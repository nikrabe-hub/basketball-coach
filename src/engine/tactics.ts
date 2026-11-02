import { CONFIG, type Effekt } from './config';
import type { Intensitaet, OffensivFokus, Taktik, Tempo, Verteidigung, Wurfauswahl } from './types';

/**
 * Taktik-Einstellungen: Auswahlmöglichkeiten mit Texten für die Oberfläche und die
 * Zusammenfassung mehrerer Einstellungen zu einer Wirkung für die Spielsimulation.
 * Alle Zahlen stehen in CONFIG.spiel.taktik.
 */

export interface Option<T extends string> {
  wert: T;
  label: string;
  /** Kurze Erklärung mit Vor- und Nachteil */
  hinweis: string;
}

export const TEMPO_OPTIONEN: Option<Tempo>[] = [
  { wert: 'langsam', label: 'Langsam', hinweis: 'Weniger Ballbesitze, weniger Fastbreaks und Ballverluste, Spieler ermüden langsamer. Hilft dem schwächeren Team.' },
  { wert: 'normal', label: 'Normal', hinweis: 'Ausgewogenes Tempo.' },
  { wert: 'schnell', label: 'Schnell', hinweis: 'Mehr Ballbesitze und Fastbreaks, aber mehr Ballverluste und müdere Spieler. Hilft dem besseren Team.' },
];

export const WURF_OPTIONEN: Option<Wurfauswahl>[] = [
  { wert: 'dreier', label: 'Mehr Dreier', hinweis: 'Mehr Würfe von draußen. Lohnt sich mit guten Dreierschützen, kostet Würfe am Ring und Offensiv-Rebounds.' },
  { wert: 'ausgewogen', label: 'Ausgewogen', hinweis: 'Jeder wirft, was er am besten kann.' },
  { wert: 'zone', label: 'Mehr Zone', hinweis: 'Mehr Würfe am Ring und im Post. Lohnt sich mit starken Innenspielern, weniger Dreier.' },
];

export const FOKUS_OPTIONEN: Option<OffensivFokus>[] = [
  { wert: 'star', label: 'Star-Spieler', hinweis: 'Die besten Scorer bekommen deutlich mehr Würfe, werden aber härter verteidigt.' },
  { wert: 'ballbewegung', label: 'Ballbewegung', hinweis: 'Ausgewogene Verteilung der Würfe (Normalfall).' },
  { wert: 'innen', label: 'Innen', hinweis: 'Die großen Spieler bekommen mehr Würfe und Post-Ups, weniger Dreier.' },
];

export const VERTEIDIGUNG_OPTIONEN: Option<Verteidigung>[] = [
  { wert: 'mann', label: 'Mann-Mann', hinweis: 'Jeder deckt seinen Gegenspieler (Normalfall).' },
  { wert: 'zone', label: 'Zone', hinweis: 'Schützt den Ring besser (mit starker Innenverteidigung), gibt aber mehr offene Dreier und kaum Ballgewinne. Weniger Fouls.' },
  { wert: 'pressing', label: 'Pressing', hinweis: 'Viele Ballgewinne (mit guten Ballräubern), aber mehr Fouls, müdere Spieler und leichtere Würfe nach Durchbrüchen.' },
];

export const INTENSITAET_OPTIONEN: Option<Intensitaet>[] = [
  { wert: 'niedrig', label: 'Niedrig', hinweis: 'Weniger Fouls und weniger Ermüdung, aber die Gegner treffen etwas besser.' },
  { wert: 'normal', label: 'Normal', hinweis: 'Normale Verteidigungsintensität.' },
  { wert: 'hoch', label: 'Hoch', hinweis: 'Mehr Ballgewinne und schwerere Würfe für den Gegner, aber mehr Fouls und mehr Ermüdung.' },
];

/** Zusammengefasste Wirkung der fünf Einstellungen (Angriff und Verteidigung zusammen). */
export type Kombi = Effekt;

const T = CONFIG.spiel.taktik;

function mal(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}
function plus(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Fasst mehrere Wirkungen zusammen: Faktoren werden multipliziert, Zuschläge addiert. */
export function kombiniere(effekte: readonly Effekt[]): Kombi {
  const k: Kombi = {
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
  for (const e of effekte) {
    k.dauer *= e.dauer;
    k.muedigkeit *= e.muedigkeit;
    k.fast *= e.fast;
    k.zonen = mal(k.zonen, e.zonen);
    k.zuege = {
      iso: k.zuege.iso * e.zuege.iso,
      pnr: k.zuege.pnr * e.zuege.pnr,
      post: k.zuege.post * e.zuege.post,
      spot: k.zuege.spot * e.zuege.spot,
      drive: k.zuege.drive * e.zuege.drive,
    };
    k.trefferEigen = plus(k.trefferEigen, e.trefferEigen);
    k.trefferGegner = plus(k.trefferGegner, e.trefferGegner);
    k.turnoverEigen += e.turnoverEigen;
    k.turnoverGegner += e.turnoverGegner;
    k.stealAnteil += e.stealAnteil;
    k.foulOhneWurf *= e.foulOhneWurf;
    k.foulBeimWurf *= e.foulBeimWurf;
    k.oreb *= e.oreb;
    k.assist *= e.assist;
    k.nutzungExtra += e.nutzungExtra;
    k.nutzungBigs *= e.nutzungBigs;
    k.trefferStar += e.trefferStar;
  }
  return k;
}

export function effekteVon(t: Taktik): Effekt[] {
  return [T.tempo[t.tempo], T.wurf[t.wurf], T.fokus[t.fokus], T.verteidigung[t.verteidigung], T.intensitaet[t.intensitaet]];
}

export function kombiVon(t: Taktik): Kombi {
  return kombiniere(effekteVon(t));
}

/** Eignung der Verteidiger (Faktor um 1) aus einem Attributmittel. */
export function eignungsFaktor(mittel: number): number {
  const e = T.eignung;
  return Math.max(e.min, Math.min(e.max, 1 + (mittel - e.referenz) / e.spanne));
}
