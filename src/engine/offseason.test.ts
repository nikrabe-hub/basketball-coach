import { describe, expect, it } from 'vitest';
import { entwickleSpieler, karriereendeChance } from './development';
import {
  fuehreLotterieAus,
  pickReihenfolge,
  rookieVertrag,
  sichereDraftDaten,
  verfuegbareKandidaten,
} from './draft';
import { generiereLiga, kaderVon } from './league';
import {
  draftAutoPick,
  draftKomplett,
  draftWaehle,
  entlasseSpieler,
  freieSpieler,
  kannNeueSaisonStarten,
  offseasonStatus,
  setzeDraftFort,
  starteDraft,
  starteLotterie,
  starteNeueSaison,
  starteOffseason,
  wechsleSaisonAutomatisch,
} from './offseason';
import { berechneOvr } from './player';
import { Rng } from './rng';
import { spieleSaisonBisEnde } from './test-helfer';
import { ansichtVon, naechsteStufeKosten, scoute, spanne, stufeVon } from './scouting';
import { sichereSaisonZiele } from './karriere';
import { CONFIG } from './config';
import { neuesSpiel, type Spieler, type SpielDaten } from './types';

function neu(seed = 7, laenge = 29, team = 5): SpielDaten {
  const sp = neuesSpiel('Test', 40, seed, generiereLiga(seed, laenge), team);
  sichereSaisonZiele(sp);
  sichereDraftDaten(sp);
  sp.einstellungen.pbp = false;
  return sp;
}

/** Spielt die Saison bis zum Ende der Finals. */
function saisonBisEnde(sp: SpielDaten): void {
  spieleSaisonBisEnde(sp);
}

function pruefeLiga(sp: SpielDaten): void {
  const { liga } = sp;
  liga.spieler.forEach((s, i) => {
    expect(s.id).toBe(i);
    expect(s.ovr).toBeGreaterThanOrEqual(25);
    expect(s.ovr).toBeLessThanOrEqual(99);
    expect(s.pot).toBeGreaterThanOrEqual(s.ovr);
    expect(s.pot).toBeLessThanOrEqual(99);
    if (s.ruhestand !== undefined) expect(s.teamId).toBeNull();
  });
  const gesehen = new Set<number>();
  for (const t of liga.teams) {
    for (const id of t.kader) {
      expect(gesehen.has(id)).toBe(false);
      gesehen.add(id);
      expect(liga.spieler[id]?.teamId).toBe(t.id);
    }
  }
}

describe('Entwicklung', () => {
  const liga = generiereLiga(11, 29);
  const kopie = (s: Spieler): Spieler => structuredClone(s);
  const mittelAenderung = (filter: (s: Spieler) => boolean): number => {
    const rng = new Rng(5);
    const aenderungen: number[] = [];
    for (const s0 of liga.spieler.filter(filter)) {
      for (let i = 0; i < 20; i++) {
        const s = kopie(s0);
        entwickleSpieler(rng, s, 20);
        aenderungen.push(s.ovr - s0.ovr);
      }
    }
    return aenderungen.reduce((a, b) => a + b, 0) / aenderungen.length;
  };

  it('junge Spieler mit Potenzial werden im Schnitt besser, alte schlechter', () => {
    expect(mittelAenderung((s) => s.alter <= 22 && s.pot - s.ovr >= 8)).toBeGreaterThan(1.5);
    expect(mittelAenderung((s) => s.alter >= 33)).toBeLessThan(-1.5);
    expect(Math.abs(mittelAenderung((s) => s.alter >= 26 && s.alter <= 28))).toBeLessThan(1.2);
  });

  it('OVR passt zu den Attributen, POT ist nie kleiner als OVR, das Alter steigt um 1', () => {
    const rng = new Rng(9);
    for (const s0 of liga.spieler) {
      const s = kopie(s0);
      entwickleSpieler(rng, s, 15);
      expect(s.alter).toBe(s0.alter + 1);
      expect(s.ovr).toBe(berechneOvr(s.attribute, s.position));
      expect(s.pot).toBeGreaterThanOrEqual(s.ovr);
      expect(s.ovrVorjahr).toBe(s0.ovr);
      for (const v of Object.values(s.attribute)) {
        expect(v).toBeGreaterThanOrEqual(CONFIG.spieler.attributMin);
        expect(v).toBeLessThanOrEqual(CONFIG.spieler.attributMax);
      }
    }
  });

  it('Spieler, die kaum spielen, entwickeln sich langsamer als Stammspieler', () => {
    const jung = liga.spieler.filter((s) => s.alter <= 21 && s.pot - s.ovr >= 10);
    const lauf = (minuten: number) => {
      const rng = new Rng(3);
      let summe = 0;
      for (const s0 of jung) for (let i = 0; i < 30; i++) {
        const s = kopie(s0);
        entwickleSpieler(rng, s, minuten);
        summe += s.ovr - s0.ovr;
      }
      return summe;
    };
    expect(lauf(30)).toBeGreaterThan(lauf(0));
  });

  it('Karriereende: nie vor 33 (mit Team), sicher ab 41, steigt mit dem Alter', () => {
    const basis = { ...liga.spieler[0]!, ovr: 60 };
    expect(karriereendeChance({ ...basis, alter: 30 }, true)).toBe(0);
    expect(karriereendeChance({ ...basis, alter: 41 }, true)).toBe(1);
    const p = [33, 35, 37, 39].map((alter) => karriereendeChance({ ...basis, alter }, true));
    for (let i = 1; i < p.length; i++) expect(p[i]!).toBeGreaterThan(p[i - 1]!);
    // Stars hören später auf als Durchschnittsspieler
    expect(karriereendeChance({ ...basis, alter: 35, ovr: 80 }, true)).toBeLessThan(karriereendeChance({ ...basis, alter: 35, ovr: 60 }, true));
    // Schwache Free Agents ab 31 meistens
    expect(karriereendeChance({ ...basis, alter: 32, ovr: 45 }, false)).toBeGreaterThanOrEqual(0.6);
  });
});

describe('Draft-Klasse und Scouting', () => {
  const sp = neu(21);
  const { liga } = sp;

  it('es gibt 100 Kandidaten ohne Team und Picks für 4 Jahre (2 Runden à 30)', () => {
    expect(liga.draftKlasse).toHaveLength(CONFIG.offseason.draft.kandidaten);
    for (const id of liga.draftKlasse) {
      const s = liga.spieler[id]!;
      expect(s.teamId).toBeNull();
      expect(s.alter).toBeGreaterThanOrEqual(19);
      expect(s.alter).toBeLessThanOrEqual(23);
      expect(s.ovr).toBeLessThanOrEqual(CONFIG.offseason.draft.kandidat.ovrMax);
      expect(s.pot).toBeGreaterThanOrEqual(s.ovr);
    }
    expect(liga.picks).toHaveLength(4 * 60);
    for (let j = 0; j < 4; j++) expect(liga.picks.filter((p) => p.saison === sp.saison + j)).toHaveLength(60);
    expect(liga.picks.every((p) => p.besitzer === p.ursprung)).toBe(true);
  });

  it('sichereDraftDaten ändert nichts, wenn schon alles da ist', () => {
    const vorher = JSON.stringify([liga.picks, liga.draftKlasse]);
    sichereDraftDaten(sp);
    expect(JSON.stringify([liga.picks, liga.draftKlasse])).toBe(vorher);
  });

  it('die sichtbare Spanne enthält immer den wahren Wert und wird mit höherer Stufe schmaler', () => {
    for (const id of liga.draftKlasse) {
      const s = liga.spieler[id]!;
      let letzteBreite = Infinity;
      for (const stufe of [0, 1, 2, 3]) {
        const sa = spanne(id, 100, s.ovr, CONFIG.offseason.scouting.startBreite.ovr, stufe);
        expect(sa[0]).toBeLessThanOrEqual(s.ovr);
        expect(sa[1]).toBeGreaterThanOrEqual(s.ovr);
        expect(sa[1] - sa[0]).toBeLessThanOrEqual(letzteBreite);
        letzteBreite = sa[1] - sa[0];
      }
    }
  });

  it('Scouting kostet Punkte, hat eine Obergrenze und deckt Attribute genauer auf', () => {
    const s = neu(22);
    const id = s.liga.draftKlasse[0]!;
    const start = s.scouting.punkte;
    expect(stufeVon(s, id)).toBe(0);
    const breite0 = ansichtVon(s, s.liga.spieler[id]!).pot;
    expect(scoute(s, id)).toBe(true);
    expect(s.scouting.punkte).toBe(start - (CONFIG.offseason.scouting.kosten[1] as number));
    expect(scoute(s, id)).toBe(true);
    expect(scoute(s, id)).toBe(true);
    expect(stufeVon(s, id)).toBe(3);
    expect(scoute(s, id)).toBe(false);
    expect(naechsteStufeKosten(s, id)).toBeNull();
    expect(s.scouting.punkte).toBe(start - (CONFIG.offseason.scouting.kosten[3] as number));
    const breite3 = ansichtVon(s, s.liga.spieler[id]!).pot;
    expect(breite3[1] - breite3[0]).toBeLessThan(breite0[1] - breite0[0]);
    // Ohne Punkte kein Scouting; Spieler, die keine Kandidaten sind, lassen sich nicht scouten.
    s.scouting.punkte = 5;
    expect(scoute(s, s.liga.draftKlasse[1]!)).toBe(false);
    expect(scoute(s, s.liga.teams[0]!.kader[0]!)).toBe(false);
  });
});

describe('Lotterie', () => {
  it('Pick-Nummern 1–60 einmalig, nur Nicht-Playoff-Teams in der Lotterie, nie tiefer als Platz 5 für das schlechteste Team', () => {
    const sp = neu(31);
    saisonBisEnde(sp);
    starteOffseason(sp);
    const lot = fuehreLotterieAus(sp);
    const playoff = new Set(sp.liga.postseason!.seeds.flat());
    expect(lot.teams).toHaveLength(14);
    expect(lot.teams.every((id) => !playoff.has(id))).toBe(true);
    expect(lot.gelost).toHaveLength(4);
    const picks = pickReihenfolge(sp.liga, sp.saison);
    expect(picks.map((p) => p.nr)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(picks.slice(0, 4).map((p) => p.ursprung)).toEqual(lot.gelost);
    expect(picks.slice(0, 14).every((p) => lot.teams.includes(p.ursprung))).toBe(true);
    expect(picks.slice(14, 30).every((p) => playoff.has(p.ursprung))).toBe(true);
    // Runde 2: alle 30 Teams genau einmal, schlechtestes zuerst (kein Playoff-Team vor einem schlechteren Lotterie-Team)
    expect(new Set(picks.slice(30).map((p) => p.ursprung)).size).toBe(30);
    const schlechtesterPick = picks.findIndex((p) => p.ursprung === lot.teams[0]);
    expect(schlechtesterPick).toBeLessThanOrEqual(4);
  });

  it('Wahrscheinlichkeiten: das schlechteste Team bekommt Pick 1 in ca. 14 % der Fälle, das 14. fast nie', () => {
    const sp = neu(32);
    saisonBisEnde(sp);
    starteOffseason(sp);
    let erster = 0;
    let letzterTop4 = 0;
    const lauf = 1500;
    let schlechtestes = -1;
    let bestes = -1;
    for (let i = 0; i < lauf; i++) {
      sp.liga.seed = 1000 + i;
      const lot = fuehreLotterieAus(sp);
      schlechtestes = lot.teams[0]!;
      bestes = lot.teams[13]!;
      if (lot.gelost[0] === schlechtestes) erster++;
      if (lot.gelost.includes(bestes)) letzterTop4++;
    }
    expect(erster / lauf).toBeGreaterThan(0.1);
    expect(erster / lauf).toBeLessThan(0.18);
    expect(letzterTop4 / lauf).toBeLessThan(0.05);
  });
});

describe('Offseason-Ablauf', () => {
  it('Draft, Verträge, Kader und neue Saison', () => {
    const sp = neu(41);
    const user = sp.userTeamId;
    saisonBisEnde(sp);
    expect(offseasonStatus(sp)).toBe('start');
    const klasse = [...sp.liga.draftKlasse];
    const ovrVor = new Map(sp.liga.spieler.map((s) => [s.id, s.ovr]));

    starteOffseason(sp);
    expect(offseasonStatus(sp)).toBe('bericht');
    expect(sp.liga.offseason!.entwicklung.length).toBeGreaterThan(10);
    // Verlauf archiviert, Vorjahreswert gesetzt, Kandidaten unverändert
    expect(sp.liga.spieler.filter((s) => s.verlauf && s.verlauf.length === 1).length).toBeGreaterThan(300);
    for (const id of klasse) expect(sp.liga.spieler[id]!.ovr).toBe(ovrVor.get(id));
    const aktive = sp.liga.spieler.filter((s) => s.teamId !== null);
    expect(aktive.every((s) => s.ovrVorjahr === ovrVor.get(s.id))).toBe(true);

    starteLotterie(sp);
    expect(offseasonStatus(sp)).toBe('lotterie');
    starteDraft(sp);

    // Mit den eigenen Picks: erst waehlen, dann auto
    const status = offseasonStatus(sp);
    if (status === 'draft') {
      const bester = verfuegbareKandidaten(sp.liga).sort((a, b) => b.pot - a.pot)[0]!;
      draftWaehle(sp, bester.id);
      expect(sp.liga.spieler[bester.id]!.teamId).toBe(user);
      if (offseasonStatus(sp) === 'draft') draftAutoPick(sp);
    }
    if (offseasonStatus(sp) === 'draft') draftKomplett(sp);
    expect(offseasonStatus(sp)).toBe('kader');

    // 60 Picks, jeder Kandidat höchstens einmal, Rookie-Verträge nach Skala, neuling
    const ergebnis = sp.liga.drafts[0]!;
    expect(ergebnis.picks).toHaveLength(60);
    expect(new Set(ergebnis.picks.map((p) => p[2])).size).toBe(60);
    for (const [nr, teamId, spielerId] of ergebnis.picks) {
      const s = sp.liga.spieler[spielerId]!;
      expect(s.draft).toEqual({ saison: 1, runde: nr <= 30 ? 1 : 2, pick: nr });
      expect(s.neuling).toBe(true);
      expect(s.vertrag).toEqual(rookieVertrag(nr));
      if (s.teamId !== null) expect(s.teamId).toBe(teamId);
    }
    expect(rookieVertrag(1).gehalt).toBeGreaterThan(rookieVertrag(30).gehalt);
    expect(rookieVertrag(31).gehalt).toBe(CONFIG.finanzen.mindestGehalt);
    // Undrafted sind Free Agents, die Klasse ist leer, Picks für Jahr 5 sind da
    expect(sp.liga.draftKlasse).toHaveLength(0);
    expect(klasse.filter((id) => sp.liga.spieler[id]!.teamId === null && !ergebnis.picks.some((p) => p[2] === id)).length).toBeGreaterThan(0);
    expect(sp.liga.picks.some((p) => p.saison === 1)).toBe(false);
    expect(sp.liga.picks.filter((p) => p.saison === 5)).toHaveLength(60);
    // KI-Kader 13–15
    for (const t of sp.liga.teams) if (t.id !== user) { expect(t.kader.length).toBeGreaterThanOrEqual(13); expect(t.kader.length).toBeLessThanOrEqual(15); }

    // Eigener Kader über 15: Start der neuen Saison gesperrt, bis entlassen wird
    const userKader = kaderVon(sp.liga, user);
    if (userKader.length > 15) {
      expect(kannNeueSaisonStarten(sp).ok).toBe(false);
      expect(() => starteNeueSaison(sp)).toThrow();
      while (sp.liga.teams[user]!.kader.length > 15) entlasseSpieler(sp, kaderVon(sp.liga, user).at(-1)!.id);
    }
    expect(kannNeueSaisonStarten(sp).ok).toBe(true);
    const pool = freieSpieler(sp.liga).length;
    expect(pool).toBeGreaterThan(20);

    sp.coaching.rotation = { auto: false, starter: [1, 2, 3, 4, 5], minuten: { '1': 30 } };
    starteNeueSaison(sp);
    expect(sp.saison).toBe(2);
    expect(sp.liga.tag).toBe(0);
    expect(sp.liga.ergebnisse).toHaveLength(0);
    expect(sp.liga.postseason).toBeUndefined();
    expect(sp.liga.offseason).toBeUndefined();
    expect(sp.liga.stand.teams.every((b) => b.siege === 0 && b.niederlagen === 0)).toBe(true);
    expect(Object.keys(sp.liga.stand.spieler)).toHaveLength(0);
    expect(sp.coaching.rotation.auto).toBe(true);
    expect(sp.karriere.ziele.every((z) => z.erfuellt === null)).toBe(true);
    expect(sp.scouting.punkte).toBe(CONFIG.offseason.scouting.punkteProSaison);
    expect(sp.liga.draftKlasse).toHaveLength(100);
    expect(sp.liga.picks.filter((p) => p.saison === 2)).toHaveLength(60);
    expect(sp.liga.spielplan.length).toBeGreaterThan(0);
    for (const t of sp.liga.teams) expect(t.kader.length).toBeGreaterThanOrEqual(13);
    pruefeLiga(sp);
  });

  it('Phasen lassen sich nicht überspringen', () => {
    const sp = neu(42);
    expect(() => starteOffseason(sp)).toThrow();
    saisonBisEnde(sp);
    expect(() => starteLotterie(sp)).toThrow();
    starteOffseason(sp);
    expect(() => starteDraft(sp)).toThrow();
    expect(() => starteOffseason(sp)).toThrow();
    starteLotterie(sp);
    expect(() => starteLotterie(sp)).toThrow();
    starteDraft(sp);
    setzeDraftFort(sp);
  });

  it('drei Saisonwechsel nacheinander laufen sauber durch, Neulinge sind in Saison 2 Rookie-Kandidaten', () => {
    const sp = neu(43);
    for (let i = 0; i < 3; i++) {
      saisonBisEnde(sp);
      wechsleSaisonAutomatisch(sp);
      pruefeLiga(sp);
      expect(sp.saison).toBe(2 + i);
    }
    const neulinge = sp.liga.spieler.filter((s) => s.neuling && s.teamId !== null);
    expect(neulinge.length).toBeGreaterThan(20);
    expect(neulinge.every((s) => s.draft?.saison === 3)).toBe(true);
    // Most-Improved braucht den Vorjahreswert: er ist jetzt da
    expect(sp.liga.spieler.filter((s) => s.ovrVorjahr !== undefined && s.teamId !== null).length).toBeGreaterThan(300);
    expect(sp.liga.drafts).toHaveLength(3);
  });

  it('der Ablauf ist reproduzierbar (gleicher Seed, gleiche Entscheidungen)', () => {
    const lauf = () => {
      const sp = neu(44);
      saisonBisEnde(sp);
      wechsleSaisonAutomatisch(sp);
      return sp;
    };
    const a = lauf();
    const b = lauf();
    expect(a.liga.spieler.map((s) => [s.ovr, s.teamId])).toEqual(b.liga.spieler.map((s) => [s.ovr, s.teamId]));
    expect(a.liga.drafts).toEqual(b.liga.drafts);
  });
});
