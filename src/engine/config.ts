/**
 * Zentrale Konfiguration aller Balancing-Zahlen.
 * Hier (und nur hier) stehen Werte wie Gehaltsobergrenze, Entwicklungskurven,
 * Verletzungsrate und die Zielwerte der Liga-Durchschnitte.
 * Meilenstein 1: nur ein Grundgerüst, die Werte werden in den
 * folgenden Meilensteinen verwendet und feinjustiert.
 */
export const CONFIG = {
  /** Version des Spielstand-Formats. Bei jeder Änderung erhöhen + Migration schreiben. */
  saveVersion: 2,

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
    /** Kalendertage pro Spiel eines Teams (82 Spiele => ca. 164 Tage Saison) */
    tageProSpiel: 2,
    /** Saisonstart im Kalender (Monat 1-12, Tag) und Startjahr der ersten Saison */
    startMonat: 10,
    startTag: 22,
    startJahr: 2026,
  },

  /** Erzeugung der Liga beim Spielstart */
  generator: {
    /** Kadergröße je Team, wird zufällig daraus gezogen (13–15) */
    spielerProTeam: [13, 14, 14, 14, 15] as readonly number[],
    /** Zielwerte (OVR) der Spieler eines Teams, nach Rang im Kader sortiert */
    talentKurve: [76, 70, 65, 62, 59, 56, 54, 52, 50, 49, 48, 47, 46, 45, 44] as readonly number[],
    /** Streuung der Teamstärke (Verschiebung der ganzen Kurve) und Obergrenze */
    teamStaerkeAbweichung: 4,
    teamStaerkeMax: 8,
    /** Streuung je Spieler um den Kurvenwert */
    spielerAbweichung: 3.5,
    /** Chance, dass der beste Spieler eines Teams ein Superstar ist, und dessen Bonus */
    superstarChance: 0.2,
    superstarBonus: 7,
    /** Alter: Normalverteilung, begrenzt */
    alterMittel: 26.5,
    alterAbweichung: 4,
    alterMin: 19,
    alterMax: 38,
    /** Junge Spieler (bis 24) sind pro fehlendem Jahr um diesen OVR-Wert schwächer */
    jugendAbzugProJahr: 1.5,
    /** Einzelne Attribute streuen um den Positionswert */
    attributAbweichung: 6,
    /** Wie stark die Position die Attribute formt (je größer, desto spezialisierter) */
    positionsBonus: 14,
    /** Persönlichkeitswerte (Mittel, Streuung) */
    persoenlichkeitMittel: 60,
    persoenlichkeitAbweichung: 18,
    /** Gehaltskurve: Gehalt wächst mit OVR^exponent zwischen OVR-Min und OVR-Max */
    gehaltExponent: 1.7,
    gehaltOvrMin: 45,
    gehaltOvrMax: 85,
    gehaltStreuung: 0.15,
    /** Teamgehälter liegen zufällig in diesem Bereich der Gehaltsobergrenze */
    payrollAnteilCap: { min: 0.88, max: 1.12 },
    /** Spieler bis zu diesem Alter bekommen Rookie-Verträge (2–3 Jahre) */
    rookieAlterBis: 21,
    /** Gewichte für die Herkunftsregion der Namen (relativ) */
    regionGewichte: {
      usa: 55,
      europa: 20,
      afrika: 8,
      lateinamerika: 8,
      ozeanien: 4,
      asien: 5,
    },
    /** Markt der Teams (relative Gewichte) und Budget in Dollar je Markt */
    marktGewichte: { klein: 35, mittel: 40, gross: 25 },
    budget: {
      klein: { min: 90_000_000, max: 120_000_000 },
      mittel: { min: 120_000_000, max: 160_000_000 },
      gross: { min: 160_000_000, max: 220_000_000 },
    },
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
