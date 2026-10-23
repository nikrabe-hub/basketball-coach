import { describe, expect, it } from 'vitest';
import { simuliereSpiel } from './game';
import { generiereLiga, staerkeRanking } from './league';
import { Rng } from './rng';
import { mannschaftVon } from './season';
import { BX } from './stats';
import type { SpielErgebnis, TeamBox } from './types';

const liga = generiereLiga(4242, 82);
const ranking = staerkeRanking(liga);
const stark = mannschaftVon(liga, ranking[0]!.teamId);
const schwach = mannschaftVon(liga, ranking[29]!.teamId);
const mitte = mannschaftVon(liga, ranking[14]!.teamId);

function spiel(seed: number, pbp = false): SpielErgebnis {
  return simuliereSpiel(new Rng(seed), stark, mitte, { tag: 3, pbp });
}

function summe(box: TeamBox, idx: number): number {
  return box.spieler.reduce((s, z) => s + (z[idx] as number), 0);
}

describe('simuliereSpiel', () => {
  it('ist mit gleichem Seed reproduzierbar, mit anderem Seed nicht', () => {
    expect(spiel(1, true)).toEqual(spiel(1, true));
    expect(spiel(1).heim.punkte + spiel(1).gast.punkte).not.toBe(0);
    const a = spiel(1);
    const b = spiel(2);
    expect([a.heim.punkte, a.gast.punkte]).not.toEqual([b.heim.punkte, b.gast.punkte]);
  });

  it('hat nie ein Unentschieden und die Viertel ergeben die Endpunktzahl', () => {
    for (let seed = 0; seed < 60; seed++) {
      const e = spiel(seed);
      expect(e.heim.punkte).not.toBe(e.gast.punkte);
      expect(e.heim.viertel).toHaveLength(4 + e.ot);
      expect(e.heim.viertel.reduce((a, b) => a + b, 0)).toBe(e.heim.punkte);
      expect(e.gast.viertel.reduce((a, b) => a + b, 0)).toBe(e.gast.punkte);
    }
  });

  it('Boxscore ist in sich stimmig', () => {
    for (let seed = 0; seed < 40; seed++) {
      const e = spiel(seed);
      const dauer = (48 + 5 * e.ot) * 60;
      for (const box of [e.heim, e.gast]) {
        // Punkte der Spieler = Teampunkte
        expect(summe(box, BX.pts)).toBe(box.punkte);
        // genau 5 Spieler auf dem Feld: Gesamtspielzeit = 5 x Spieldauer (Rundung je Spieler)
        expect(Math.abs(summe(box, BX.min) - 5 * dauer)).toBeLessThanOrEqual(box.spieler.length);
        // Plus/Minus: 5 Spieler auf dem Feld
        const eigene = box === e.heim ? e.heim.punkte - e.gast.punkte : e.gast.punkte - e.heim.punkte;
        expect(summe(box, BX.pm)).toBe(5 * eigene);
        expect(box.spieler.filter((z) => z[BX.start] === 1)).toHaveLength(5);
        for (const z of box.spieler) {
          expect(z[BX.fgm]).toBeLessThanOrEqual(z[BX.fga]);
          expect(z[BX.tpm]).toBeLessThanOrEqual(z[BX.tpa]);
          expect(z[BX.tpa]).toBeLessThanOrEqual(z[BX.fga]);
          expect(z[BX.tpm]).toBeLessThanOrEqual(z[BX.fgm]);
          expect(z[BX.ftm]).toBeLessThanOrEqual(z[BX.fta]);
          expect(z[BX.oreb]).toBeLessThanOrEqual(z[BX.reb]);
          expect(z[BX.pf]).toBeLessThanOrEqual(6);
          expect(z[BX.min]).toBeGreaterThan(0);
          // Punkte = 2*FGM + 1*3PM + FTM
          expect(z[BX.pts]).toBe(2 * z[BX.fgm] + z[BX.tpm] + z[BX.ftm]);
        }
        // Assists gibt es nur nach getroffenen Würfen
        expect(summe(box, BX.ast)).toBeLessThanOrEqual(summe(box, BX.fgm));
      }
      // Steals/Blocks/Turnovers/Rebounds hängen an Gegenaktionen des anderen Teams
      expect(summe(e.heim, BX.stl)).toBeLessThanOrEqual(summe(e.gast, BX.to));
      expect(summe(e.gast, BX.stl)).toBeLessThanOrEqual(summe(e.heim, BX.to));
      expect(summe(e.heim, BX.blk)).toBeLessThanOrEqual(summe(e.gast, BX.fga));
    }
  });

  it('Spieler foulen höchstens sechs Mal und fliegen dann raus (nie mehr als 6 Fouls)', () => {
    let maxFouls = 0;
    for (let seed = 0; seed < 80; seed++) {
      const e = spiel(seed);
      for (const z of [...e.heim.spieler, ...e.gast.spieler]) maxFouls = Math.max(maxFouls, z[BX.pf]);
    }
    expect(maxFouls).toBeLessThanOrEqual(6);
  });

  it('Play-by-Play gibt es nur auf Wunsch', () => {
    expect(spiel(5, false).pbp).toBeUndefined();
    const e = spiel(5, true);
    expect(e.pbp!.length).toBeGreaterThan(100);
    expect(e.pbp![0]).toMatch(/^Q1 /);
  });

  it('liefert eine Zusammenfassung mit dem Siegerteam', () => {
    const e = spiel(7);
    const sieger = e.heim.punkte > e.gast.punkte ? stark : mitte;
    expect(e.text).toContain(sieger.name);
    expect(e.text).toContain(`${Math.max(e.heim.punkte, e.gast.punkte)}`);
  });

  it('das stärkste Team schlägt das schwächste deutlich öfter als umgekehrt', () => {
    let siege = 0;
    const n = 120;
    for (let i = 0; i < n; i++) {
      const e = simuliereSpiel(new Rng(900 + i), i % 2 === 0 ? stark : schwach, i % 2 === 0 ? schwach : stark, {
        tag: 0,
        pbp: false,
      });
      const heimGewinnt = e.heim.punkte > e.gast.punkte;
      if ((i % 2 === 0) === heimGewinnt) siege++;
    }
    expect(siege / n).toBeGreaterThan(0.75);
    expect(siege / n).toBeLessThan(1);
  });

  it('erzeugt realistische Spielergebnisse (Punkte, Wurfquote) im Durchschnitt', () => {
    let pts = 0;
    let fgm = 0;
    let fga = 0;
    const n = 60;
    for (let i = 0; i < n; i++) {
      const e = spiel(2000 + i);
      pts += e.heim.punkte + e.gast.punkte;
      fgm += summe(e.heim, BX.fgm) + summe(e.gast, BX.fgm);
      fga += summe(e.heim, BX.fga) + summe(e.gast, BX.fga);
    }
    expect(pts / n / 2).toBeGreaterThan(95);
    expect(pts / n / 2).toBeLessThan(130);
    expect(fgm / fga).toBeGreaterThan(0.4);
    expect(fgm / fga).toBeLessThan(0.55);
  });
});
