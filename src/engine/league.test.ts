import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { generiereLiga, gehaltSumme, kaderVon, staerkeRang, teamStaerke } from './league';
import { istGesperrt } from './names';
import { ATTRIBUT_INFO, berechneOvr } from './player';

describe('generiereLiga', () => {
  const liga = generiereLiga(12345, 82);

  it('erzeugt 30 Teams in 2 Conferences mit je 3 Divisionen à 5 Teams', () => {
    expect(liga.teams).toHaveLength(30);
    for (let c = 0; c < 2; c++) {
      for (let d = 0; d < 3; d++) {
        expect(liga.teams.filter((t) => t.conference === c && t.division === d)).toHaveLength(5);
      }
    }
  });

  it('Teams haben eindeutige Kürzel (3 Buchstaben) und Namen', () => {
    const kuerzel = new Set(liga.teams.map((t) => t.kuerzel));
    expect(kuerzel.size).toBe(30);
    expect(liga.teams.every((t) => /^[A-Z]{3}$/.test(t.kuerzel))).toBe(true);
    expect(new Set(liga.teams.map((t) => `${t.stadt} ${t.name}`)).size).toBe(30);
  });

  it('jedes Team hat 13–15 Spieler und IDs entsprechen dem Index', () => {
    liga.spieler.forEach((s, i) => expect(s.id).toBe(i));
    for (const t of liga.teams) {
      expect(t.kader.length).toBeGreaterThanOrEqual(CONFIG.liga.kaderMin);
      expect(t.kader.length).toBeLessThanOrEqual(CONFIG.liga.kaderMax);
      for (const id of t.kader) expect(liga.spieler[id]?.teamId).toBe(t.id);
    }
    const summe = liga.teams.reduce((s, t) => s + t.kader.length, 0);
    expect(liga.spieler).toHaveLength(summe);
  });

  it('Kader sind nach OVR absteigend sortiert', () => {
    for (const t of liga.teams) {
      const ovrs = kaderVon(liga, t.id).map((s) => s.ovr);
      expect(ovrs).toEqual([...ovrs].sort((a, b) => b - a));
    }
  });

  it('jedes Team hat von jeder Position mindestens zwei Spieler', () => {
    for (const t of liga.teams) {
      const k = kaderVon(liga, t.id);
      for (const p of ['PG', 'SG', 'SF', 'PF', 'C']) {
        expect(k.filter((s) => s.position === p).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('Attribute liegen in 25–99, OVR stimmt mit der Formel überein, POT >= OVR', () => {
    for (const s of liga.spieler) {
      for (const a of ATTRIBUT_INFO) {
        expect(s.attribute[a.key]).toBeGreaterThanOrEqual(25);
        expect(s.attribute[a.key]).toBeLessThanOrEqual(99);
      }
      expect(s.ovr).toBe(berechneOvr(s.attribute, s.position));
      expect(s.pot).toBeGreaterThanOrEqual(s.ovr);
      expect(s.pot).toBeLessThanOrEqual(99);
      expect(s.alter).toBeGreaterThanOrEqual(19);
      expect(s.alter).toBeLessThanOrEqual(38);
    }
  });

  it('Ligaweite OVR-Verteilung ist plausibel (keine absurden Werte)', () => {
    const ovrs = liga.spieler.map((s) => s.ovr);
    const mittel = ovrs.reduce((a, b) => a + b, 0) / ovrs.length;
    expect(mittel).toBeGreaterThan(48);
    expect(mittel).toBeLessThan(62);
    expect(Math.max(...ovrs)).toBeLessThanOrEqual(95);
    expect(Math.max(...ovrs)).toBeGreaterThanOrEqual(75);
    expect(Math.min(...ovrs)).toBeGreaterThanOrEqual(30);
  });

  it('Verträge: Gehälter zwischen Minimum und Maximum, Laufzeit 1–5, Teamgehälter plausibel', () => {
    const { mindestGehalt, maximalGehalt, salaryCap } = CONFIG.finanzen;
    for (const s of liga.spieler) {
      expect(s.vertrag.gehalt).toBeGreaterThanOrEqual(mindestGehalt);
      expect(s.vertrag.gehalt).toBeLessThanOrEqual(maximalGehalt);
      expect(s.vertrag.jahre).toBeGreaterThanOrEqual(1);
      expect(s.vertrag.jahre).toBeLessThanOrEqual(5);
    }
    for (const t of liga.teams) {
      const summe = gehaltSumme(liga, t.id);
      expect(summe).toBeGreaterThan(salaryCap * 0.6);
      expect(summe).toBeLessThan(salaryCap * 1.4);
    }
  });

  it('Spieler heißen eindeutig und nie wie bekannte echte Spieler', () => {
    const namen = liga.spieler.map((s) => `${s.vorname} ${s.nachname}`);
    expect(new Set(namen).size).toBe(namen.length);
    for (const s of liga.spieler) expect(istGesperrt(s.vorname, s.nachname)).toBe(false);
  });

  it('Sperrliste erkennt bekannte Namen (auch mit Akzenten)', () => {
    expect(istGesperrt('LeBron', 'James')).toBe(true);
    expect(istGesperrt('Luka', 'Dončić')).toBe(true);
    expect(istGesperrt('Marcus', 'Whitfield')).toBe(false);
  });

  it('gleicher Seed ergibt exakt die gleiche Liga, anderer Seed eine andere', () => {
    expect(generiereLiga(12345, 82)).toEqual(liga);
    const andere = generiereLiga(54321, 82);
    expect(andere.spieler[0]?.nachname === liga.spieler[0]?.nachname && andere.spieler[1]?.nachname === liga.spieler[1]?.nachname).toBe(false);
  });

  it('Teams sind unterschiedlich stark, Rang 1 ist das stärkste Team', () => {
    const staerken = liga.teams.map((t) => teamStaerke(liga, t.id));
    expect(Math.max(...staerken) - Math.min(...staerken)).toBeGreaterThan(4);
    const bester = staerken.indexOf(Math.max(...staerken));
    expect(staerkeRang(liga, bester)).toBe(1);
  });

  it('wird in unter 5 Sekunden erzeugt (Abnahmekriterium)', () => {
    const start = performance.now();
    generiereLiga(777, 82);
    expect(performance.now() - start).toBeLessThan(5000);
  });

  it('viele Seeds laufen ohne Fehler durch (Namen reichen immer)', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const l = generiereLiga(seed * 7919, 29);
      expect(l.teams).toHaveLength(30);
    }
  });
});
