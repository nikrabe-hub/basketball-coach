/**
 * Zentrale Konfiguration aller Balancing-Zahlen.
 * Hier (und nur hier) stehen Werte wie Gehaltsobergrenze, Entwicklungskurven,
 * Verletzungsrate und die Zielwerte der Liga-Durchschnitte.
 * Meilenstein 1: nur ein Grundgerüst, die Werte werden in den
 * folgenden Meilensteinen verwendet und feinjustiert.
 */
/**
 * Wirkung einer Taktik-Einstellung. Alle Felder sind Anpassungen gegenüber dem Normalfall
 * (Faktoren: 1 = keine Änderung, Zuschläge: 0 = keine Änderung). "Eigene" Werte gelten, wenn
 * das Team angreift bzw. selbst betroffen ist; "Gegner" gelten für den angreifenden Gegner.
 */
export interface Effekt {
  /** Faktor auf die Dauer der eigenen Ballbesitze */
  dauer: number;
  /** Faktor auf den Energieverbrauch der eigenen Spieler */
  muedigkeit: number;
  /** Faktor auf die Chance auf Fastbreaks des eigenen Teams */
  fast: number;
  /** Faktoren auf die Wurfzonen [Ring, Mitteldistanz, Dreier] der eigenen Angriffe */
  zonen: readonly [number, number, number];
  /** Faktoren auf die Häufigkeit der Spielzüge der eigenen Angriffe */
  zuege: { iso: number; pnr: number; post: number; spot: number; drive: number };
  /** Zuschlag auf die eigene Trefferchance je Zone [Ring, Mitte, Dreier] */
  trefferEigen: readonly [number, number, number];
  /** Zuschlag auf die Trefferchance des angreifenden Gegners je Zone (Wirkung der Verteidigung) */
  trefferGegner: readonly [number, number, number];
  /** Zuschlag auf die eigene Turnover-Wahrscheinlichkeit */
  turnoverEigen: number;
  /** Zuschlag auf die Turnover-Wahrscheinlichkeit des Gegners (wird mit der Eignung der Verteidiger skaliert) */
  turnoverGegner: number;
  /** Zuschlag auf den Anteil der Ballverluste, die als Steal gewertet werden (eigene Verteidigung) */
  stealAnteil: number;
  /** Faktor auf Fouls der eigenen Verteidigung (ohne Wurf bzw. beim Wurf) */
  foulOhneWurf: number;
  foulBeimWurf: number;
  /** Faktor auf die Offensiv-Rebound-Chance des eigenen Teams */
  oreb: number;
  /** Faktor auf die Assist-Wahrscheinlichkeit des eigenen Teams */
  assist: number;
  /** Zusätzlicher Exponent auf die Wurf-Häufigkeit nach Offensivstärke (positiv: Stars werfen mehr) */
  nutzungExtra: number;
  /** Faktor auf die Wurf-Häufigkeit großer Spieler (PF/C) */
  nutzungBigs: number;
  /** Zuschlag auf die Trefferchance des besten Offensivspielers auf dem Feld (Gegner doppelt ihn) */
  trefferStar: number;
}

const NEUTRAL: Effekt = {
  dauer: 1,
  muedigkeit: 1,
  fast: 1,
  zonen: [1, 1, 1],
  zuege: { iso: 1, pnr: 1, post: 1, spot: 1, drive: 1 },
  trefferEigen: [0, 0, 0],
  trefferGegner: [0, 0, 0],
  turnoverEigen: 0,
  turnoverGegner: 0,
  stealAnteil: 0,
  foulOhneWurf: 1,
  foulBeimWurf: 1,
  oreb: 1,
  assist: 1,
  nutzungExtra: 0,
  nutzungBigs: 1,
  trefferStar: 0,
};
const E = (teil: Partial<Effekt>): Effekt => ({ ...NEUTRAL, ...teil });

export const CONFIG = {
  /** Version des Spielstand-Formats. Bei jeder Änderung erhöhen + Migration schreiben. */
  saveVersion: 6,

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
      attributProPunkt: 0.13,
      /** So viele Rotations-Wertungspunkte kostet jeder fehlende Energiepunkt */
      wertungProPunkt: 0.65,
    },
    rotation: {
      /** Mindestzeit auf dem Feld, bevor ein Wechsel erlaubt ist (Sekunden) */
      minEinsatz: 120,
      /** Wer schon auf dem Feld steht, bekommt diesen Bonus (verhindert Hin und Her) */
      traegheit: 2.5,
      foulProblem5: 6,
      /** Garbage Time: Abstand und Restzeit im letzten Viertel, Abzug für die Starter */
      garbageAbstand: 22,
      garbageSekunden: 420,
      garbageStarterAbzug: 25,
      /** Wertung pro Minute, die ein Spieler hinter seiner Ziel-Spielzeit liegt */
      defizitProMinute: 6,
      /** Standard-Minuten (automatische Rotation) nach Rang der einsatzbereiten Spieler; wird auf 240 normiert */
      /** In den Playoffs spielen die Stars mehr (Summe wird auf 240 umgerechnet) */
    standardMinutenPlayoffs: [41, 38, 35, 31, 27, 21, 15, 10, 6, 2, 0],
    standardMinuten: [39, 36, 33, 30, 28, 23, 18, 13, 9, 6, 3] as readonly number[],
      /** Beim Start der zweiten Halbzeit bevorzugte Starter (Bonus auf die Wertung) */
      starterNachHalbzeit: 40,
      /** Spieler ohne Ziel-Minuten, die nur im Notfall spielen (zu wenige Spieler mit Minuten) */
      notfallMinuten: 8,
      /** So viele Spieler bekommen mindestens Minuten, sonst werden Spieler nach OVR ergänzt */
      mindestRotation: 8,
    },
    /** Schlussminute: Foulen des zurückliegenden Teams, Zeit von der Uhr nehmen, schnelle Würfe */
    endspiel: {
      /** Ab dieser Restzeit (Sekunden) im letzten Viertel/Overtime greifen die Regeln */
      foulenAb: 40,
      /** Rückstand, bis zu dem absichtlich gefoult wird: Grundwert plus Restsekunden / Teiler */
      foulenRueckstand: 2,
      foulenTeiler: 12,
      /** Dauer eines Ballbesitzes beim Foulen (Sekunden) */
      foulDauer: [2, 4] as const,
      /** Das führende Team lässt die Uhr herunterlaufen, wenn weniger als so viele Sekunden bleiben */
      haltenAb: 100,
      haltenVorsprungMax: 12,
      haltenDauer: [19, 3] as const,
      /** Das zurückliegende Team wirft schneller: Dauerfaktor und Dreier-Anteil, wenn es mit mindestens 3 zurückliegt */
      eilenAb: 70,
      eilenDauer: 0.62,
      eilenDreier: 1.7,
      /** Bei genau 3 Punkten Rückstand wirft das Team in den letzten Sekunden einen Dreier zum Ausgleich */
      ausgleichswurfSekunden: 14,
      /** Enge Schlussphase: Restzeit, maximaler Abstand und Faktor auf den Ausgleichs-Effekt */
      clutch: { sekunden: 300, abstand: 10, faktor: 3 },
    },
    /** Wirkung der Taktik-Einstellungen. Die mittlere Option jeder Gruppe ist der neutrale Normalfall. */
    taktik: {
      tempo: {
        langsam: E({ dauer: 1.12, muedigkeit: 0.97, fast: 0.55, turnoverEigen: -0.003 }),
        normal: E({}),
        schnell: E({ dauer: 0.9, muedigkeit: 1.04, fast: 1.5, turnoverEigen: 0.005 }),
      },
      wurf: {
        dreier: E({
          zonen: [0.94, 0.78, 1.3],
          zuege: { iso: 1, pnr: 1, post: 0.8, spot: 1.25, drive: 0.95 },
          trefferEigen: [-0.006, 0, 0.004],
          oreb: 0.95,
        }),
        ausgewogen: E({}),
        zone: E({
          zonen: [1.25, 1.05, 0.72],
          zuege: { iso: 1, pnr: 1, post: 1.4, spot: 0.8, drive: 1.15 },
          trefferEigen: [0.002, 0, -0.004],
          oreb: 1.03,
        }),
      },
      fokus: {
        star: E({ nutzungExtra: 1.6, trefferStar: -0.012, assist: 0.95 }),
        ballbewegung: E({}),
        innen: E({
          nutzungBigs: 1.5,
          zonen: [1.12, 1, 0.88],
          zuege: { iso: 0.9, pnr: 1, post: 1.5, spot: 0.9, drive: 1 },
          trefferEigen: [0.002, 0, -0.003],
          assist: 0.97,
        }),
      },
      verteidigung: {
        mann: E({}),
        zone: E({
          trefferGegner: [-0.016, 0, 0.012],
          turnoverGegner: -0.01,
          foulOhneWurf: 0.85,
          foulBeimWurf: 0.85,
          muedigkeit: 0.96,
        }),
        pressing: E({
          turnoverGegner: 0.026,
          stealAnteil: 0.08,
          trefferGegner: [0.014, 0, 0.008],
          foulOhneWurf: 1.2,
          muedigkeit: 1.12,
        }),
      },
      intensitaet: {
        niedrig: E({ trefferGegner: [0.006, 0.006, 0.006], turnoverGegner: -0.01, foulOhneWurf: 0.85, foulBeimWurf: 0.88, muedigkeit: 0.94 }),
        normal: E({}),
        hoch: E({ trefferGegner: [-0.004, -0.004, -0.004], turnoverGegner: 0.012, foulOhneWurf: 1.18, foulBeimWurf: 1.12, muedigkeit: 1.07 }),
      },
      /** Eignung: Wirkung von Zone/Pressing hängt von den Verteidigern ab (Attributmittel -> Faktor) */
      eignung: { referenz: 55, spanne: 15, min: 0.3, max: 1.8 },
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
    /** Anteil der Spiele mit Verlängerung (NBA ca. 6 %; hier etwas weniger, siehe NOTIZEN.md) */
    verlaengerungsQuote: { min: 0.04, max: 0.075 },
    /** Verletzungen je Team und Saison (alle / nur schwere ab 10 Spielen Ausfall) */
    verletzungenProTeamUndSaison: { min: 3, max: 8 },
    schwereVerletzungenProTeamUndSaison: { min: 0.4, max: 1.6 },
  },

  /** Offseason (Meilenstein 5a): Karriereende, Entwicklung, Draft, Scouting. Startwerte, werden mit dem 20-Saisons-Skript abgestimmt. */
  offseason: {
    kader: { min: 13, max: 15 },
    karriereende: {
      /** Ab diesem Alter (am Saisonende) kann ein Spieler aufhören */
      abAlter: 33,
      /** Chance mit 33, plus `proJahr` für jedes weitere Jahr */
      grundChance: 0.1,
      proJahr: 0.1,
      /** Pro OVR-Punkt unter 60 steigt die Chance, pro Punkt über 75 sinkt sie */
      ovrFaktor: 0.01,
      starBonus: 0.15,
      /** Mit diesem Alter hören alle auf */
      pflichtAlter: 41,
      /** Spieler ohne Team: ab diesem Alter und unter dieser OVR hören sie meist auf */
      freeAgentAlter: 31,
      freeAgentOvr: 50,
      freeAgentChance: 0.6,
      /** Mehr als so viele Spieler ohne Team bleiben nicht im Pool (die Schwächsten hören auf) */
      poolMax: 60,
    },
    entwicklung: {
      /** Junge Spieler (Alter -> Anteil der Lücke zum Potenzial, den sie in einem Jahr schließen) */
      lueckeAnteil: { 19: 0.3, 20: 0.3, 21: 0.28, 22: 0.24, 23: 0.18, 24: 0.12, 25: 0.07, 26: 0.04 } as Record<number, number>,
      /** Ab 27: erwartete OVR-Änderung pro Jahr (ab 36 gilt der letzte Wert) */
      abbau: [-0.1, -0.4, -0.8, -1.3, -1.9, -2.5, -3.1, -3.7, -4.3, -4.8] as readonly number[],
      abbauStartAlter: 27,
      /** Zufall pro Jahr (Standardabweichung in OVR-Punkten) */
      rauschen: 1.6,
      ueberraschungChance: 0.06,
      ueberraschungMittel: 4,
      /** Arbeitsethik 99 / 20 verändert das Wachstum um bis zu +/- diesen Anteil */
      arbeitsethikEinfluss: 0.25,
      /** Spielzeit (Minuten pro Spiel): wer viel spielt, wächst schneller, wer kaum spielt, langsamer */
      spielzeitViel: 24,
      spielzeitWenig: 8,
      spielzeitBonus: 0.12,
      spielzeitMalus: 0.18,
      /** Einzelne Attribute streuen um die Gesamtänderung */
      attributRauschen: 1.3,
      /** Wie stark ein Attribut beim Abbau mitgeht (1 = wie die Gesamtwertung) */
      abbauAttribut: {
        speed: 1.7, sprungkraft: 1.7, ausdauer: 1.3, kraft: 0.9, ballhandling: 0.9, dunk: 1.2,
        dreier: 0.6, mitteldistanz: 0.6, freiwurf: 0.4, spielIq: 0.3, passen: 0.5,
        postMoves: 0.8, reboundOff: 1.0, reboundDef: 0.9, block: 1.1,
        perimeterDef: 1.2, innenDef: 0.9, steal: 1.2,
      } as Record<string, number>,
      /** Ab diesem Alter wachsen Athletik-Attribute kaum noch */
      athletikWachstumBis: 24,
      /** Potenzial schwankt bis zu diesem Alter noch um +/- (Standardabweichung) */
      potSchwankungBis: 25,
      potSchwankung: 1.5,
    },
    draft: {
      kandidaten: 100,
      runden: 2,
      picksProRunde: 30,
      lotterieTeams: 14,
      /** Chance auf Pick 1 in Prozent, schlechtestes Team zuerst (wie NBA seit 2019) */
      lotterieChancen: [14, 14, 14, 12.5, 10.5, 9, 7.5, 6, 4.5, 3, 2, 1.5, 1, 0.5] as readonly number[],
      /** So viele Picks werden gelost, der Rest folgt nach Bilanz */
      lotterieZiehungen: 4,
      kandidat: {
        /** Potenzial nach Rang r (0 = bester): potBasis + potSpanne * exp(-r / potTau), plus Zufall */
        potBasis: 48,
        potSpanne: 36,
        potTau: 20,
        potStreuung: 3.5,
        /** Obergrenze für die OVR eines Kandidaten (auch die Besten sind noch keine Stars) */
        ovrMax: 64,
        /** Alter der Kandidaten (19–23): Gewichte für die besten 10 und für alle anderen */
        alterGewichteTop: [45, 35, 15, 5, 0] as readonly number[],
        alterGewichte: [30, 28, 22, 14, 6] as readonly number[],
        /** Lücke OVR -> POT je Alter 19–23: [Mittel, Streuung] */
        luecke: [[17, 5], [13, 4.5], [9, 4], [6, 3.5], [3.5, 2.5]] as readonly (readonly [number, number])[],
        potMax: 92,
      },
      /** KI: Streuung der Bewertung und Bonus für eine dünn besetzte Position */
      ki: { rauschen: 3, bedarfBonus: 2 },
      /** Rookie-Gehälter nach Pick (Runde 1: geometrisch von Pick 1 zu Pick 30) und Laufzeit */
      rookie: { pick1: 10_500_000, pick30: 2_300_000, jahreRunde1: 3, jahreRunde2: 2 },
    },
    scouting: {
      punkteProSaison: 100,
      /** Gesamtkosten für Stufe 0–3 */
      kosten: [0, 15, 30, 50] as readonly number[],
      /** Wie breit die Spanne bei Stufe 0–3 im Vergleich zum Start ist */
      breite: [1, 0.6, 0.3, 0.1] as readonly number[],
      /** Halbe Breite der Spanne bei Stufe 0 */
      startBreite: { ovr: 8, pot: 12, attribut: 10 },
    },
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
    /** Wahrscheinlichkeit pro Sekunde Spielzeit und Spieler auf dem Feld (bei Verletzungsanfälligkeit 60) */
    rateProSekunde: 0.0000059,
    /** Anfälligkeit 60 = Faktor 1, linear skaliert (Mindestfaktor) */
    anfaelligkeitReferenz: 60,
    anfaelligkeitMin: 0.4,
    /** Ausfalldauer in Spielen (bei 82 Spielen): Anteil an allen Verletzungen und Bereich je Stufe */
    stufen: [
      { anteil: 0.58, von: 1, bis: 3 },
      { anteil: 0.27, von: 4, bis: 10 },
      { anteil: 0.11, von: 11, bis: 30 },
      { anteil: 0.04, von: 31, bis: 110 },
    ] as const,
    /** Ab so vielen Spielen Ausfall (hochgerechnet auf 82 Spiele) hält die Simulation an */
    schwerAb: 10,
  },

  moral: {
    /** Startwert aller Spieler */
    start: 70,
    /** Alle Spiele zieht die Moral um diesen Anteil der Abweichung zur Mitte zurück */
    zumMittelwert: 0.015,
    mitte: 70,
    sieg: 0.6,
    niederlage: -0.6,
    /** Rolle: Abweichung der Spielzeit von der erwarteten (in Minuten / 10), begrenzt, mal dieser Wert */
    rollenSchritt: 0.9,
    rollenGrenze: { min: -1.2, max: 0.8 },
    /** Erwartete Spielzeit (Minuten) nach Rang im Kader (nach OVR) */
    erwarteteMinuten: [33, 30, 28, 26, 24, 23, 21, 19, 15, 12] as readonly number[],
    /** Unter diesem Wert gilt ein Spieler als unzufrieden (Meldung, hält die Simulation an) */
    unzufriedenUnter: 35,
    /** Wirkung auf die Leistung: Abzug pro Punkt unter 50, Bonus pro Punkt über 80 (in Attributpunkten) */
    malusProPunkt: 0.08,
    bonusProPunkt: 0.04,
    bonusAb: 80,
    malusUnter: 50,
  },

  /** Wahl der Auszeichnungen (Meilenstein 4b) */
  awards: {
    /** Mindestanteil der Hauptrundenspiele, den ein Spieler absolviert haben muss */
    mindestSpieleAnteil: 0.6,
    /** MVP: Bonus (in Punkten pro Spiel) für Teams über .500, pro 100 % Siegquote-Abstand zu 50 % */
    mvpTeamErfolg: 16,
    /** Bester Verteidiger: Gewichte (Steals, Blocks, def. Rebounds) und Teamabwehr pro Punkt unter dem Ligaschnitt */
    dpoy: { steal: 2.4, block: 2.2, reboundDef: 0.5, teamAbwehr: 0.5, attribut: 0.18 },
    /** Sechster Mann: höchstens so viel Anteil an Einsätzen als Starter */
    sechsterMannMaxStartAnteil: 0.2,
    sechsterMannMinMinuten: 14,
    /** Rookie: Mindestanteil der Spiele (niedriger, da Rookies später ins Team kommen) */
    rookieMindestSpieleAnteil: 0.4,
  },

  /** Besitzer-Ziele, Jobsicherheit und Coach-Ruf (Meilenstein 4b; Entlassung folgt in Meilenstein 6) */
  karriere: {
    /** Erwartete Siegquote nach Stärke-Rang: 0,5 + (15,5 - Rang) * dieser Wert */
    erwartungProRang: 0.0165,
    /** Besitzer-Typ verschiebt die Erwartung (Siegquote) */
    erwartungNachBesitzer: { geduldig: -0.03, ungeduldig: 0.02, sparsam: -0.01, siegen: 0.03 } as const,
    /** Jobsicherheit: Änderung pro erfülltem / verfehltem Ziel (je nach Besitzer) */
    zielErfuellt: { geduldig: 6, ungeduldig: 9, sparsam: 7, siegen: 9 } as const,
    zielVerfehlt: { geduldig: -7, ungeduldig: -16, sparsam: -12, siegen: -14 } as const,
    /** Jobsicherheit: Bonus pro gewonnener Playoff-Runde, für den Titel und pro 100 % Siegquote über 50 % */
    rundeBonus: 2,
    titelBonus: 8,
    siegquoteFaktor: 20,
    /** Ruf: pro gewonnener Playoff-Runde, Titel, Trainerpreis und pro 100 % Siegquote über 50 % */
    rufRunde: 1.5,
    rufTitel: 6,
    rufTrainer: 4,
    rufSiegquote: 24,
  },
} as const;

export type Config = typeof CONFIG;
