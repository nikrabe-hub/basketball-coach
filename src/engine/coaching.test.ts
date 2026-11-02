import { afterEach, describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { simuliereSpiel, type Mannschaft } from './game';
import { generiereLiga, kaderVon, staerkeRanking } from './league';
import { Rng } from './rng';
import { mannschaftVon, simuliereBis, simuliereTag } from './season';
import { BX } from './stats';
import { kombiVon } from './tactics';
import { neuesSpiel, standardCoaching, type Coaching, type SpielDaten, type SpielErgebnis, type Taktik, type TeamBox } from './types';
import { letzteWichtigeNachricht, verarbeiteSpielZustand } from './zustand';

const ORIGINALRATE = CONFIG.verletzungen.rateProSekunde;
const liga = generiereLiga(4242, 82);
const ranking = staerkeRanking(liga);
const mitteId = ranking[14]!.teamId;
const gegnerId = ranking[10]!.teamId;

function mitCoaching(teil: Partial<Taktik> = {}, rotation?: Coaching['rotation']): Coaching {
  const c = standardCoaching();
  c.taktik = { ...c.taktik, ...teil };
  if (rotation) c.rotation = rotation;
  return c;
}

/** Spiele des Teams `mitteId` (zu Hause und auswärts im Wechsel) mit dem gegebenen Coaching. */
function spieleMit(coaching: Coaching | undefined, n: number, seed = 100): { eigene: TeamBox; gegner: TeamBox; erg: SpielErgebnis }[] {
  const eigen = mannschaftVon(liga, mitteId, coaching);
  const andere = mannschaftVon(liga, gegnerId);
  const liste = [];
  for (let i = 0; i < n; i++) {
    const heim = i % 2 === 0;
    const erg = simuliereSpiel(new Rng(seed + i), heim ? eigen : andere, heim ? andere : eigen, { tag: 0, pbp: false });
    liste.push({ eigene: heim ? erg.heim : erg.gast, gegner: heim ? erg.gast : erg.heim, erg });
  }
  return liste;
}

const summe = (box: TeamBox, idx: number) => box.spieler.reduce((s, z) => s + (z[idx] as number), 0);
const mittel = (liste: number[]) => liste.reduce((a, b) => a + b, 0) / liste.length;
const ballbesitze = (box: TeamBox) => summe(box, BX.fga) + 0.44 * summe(box, BX.fta) - summe(box, BX.oreb) + summe(box, BX.to);

describe('Taktik', () => {
  it('die mittleren Optionen sind neutral (Normalfall ändert nichts)', () => {
    const k = kombiVon({ tempo: 'normal', wurf: 'ausgewogen', fokus: 'ballbewegung', verteidigung: 'mann', intensitaet: 'normal' });
    expect(k.dauer).toBe(1);
    expect(k.muedigkeit).toBe(1);
    expect(k.zonen).toEqual([1, 1, 1]);
    expect(k.trefferGegner).toEqual([0, 0, 0]);
    expect(k.turnoverGegner).toBe(0);
  });

  it('Tempo schnell bringt mehr Ballbesitze als langsam', () => {
    const schnell = mittel(spieleMit(mitCoaching({ tempo: 'schnell' }), 120).map((s) => ballbesitze(s.eigene)));
    const langsam = mittel(spieleMit(mitCoaching({ tempo: 'langsam' }), 120).map((s) => ballbesitze(s.eigene)));
    expect(schnell - langsam).toBeGreaterThan(8);
  });

  it('Mehr Dreier erhöht den Dreieranteil, Mehr Zone senkt ihn', () => {
    const anteil = (c: Coaching) => {
      const l = spieleMit(c, 120);
      return mittel(l.map((s) => summe(s.eigene, BX.tpa))) / mittel(l.map((s) => summe(s.eigene, BX.fga)));
    };
    const dreier = anteil(mitCoaching({ wurf: 'dreier' }));
    const normal = anteil(mitCoaching());
    const zone = anteil(mitCoaching({ wurf: 'zone' }));
    expect(dreier).toBeGreaterThan(normal + 0.03);
    expect(zone).toBeLessThan(normal - 0.03);
  });

  it('Pressing erzwingt mehr Ballverluste des Gegners, kostet aber Fouls', () => {
    const presse = spieleMit(mitCoaching({ verteidigung: 'pressing', intensitaet: 'hoch' }), 150);
    const mann = spieleMit(mitCoaching(), 150);
    expect(mittel(presse.map((s) => summe(s.gegner, BX.to)))).toBeGreaterThan(mittel(mann.map((s) => summe(s.gegner, BX.to))) + 0.8);
    expect(mittel(presse.map((s) => summe(s.eigene, BX.pf)))).toBeGreaterThan(mittel(mann.map((s) => summe(s.eigene, BX.pf))) + 0.5);
  });

  it('Fokus Star-Spieler: der beste Werfer bekommt mehr Würfe', () => {
    const bester = [...kaderVon(liga, mitteId)].sort((a, b) => b.ovr - a.ovr)[0]!;
    const wuerfe = (c: Coaching) =>
      mittel(
        spieleMit(c, 120).map((s) => {
          const z = s.eigene.spieler.find((r) => r[BX.id] === bester.id);
          return z ? z[BX.fga] : 0;
        }),
      );
    expect(wuerfe(mitCoaching({ fokus: 'star' }))).toBeGreaterThan(wuerfe(mitCoaching()) + 0.8);
  });

  it('Taktik-Wirkung ist nicht übermächtig: jede Einzel-Einstellung verändert den Abstand um höchstens ca. 5 Punkte', () => {
    const abstand = (c: Coaching | undefined) => mittel(spieleMit(c, 200, 700).map((s) => s.eigene.punkte - s.gegner.punkte));
    const basis = abstand(undefined);
    for (const t of [{ tempo: 'schnell' }, { wurf: 'dreier' }, { fokus: 'star' }, { verteidigung: 'pressing' }, { intensitaet: 'hoch' }] as Partial<Taktik>[]) {
      expect(Math.abs(abstand(mitCoaching(t)) - basis)).toBeLessThan(5);
    }
  });
});

describe('Rotation', () => {
  const kader = [...kaderVon(liga, mitteId)].sort((a, b) => b.ovr - a.ovr);
  const rotation = (minuten: number[], starter = kader.slice(0, 5).map((s) => s.id)): Coaching['rotation'] => ({
    auto: false,
    starter,
    minuten: Object.fromEntries(kader.map((s, i) => [String(s.id), minuten[i] ?? 0])),
  });

  it('die gewählten Starter beginnen das Spiel', () => {
    const starter = [kader[5]!, kader[6]!, kader[7]!, kader[8]!, kader[9]!].map((s) => s.id);
    const spiele = spieleMit(mitCoaching({}, rotation([20, 20, 20, 20, 20, 30, 30, 30, 30, 30], starter)), 20);
    for (const s of spiele) {
      const gestartet = s.eigene.spieler.filter((z) => z[BX.start] === 1).map((z) => z[BX.id]);
      expect(gestartet.sort()).toEqual([...starter].sort());
    }
  });

  it('Spieler mit 0 Minuten spielen nicht, andere bekommen ungefähr ihre Ziel-Minuten', () => {
    const ziel = [0, 0, 34, 34, 34, 26, 26, 26, 20, 20];
    const spiele = spieleMit(mitCoaching({}, rotation(ziel, kader.slice(2, 7).map((s) => s.id))), 40);
    const min = (id: number) => mittel(spiele.map((s) => (s.eigene.spieler.find((z) => z[BX.id] === id)?.[BX.min] ?? 0) / 60));
    expect(min(kader[0]!.id)).toBe(0);
    expect(min(kader[1]!.id)).toBe(0);
    // Die Ziel-Minuten zusammen ergeben genau 240, die Umsetzung weicht durch Müdigkeit und Fouls etwas ab.
    expect(min(kader[2]!.id)).toBeGreaterThan(26);
    expect(min(kader[2]!.id)).toBeLessThan(38);
    expect(min(kader[2]!.id)).toBeGreaterThan(min(kader[8]!.id) + 6);
  });

  it('die Spielzeit aller Spieler ergibt immer 5 mal die Spieldauer (auch bei eigener Rotation)', () => {
    for (const s of spieleMit(mitCoaching({}, rotation([36, 34, 30, 28, 26, 20, 16, 12, 8, 6])), 20)) {
      const dauer = (48 + 5 * s.erg.ot) * 60;
      expect(Math.abs(summe(s.eigene, BX.min) - 5 * dauer)).toBeLessThanOrEqual(s.eigene.spieler.length);
    }
  });

  it('mit zu wenigen Minuten-Spielern ergänzt die Engine die Rotation (kein Absturz)', () => {
    const spiele = spieleMit(mitCoaching({}, rotation([48, 48, 48])), 10);
    for (const s of spiele) expect(s.eigene.spieler.length).toBeGreaterThanOrEqual(8);
  });

  it('Verletzte Spieler spielen nicht und werden in der Rotation ersetzt', () => {
    const fliegtRaus = kader[0]!;
    const kopie = structuredClone(liga);
    kopie.spieler[fliegtRaus.id]!.verletzung = { typ: 'Test', spieleGesamt: 5, spieleVerbleibend: 5 };
    for (const c of [undefined, mitCoaching({}, rotation([36, 34, 30, 28, 26, 20, 16, 12, 8, 6]))]) {
      const eigen = mannschaftVon(kopie, mitteId, c);
      for (let i = 0; i < 10; i++) {
        const e = simuliereSpiel(new Rng(300 + i), eigen, mannschaftVon(kopie, gegnerId), { tag: 0, pbp: false });
        expect(e.heim.spieler.some((z) => z[BX.id] === fliegtRaus.id)).toBe(false);
        expect(e.heim.spieler.filter((z) => z[BX.start] === 1)).toHaveLength(5);
      }
    }
  });

  it('wenn weniger als 5 gesund sind, spielen die am wenigsten Verletzten trotzdem', () => {
    const kopie = structuredClone(liga);
    kaderVon(kopie, mitteId).forEach((s, i) => {
      if (i >= 3) s.verletzung = { typ: 'Test', spieleGesamt: 4 + i, spieleVerbleibend: 4 + i };
    });
    const m: Mannschaft = mannschaftVon(kopie, mitteId);
    const e = simuliereSpiel(new Rng(5), m, mannschaftVon(kopie, gegnerId), { tag: 0, pbp: false });
    expect(e.heim.spieler.filter((z) => z[BX.start] === 1)).toHaveLength(5);
  });
});

describe('Verletzungen im Spiel', () => {
  it('passieren selten, betreffen Spieler beider Teams und verlassen das Feld sofort', () => {
    const alle = spieleMit(undefined, 300, 4000);
    const verletzungen = alle.flatMap((s) => s.erg.verletzungen ?? []);
    // erwartet: ca. 0,16 pro Spiel, also ca. 47 in 300 Spielen
    expect(verletzungen.length).toBeGreaterThan(20);
    expect(verletzungen.length).toBeLessThan(110);
    for (const v of verletzungen) {
      expect(v.spiele).toBeGreaterThanOrEqual(1);
      expect([mitteId, gegnerId]).toContain(v.teamId);
    }
    expect(new Set(verletzungen.map((v) => v.teamId)).size).toBe(2);
  });

  it('der Play-by-Play und die Zusammenfassung nennen die Verletzung', () => {
    for (let seed = 0; seed < 400; seed++) {
      const e = simuliereSpiel(new Rng(seed), mannschaftVon(liga, mitteId), mannschaftVon(liga, gegnerId), { tag: 0, pbp: true });
      if (e.verletzungen?.length) {
        expect(e.pbp!.some((z) => z.includes('verletzt sich'))).toBe(true);
        expect(e.text).toContain('verletzt sich');
        return;
      }
    }
    throw new Error('In 400 Spielen keine Verletzung');
  });

  it('Ausfalldauer wird auf kurze Saisons umgerechnet, bleibt mindestens ein Spiel', async () => {
    const { skaliereDauer } = await import('./injuries');
    expect(skaliereDauer(60, 82)).toBe(60);
    expect(skaliereDauer(60, 29)).toBe(21);
    expect(skaliereDauer(1, 29)).toBe(1);
  });
});

describe('Schlussminute', () => {
  it('das zurückliegende Team foult am Ende absichtlich, es gibt knappe Spiele und Verlängerungen', () => {
    let fouls = 0;
    let ot = 0;
    for (let seed = 0; seed < 150; seed++) {
      const e = simuliereSpiel(new Rng(seed), mannschaftVon(liga, mitteId), mannschaftVon(liga, gegnerId), { tag: 0, pbp: true });
      fouls += e.pbp!.filter((z) => z.includes('Absichtliches Foul')).length;
      if (e.ot > 0) ot++;
    }
    expect(fouls).toBeGreaterThan(20);
    expect(ot).toBeGreaterThan(0);
  });
});

describe('Spielzustand nach dem Spiel (Verletzungen, Moral, Posteingang)', () => {
  const frisch = (): SpielDaten => {
    const l = structuredClone(liga);
    return neuesSpiel('Test', 40, 1, l, mitteId);
  };
  const letztesEigenesSpiel = (spiel: SpielDaten): SpielErgebnis => {
    for (let t = spiel.liga.tag - 1; t >= 0; t--) {
      const e = (spiel.liga.ergebnisse[t] ?? []).find((x) => x.heim.teamId === spiel.userTeamId || x.gast.teamId === spiel.userTeamId);
      if (e) return e;
    }
    throw new Error('kein Spiel');
  };

  it('neue schwere Verletzung im eigenen Team: wichtige Meldung, kurze: unwichtig', () => {
    const spiel = frisch();
    const star = kaderVon(spiel.liga, mitteId)[0]!;
    const ersatz = kaderVon(spiel.liga, mitteId)[1]!;
    const erg = simuliereSpiel(new Rng(1), mannschaftVon(spiel.liga, mitteId), mannschaftVon(spiel.liga, gegnerId), { tag: 0, pbp: false });
    erg.verletzungen = [
      { spielerId: star.id, teamId: mitteId, typ: 'Meniskusriss', spiele: 40 },
      { spielerId: ersatz.id, teamId: mitteId, typ: 'Verstauchter Knöchel', spiele: 2 },
    ];
    verarbeiteSpielZustand(spiel, erg);
    expect(spiel.liga.spieler[star.id]!.verletzung).toEqual({ typ: 'Meniskusriss', spieleGesamt: 40, spieleVerbleibend: 40 });
    const wichtig = spiel.posteingang.filter((n) => n.wichtig);
    expect(wichtig).toHaveLength(1);
    expect(wichtig[0]!.spielerId).toBe(star.id);
    expect(spiel.posteingang).toHaveLength(2);
    expect(letzteWichtigeNachricht(spiel)?.spielerId).toBe(star.id);
  });

  it('Verletzungen laufen mit gespielten Spielen ab, Rückkehr wird gemeldet', () => {
    const spiel = frisch();
    const s = kaderVon(spiel.liga, mitteId)[3]!;
    s.verletzung = { typ: 'Test', spieleGesamt: 2, spieleVerbleibend: 2 };
    // Zwei Spieltage des Teams simulieren
    let gespielt = 0;
    while (gespielt < 2) {
      const heute = spiel.liga.spielplan[spiel.liga.tag]!;
      if (heute.some((g) => g.heim === mitteId || g.gast === mitteId)) gespielt++;
      simuliereTag(spiel);
    }
    expect(spiel.liga.spieler[s.id]!.verletzung).toBeNull();
    expect(spiel.posteingang.some((n) => n.typ === 'rueckkehr' && n.spielerId === s.id)).toBe(true);
  });

  it('Moral steigt nach Siegen und fällt, wenn ein Star kaum spielt; Unzufriedenheit hält die Simulation an', () => {
    const spiel = frisch();
    const kader = [...kaderVon(spiel.liga, mitteId)].sort((a, b) => b.ovr - a.ovr);
    const star = kader[0]!;
    // Der beste Spieler sitzt auf der Bank (1 Minute), der Rest spielt.
    spiel.coaching.rotation = {
      auto: false,
      starter: kader.slice(1, 6).map((s) => s.id),
      minuten: Object.fromEntries(kader.map((s, i) => [String(s.id), i === 0 ? 1 : i < 10 ? 28 : 0])),
    };
    const ende = spiel.liga.spielplan.length;
    // Die Simulation hält bei wichtigen Meldungen (auch Verletzungen) an: weiterlaufen lassen, bis die Moral-Meldung kommt.
    let meldung = spiel.posteingang.find((n) => n.typ === 'moral');
    for (let lauf = 0; lauf < 12 && !meldung && spiel.liga.tag < ende; lauf++) {
      simuliereBis(spiel, ende);
      meldung = spiel.posteingang.find((n) => n.typ === 'moral');
    }
    expect(spiel.liga.spieler[star.id]!.moral).toBeLessThan(CONFIG.moral.start);
    expect(meldung?.spielerId).toBe(star.id);
    expect(meldung?.wichtig).toBe(true);
    // Unmittelbar danach hat die Simulation angehalten (die Hauptrunde ist noch nicht vorbei).
    expect(spiel.liga.tag).toBeLessThan(ende);
    expect(letztesEigenesSpiel(spiel)).toBeDefined();
  });

  afterEach(() => {
    (CONFIG.verletzungen as { rateProSekunde: number }).rateProSekunde = ORIGINALRATE;
  });

  it('Eine schwere Verletzung im eigenen Team hält die Simulation an', () => {
    (CONFIG.verletzungen as { rateProSekunde: number }).rateProSekunde = 0.0004;
    const spiel = frisch();
    const ende = spiel.liga.spielplan.length;
    const fertig = simuliereBis(spiel, ende);
    expect(fertig).toBe(false);
    expect(spiel.liga.tag).toBeLessThan(ende);
    const grund = letzteWichtigeNachricht(spiel);
    expect(grund).toBeDefined();
  });
});
