import { describe, expect, it } from 'vitest';
import { generiereLiga } from './league';
import {
  deadlineTag,
  eigeneErgebnisse,
  hauptrundeVorbei,
  naechsterEigenerSpieltag,
  simuliereBis,
  simuliereTag,
  zielTag,
} from './season';
import { siegQuote, sortiereTabelle, spiele } from './stats';
import { neuesSpiel, type SpielDaten } from './types';

function neu(seed = 7, laenge = 29, team = 5): SpielDaten {
  return neuesSpiel('Test', 40, seed, generiereLiga(seed, laenge), team);
}

describe('Saison simulieren', () => {
  const sp = neu();
  simuliereBis(sp, sp.liga.spielplan.length);
  const { liga } = sp;

  it('spielt alle Tage und hält zu jedem Spiel des Spielplans ein Ergebnis bereit', () => {
    expect(hauptrundeVorbei(liga)).toBe(true);
    expect(liga.ergebnisse).toHaveLength(liga.spielplan.length);
    liga.spielplan.forEach((tag, i) => {
      expect(liga.ergebnisse[i]).toHaveLength(tag.length);
      tag.forEach((s, j) => {
        expect(liga.ergebnisse[i]![j]!.heim.teamId).toBe(s.heim);
        expect(liga.ergebnisse[i]![j]!.gast.teamId).toBe(s.gast);
      });
    });
  });

  it('jedes Team hat genau 29 Spiele; Siege und Niederlagen gleichen sich aus', () => {
    let siege = 0;
    let niederlagen = 0;
    for (const b of liga.stand.teams) {
      expect(spiele(b)).toBe(29);
      expect(Math.abs(b.heimSiege + b.heimNiederlagen - 14.5)).toBeLessThanOrEqual(2);
      expect(b.heimSiege + b.heimNiederlagen + b.auswSiege + b.auswNiederlagen).toBe(29);
      siege += b.siege;
      niederlagen += b.niederlagen;
    }
    expect(siege).toBe(30 * 29 / 2);
    expect(niederlagen).toBe(siege);
    const pf = liga.stand.teams.reduce((a, b) => a + b.punkteFuer, 0);
    const pg = liga.stand.teams.reduce((a, b) => a + b.punkteGegen, 0);
    expect(pf).toBe(pg);
  });

  it('Spielerstatistiken passen zu den Teampunkten', () => {
    for (const t of liga.teams) {
      const b = liga.stand.teams[t.id]!;
      // Alle Punkte, die Spieler dieses Teams erzielten, ergeben die Teampunkte (Kader ändern sich nicht).
      const spielerPunkte = t.kader.reduce((a, id) => a + (liga.stand.spieler[String(id)]?.pts ?? 0), 0);
      expect(spielerPunkte).toBe(b.punkteFuer);
    }
  });

  it('Tabelle sortiert nach Siegquote', () => {
    const reihenfolge = sortiereTabelle(liga, liga.teams.map((t) => t.id));
    for (let i = 1; i < reihenfolge.length; i++) {
      const a = liga.stand.teams[reihenfolge[i - 1]!]!;
      const b = liga.stand.teams[reihenfolge[i]!]!;
      expect(siegQuote(a)).toBeGreaterThanOrEqual(siegQuote(b));
    }
  });

  it('Serie und letzte 10 Spiele stimmen', () => {
    for (const b of liga.stand.teams) {
      expect(b.letzte).toHaveLength(10);
      const ende = b.letzte[b.letzte.length - 1]!;
      expect(Math.sign(b.serie)).toBe(ende === 1 ? 1 : -1);
    }
  });
});

describe('Simulation in Etappen', () => {
  it('liefert dasselbe Ergebnis, egal in welchen Schritten simuliert wird', () => {
    const a = neu(11);
    const b = neu(11);
    simuliereBis(a, a.liga.spielplan.length);
    for (const ziel of [3, 10, 11, 25, 1000]) simuliereBis(b, ziel);
    expect(b).toEqual(a);
  });

  it('meldet den Fortschritt nach jedem Tag', () => {
    const sp = neu(12);
    const meldungen: [number, number][] = [];
    simuliereBis(sp, 6, { onFortschritt: (fertig, gesamt) => meldungen.push([fertig, gesamt]) });
    expect(meldungen).toEqual([1, 2, 3, 4, 5, 6].map((i) => [i, 6]));
  });

  it('gleiche Liga, gleiche Ergebnisse (Reproduzierbarkeit über den Seed)', () => {
    const a = neu(21);
    const b = neu(21);
    simuliereBis(a, 8);
    simuliereBis(b, 8);
    expect(a.liga.ergebnisse).toEqual(b.liga.ergebnisse);
  });
});

describe('Simulationsziele', () => {
  it('nächstes Spiel: stoppt direkt nach dem Spieltag des eigenen Teams', () => {
    const sp = neu(31);
    const erster = naechsterEigenerSpieltag(sp)!;
    const ziel = zielTag(sp, 'naechstesSpiel')!;
    expect(ziel).toBe(erster + 1);
    simuliereBis(sp, ziel);
    expect(eigeneErgebnisse(sp)).toHaveLength(1);
    const zweiter = naechsterEigenerSpieltag(sp)!;
    expect(zweiter).toBeGreaterThan(erster);
  });

  it('Woche = 7 Tage, Deadline nach ca. 60 % der Saison, Saisonende = alle Tage', () => {
    const sp = neu(32);
    expect(zielTag(sp, 'woche')).toBe(7);
    expect(zielTag(sp, 'deadline')).toBe(deadlineTag(sp.liga));
    expect(deadlineTag(sp.liga)).toBe(Math.floor(sp.liga.spielplan.length * 0.6));
    expect(zielTag(sp, 'saisonende')).toBe(sp.liga.spielplan.length);
  });

  it('nach der Deadline gibt es kein Deadline-Ziel mehr; nach dem Saisonende gar keins', () => {
    const sp = neu(33);
    simuliereBis(sp, deadlineTag(sp.liga));
    expect(zielTag(sp, 'deadline')).toBeNull();
    expect(zielTag(sp, 'woche')).not.toBeNull();
    simuliereBis(sp, 9999);
    for (const z of ['naechstesSpiel', 'woche', 'deadline', 'saisonende'] as const) {
      expect(zielTag(sp, z)).toBeNull();
    }
  });

  it('simuliereTag auf einem nicht vorhandenen Tag wirft einen Fehler', () => {
    const sp = neu(34);
    simuliereBis(sp, 9999);
    expect(() => simuliereTag(sp)).toThrow();
  });
});

describe('Play-by-Play', () => {
  it('wird nur für eigene Spiele gespeichert und nur für die letzten 10', () => {
    const sp = neu(41);
    simuliereBis(sp, sp.liga.spielplan.length);
    const mitPbp = sp.liga.ergebnisse.flat().filter((e) => e.pbp);
    expect(mitPbp).toHaveLength(10);
    for (const e of mitPbp) {
      expect([e.heim.teamId, e.gast.teamId]).toContain(sp.userTeamId);
    }
    // Es sind die letzten eigenen Spiele
    const eigene = eigeneErgebnisse(sp);
    const letzte10 = eigene.slice(-10).map((x) => x.erg);
    expect(mitPbp).toEqual(letzte10);
  });

  it('kann in den Einstellungen abgeschaltet werden', () => {
    const sp = neu(42);
    sp.einstellungen.pbp = false;
    simuliereBis(sp, 20);
    expect(sp.liga.ergebnisse.flat().some((e) => e.pbp)).toBe(false);
  });
});
