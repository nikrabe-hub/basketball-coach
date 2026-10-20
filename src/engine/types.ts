/**
 * Daten-Modelle des Spiels. In Meilenstein 1 nur das Nötigste;
 * Liga, Teams und Spieler kommen in Meilenstein 2 dazu.
 */

export interface Coach {
  name: string;
  alter: number;
}

/** Der komplette Spielstand eines Speicherplatzes (ohne Verwaltungsdaten). */
export interface SpielDaten {
  coach: Coach;
  /** Seed, aus dem die Liga erzeugt wird (reproduzierbar) */
  seed: number;
  /** Wie viele Saisons wurden bereits gespielt (Platzhalter für später) */
  saison: number;
}

export function neuesSpiel(coachName: string, coachAlter: number, seed: number): SpielDaten {
  return {
    coach: { name: coachName.trim(), alter: coachAlter },
    seed,
    saison: 1,
  };
}
