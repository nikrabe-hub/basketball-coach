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
  /** Stimmung 0..100 (ab Meilenstein 4): hängt von Spielzeit, Rolle und Teamerfolg ab */
  moral: number;
  /** null = fit */
  verletzung: Verletzung | null;
  /** Rookie in dieser Saison (ab Meilenstein 4b; für die Wahl zum Rookie des Jahres) */
  neuling: boolean;
  /** Gesamtwertung vor einem Jahr (ab Meilenstein 5, für "Most Improved"); fehlt in der ersten Saison */
  ovrVorjahr?: number;
}

/** Eine laufende Verletzung. Die Dauer zählt in Spielen des eigenen Teams. */
export interface Verletzung {
  typ: string;
  /** Ausfallzeit insgesamt (in Spielen) */
  spieleGesamt: number;
  spieleVerbleibend: number;
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

// ---------- Ergebnisse & Statistik (ab Meilenstein 3) ----------

/**
 * Eine Boxscore-Zeile eines Spielers. Als Zahlenliste gespeichert (statt Objekt),
 * damit der Spielstand klein bleibt. Zugriff über die Indizes in `BX` (stats.ts).
 * Reihenfolge: id, Spielzeit in Sekunden, Punkte, Rebounds, Off.-Rebounds, Assists,
 * Steals, Blocks, Turnovers, Fouls, FG getroffen/versucht, 3P getroffen/versucht,
 * FT getroffen/versucht, Plus/Minus, Starter (1/0).
 */
export type BoxZeile = [
  id: number,
  min: number,
  pts: number,
  reb: number,
  oreb: number,
  ast: number,
  stl: number,
  blk: number,
  to: number,
  pf: number,
  fgm: number,
  fga: number,
  tpm: number,
  tpa: number,
  ftm: number,
  fta: number,
  pm: number,
  start: number,
];

export interface TeamBox {
  teamId: number;
  punkte: number;
  /** Punkte je Viertel, Overtimes hinten angehängt */
  viertel: number[];
  spieler: BoxZeile[];
}

/** Eine neue Verletzung, die in einem Spiel passiert ist. */
export interface NeueVerletzung {
  spielerId: number;
  teamId: number;
  typ: string;
  spiele: number;
}

export interface SpielErgebnis {
  tag: number;
  heim: TeamBox;
  gast: TeamBox;
  /** Anzahl Verlängerungen (0 = keine) */
  ot: number;
  /** Kurze Spielzusammenfassung */
  text: string;
  /** Play-by-Play (nur für eigene Spiele und nur wenn eingeschaltet) */
  pbp?: string[];
  /** Verletzungen, die in diesem Spiel passiert sind */
  verletzungen?: NeueVerletzung[];
}

/** Saisonbilanz eines Teams. */
export interface TeamBilanz {
  siege: number;
  niederlagen: number;
  heimSiege: number;
  heimNiederlagen: number;
  auswSiege: number;
  auswNiederlagen: number;
  divSiege: number;
  divNiederlagen: number;
  confSiege: number;
  confNiederlagen: number;
  punkteFuer: number;
  punkteGegen: number;
  /** Positiv = Siegesserie, negativ = Niederlagenserie */
  serie: number;
  /** Letzte Spiele, neueste zuletzt: 1 = Sieg, 0 = Niederlage */
  letzte: number[];
}

/** Saison-Summen eines Spielers (Spielzeit in Sekunden). */
export interface SpielerSumme {
  spiele: number;
  starts: number;
  min: number;
  pts: number;
  reb: number;
  oreb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  pm: number;
}

/** Laufende Tabellen und Statistiken der aktuellen Saison. */
export interface Saisonstand {
  /** Index = Team-ID */
  teams: TeamBilanz[];
  /** Schlüssel = Spieler-ID (als Text) */
  spieler: Record<string, SpielerSumme>;
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
  /** ergebnisse[tag][i] gehört zu spielplan[tag][i]; nur für schon gespielte Tage vorhanden */
  ergebnisse: SpielErgebnis[][];
  stand: Saisonstand;
  /** Play-In und Playoffs; entsteht, sobald die Hauptrunde gespielt ist (ab Meilenstein 4b) */
  postseason?: Postseason;
}

// ---------- Play-In, Playoffs, Awards (ab Meilenstein 4b) ----------

export type PostPhase = 'playin' | 'playoffs' | 'beendet';

/** Verweis auf ein gespieltes Spiel: liga.ergebnisse[tag][index] */
export interface SpielRef {
  tag: number;
  index: number;
}

/** Ein angesetztes Spiel in Play-In oder Playoffs. */
export interface PostSpiel extends Spiel {
  art: 'playin' | 'serie';
  /** Index in postseason.playin bzw. postseason.serien */
  ref: number;
}

export type PlayInTyp = '7v8' | '9v10' | 'finale8';

export interface PlayInSpiel {
  id: number;
  conference: 0 | 1;
  typ: PlayInTyp;
  /** Teams stehen bei "finale8" erst nach den ersten Spielen fest */
  heim: number | null;
  gast: number | null;
  spiel: SpielRef | null;
  sieger: number | null;
  verlierer: number | null;
}

export interface Serie {
  id: number;
  /** 1 = erste Runde, 2 = zweite Runde, 3 = Conference Finals, 4 = Finals */
  runde: 1 | 2 | 3 | 4;
  /** null = Finals */
  conference: 0 | 1 | null;
  /** Position im Tableau der Runde (von oben nach unten) */
  slot: number;
  /** Team mit Heimvorteil */
  oben: number;
  unten: number;
  /** Platz in der Conference-Setzliste (1–8) */
  seedOben: number;
  seedUnten: number;
  siegeOben: number;
  siegeUnten: number;
  spiele: SpielRef[];
  sieger: number | null;
}

export interface AwardPreis {
  spielerId: number;
  teamId: number;
  /** Kurze Begründung, z. B. "28,1 Punkte, 7,2 Rebounds" */
  text: string;
}

export interface Awards {
  mvp: AwardPreis | null;
  verteidiger: AwardPreis | null;
  rookie: AwardPreis | null;
  sechsterMann: AwardPreis | null;
  /** null, solange es keine Vorjahreswerte gibt (erste Saison) */
  mostImproved: AwardPreis | null;
  finalsMvp: AwardPreis | null;
  trainer: { teamId: number; text: string } | null;
  /** Erstes, zweites und drittes All-League-Team (je 5 Spieler-IDs) */
  allLeague: [number[], number[], number[]];
}

export interface Postseason {
  phase: PostPhase;
  /** Setzliste nach der Hauptrunde je Conference (Team-IDs, Platz 1 bis 15) */
  tabelle: [number[], number[]];
  playin: PlayInSpiel[];
  /** Die acht Playoff-Teams je Conference nach Platz (-1 = noch offen) */
  seeds: [number[], number[]];
  serien: Serie[];
  /** Aktuelle Runde: 0 = Play-In, 1–4 = Playoffs */
  runde: number;
  /** Alle bisher angesetzten Tage; Tag n gehört zu Kalendertag spielplan.length + n */
  tage: PostSpiel[][];
  meister: number | null;
  awards: Awards;
}

// ---------- Coach-Karriere (ab Meilenstein 4b) ----------

/**
 * Ziel des Besitzers. `runde` = so weit sollen die Playoffs führen:
 * 0 = Play-In erreichen, 1 = Playoffs, 2 = zweite Runde, 3 = Conference Finals, 4 = Finals, 5 = Titel.
 */
export interface SaisonZiel {
  typ: 'siege' | 'runde';
  text: string;
  wert: number;
  /** null = noch offen */
  erfuellt: boolean | null;
}

export interface Karriere {
  /** Coach-Ruf 0–100 */
  ruf: number;
  /** Jobsicherheit 0–100 */
  jobsicherheit: number;
  /** Ziele der laufenden Saison */
  ziele: SaisonZiel[];
}

/** Abschluss einer Saison für die Liga-Historie. */
export interface SaisonRueckblick {
  saison: number;
  meisterId: number;
  /** Verlierer der Finals */
  finalGegnerId: number;
  userSiege: number;
  userNiederlagen: number;
  /** z. B. "Meister", "Conference Finals", "Playoffs verpasst" */
  userErgebnis: string;
  ziele: SaisonZiel[];
  jobsicherheit: number;
  ruf: number;
  awards: Awards;
}

// ---------- Coaching (ab Meilenstein 4) ----------

export type Tempo = 'langsam' | 'normal' | 'schnell';
export type Wurfauswahl = 'dreier' | 'ausgewogen' | 'zone';
export type OffensivFokus = 'star' | 'ballbewegung' | 'innen';
export type Verteidigung = 'mann' | 'zone' | 'pressing';
export type Intensitaet = 'niedrig' | 'normal' | 'hoch';

export interface Taktik {
  tempo: Tempo;
  wurf: Wurfauswahl;
  fokus: OffensivFokus;
  verteidigung: Verteidigung;
  intensitaet: Intensitaet;
}

/** Rotation des eigenen Teams. Bei `auto` entscheidet der Computer, sonst gelten Starter und Minuten. */
export interface Rotation {
  auto: boolean;
  /** Spieler-IDs der Starting Five (nur wenn nicht auto) */
  starter: number[];
  /** Ziel-Minuten pro Spieler-ID (Text), 0..40; nicht eingetragen = 0 */
  minuten: Record<string, number>;
}

export interface Coaching {
  taktik: Taktik;
  rotation: Rotation;
}

export type NachrichtTyp = 'verletzung' | 'rueckkehr' | 'moral' | 'info' | 'playoffs';

export interface Nachricht {
  id: number;
  saison: number;
  /** Kalendertag, an dem die Nachricht entstand */
  tag: number;
  typ: NachrichtTyp;
  text: string;
  spielerId?: number;
  /** Wichtige Nachrichten halten die Simulation an */
  wichtig: boolean;
  gelesen: boolean;
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
  einstellungen: Einstellungen;
  /** Rotation und Taktik des eigenen Teams (die KI-Teams nutzen Standard-Taktik und automatische Rotation) */
  coaching: Coaching;
  /** Meldungen, neueste zuletzt */
  posteingang: Nachricht[];
  /** Ruf, Jobsicherheit und Besitzer-Ziele (ab Meilenstein 4b) */
  karriere: Karriere;
  /** Abgeschlossene Saisons, älteste zuerst (ab Meilenstein 4b) */
  historie: SaisonRueckblick[];
}

export interface Einstellungen {
  /** Play-by-Play-Ticker für die eigenen Spiele speichern (kostet etwas Speicherplatz) */
  pbp: boolean;
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
    einstellungen: { pbp: true },
    coaching: standardCoaching(),
    posteingang: [],
    karriere: { ruf: 50, jobsicherheit: 60, ziele: [] },
    historie: [],
  };
}

export const STANDARD_TAKTIK: Taktik = {
  tempo: 'normal',
  wurf: 'ausgewogen',
  fokus: 'ballbewegung',
  verteidigung: 'mann',
  intensitaet: 'normal',
};

export function standardCoaching(): Coaching {
  return { taktik: { ...STANDARD_TAKTIK }, rotation: { auto: true, starter: [], minuten: {} } };
}
