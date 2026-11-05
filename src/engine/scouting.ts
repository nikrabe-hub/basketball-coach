import { CONFIG } from './config';
import { ATTRIBUT_INFO, begrenze } from './player';
import { mischeSeed } from './rng';
import type { AttributKey, Spieler, SpielDaten } from './types';

const S = CONFIG.offseason.scouting;
const MAX_STUFE = S.kosten.length - 1;

/** Eine Spanne [von, bis] (ganze Zahlen, beide Grenzen inklusive). */
export type Spanne = [von: number, bis: number];

/** Fester Pseudo-Zufallswert -1..1 für einen Spieler und eine Eigenschaft (ändert sich nie). */
function versatz(spielerId: number, eigenschaft: number): number {
  return (mischeSeed(spielerId, eigenschaft, 0x5c0a7) / 0xffffffff) * 2 - 1;
}

/**
 * Sichtbare Spanne für einen wahren Wert. Der wahre Wert liegt immer in der Spanne;
 * die Mitte ist je nach Spieler etwas daneben. Mit höherer Stufe wird die Spanne schmaler und die Mitte genauer.
 */
export function spanne(spielerId: number, eigenschaft: number, wahr: number, startBreite: number, stufe: number): Spanne {
  const breite = startBreite * (S.breite[begrenze(stufe, 0, MAX_STUFE)] as number);
  const mitte = wahr + versatz(spielerId, eigenschaft) * 0.55 * breite;
  const { attributMin, attributMax } = CONFIG.spieler;
  return [begrenze(Math.floor(mitte - breite), attributMin, attributMax), begrenze(Math.ceil(mitte + breite), attributMin, attributMax)];
}

export const mitteVon = (sp: Spanne): number => (sp[0] + sp[1]) / 2;

export interface Ansicht {
  ovr: Spanne;
  pot: Spanne;
  attribute: Record<AttributKey, Spanne>;
  /** Eine Zahl zum Sortieren: Mischung aus OVR und POT (junge Spieler: POT zählt mehr) */
  wert: number;
}

/** Gewicht des Potenzials bei der Bewertung eines Kandidaten (jünger = mehr). */
export function potGewicht(alter: number): number {
  return begrenze(0.35 + (22 - alter) * 0.08, 0.2, 0.6);
}

/** Was der Spieler (mit seinem Scouting) von einem Kandidaten sieht. */
export function ansichtVon(spiel: SpielDaten, s: Spieler): Ansicht {
  const stufe = stufeVon(spiel, s.id);
  const ovr = spanne(s.id, 100, s.ovr, S.startBreite.ovr, stufe);
  const pot = spanne(s.id, 101, s.pot, S.startBreite.pot, stufe);
  const attribute = {} as Record<AttributKey, Spanne>;
  ATTRIBUT_INFO.forEach((a, i) => {
    attribute[a.key] = spanne(s.id, i + 1, s.attribute[a.key], S.startBreite.attribut, stufe);
  });
  const w = potGewicht(s.alter);
  return { ovr, pot, attribute, wert: mitteVon(ovr) * (1 - w) + mitteVon(pot) * w };
}

export function stufeVon(spiel: SpielDaten, spielerId: number): number {
  return spiel.scouting.stufen[String(spielerId)] ?? 0;
}

/** Kosten in Punkten, um einen Kandidaten eine Stufe höher zu scouten (null = schon auf der höchsten Stufe). */
export function naechsteStufeKosten(spiel: SpielDaten, spielerId: number): number | null {
  const stufe = stufeVon(spiel, spielerId);
  if (stufe >= MAX_STUFE) return null;
  return (S.kosten[stufe + 1] as number) - (S.kosten[stufe] as number);
}

/** Scoutet einen Kandidaten eine Stufe weiter. Gibt false zurück, wenn die Punkte nicht reichen oder die höchste Stufe erreicht ist. */
export function scoute(spiel: SpielDaten, spielerId: number): boolean {
  if (!spiel.liga.draftKlasse.includes(spielerId)) return false;
  const kosten = naechsteStufeKosten(spiel, spielerId);
  if (kosten === null || kosten > spiel.scouting.punkte) return false;
  spiel.scouting.punkte -= kosten;
  spiel.scouting.stufen[String(spielerId)] = stufeVon(spiel, spielerId) + 1;
  return true;
}
