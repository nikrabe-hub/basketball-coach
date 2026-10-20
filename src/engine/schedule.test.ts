import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { Rng } from './rng';
import { erzeugeSpielplan, spieleVonTeam } from './schedule';
import { erzeugeTeams } from './teams';

describe('erzeugeSpielplan', () => {
  for (const laenge of CONFIG.saison.spieleOptionen) {
    describe(`${laenge} Spiele`, () => {
      const teams = erzeugeTeams(new Rng(1));
      const plan = erzeugeSpielplan(new Rng(2), teams, laenge);

      it('jedes Team spielt genau so viele Spiele wie verlangt', () => {
        for (const t of teams) expect(spieleVonTeam(plan, t.id)).toHaveLength(laenge);
      });

      it('insgesamt 30 × Spiele / 2 Spiele, kein Team spielt gegen sich selbst', () => {
        const alle = plan.flat();
        expect(alle).toHaveLength((30 * laenge) / 2);
        expect(alle.every((s) => s.heim !== s.gast)).toBe(true);
      });

      it('kein Team spielt zweimal am selben Tag', () => {
        for (const tag of plan) {
          const gesehen = new Set<number>();
          for (const s of tag) {
            expect(gesehen.has(s.heim)).toBe(false);
            expect(gesehen.has(s.gast)).toBe(false);
            gesehen.add(s.heim);
            gesehen.add(s.gast);
          }
        }
      });

      it('Heim- und Auswärtsspiele sind ausgeglichen (höchstens 2 Unterschied zur Hälfte)', () => {
        for (const t of teams) {
          const heim = spieleVonTeam(plan, t.id).filter((s) => s.heim).length;
          expect(Math.abs(heim - laenge / 2)).toBeLessThanOrEqual(2);
        }
      });

      it('die Saison dauert etwa so viele Tage wie geplant und hat keine Leertage', () => {
        const ziel = laenge * CONFIG.saison.tageProSpiel;
        expect(plan.length).toBeGreaterThanOrEqual(ziel - 2);
        expect(plan.length).toBeLessThanOrEqual(ziel + 15);
        expect(plan.every((tag) => tag.length > 0)).toBe(true);
      });
    });
  }

  it('82 Spiele: 4× gegen Division-Gegner, 3× gegen andere Conference-Gegner, 2–3× gegen die andere Conference', () => {
    const teams = erzeugeTeams(new Rng(1));
    const plan = erzeugeSpielplan(new Rng(3), teams, 82);
    for (const t of teams) {
      const proGegner = new Map<number, number>();
      for (const s of spieleVonTeam(plan, t.id)) proGegner.set(s.gegner, (proGegner.get(s.gegner) ?? 0) + 1);
      for (const g of teams) {
        if (g.id === t.id) continue;
        const n = proGegner.get(g.id) ?? 0;
        if (g.conference === t.conference && g.division === t.division) expect(n).toBe(4);
        else if (g.conference === t.conference) expect(n).toBe(3);
        else expect([2, 3]).toContain(n);
      }
    }
  });

  it('gleicher Seed ergibt den gleichen Spielplan', () => {
    const teams = erzeugeTeams(new Rng(1));
    expect(erzeugeSpielplan(new Rng(9), teams, 58)).toEqual(erzeugeSpielplan(new Rng(9), teams, 58));
  });

  it('lehnt ungültige Saisonlängen ab', () => {
    expect(() => erzeugeSpielplan(new Rng(1), erzeugeTeams(new Rng(1)), 60)).toThrow();
  });
});
