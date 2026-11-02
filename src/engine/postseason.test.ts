import { beforeAll, describe, expect, it } from 'vitest';
import { berechneAwards } from './awards';
import { erreichteRunde, sichereSaisonZiele } from './karriere';
import { generiereLiga } from './league';
import { nochImRennen, spieleAmTag } from './postseason';
import { hauptrundeVorbei, simuliereTag, simuliereZiel, type SimulationsZiel } from './season';
import { sortiereTabelle } from './stats';
import { neuesSpiel, type Postseason, type SpielDaten } from './types';

/** Simuliert, bis das Ziel erreicht ist, und macht nach Stopps wegen wichtiger Meldungen weiter. */
function bis(sp: SpielDaten, ziel: SimulationsZiel, schutz = 500): void {
  for (let i = 0; i < schutz; i++) {
    if (simuliereZiel(sp, ziel)) return;
  }
  throw new Error('Simulation kommt nicht zum Ziel');
}

function hauptrunde(seed: number, laenge = 29, team = 3): SpielDaten {
  const sp = neuesSpiel('Test', 40, seed, generiereLiga(seed, laenge), team);
  sichereSaisonZiele(sp);
  bis(sp, 'saisonende');
  return sp;
}

describe('Tiebreaker der Tabelle', () => {
  it('Gleiche Siegquote: Der Direktvergleich entscheidet vor der Punktedifferenz', () => {
    const sp = hauptrunde(11);
    const { liga } = sp;
    // Zwei Teams der gleichen Conference künstlich gleich stellen, Punktedifferenz zugunsten von b
    const ids = liga.teams.filter((t) => t.conference === 0).map((t) => t.id);
    const [a, b] = [ids[3] as number, ids[4] as number];
    const sa = liga.stand.teams[a]!;
    const sb = liga.stand.teams[b]!;
    sb.siege = sa.siege;
    sb.niederlagen = sa.niederlagen;
    sb.punkteFuer = sa.punkteFuer + 500;
    sb.punkteGegen = sa.punkteGegen;
    // a hat alle direkten Duelle gewonnen: wir fügen ein künstliches Ergebnis ein
    const ergebnisse = liga.ergebnisse.map((tag) => [...(tag ?? [])]);
    ergebnisse[0] = [
      ...(ergebnisse[0] ?? []),
      {
        tag: 0,
        heim: { teamId: a, punkte: 100, viertel: [25, 25, 25, 25], spieler: [] },
        gast: { teamId: b, punkte: 90, viertel: [25, 25, 20, 20], spieler: [] },
        ot: 0,
        text: '',
      },
    ];
    liga.ergebnisse = ergebnisse;
    // ohne weitere direkte Duelle: a vor b, obwohl b die bessere Punktedifferenz hat
    const sortiert = sortiereTabelle(liga, [a, b]);
    // Wenn die beiden in der Hauptrunde noch gegeneinander gespielt haben, gleicht das aus – sonst gewinnt a.
    const nachtrag = liga.ergebnisse.flat().filter((e) => [e.heim.teamId, e.gast.teamId].sort().join() === [a, b].sort().join());
    const aSiege = nachtrag.filter((e) => (e.heim.punkte > e.gast.punkte ? e.heim.teamId : e.gast.teamId) === a).length;
    const bSiege = nachtrag.length - aSiege;
    if (aSiege > bSiege) expect(sortiert[0]).toBe(a);
    else if (bSiege > aSiege) expect(sortiert[0]).toBe(b);
    else expect(sortiert[0]).toBe(b); // gleicher Direktvergleich: Punktedifferenz entscheidet
  });

  it('Reihenfolge ist eindeutig und enthält jedes Team genau einmal', () => {
    const sp = hauptrunde(12);
    const ids = sp.liga.teams.map((t) => t.id);
    const s = sortiereTabelle(sp.liga, ids);
    expect(new Set(s).size).toBe(ids.length);
    // nach Siegquote absteigend
    const q = (id: number) => sp.liga.stand.teams[id]!.siege / (sp.liga.stand.teams[id]!.siege + sp.liga.stand.teams[id]!.niederlagen);
    for (let i = 1; i < s.length; i++) expect(q(s[i - 1] as number)).toBeGreaterThanOrEqual(q(s[i] as number) - 1e-9);
  });
});

describe('Play-In und Playoffs', () => {
  let sp: SpielDaten;
  let stand: string;
  beforeAll(() => {
    sp = hauptrunde(21);
    stand = JSON.stringify(sp.liga.stand);
  });

  it('nach der Hauptrunde entsteht das Play-In mit der Setzliste beider Conferences', () => {
    const post = sp.liga.postseason as Postseason;
    expect(hauptrundeVorbei(sp.liga)).toBe(true);
    expect(post.phase).toBe('playin');
    expect(post.tabelle[0]).toHaveLength(15);
    expect(post.tabelle[1]).toHaveLength(15);
    expect(post.playin).toHaveLength(6);
    // Platz 7 gegen 8, 9 gegen 10 mit Heimrecht für die bessere Setzung
    const p78 = post.playin.find((p) => p.conference === 0 && p.typ === '7v8')!;
    expect(p78.heim).toBe(post.tabelle[0][6]);
    expect(p78.gast).toBe(post.tabelle[0][7]);
    expect(post.seeds[0].slice(0, 6)).toEqual(post.tabelle[0].slice(0, 6));
  });

  it('Play-In: erster Tag 4 Spiele, zweiter Tag 2 Spiele, danach 16 Teams in 8 Serien', () => {
    const post = sp.liga.postseason as Postseason;
    simuliereTag(sp);
    expect(post.tage[0]).toHaveLength(4);
    expect(post.phase).toBe('playin');
    simuliereTag(sp);
    expect(post.tage[1]).toHaveLength(2);
    expect(post.phase).toBe('playoffs');
    expect(post.runde).toBe(1);
    const erste = post.serien.filter((s) => s.runde === 1);
    expect(erste).toHaveLength(8);
    const teams = new Set(erste.flatMap((s) => [s.oben, s.unten]));
    expect(teams.size).toBe(16);
    // 1 gegen 8 usw.
    for (const c of [0, 1] as const) {
      const sc = erste.filter((s) => s.conference === c).sort((a, b) => a.slot - b.slot);
      expect(sc.map((s) => [s.seedOben, s.seedUnten])).toEqual([[1, 8], [4, 5], [3, 6], [2, 7]]);
    }
  });

  it('Play-In-Sieger stehen fest: Nr. 7 gewinnt 7:8, Nr. 8 gewinnt das Finale um Platz 8', () => {
    const post = sp.liga.postseason as Postseason;
    for (const c of [0, 1] as const) {
      const p78 = post.playin.find((p) => p.conference === c && p.typ === '7v8')!;
      const fin = post.playin.find((p) => p.conference === c && p.typ === 'finale8')!;
      expect(post.seeds[c][6]).toBe(p78.sieger);
      expect(post.seeds[c][7]).toBe(fin.sieger);
      expect(fin.heim).toBe(p78.verlierer);
    }
  });

  it('Playoffs bis zum Titel: 15 Serien, jede mit genau 4 Siegen, 4 bis 7 Spielen, Heimrecht 2-2-1-1-1', () => {
    const post = sp.liga.postseason as Postseason;
    bis(sp, 'playoffsEnde');
    expect(post.phase).toBe('beendet');
    expect(post.serien).toHaveLength(15);
    for (const s of post.serien) {
      expect(s.sieger).not.toBeNull();
      expect(Math.max(s.siegeOben, s.siegeUnten)).toBe(4);
      expect(Math.min(s.siegeOben, s.siegeUnten)).toBeLessThan(4);
      expect(s.spiele.length).toBe(s.siegeOben + s.siegeUnten);
      expect(s.spiele.length).toBeGreaterThanOrEqual(4);
      expect(s.spiele.length).toBeLessThanOrEqual(7);
      const heim = [true, true, false, false, true, false, true];
      s.spiele.forEach((ref, i) => {
        const erg = sp.liga.ergebnisse[ref.tag]![ref.index]!;
        expect(erg.heim.teamId).toBe(heim[i] ? s.oben : s.unten);
        expect(spieleAmTag(sp.liga, ref.tag)[ref.index]?.heim).toBe(erg.heim.teamId);
      });
    }
    expect(post.meister).toBe(post.serien.find((s) => s.runde === 4)!.sieger);
  });

  it('Spätere Runden bestehen aus den Siegern der Runde davor; das bessere Team hat das Heimrecht', () => {
    const post = sp.liga.postseason as Postseason;
    for (const s of post.serien.filter((x) => x.runde > 1)) {
      const vorher = post.serien.filter((x) => x.runde === s.runde - 1 && (s.conference === null || x.conference === s.conference));
      const sieger = new Set(vorher.map((x) => x.sieger));
      expect(sieger.has(s.oben)).toBe(true);
      expect(sieger.has(s.unten)).toBe(true);
      if (s.conference !== null) expect(s.seedOben).toBeLessThan(s.seedUnten);
    }
  });

  it('Play-In und Playoffs verändern Tabelle und Saisonstatistik nicht', () => {
    expect(JSON.stringify(sp.liga.stand)).toBe(stand);
  });

  it('Tage nach der Hauptrunde haben Ergebnisse unter liga.ergebnisse und passen zum Spielplan der Postseason', () => {
    const post = sp.liga.postseason as Postseason;
    post.tage.forEach((tag, d) => {
      const t = sp.liga.spielplan.length + d;
      expect(sp.liga.ergebnisse[t]).toHaveLength(tag.length);
      tag.forEach((g, i) => {
        expect(sp.liga.ergebnisse[t]![i]!.heim.teamId).toBe(g.heim);
        expect(sp.liga.ergebnisse[t]![i]!.gast.teamId).toBe(g.gast);
      });
    });
    expect(sp.liga.tag).toBe(sp.liga.spielplan.length + post.tage.length);
  });

  it('Abschluss: Historie, Karriere-Bewertung, Finals-MVP vom Meister, Abschlussmeldung', () => {
    const post = sp.liga.postseason as Postseason;
    expect(sp.historie).toHaveLength(1);
    const h = sp.historie[0]!;
    expect(h.meisterId).toBe(post.meister);
    expect(h.ziele.every((z) => z.erfuellt !== null)).toBe(true);
    expect(post.awards.finalsMvp?.teamId).toBe(post.meister);
    expect(sp.karriere.jobsicherheit).toBeGreaterThanOrEqual(0);
    expect(sp.karriere.jobsicherheit).toBeLessThanOrEqual(100);
    expect(sp.posteingang.some((n) => n.typ === 'playoffs' && n.text.includes('Meister'))).toBe(true);
    expect(erreichteRunde(post, post.meister as number)).toBe(5);
  });
});

describe('Simulationsziele in den Playoffs', () => {
  it('naechstesSpiel in Etappen und playoffsEnde führen zum gleichen Ergebnis', () => {
    const a = hauptrunde(31);
    const b = structuredClone(a);
    bis(a, 'playoffsEnde');
    let n = 0;
    while (b.liga.postseason?.phase !== 'beendet' && n++ < 400) simuliereZiel(b, 'naechstesSpiel');
    expect(b.liga.postseason?.meister).toBe(a.liga.postseason?.meister);
    expect(b.liga.postseason?.serien.map((s) => `${s.siegeOben}-${s.siegeUnten}`)).toEqual(
      a.liga.postseason?.serien.map((s) => `${s.siegeOben}-${s.siegeUnten}`),
    );
  });

  it("'serie' hält an, sobald die eigene Serie entschieden ist (oder die Runde endet)", () => {
    const sp = hauptrunde(32);
    const post = sp.liga.postseason as Postseason;
    bis(sp, 'serie'); // Play-In
    expect(post.phase).toBe('playoffs');
    const vorher = post.runde;
    bis(sp, 'serie');
    const eigene = post.serien.filter((s) => s.runde === vorher && (s.oben === sp.userTeamId || s.unten === sp.userTeamId));
    if (eigene.length > 0) expect(eigene[0]!.sieger).not.toBeNull();
    else expect(post.runde).toBeGreaterThan(vorher);
  });

  it('nochImRennen: nach dem Titel niemand mehr; ein ausgeschiedenes Team nicht', () => {
    const sp = hauptrunde(33);
    bis(sp, 'playoffsEnde');
    const post = sp.liga.postseason as Postseason;
    for (const t of sp.liga.teams) expect(nochImRennen(post, t.id)).toBe(false);
  });

  it('Alle Ergebnisse sind reproduzierbar (gleicher Spielstand, gleiche Postseason)', () => {
    const a = hauptrunde(34);
    const b = hauptrunde(34);
    bis(a, 'playoffsEnde');
    bis(b, 'playoffsEnde');
    expect(JSON.stringify(a.liga.postseason?.serien)).toBe(JSON.stringify(b.liga.postseason?.serien));
  });
});

describe('Awards', () => {
  const sp = hauptrunde(41, 58);
  const awards = berechneAwards(sp.liga);

  it('MVP, Verteidiger, Sechster Mann, Trainer und alle drei All-League-Teams sind vergeben', () => {
    expect(awards.mvp).not.toBeNull();
    expect(awards.verteidiger).not.toBeNull();
    expect(awards.sechsterMann).not.toBeNull();
    expect(awards.trainer).not.toBeNull();
    const alle = awards.allLeague.flat();
    expect(alle).toHaveLength(15);
    expect(new Set(alle).size).toBe(15);
    expect(awards.allLeague[0]).toContain(awards.mvp!.spielerId);
  });

  it('Rookie ist ein Neuling, Sechster Mann startet selten, Most Improved fehlt in der ersten Saison', () => {
    if (awards.rookie) expect(sp.liga.spieler[awards.rookie.spielerId]!.neuling).toBe(true);
    const sm = awards.sechsterMann!;
    const z = sp.liga.stand.spieler[String(sm.spielerId)]!;
    expect(z.starts).toBeLessThanOrEqual(0.2 * z.spiele);
    expect(awards.mostImproved).toBeNull();
  });

  it('Most Improved wird mit Vorjahreswerten vergeben', () => {
    const l = structuredClone(sp.liga);
    const kandidat = l.spieler.find((s) => s.teamId !== null && (l.stand.spieler[String(s.id)]?.spiele ?? 0) >= 20)!;
    for (const s of l.spieler) s.ovrVorjahr = s.ovr;
    kandidat.ovrVorjahr = kandidat.ovr - 8;
    expect(berechneAwards(l).mostImproved?.spielerId).toBe(kandidat.id);
  });
});
