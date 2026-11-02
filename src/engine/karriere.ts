import { erwarteteSiegquote } from './awards';
import { CONFIG } from './config';
import { staerkeRang } from './league';
import { neueNachricht } from './zustand';
import type { BesitzerTyp, Liga, Postseason, SaisonRueckblick, SaisonZiel, Serie, SpielDaten } from './types';

/**
 * Besitzer-Ziele, Jobsicherheit und Coach-Ruf (Meilenstein 4b).
 * Ziele entstehen zu Saisonbeginn aus Teamstärke und Besitzer-Typ und werden nach den Playoffs bewertet.
 * Entlassung und Jobangebote kommen in Meilenstein 6.
 */

export const RUNDEN_ZIEL_TEXT = [
  'Das Play-In erreichen (Platz 1–10)',
  'Die Playoffs erreichen',
  'Die zweite Runde erreichen',
  'Die Conference Finals erreichen',
  'Die Finals erreichen',
  'Die Meisterschaft gewinnen',
] as const;

/** Wie weit ein Team gekommen ist: -1 = nicht im Play-In, 0 = Play-In ohne Playoffs, 1–4 = Runde, 5 = Meister. */
export function erreichteRunde(post: Postseason, teamId: number): number {
  if (post.meister === teamId) return 5;
  let r = -1;
  if (post.playin.some((p) => p.heim === teamId || p.gast === teamId)) r = 0;
  if (post.seeds.some((conf) => conf.includes(teamId))) r = Math.max(r, 1);
  for (const s of post.serien) {
    if (s.oben === teamId || s.unten === teamId) r = Math.max(r, s.runde);
  }
  return r;
}

export function erzeugeSaisonZiele(liga: Liga, teamId: number, besitzer: BesitzerTyp): SaisonZiel[] {
  const rang = staerkeRang(liga, teamId);
  const K = CONFIG.karriere;
  const quote = erwarteteSiegquote(rang) + K.erwartungNachBesitzer[besitzer];
  const wert = Math.max(1, Math.round(quote * liga.saisonLaenge));
  const ziele: SaisonZiel[] = [{ typ: 'siege', text: `Mindestens ${wert} Siege in der Hauptrunde`, wert, erfuellt: null }];

  const fordernd = besitzer === 'ungeduldig' || besitzer === 'siegen';
  let runde: number | null;
  if (rang <= 3) runde = fordernd ? 5 : 4;
  else if (rang <= 7) runde = fordernd ? 3 : 2;
  else if (rang <= 14) runde = 1;
  else if (rang <= 22) runde = 0;
  else runde = null;
  if (runde !== null) ziele.push({ typ: 'runde', text: RUNDEN_ZIEL_TEXT[runde] as string, wert: runde, erfuellt: null });
  return ziele;
}

/** Legt die Ziele der laufenden Saison an, falls noch keine da sind. */
export function sichereSaisonZiele(spiel: SpielDaten): void {
  if (spiel.karriere.ziele.length > 0) return;
  const team = spiel.liga.teams[spiel.userTeamId];
  if (!team) return;
  spiel.karriere.ziele = erzeugeSaisonZiele(spiel.liga, spiel.userTeamId, team.besitzer);
}

const klemme = (x: number) => Math.max(0, Math.min(100, x));

/** Text für das Ergebnis eines Teams: -1 bis 5 wie bei `erreichteRunde`. */
export function ergebnisText(runde: number): string {
  switch (runde) {
    case -1:
      return 'Playoffs verpasst';
    case 0:
      return 'Im Play-In ausgeschieden';
    case 1:
      return 'In der ersten Runde ausgeschieden';
    case 2:
      return 'In der zweiten Runde ausgeschieden';
    case 3:
      return 'Im Conference-Finale ausgeschieden';
    case 4:
      return 'Finals verloren';
    default:
      return 'Meister';
  }
}

/** Bewertet die Saison nach den Finals: Ziele, Jobsicherheit, Ruf, Historie und eine Abschlussmeldung. */
export function bewerteSaison(spiel: SpielDaten): void {
  const { liga } = spiel;
  const post = liga.postseason as Postseason;
  const team = liga.teams[spiel.userTeamId];
  const b = liga.stand.teams[spiel.userTeamId];
  if (!team || !b) return;
  sichereSaisonZiele(spiel);

  const runde = erreichteRunde(post, spiel.userTeamId);
  const K = CONFIG.karriere;
  const spiele = b.siege + b.niederlagen;
  const quote = spiele === 0 ? 0.5 : b.siege / spiele;

  let sicherheit = spiel.karriere.jobsicherheit;
  for (const z of spiel.karriere.ziele) {
    z.erfuellt = z.typ === 'siege' ? b.siege >= z.wert : runde >= z.wert;
    sicherheit += z.erfuellt ? K.zielErfuellt[team.besitzer] : K.zielVerfehlt[team.besitzer];
  }
  const gewonneneRunden = Math.max(0, runde >= 5 ? 4 : runde - 1);
  sicherheit += gewonneneRunden * K.rundeBonus + (runde === 5 ? K.titelBonus : 0) + (quote - 0.5) * K.siegquoteFaktor;

  let ruf = spiel.karriere.ruf;
  ruf += (quote - 0.5) * K.rufSiegquote + gewonneneRunden * K.rufRunde + (runde === 5 ? K.rufTitel : 0);
  if (post.awards.trainer?.teamId === spiel.userTeamId) ruf += K.rufTrainer;

  spiel.karriere.jobsicherheit = Math.round(klemme(sicherheit));
  spiel.karriere.ruf = Math.round(klemme(ruf) * 10) / 10;

  const finale = post.serien.find((s: Serie) => s.runde === 4);
  const meisterId = post.meister as number;
  const finalGegnerId = finale ? (finale.oben === meisterId ? finale.unten : finale.oben) : meisterId;
  const rueckblick: SaisonRueckblick = {
    saison: spiel.saison,
    meisterId,
    finalGegnerId,
    userSiege: b.siege,
    userNiederlagen: b.niederlagen,
    userErgebnis: ergebnisText(runde),
    ziele: structuredClone(spiel.karriere.ziele),
    jobsicherheit: spiel.karriere.jobsicherheit,
    ruf: spiel.karriere.ruf,
    awards: structuredClone(post.awards),
  };
  spiel.historie.push(rueckblick);

  const meister = liga.teams[meisterId];
  const meisterText = meister ? `${meister.stadt} ${meister.name}` : '?';
  const erfuellt = spiel.karriere.ziele.filter((z) => z.erfuellt).length;
  neueNachricht(
    spiel,
    'playoffs',
    meisterId === spiel.userTeamId
      ? `Du bist Meister! Ziele erfüllt: ${erfuellt} von ${spiel.karriere.ziele.length}. Jobsicherheit ${spiel.karriere.jobsicherheit}.`
      : `${meisterText} ist Meister. Deine Saison: ${rueckblick.userErgebnis}. Ziele erfüllt: ${erfuellt} von ${spiel.karriere.ziele.length}. Jobsicherheit ${spiel.karriere.jobsicherheit}.`,
    true,
  );
}
