/**
 * Zentrale Konfiguration aller Balancing-Zahlen.
 * Hier (und nur hier) stehen Werte wie Gehaltsobergrenze, Entwicklungskurven,
 * Verletzungsrate und die Zielwerte der Liga-Durchschnitte.
 * Meilenstein 1: nur ein Grundgerüst, die Werte werden in den
 * folgenden Meilensteinen verwendet und feinjustiert.
 */
export const CONFIG = {
  /** Version des Spielstand-Formats. Bei jeder Änderung erhöhen + Migration schreiben. */
  saveVersion: 1,

  /** Anzahl Speicherplätze */
  saveSlots: 3,

  liga: {
    teams: 30,
    conferences: 2,
    divisionsProConference: 3,
    kaderMin: 13,
    kaderMax: 15,
  },

  saison: {
    /** Erlaubte Saisonlängen (Spiele pro Team). Standard = erster Eintrag. */
    spieleOptionen: [82, 58, 29] as const,
    tradeDeadlineAnteil: 0.6,
    playInPlaetze: [7, 8, 9, 10] as const,
    playoffTeams: 16,
    playoffSerieBestOf: 7,
  },

  /** Zielwerte für das Balancing-Skript (ungefähr modernes NBA-Niveau) */
  ziele: {
    ballbesitzeProTeamUndSpiel: 100,
    punkteProTeamUndSpiel: { min: 110, max: 115 },
    dreierAnteilAnWuerfen: { min: 0.34, max: 0.42 },
  },

  finanzen: {
    /** in Dollar; weiche Obergrenze, jährlich leicht steigend */
    salaryCap: 140_000_000,
    luxussteuerGrenze: 170_000_000,
    mindestGehalt: 1_100_000,
    maximalGehalt: 45_000_000,
    jaehrlicherAnstieg: 0.04,
  },

  spieler: {
    attributMin: 25,
    attributMax: 99,
    alterJung: { von: 19, bis: 24 },
    alterHoehepunkt: { von: 25, bis: 30 },
    alterAbbauAb: 31,
  },

  verletzungen: {
    /** Wahrscheinlichkeit pro Ballbesitz und Spieler auf dem Feld (grobe Startgröße) */
    rateProBallbesitz: 0.00012,
  },
} as const;

export type Config = typeof CONFIG;
