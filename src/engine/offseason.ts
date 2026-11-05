import { CONFIG } from './config';
import { entwickleSpieler, karriereendeChance } from './development';
import {
  aktuellerPick,
  autoPickUser,
  fuehreLotterieAus,
  schliesseDraftAb,
  sichereDraftDaten,
  simuliereDraftBisUser,
  simuliereDraftKomplett,
  waehleKandidat,
} from './draft';
import { sichereSaisonZiele } from './karriere';
import { gehaltFuerOvr, kaderVon, sortiereKader } from './league';
import { Rng, mischeSeed } from './rng';
import { erzeugeSpielplan } from './schedule';
import { leererStand } from './stats';
import {
  type EntwicklungsZeile,
  type Liga,
  type OffseasonPhase,
  type Spieler,
  type SpielDaten,
  type VertragsZeile,
} from './types';
import { begrenze } from './player';
import { neueNachricht } from './zustand';

const O = CONFIG.offseason;
const name = (s: Spieler) => `${s.vorname} ${s.nachname}`;

export type OffseasonStatus = 'keine' | 'start' | OffseasonPhase;

/** Wo steht das Spiel im Ablauf nach den Finals? 'keine' = die Saison läuft noch. */
export function offseasonStatus(spiel: SpielDaten): OffseasonStatus {
  const post = spiel.liga.postseason;
  if (!post || post.phase !== 'beendet') return 'keine';
  return spiel.liga.offseason ? spiel.liga.offseason.phase : 'start';
}

function offseasonOder(spiel: SpielDaten): NonNullable<Liga['offseason']> {
  const o = spiel.liga.offseason;
  if (!o) throw new Error('Die Offseason hat noch nicht begonnen.');
  return o;
}

/** Spieler ohne Team, die nicht aufgehört haben und nicht zur Draft-Klasse gehören. */
export function freieSpieler(liga: Liga): Spieler[] {
  const klasse = new Set(liga.draftKlasse);
  return liga.spieler.filter((s) => s.teamId === null && s.ruhestand === undefined && !klasse.has(s.id));
}

/** Wert eines Spielers zum Auswählen oder Entlassen (junge Spieler zählen mit Potenzial). */
export function haltWert(s: Spieler): number {
  return s.ovr + (s.alter <= 23 ? (s.pot - s.ovr) * 0.5 : 0);
}

// ---------- 1. Karriereende und Entwicklung ----------

function archiviereSaison(spiel: SpielDaten): void {
  const { liga } = spiel;
  for (const s of liga.spieler) {
    const z = liga.stand.spieler[String(s.id)];
    if (!z || z.spiele === 0) continue;
    (s.verlauf ??= []).push([
      spiel.saison,
      s.teamId ?? -1,
      z.spiele,
      Math.round(z.min / 60),
      z.pts,
      z.reb,
      z.ast,
      z.stl,
      z.blk,
      s.ovr,
      s.alter,
    ]);
  }
}

function beendeKarriere(liga: Liga, s: Spieler, saison: number): void {
  if (s.teamId !== null) {
    const team = liga.teams[s.teamId];
    if (team) team.kader = team.kader.filter((id) => id !== s.id);
  }
  s.teamId = null;
  s.ruhestand = saison;
  s.verletzung = null;
}

/** Karriereende, dann ein Jahr älter und besser/schlechter. Danach beginnt der Ablauf mit der Phase "bericht". */
export function starteOffseason(spiel: SpielDaten): void {
  if (offseasonStatus(spiel) !== 'start') throw new Error('Die Offseason kann jetzt nicht beginnen.');
  const { liga } = spiel;
  const rng = new Rng(mischeSeed(liga.seed, spiel.saison, 0x0ff5));
  archiviereSaison(spiel);

  const klasse = new Set(liga.draftKlasse);
  const aktiv = liga.spieler.filter((s) => s.ruhestand === undefined && !klasse.has(s.id));

  // Karriereende
  const ruhestand: number[] = [];
  const meineRuhestand = new Set<number>();
  for (const s of aktiv) {
    if (rng.chance(karriereendeChance(s, s.teamId !== null))) {
      if (s.teamId === spiel.userTeamId) meineRuhestand.add(s.id);
      beendeKarriere(liga, s, spiel.saison);
      ruhestand.push(s.id);
    }
  }
  // Der Pool ohne Team bleibt klein: die Schwächsten hören auf.
  const pool = freieSpieler(liga).sort((a, b) => haltWert(b) - haltWert(a) || a.id - b.id);
  for (const s of pool.slice(O.karriereende.poolMax)) {
    beendeKarriere(liga, s, spiel.saison);
    ruhestand.push(s.id);
  }

  // Entwicklung
  const zeilen: EntwicklungsZeile[] = [];
  for (const s of aktiv) {
    if (s.ruhestand !== undefined) continue;
    const z = liga.stand.spieler[String(s.id)];
    const minProSpiel = z && z.spiele > 0 ? z.min / z.spiele / 60 : 0;
    const alt = { ovr: s.ovr, pot: s.pot };
    entwickleSpieler(rng, s, minProSpiel);
    s.neuling = false;
    zeilen.push({ spielerId: s.id, teamId: s.teamId, alter: s.alter, ovrAlt: alt.ovr, ovrNeu: s.ovr, potAlt: alt.pot, potNeu: s.pot });
  }
  for (const t of liga.teams) sortiereKader(liga, t.id);

  const eigene = zeilen.filter((z) => z.teamId === spiel.userTeamId).sort((a, b) => b.ovrNeu - a.ovrNeu);
  const andere = zeilen.filter((z) => z.teamId !== null && z.teamId !== spiel.userTeamId);
  const delta = (z: EntwicklungsZeile) => z.ovrNeu - z.ovrAlt;
  const hoch = [...andere].sort((a, b) => delta(b) - delta(a) || a.spielerId - b.spielerId).slice(0, 5);
  const runter = [...andere].sort((a, b) => delta(a) - delta(b) || a.spielerId - b.spielerId).slice(0, 5);

  liga.offseason = {
    phase: 'bericht',
    ruhestand: ruhestand.filter((id) => {
      const s = liga.spieler[id] as Spieler;
      return s.ovr >= 60 || meineRuhestand.has(id) || s.alter >= 36;
    }),
    entwicklung: [...eigene, ...hoch, ...runter],
    lotterie: null,
    draftZeiger: 0,
    vertraege: [],
  };
  // Aufgehört haben auch Spieler des eigenen Teams: kurze Meldung.
  const meine = [...meineRuhestand].map((id) => liga.spieler[id] as Spieler);
  if (meine.length > 0) neueNachricht(spiel, 'info', `Karriereende: ${meine.slice(0, 6).map((s) => `${name(s)} (${s.alter})`).join(', ')}.`, false);
}

// ---------- 2. Lotterie und Draft ----------

export function starteLotterie(spiel: SpielDaten): void {
  const o = offseasonOder(spiel);
  if (o.phase !== 'bericht') throw new Error('Die Lotterie kommt nach dem Entwicklungsbericht.');
  o.lotterie = fuehreLotterieAus(spiel);
  o.phase = 'lotterie';
}

/** Draft eröffnen: KI-Teams wählen, bis du dran bist. */
export function starteDraft(spiel: SpielDaten): void {
  const o = offseasonOder(spiel);
  if (o.phase !== 'lotterie') throw new Error('Der Draft beginnt nach der Lotterie.');
  o.phase = 'draft';
  o.draftZeiger = 0;
  setzeDraftFort(spiel);
}

/** Wenn kein Pick mehr offen ist, wird der Draft abgeschlossen. */
function pruefeDraftEnde(spiel: SpielDaten): void {
  if (aktuellerPick(spiel.liga, spiel.saison)) return;
  schliesseDraftAb(spiel);
  beendeDraftPhase(spiel);
}

/** KI-Picks, bis du wieder am Zug bist (oder der Draft zu Ende ist). */
export function setzeDraftFort(spiel: SpielDaten): void {
  simuliereDraftBisUser(spiel);
  pruefeDraftEnde(spiel);
}

export function draftWaehle(spiel: SpielDaten, spielerId: number): void {
  waehleKandidat(spiel, spielerId);
  setzeDraftFort(spiel);
}

export function draftAutoPick(spiel: SpielDaten): void {
  autoPickUser(spiel);
  setzeDraftFort(spiel);
}

export function draftKomplett(spiel: SpielDaten): void {
  simuliereDraftKomplett(spiel);
  pruefeDraftEnde(spiel);
}

// ---------- 3. Kader ----------

/** Vorläufige Regel (bis Meilenstein 5b): auslaufende Verträge werden zum Marktwert um 1–3 Jahre verlängert. */
function verlaengereAuslaufende(spiel: SpielDaten, rng: Rng): VertragsZeile[] {
  const { liga } = spiel;
  const { mindestGehalt, maximalGehalt } = CONFIG.finanzen;
  const eigene: VertragsZeile[] = [];
  for (const t of liga.teams) {
    for (const s of kaderVon(liga, t.id)) {
      if (s.draft?.saison === spiel.saison) continue; // frisch gedraftet
      s.vertrag.jahre -= 1;
      if (s.vertrag.jahre > 0) continue;
      const alt = s.vertrag.gehalt;
      const markt = gehaltFuerOvr(s.ovr) * rng.range(0.92, 1.08);
      const gehalt = begrenze(Math.round(markt / 10_000) * 10_000, mindestGehalt, maximalGehalt);
      const jahre = s.alter >= 33 ? 1 : rng.int(1, 3);
      s.vertrag = { gehalt, jahre };
      if (t.id === spiel.userTeamId) eigene.push({ spielerId: s.id, gehaltAlt: alt, gehaltNeu: gehalt, jahre });
    }
  }
  return eigene;
}

/** Entlässt einen Spieler: er wird Free Agent. (Restgehalt zählt erst ab Meilenstein 5b gegen die Obergrenze.) */
export function entlasseSpieler(spiel: SpielDaten, spielerId: number): void {
  const { liga } = spiel;
  const s = liga.spieler[spielerId];
  if (!s || s.teamId === null) throw new Error('Dieser Spieler hat kein Team.');
  const team = liga.teams[s.teamId];
  if (!team) return;
  team.kader = team.kader.filter((id) => id !== s.id);
  s.teamId = null;
  s.moral = CONFIG.moral.start;
}

/** Verpflichtet den besten freien Spieler zum Mindestgehalt (1 Jahr). Gibt false zurück, wenn niemand frei ist. */
function verpflichteBestenFreien(spiel: SpielDaten, teamId: number): Spieler | null {
  const { liga } = spiel;
  const beste = freieSpieler(liga).sort((a, b) => haltWert(b) - haltWert(a) || a.id - b.id)[0];
  if (!beste) return null;
  const team = liga.teams[teamId];
  if (!team) return null;
  beste.teamId = teamId;
  beste.vertrag = { gehalt: CONFIG.finanzen.mindestGehalt, jahre: 1 };
  team.kader.push(beste.id);
  sortiereKader(liga, teamId);
  return beste;
}

function verwalteKaderderKI(spiel: SpielDaten): void {
  const { liga } = spiel;
  for (const t of liga.teams) {
    if (t.id === spiel.userTeamId) continue;
    while (t.kader.length > O.kader.max) {
      const schwaechster = kaderVon(liga, t.id).sort((a, b) => haltWert(a) - haltWert(b) || b.id - a.id)[0] as Spieler;
      entlasseSpieler(spiel, schwaechster.id);
    }
    while (t.kader.length < O.kader.min) {
      if (!verpflichteBestenFreien(spiel, t.id)) break;
    }
  }
}

function beendeDraftPhase(spiel: SpielDaten): void {
  const o = offseasonOder(spiel);
  const rng = new Rng(mischeSeed(spiel.liga.seed, spiel.saison, 0x7a9e));
  o.vertraege = verlaengereAuslaufende(spiel, rng);
  verwalteKaderderKI(spiel);
  o.phase = 'kader';
  const meine = o.vertraege.length;
  if (meine > 0) neueNachricht(spiel, 'info', `${meine} auslaufende Verträge wurden vorläufig zum Marktwert verlängert.`, false);
}

/** Prüft, ob die neue Saison beginnen darf (Kader des Spielers höchstens 15). */
export function kannNeueSaisonStarten(spiel: SpielDaten): { ok: boolean; grund?: string } {
  if (offseasonStatus(spiel) !== 'kader') return { ok: false, grund: 'Der Draft ist noch nicht abgeschlossen.' };
  const n = (spiel.liga.teams[spiel.userTeamId] as { kader: number[] }).kader.length;
  if (n > O.kader.max) return { ok: false, grund: `Dein Kader hat ${n} Spieler, erlaubt sind höchstens ${O.kader.max}. Bitte entlasse ${n - O.kader.max}.` };
  return { ok: true };
}

// ---------- 4. Neue Saison ----------

export function starteNeueSaison(spiel: SpielDaten): void {
  const pruefung = kannNeueSaisonStarten(spiel);
  if (!pruefung.ok) throw new Error(pruefung.grund);
  const { liga } = spiel;
  const user = liga.teams[spiel.userTeamId] as { kader: number[] };

  // Zu kleiner Kader: mit den besten freien Spielern zum Mindestgehalt auffüllen.
  const geholt: Spieler[] = [];
  while (user.kader.length < O.kader.min) {
    const s = verpflichteBestenFreien(spiel, spiel.userTeamId);
    if (!s) break;
    geholt.push(s);
  }

  // Verletzungen heilen in der Pause, die Stimmung pendelt sich ein.
  const heilung = Math.round(liga.saisonLaenge * 0.4);
  for (const s of liga.spieler) {
    if (s.verletzung) {
      s.verletzung.spieleVerbleibend -= heilung;
      if (s.verletzung.spieleVerbleibend <= 0) s.verletzung = null;
    }
    s.moral = Math.round(s.moral * 0.5 + CONFIG.moral.start * 0.5);
  }

  const neueSaison = spiel.saison + 1;
  const rng = new Rng(mischeSeed(liga.seed, neueSaison, 0x5ced));
  liga.spielplan = erzeugeSpielplan(rng, liga.teams, liga.saisonLaenge);
  liga.tag = 0;
  liga.ergebnisse = [];
  liga.stand = leererStand(liga.teams.length);
  delete liga.postseason;
  delete liga.offseason;
  spiel.saison = neueSaison;

  // Die Rotation passt nicht mehr zum Kader: zurück auf Automatik.
  const hatteManuell = !spiel.coaching.rotation.auto;
  spiel.coaching.rotation = { auto: true, starter: [], minuten: {} };

  spiel.karriere.ziele = [];
  sichereSaisonZiele(spiel);
  spiel.scouting = { punkte: O.scouting.punkteProSaison, stufen: {} };
  sichereDraftDaten(spiel);

  neueNachricht(spiel, 'info', `Saison ${neueSaison} beginnt. Neue Ziele des Besitzers findest du auf dem Start-Tab.`, false);
  if (hatteManuell) neueNachricht(spiel, 'info', 'Deine Rotation wurde auf Automatik zurückgestellt, weil sich der Kader verändert hat.', false);
  if (geholt.length > 0) {
    neueNachricht(spiel, 'info', `Dein Kader war zu klein. Verpflichtet zum Mindestgehalt: ${geholt.map(name).join(', ')}.`, false);
  }
}

// Wird nur für das Skript zur Langzeitsimulation und für Tests gebraucht: ein ganzer Wechsel ohne Eingriffe des Spielers.
export function wechsleSaisonAutomatisch(spiel: SpielDaten): void {
  starteOffseason(spiel);
  starteLotterie(spiel);
  starteDraft(spiel);
  if (offseasonStatus(spiel) === 'draft') draftKomplett(spiel);
  const n = (spiel.liga.teams[spiel.userTeamId] as { kader: number[] }).kader.length;
  for (let i = n; i > O.kader.max; i--) {
    const schwaechster = kaderVon(spiel.liga, spiel.userTeamId).sort((a, b) => haltWert(a) - haltWert(b))[0] as Spieler;
    entlasseSpieler(spiel, schwaechster.id);
  }
  starteNeueSaison(spiel);
}

