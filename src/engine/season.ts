import { CONFIG } from './config';
import { simuliereSpiel, type Mannschaft } from './game';
import { kaderVon } from './league';
import { mischeSeed, Rng } from './rng';
import { verbucheErgebnis } from './stats';
import type { Liga, SpielDaten, SpielErgebnis } from './types';

/** Wie viele eigene Spiele ihren Play-by-Play behalten. */
const PBP_BEHALTEN = 10;

export type SimulationsZiel = 'naechstesSpiel' | 'woche' | 'deadline' | 'saisonende';

export const ZIEL_TEXT: Record<SimulationsZiel, string> = {
  naechstesSpiel: 'Nächstes Spiel simulieren',
  woche: 'Eine Woche simulieren',
  deadline: 'Bis zur Trade Deadline',
  saisonende: 'Bis zum Saisonende',
};

export function mannschaftVon(liga: Liga, teamId: number): Mannschaft {
  const t = liga.teams[teamId];
  if (!t) throw new Error(`Unbekanntes Team ${teamId}`);
  return { teamId, name: t.name, kuerzel: t.kuerzel, spieler: kaderVon(liga, teamId) };
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
  }
}

/** Spielt einen Kalendertag (alle Spiele dieses Tages). Verändert `spiel.liga`. */
export function simuliereTag(spiel: SpielDaten): SpielErgebnis[] {
  const { liga } = spiel;
  const tag = liga.tag;
  const spiele = liga.spielplan[tag];
  if (!spiele) throw new Error(`Kein Spieltag ${tag}`);

  const mannschaften = new Map<number, Mannschaft>();
  const holen = (id: number) => {
    let m = mannschaften.get(id);
    if (!m) {
      m = mannschaftVon(liga, id);
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
    });
    verbucheErgebnis(liga, erg);
    ergebnisse.push(erg);
  });
  liga.ergebnisse[tag] = ergebnisse;
  liga.tag = tag + 1;
  kuerzePbp(spiel);
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

/** Simuliert alle Tage bis `ziel` (ausschließlich). Verändert `spiel`. */
export function simuliereBis(spiel: SpielDaten, ziel: number, opt: SimulationsOptionen = {}): void {
  const start = spiel.liga.tag;
  const ende = Math.min(ziel, spiel.liga.spielplan.length);
  while (spiel.liga.tag < ende) {
    simuliereTag(spiel);
    opt.onFortschritt?.(spiel.liga.tag - start, ende - start);
  }
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
  return (liga.spielplan[tag] ?? []).findIndex((s) => s.heim === teamId || s.gast === teamId);
}
