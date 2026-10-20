/**
 * Daten-Modelle des Spiels. Alles sind einfache, JSON-taugliche Objekte,
 * damit sie direkt in IndexedDB gespeichert werden können.
 */

export interface Coach {
  name: string;
  alter: number;
}

// ---------- Spieler ----------

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export const POSITIONEN: readonly Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export type AttributKey =
  | 'dunk'
  | 'mitteldistanz'
  | 'dreier'
  | 'freiwurf'
  | 'ballhandling'
  | 'passen'
  | 'spielIq'
  | 'postMoves'
  | 'reboundOff'
  | 'reboundDef'
  | 'block'
  | 'perimeterDef'
  | 'innenDef'
  | 'steal'
  | 'speed'
  | 'sprungkraft'
  | 'kraft'
  | 'ausdauer';
export type Attribute = Record<AttributKey, number>;

export type PersoenlichkeitKey =
  | 'arbeitsethik'
  | 'ego'
  | 'loyalitaet'
  | 'geldgier'
  | 'verletzungsanfaelligkeit';
export type Persoenlichkeit = Record<PersoenlichkeitKey, number>;

export interface Vertrag {
  /** Jahresgehalt in Dollar */
  gehalt: number;
  /** Restlaufzeit in Jahren, das laufende Jahr eingerechnet */
  jahre: number;
}

export interface Spieler {
  /** Eindeutig in der Liga; entspricht dem Index in Liga.spieler */
  id: number;
  vorname: string;
  nachname: string;
  position: Position;
  groesseCm: number;
  gewichtKg: number;
  alter: number;
  nationalitaet: string;
  attribute: Attribute;
  persoenlichkeit: Persoenlichkeit;
  /** Gesamtwertung (aus den Attributen je nach Position berechnet) */
  ovr: number;
  /** Potenzial */
  pot: number;
  vertrag: Vertrag;
  /** null = Free Agent (ab Meilenstein 5) */
  teamId: number | null;
}

// ---------- Teams & Liga ----------

export type Markt = 'klein' | 'mittel' | 'gross';
export type BesitzerTyp = 'geduldig' | 'ungeduldig' | 'sparsam' | 'siegen';

export interface Team {
  /** Index in Liga.teams */
  id: number;
  stadt: string;
  name: string;
  /** 3 Buchstaben */
  kuerzel: string;
  /** Teamfarben als #rrggbb */
  farbe1: string;
  farbe2: string;
  /** 0 = Ost, 1 = West */
  conference: 0 | 1;
  /** 0..2, Namen siehe DIVISIONEN in teams.ts */
  division: 0 | 1 | 2;
  markt: Markt;
  /** 0..100 */
  fanBegeisterung: number;
  budget: number;
  halle: string;
  besitzer: BesitzerTyp;
  /** Spieler-IDs, nach OVR absteigend sortiert */
  kader: number[];
}

/** Ein angesetztes Spiel. Der Spieltag ergibt sich aus der Position in Liga.spielplan. */
export interface Spiel {
  heim: number;
  gast: number;
}

export interface Liga {
  seed: number;
  /** Spiele pro Team in der Hauptrunde: 82, 58 oder 29 */
  saisonLaenge: number;
  teams: Team[];
  spieler: Spieler[];
  /** spielplan[tag] = alle Spiele dieses Kalendertags */
  spielplan: Spiel[][];
  /** Aktueller Kalendertag (0-basiert): der nächste noch nicht gespielte Tag */
  tag: number;
}

// ---------- Spielstand ----------

/** Der komplette Spielstand eines Speicherplatzes (ohne Verwaltungsdaten). */
export interface SpielDaten {
  coach: Coach;
  /** Seed, aus dem die Liga erzeugt wurde (reproduzierbar) */
  seed: number;
  /** Laufende Saison, 1-basiert */
  saison: number;
  liga: Liga;
  /** Das Team des Spielers (Index in liga.teams) */
  userTeamId: number;
}

export function neuesSpiel(
  coachName: string,
  coachAlter: number,
  seed: number,
  liga: Liga,
  userTeamId: number,
): SpielDaten {
  return {
    coach: { name: coachName.trim(), alter: coachAlter },
    seed,
    saison: 1,
    liga,
    userTeamId,
  };
}
