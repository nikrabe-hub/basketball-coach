import { CONFIG } from './config';
import type { Rng } from './rng';
import type { Spieler } from './types';

/**
 * Verletzungen: Typ und Dauer werden gewürfelt, sobald im Spiel ein Spieler verletzt wird
 * (siehe game.ts). Die Dauer zählt in Spielen des eigenen Teams.
 */

const TYPEN = [
  // Stufe 0: 1–3 Spiele
  ['Verstauchter Knöchel', 'Prellung am Oberschenkel', 'Leichte Zerrung in der Leiste', 'Leichte Knieprellung', 'Fingerverstauchung', 'Rückenverspannung'],
  // Stufe 1: 4–10 Spiele
  ['Wadenzerrung', 'Handgelenksverstauchung', 'Reizung der Patellasehne', 'Kapselreizung im Knie', 'Oberschenkelzerrung', 'Schulterprellung'],
  // Stufe 2: 11–30 Spiele
  ['Muskelfaserriss', 'Bänderverletzung im Knöchel', 'Stressreaktion im Fuß', 'Fingerbruch', 'Innenbandzerrung im Knie'],
  // Stufe 3: 31+ Spiele
  ['Meniskusriss', 'Bruch im Mittelfuß', 'Schulter-Operation', 'Schienbeinbruch', 'Kreuzbandriss'],
] as const;

export interface GewuerfelteVerletzung {
  typ: string;
  spiele: number;
}

/** Skaliert eine Ausfalldauer auf die Länge der Saison (bei kürzeren Saisons fallen Spieler weniger Spiele aus). */
export function skaliereDauer(spiele: number, saisonLaenge: number): number {
  return Math.max(1, Math.round((spiele * saisonLaenge) / 82));
}

export function wuerfleVerletzung(rng: Rng, saisonLaenge: number): GewuerfelteVerletzung {
  const stufen = CONFIG.verletzungen.stufen;
  const stufe = rng.gewichtet(stufen.map((s) => s.anteil));
  const st = stufen[stufe] ?? stufen[0];
  const typen = TYPEN[stufe] ?? TYPEN[0];
  const typ = rng.pick(typen);
  // Kreuzbandriss dauert fast die ganze Saison
  const spiele = typ === 'Kreuzbandriss' ? rng.int(80, 110) : rng.int(st.von, st.bis);
  return { typ, spiele: skaliereDauer(spiele, saisonLaenge) };
}

/** Verletzungsanfälligkeit des Spielers als Faktor (1 = durchschnittlich). */
export function anfaelligkeit(s: Spieler): number {
  const v = CONFIG.verletzungen;
  return Math.max(v.anfaelligkeitMin, s.persoenlichkeit.verletzungsanfaelligkeit / v.anfaelligkeitReferenz);
}

/** Ab wie vielen Spielen Ausfall ein Fall als schwer gilt (auf die Saisonlänge umgerechnet). */
export function schwerAb(saisonLaenge: number): number {
  return skaliereDauer(CONFIG.verletzungen.schwerAb, saisonLaenge);
}

export function istSchwer(spielerVerletzungSpiele: number, saisonLaenge: number): boolean {
  return spielerVerletzungSpiele >= schwerAb(saisonLaenge);
}

export function verletzungText(s: Spieler): string {
  const v = s.verletzung;
  if (!v) return '';
  return `${v.typ}, noch ${v.spieleVerbleibend} ${v.spieleVerbleibend === 1 ? 'Spiel' : 'Spiele'}`;
}
