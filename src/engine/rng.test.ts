import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

describe('Rng', () => {
  it('liefert bei gleichem Seed die gleiche Folge', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('liefert bei unterschiedlichem Seed unterschiedliche Folgen', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const folgeA = Array.from({ length: 10 }, () => a.next());
    const folgeB = Array.from({ length: 10 }, () => b.next());
    expect(folgeA).not.toEqual(folgeB);
  });

  it('akzeptiert Text als Seed', () => {
    expect(new Rng('abc').next()).toBe(new Rng('abc').next());
  });

  it('next() liegt immer in [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('int() trifft beide Grenzen und bleibt im Bereich', () => {
    const r = new Rng(99);
    const gesehen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const x = r.int(3, 6);
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThanOrEqual(6);
      gesehen.add(x);
    }
    expect([...gesehen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('normal() hat ungefähr den gewünschten Mittelwert', () => {
    const r = new Rng(5);
    let summe = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) summe += r.normal(50, 10);
    expect(summe / n).toBeGreaterThan(49.5);
    expect(summe / n).toBeLessThan(50.5);
  });

  it('shuffle() behält alle Elemente und verändert das Original nicht', () => {
    const r = new Rng(3);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const gemischt = r.shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...gemischt].sort()).toEqual(original);
  });
});
