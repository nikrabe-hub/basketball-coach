/**
 * Zentrale Konfiguration aller Balancing-Zahlen.
 * Hier (und nur hier) stehen Werte wie Gehaltsobergrenze, Entwicklungskurven,
 * Verletzungsrate und die Zielwerte der Liga-Durchschnitte.
 * Meilenstein 1: nur ein Grundgerüst, die Werte werden in den
 * folgenden Meilensteinen verwendet und feinjustiert.
 */
export const CONFIG = {
  /** Version des Spielstand-Formats. Bei jeder Änderung erhöhen + Migration schreiben. */
  saveVersion: 3,

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

  /** Spielsimulation (Meilenstein 3). Alle Zahlen sind Startwerte und werden mit dem Balancing-Skript abgestimmt. */
  spiel: {
    viertelSekunden: 720,
    otSekunden: 300,
    /**
     * Wie stark Attribut-Unterschiede im Spiel wirken (1 = voll, kleiner = Spieler rücken näher
     * zusammen). Der wichtigste Regler für den Abstand zwischen starken und schwachen Teams.
     */
    attributWirkung: 0.35,
    /** Skaliert alle Ballbesitz-Dauern (größer = langsamer = weniger Ballbesitze) */
    tempoFaktor: 1.08,
    /** Dauer eines Ballbesitzes je Spielzug: [Mittel, Streuung] in Sekunden */
    dauer: {
      iso: [16.5, 4],
      pnr: [15, 4],
      post: [15.5, 4],
      spot: [11, 4],
      drive: [12.5, 4],
      fast: [6.5, 2],
      putback: [4.5, 1.5],
    } as const,
    /** Grundhäufigkeit der Spielzüge */
    zugGewichte: { iso: 0.12, pnr: 0.28, post: 0.08, spot: 0.22, drive: 0.2 } as const,
    /** Wer wirft? Gewicht = (Offensivwert / 60) ^ Exponent */
    nutzungExponent: 0.45,
    /** Wurfzonen [Ring, Mitteldistanz, Dreier]: Grundanteile und wie stark Attribute sie verschieben */
    zonenBasis: [0.32, 0.18, 0.5] as const,
    zonenSkala: 22,
    /** Trefferwahrscheinlichkeit je Zone [Ring, Mitteldistanz, Dreier] bei Attribut 60 gegen Verteidiger 55 */
    treffer: {
      basis: [0.61, 0.415, 0.36] as const,
      angriffProPunkt: [0.0035, 0.003, 0.0035] as const,
      abwehrProPunkt: [0.0028, 0.0022, 0.0025] as const,
      /** Hilfe-Verteidigung am Ring: Wirkung pro Punkt Innen-Defense der übrigen Verteidiger */
      hilfeProPunkt: 0.0012,
      /** Bonus für freie Würfe (Spot-Up, Kick-out) */
      frei: 0.02,
      /** Bonus pro Punkt Spiel-IQ über 60 */
      iqProPunkt: 0.0008,
      min: 0.15,
      max: 0.85,
    },
    heimvorteil: 0.02,
    /** Trefferchance sinkt pro Punkt eigenen Vorsprungs um diesen Wert (Rückstand: steigt) */
    ausgleich: 0.0027,
    ausgleichMaxAbstand: 30,
    turnover: { basis: 0.14, proPunkt: 0.0015, min: 0.07, max: 0.2, stealAnteil: 0.58, offensivfoulAnteil: 0.1, fastbreak: 0.07 },
    /** Foul des Verteidigers vor dem Wurf (ohne Freiwürfe, außer im Bonus) */
    foulOhneWurf: 0.1,
    /** Foul beim Wurf je Zone [Ring, Mitteldistanz, Dreier] */
    foulBeimWurf: [0.14, 0.06, 0.025] as const,
    /** Teamfouls pro Viertel ab denen jedes Foul zwei Freiwürfe bringt */
    bonusAb: 5,
    ausgefoult: 6,
    blockBasis: [0.11, 0.05, 0.012] as const,
    freiwurf: { basis: 0.62, proPunkt: 0.0058 },
    /** Wahrscheinlichkeit eines Assists nach getroffenem Wurf je Spielzug */
    assistFaktor: 1.12,
    assist: { iso: 0.18, pnrHandler: 0.55, pnrRoller: 0.92, post: 0.45, spot: 0.97, driveRim: 0.55, driveKick: 0.97, fast: 0.8 } as const,
    rebound: { offensivBasis: 0.27, freiwurfFaktor: 0.55, blockFaktor: 0.8, min: 0.1, max: 0.45, teamAnteil: 0.1 },
    fastbreak: { nachSteal: 0.45, nachRebound: 0.1 },
    /** Müdigkeit: Energie 0..100 */
    muedigkeit: {
      verbrauchProSek: 0.065,
      ausdauerReferenz: 75,
      erholungProSek: 0.03,
      erholungViertel: 6,
      erholungHalbzeit: 18,
      /** So viele Attributpunkte kostet jeder fehlende Energiepunkt */
      attributProPunkt: 0.25,
      /** So viele Rotations-Wertungspunkte kostet jeder fehlende Energiepunkt */
      wertungProPunkt: 0.5,
    },
    rotation: {
      /** Rotationswert = 100 minus Rang im Kader mal diesen Wert, minus Müdigkeit */
      rangSchritt: 3.2,
      /** Mindestzeit auf dem Feld, bevor ein Wechsel erlaubt ist (Sekunden) */
      minEinsatz: 120,
      /** Wer schon auf dem Feld steht, bekommt diesen Bonus (verhindert Hin und Her) */
      traegheit: 2.5,
      /** Abzug für die Rangplätze 9–10 und ab 11 im Kader (nach OVR) */
      abzugRang9: 3,
      abzugRang11: 10,
      foulProblem5: 6,
      /** Garbage Time: Abstand und Restzeit im letzten Viertel, Abzug für die Starter */
      garbageAbstand: 22,
      garbageSekunden: 420,
      garbageStarterAbzug: 25,
    },
  },

  /** Zielwerte für das Balancing-Skript (ungefähr modernes NBA-Niveau) */
  ziele: {
    ballbesitzeProTeamUndSpiel: { min: 96, max: 104 },
    punkteProTeamUndSpiel: { min: 108, max: 116 },
    fgQuote: { min: 0.44, max: 0.49 },
    dreierQuote: { min: 0.34, max: 0.38 },
    dreierAnteilAnWuerfen: { min: 0.34, max: 0.42 },
    freiwurfQuote: { min: 0.74, max: 0.8 },
    freiwurfVersucheProTeam: { min: 18, max: 25 },
    reboundsProTeam: { min: 41, max: 47 },
    assistsProTeam: { min: 23, max: 28 },
    turnoversProTeam: { min: 12, max: 15 },
    foulsProTeam: { min: 18, max: 22 },
    heimsiegQuote: { min: 0.55, max: 0.62 },
    /** Siege des besten und schlechtesten Teams, hochgerechnet auf 82 Spiele */
    besteBilanz: { min: 58, max: 70 },
    schlechtesteBilanz: { min: 13, max: 26 },
    /** Beste Punkteschnitte pro Spiel */
    topScorer: { min: 24, max: 35 },
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
