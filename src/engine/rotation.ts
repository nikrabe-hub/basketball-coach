import { CONFIG } from './config';
import type { Rotation, Spieler } from './types';

export const SPIELZEIT_GESAMT = 240;

/**
 * Hilfen für die Rotations-Einstellung (Oberfläche und Tests).
 * Die eigentliche Umsetzung im Spiel steht in game.ts (Zielminuten je Spieler).
 */

/** Sortiert nach Stärke (OVR), bei Gleichstand nach Id – dieselbe Reihenfolge wie die automatische Rotation. */
function nachStaerke(kader: readonly Spieler[]): Spieler[] {
  return [...kader].sort((a, b) => b.ovr - a.ovr || a.id - b.id);
}

/** Vorschlag wie die automatische Rotation: die fünf Besten starten, Minuten nach Rang. Verletzte bekommen 0. */
export function vorschlagRotation(kader: readonly Spieler[]): Rotation {
  const fit = nachStaerke(kader.filter((s) => !s.verletzung));
  const minuten: Record<string, number> = {};
  for (const s of kader) minuten[String(s.id)] = 0;
  // Auf genau 240 Minuten umrechnen (Verfahren des größten Rests), damit die Anzeige "240 von 240" zeigt.
  const roh = fit.map((_, i) => CONFIG.spiel.rotation.standardMinuten[i] ?? 0);
  const rohSumme = roh.reduce((a, b) => a + b, 0);
  if (rohSumme > 0) {
    const skaliert = roh.map((m) => (m * SPIELZEIT_GESAMT) / rohSumme);
    const ganz = skaliert.map(Math.floor);
    let rest = SPIELZEIT_GESAMT - ganz.reduce((a, b) => a + b, 0);
    const reihenfolge = skaliert
      .map((x, i) => ({ i, bruch: x - Math.floor(x) }))
      .filter((e) => roh[e.i]! > 0)
      .sort((a, b) => b.bruch - a.bruch || a.i - b.i);
    for (const e of reihenfolge) {
      if (rest <= 0) break;
      ganz[e.i] = (ganz[e.i] as number) + 1;
      rest--;
    }
    fit.forEach((s, i) => {
      minuten[String(s.id)] = ganz[i] as number;
    });
  }
  return { auto: false, starter: fit.slice(0, 5).map((s) => s.id), minuten };
}

/** Summe der eingestellten Minuten (nur gesunde Spieler zählen). */
export function minutenSumme(kader: readonly Spieler[], rot: Rotation): number {
  let summe = 0;
  for (const s of kader) if (!s.verletzung) summe += rot.minuten[String(s.id)] ?? 0;
  return summe;
}

/** Eine Rotation, in der jeder Spieler eingetragen ist (fehlende Spieler bekommen 0 Minuten). */
export function vollstaendigeRotation(kader: readonly Spieler[], rot: Rotation): Rotation {
  if (rot.starter.length === 0 && Object.keys(rot.minuten).length === 0) return { ...vorschlagRotation(kader), auto: rot.auto };
  const minuten: Record<string, number> = {};
  for (const s of kader) minuten[String(s.id)] = rot.minuten[String(s.id)] ?? 0;
  const ids = new Set(kader.map((s) => s.id));
  return { auto: rot.auto, starter: rot.starter.filter((id) => ids.has(id)), minuten };
}

