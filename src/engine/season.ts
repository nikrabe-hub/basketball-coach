import { CONFIG } from './config';
import { simuliereSpiel, type Mannschaft } from './game';
import { kaderVon } from './league';
import { mischeSeed, Rng } from './rng';
import { verbucheErgebnis } from './stats';
import type { Coaching, Liga, SpielDaten, SpielErgebnis } from './types';
import { verarbeiteSpielZustand } from './zustand';
import {
  erzeugePostseason,
  laufendeSerieVon,
  nochImRennen,
  schaetzeRestTage,
  simuliereNachseasonTag,
  spieleAmTag,
} from './postseason';

/** Wie viele eigene Spiele ihren Play-by-Play behalten. */
const PBP_BEHALTEN = 10;

/**
 * Simulationsziele. Hauptrunde: nächstes Spiel, Woche, Deadline, Ende der Hauptrunde.
 * Play-In und Playoffs: nächstes Spiel, bis zum Ende der Serie (bzw. Runde) und bis zum Ende der Playoffs.
 */
export type SimulationsZiel = 'naechstesSpiel' | 'woche' | 'deadline' | 'saisonende' | 'serie' | 'playoffsEnde';

export const ZIEL_TEXT: Record<SimulationsZiel, string> = {
  naechstesSpiel: 'Nächstes Spiel simulieren',
  woche: 'Eine Woche simulieren',
  deadline: 'Bis zur Trade Deadline',
  saisonende: 'Bis zum Ende der Hauptrunde',
  serie: 'Bis zum Ende der Serie',
  playoffsEnde: 'Bis zum Ende der Playoffs',
};

export function mannschaftVon(liga: Liga, teamId: number, coaching?: Coaching): Mannschaft {
  const t = liga.teams[teamId];
  if (!t) throw new Error(`Unbekanntes Team ${teamId}`);
  const m: Mannschaft = { teamId, name: t.name, kuerzel: t.kuerzel, spieler: kaderVon(liga, teamId) };
  if (coaching) m.coaching = coaching;
  return m;
}

/** Seed eines einzelnen Spiels: hängt nur von Liga, Saison, Tag und Position im Spielplan ab. */
export function spielSeed(liga: Liga, saison: number, tag: number, index: number): number {
  return mischeSeed(liga.seed, saison, tag, index, 0x5ba11);
}

/** Alle Tage der Hauptrunde gespielt? */
export function hauptrundeVorbei(liga: Liga): boolean {
  return liga.tag >= liga.spielplan.length;
}

/** Kalendertag, an dem die Trade Deadline erreicht ist (ca. 60 % der Saison). */
export function deadlineTag(liga: Liga): number {
  return Math.floor(liga.spielplan.length * CONFIG.saison.tradeDeadlineAnteil);
}

/** Nächster Tag (ab dem aktuellen), an dem das eigene Team spielt. */
export function naechsterEigenerSpieltag(spiel: SpielDaten): number | null {
  const { liga, userTeamId } = spiel;
  for (let tag = liga.tag; tag < liga.spielplan.length; tag++) {
    if ((liga.spielplan[tag] ?? []).some((s) => s.heim === userTeamId || s.gast === userTeamId)) return tag;
  }
  return null;
}

/** Bis zu welchem Tag (ausschließlich) simuliert wird; null = Ziel ist nicht möglich. */
export function zielTag(spiel: SpielDaten, ziel: SimulationsZiel): number | null {
  const { liga } = spiel;
  const ende = liga.spielplan.length;
  if (hauptrundeVorbei(liga)) return null;
  switch (ziel) {
    case 'naechstesSpiel': {
      const t = naechsterEigenerSpieltag(spiel);
      return t === null ? ende : t + 1;
    }
    case 'woche':
      return Math.min(liga.tag + 7, ende);
    case 'deadline': {
      const d = deadlineTag(liga);
      return liga.tag < d ? d : null;
    }
    case 'saisonende':
      return ende;
    case 'serie':
    case 'playoffsEnde':
      return null;
  }
}

/** Ist das Ziel im aktuellen Zustand sinnvoll (Hauptrunde, Play-In oder Playoffs)? */
export function zielMoeglich(spiel: SpielDaten, ziel: SimulationsZiel): boolean {
  const { liga } = spiel;
  if (!hauptrundeVorbei(liga)) return zielTag(spiel, ziel) !== null;
  const post = liga.postseason;
  if (!post || post.phase === 'beendet') return false;
  return ziel === 'naechstesSpiel' || ziel === 'serie' || ziel === 'playoffsEnde';
}

/** Spielt einen Kalendertag (alle Spiele dieses Tages). Verändert `spiel.liga`. */
export function simuliereTag(spiel: SpielDaten): SpielErgebnis[] {
  const { liga } = spiel;
  if (hauptrundeVorbei(liga)) return simuliereNachseasonTag(spiel);
  const tag = liga.tag;
  const spiele = liga.spielplan[tag];
  if (!spiele) throw new Error(`Kein Spieltag ${tag}`);

  const mannschaften = new Map<number, Mannschaft>();
  const holen = (id: number) => {
    let m = mannschaften.get(id);
    if (!m) {
      m = mannschaftVon(liga, id, id === spiel.userTeamId ? spiel.coaching : undefined);
      mannschaften.set(id, m);
    }
    return m;
  };

  const ergebnisse: SpielErgebnis[] = [];
  spiele.forEach((sp, i) => {
    const eigenes = sp.heim === spiel.userTeamId || sp.gast === spiel.userTeamId;
    const rng = new Rng(spielSeed(liga, spiel.saison, tag, i));
    const erg = simuliereSpiel(rng, holen(sp.heim), holen(sp.gast), {
      tag,
      pbp: eigenes && spiel.einstellungen.pbp,
      saisonLaenge: liga.saisonLaenge,
    });
    verbucheErgebnis(liga, erg);
    verarbeiteSpielZustand(spiel, erg);
    ergebnisse.push(erg);
  });
  liga.ergebnisse[tag] = ergebnisse;
  liga.tag = tag + 1;
  kuerzePbp(spiel);
  // Nach dem letzten Tag der Hauptrunde stehen Play-In und Playoffs an
  if (hauptrundeVorbei(liga)) erzeugePostseason(spiel);
  return ergebnisse;
}

/** Nur die letzten Spiele behalten ihren Play-by-Play (spart Speicherplatz). */
function kuerzePbp(spiel: SpielDaten): void {
  const { liga } = spiel;
  let behalten = 0;
  for (let tag = liga.tag - 1; tag >= 0; tag--) {
    for (const erg of liga.ergebnisse[tag] ?? []) {
      if (!erg.pbp) continue;
      if (behalten < PBP_BEHALTEN) behalten++;
      else delete erg.pbp;
    }
  }
}

export interface SimulationsOptionen {
  /** Wird nach jedem gespielten Tag aufgerufen */
  onFortschritt?: (tagFertig: number, tagZiel: number) => void;
}

/**
 * Simuliert alle Tage bis `ziel` (ausschließlich). Verändert `spiel`.
 * Hält früher an, wenn am letzten Tag eine wichtige Meldung (zum Beispiel eine schwere Verletzung
 * im eigenen Team) in den Posteingang kam. Rückgabe: true, wenn das Ziel erreicht wurde.
 */
export function simuliereBis(spiel: SpielDaten, ziel: number, opt: SimulationsOptionen = {}): boolean {
  const start = spiel.liga.tag;
  const ende = Math.min(ziel, spiel.liga.spielplan.length);
  while (spiel.liga.tag < ende) {
    const letzteId = hoechsteNachrichtenId(spiel);
    simuliereTag(spiel);
    opt.onFortschritt?.(spiel.liga.tag - start, ende - start);
    if (spiel.liga.tag < ende && hatNeueWichtigeNachricht(spiel, letzteId)) return false;
  }
  return true;
}

/**
 * Simuliert in Play-In und Playoffs, bis das Ziel erreicht ist oder (bei einer wichtigen Meldung) früher.
 * 'naechstesSpiel': bis das eigene Team gespielt hat (ist es ausgeschieden: bis zum Ende der Runde).
 * 'serie': bis die eigene Serie entschieden ist, sonst bis zum Ende der Runde. Rückgabe wie `simuliereBis`.
 */
function simuliereNachseasonBis(spiel: SpielDaten, ziel: SimulationsZiel, opt: SimulationsOptionen): boolean {
  const { liga } = spiel;
  const post = liga.postseason;
  if (!post) return true;
  const u = spiel.userTeamId;
  const imRennen = nochImRennen(post, u);
  const startPhase = post.phase;
  const startRunde = post.runde;
  const eigeneSerie = laufendeSerieVon(post, u)?.id ?? null;
  let fertig = 0;

  const beendet = () => post.phase === 'beendet';
  while (!beendet()) {
    const letzteId = hoechsteNachrichtenId(spiel);
    simuliereTag(spiel);
    fertig++;
    opt.onFortschritt?.(fertig, fertig + Math.ceil(schaetzeRestTage(post)));
    if (beendet()) break;

    const heute = post.tage[post.tage.length - 1] ?? [];
    const eigenGespielt = heute.some((g) => g.heim === u || g.gast === u);
    const abschnittVorbei = post.phase !== startPhase || post.runde !== startRunde;
    const eigeneSerieFertig = eigeneSerie !== null && post.serien[eigeneSerie]?.sieger !== null;
    if (ziel === 'naechstesSpiel' && ((imRennen && eigenGespielt) || (!imRennen && abschnittVorbei))) break;
    if (ziel === 'serie' && (abschnittVorbei || eigeneSerieFertig)) break;
    if (hatNeueWichtigeNachricht(spiel, letzteId)) return false;
  }
  opt.onFortschritt?.(fertig, fertig);
  return true;
}

/**
 * Simuliert ein Ziel (siehe SimulationsZiel) in Hauptrunde, Play-In oder Playoffs. Verändert `spiel`.
 * Rückgabe: true, wenn das Ziel erreicht wurde; false, wenn eine wichtige Meldung früher angehalten hat.
 */
export function simuliereZiel(spiel: SpielDaten, ziel: SimulationsZiel, opt: SimulationsOptionen = {}): boolean {
  if (!hauptrundeVorbei(spiel.liga)) {
    const bis = zielTag(spiel, ziel);
    return bis === null ? true : simuliereBis(spiel, bis, opt);
  }
  return simuliereNachseasonBis(spiel, ziel, opt);
}

export function hoechsteNachrichtenId(spiel: SpielDaten): number {
  return spiel.posteingang.reduce((m, n) => Math.max(m, n.id), 0);
}

/** Gibt es seit der Nachricht mit der Nummer `letzteId` eine wichtige Meldung? */
export function hatNeueWichtigeNachricht(spiel: SpielDaten, letzteId: number): boolean {
  return spiel.posteingang.some((n) => n.id > letzteId && n.wichtig);
}

/** Alle bisherigen Ergebnisse des eigenen Teams, neueste zuletzt. */
export function eigeneErgebnisse(spiel: SpielDaten): { erg: SpielErgebnis; index: number }[] {
  const { liga, userTeamId } = spiel;
  const liste: { erg: SpielErgebnis; index: number }[] = [];
  for (let tag = 0; tag < liga.tag; tag++) {
    (liga.ergebnisse[tag] ?? []).forEach((erg, index) => {
      if (erg.heim.teamId === userTeamId || erg.gast.teamId === userTeamId) liste.push({ erg, index });
    });
  }
  return liste;
}

/** Position eines Spiels des Teams im Spielplan des Tages (für den Zugriff auf liga.ergebnisse). */
export function spielIndex(liga: Liga, tag: number, teamId: number): number {
  return spieleAmTag(liga, tag).findIndex((s) => s.heim === teamId || s.gast === teamId);
}
