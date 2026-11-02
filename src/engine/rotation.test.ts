import { describe, expect, it } from 'vitest';
import { generiereLiga, kaderVon } from './league';
import { minutenSumme, SPIELZEIT_GESAMT, vollstaendigeRotation, vorschlagRotation } from './rotation';
import { standardCoaching } from './types';

const liga = generiereLiga(777, 82);
const kader = kaderVon(liga, 3).map((s) => ({ ...s }));

describe('Rotations-Hilfen', () => {
  it('Vorschlag: 5 Starter, genau 240 Minuten, die Besten spielen am meisten', () => {
    const r = vorschlagRotation(kader);
    expect(r.starter).toHaveLength(5);
    expect(minutenSumme(kader, r)).toBe(SPIELZEIT_GESAMT);
    const beste = [...kader].sort((a, b) => b.ovr - a.ovr || a.id - b.id);
    expect(r.starter).toEqual(beste.slice(0, 5).map((s) => s.id));
    const m = (i: number) => r.minuten[String(beste[i]!.id)] as number;
    expect(m(0)).toBeGreaterThanOrEqual(m(4));
    expect(m(0)).toBeLessThanOrEqual(40);
  });

  it('Vorschlag: Verletzte bekommen 0 Minuten und starten nicht', () => {
    const k = kader.map((s) => ({ ...s }));
    const star = [...k].sort((a, b) => b.ovr - a.ovr)[0]!;
    star.verletzung = { typ: 'Knöchel', spieleGesamt: 5, spieleVerbleibend: 5 };
    const r = vorschlagRotation(k);
    expect(r.minuten[String(star.id)]).toBe(0);
    expect(r.starter).not.toContain(star.id);
    expect(r.starter).toHaveLength(5);
    expect(minutenSumme(k, r)).toBe(SPIELZEIT_GESAMT);
  });

  it('vollständige Rotation: leere Einstellung behält den Automatik-Schalter', () => {
    const auto = vollstaendigeRotation(kader, standardCoaching().rotation);
    expect(auto.auto).toBe(true);
    expect(auto.starter).toHaveLength(5);
    const eigene = vollstaendigeRotation(kader, { auto: false, starter: [kader[0]!.id], minuten: { [String(kader[0]!.id)]: 20 } });
    expect(eigene.auto).toBe(false);
    expect(Object.keys(eigene.minuten)).toHaveLength(kader.length);
    expect(eigene.minuten[String(kader[1]!.id)]).toBe(0);
  });
});
