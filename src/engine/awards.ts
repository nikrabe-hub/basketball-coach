import { CONFIG } from './config';
import { staerkeRang } from './league';
import { BX } from './stats';
import type { AwardPreis, Awards, Liga, Serie, Spieler, SpielerSumme } from './types';

/**
 * Wahl der Auszeichnungen. Die Hauptrunden-Preise stehen fest, sobald die Hauptrunde gespielt ist;
 * der Finals-MVP kommt nach den Finals dazu. Alle Gewichte stehen in CONFIG.awards.
 */

const f1 = (x: number) => x.toFixed(1).replace('.', ',');

interface Kandidat {
  s: Spieler;
  summe: SpielerSumme;
  /** Spielwert pro Spiel (Game-Score-Formel) */
  wert: number;
  siegQuote: number;
}

/** Spielwert pro Spiel: Punkte plus Effizienz, Rebounds, Assists, Steals, Blocks minus Ballverluste und Fouls. */
export function spielwertProSpiel(z: SpielerSumme): number {
  if (z.spiele === 0) return 0;
  const dreb = z.reb - z.oreb;
  const gesamt =
    z.pts +
    0.4 * z.fgm -
    0.7 * z.fga -
    0.4 * (z.fta - z.ftm) +
    0.7 * z.oreb +
    0.3 * dreb +
    z.stl +
    0.7 * z.ast +
    0.7 * z.blk -
    0.4 * z.pf -
    z.to;
  return gesamt / z.spiele;
}

function sammleKandidaten(liga: Liga, mindestAnteil: number): Kandidat[] {
  const mindest = Math.max(1, Math.ceil(liga.saisonLaenge * mindestAnteil));
  const alle: Kandidat[] = [];
  for (const s of liga.spieler) {
    if (s.teamId === null) continue;
    const summe = liga.stand.spieler[String(s.id)];
    const b = liga.stand.teams[s.teamId];
    if (!summe || !b || summe.spiele === 0) continue;
    const spiele = b.siege + b.niederlagen;
    alle.push({ s, summe, wert: spielwertProSpiel(summe), siegQuote: spiele === 0 ? 0.5 : b.siege / spiele });
  }
  const berechtigt = alle.filter((k) => k.summe.spiele >= mindest);
  return berechtigt.length >= 5 ? berechtigt : alle;
}

function preis(k: Kandidat | undefined, text?: string): AwardPreis | null {
  if (!k || k.s.teamId === null) return null;
  const z = k.summe;
  const n = z.spiele;
  return {
    spielerId: k.s.id,
    teamId: k.s.teamId,
    text: text ?? `${f1(z.pts / n)} Punkte, ${f1(z.reb / n)} Rebounds, ${f1(z.ast / n)} Assists`,
  };
}

function besterNach(liste: Kandidat[], punkte: (k: Kandidat) => number): Kandidat | undefined {
  let best: Kandidat | undefined;
  let bestWert = -Infinity;
  for (const k of liste) {
    const w = punkte(k);
    if (w > bestWert || (w === bestWert && best !== undefined && k.s.id < best.s.id)) {
      best = k;
      bestWert = w;
    }
  }
  return best;
}

/** Erwartete Siegquote eines Teams nach seiner Stärke (wie bei den Besitzer-Zielen). */
export function erwarteteSiegquote(rang: number): number {
  return 0.5 + (15.5 - rang) * CONFIG.karriere.erwartungProRang;
}

export function berechneAwards(liga: Liga): Awards {
  const A = CONFIG.awards;
  const kandidaten = sammleKandidaten(liga, A.mindestSpieleAnteil);

  const mvpPunkte = (k: Kandidat) => k.wert + A.mvpTeamErfolg * (k.siegQuote - 0.5);
  const mvp = besterNach(kandidaten, mvpPunkte);

  // Teamabwehr: Gegnerpunkte pro Spiel gegenüber dem Ligaschnitt
  const stand = liga.stand.teams;
  const gegnerProSpiel = (id: number) => {
    const b = stand[id];
    return b && b.siege + b.niederlagen > 0 ? b.punkteGegen / (b.siege + b.niederlagen) : 0;
  };
  const schnitt = stand.length === 0 ? 0 : stand.reduce((a, _b, i) => a + gegnerProSpiel(i), 0) / stand.length;
  const verteidigerPunkte = (k: Kandidat) => {
    const z = k.summe;
    const n = z.spiele;
    const att = k.s.attribute;
    const attributMittel = (att.perimeterDef + att.innenDef + att.steal + att.block) / 4;
    const teamAbwehr = k.s.teamId === null ? 0 : schnitt - gegnerProSpiel(k.s.teamId);
    return (
      (z.stl / n) * A.dpoy.steal +
      (z.blk / n) * A.dpoy.block +
      ((z.reb - z.oreb) / n) * A.dpoy.reboundDef +
      teamAbwehr * A.dpoy.teamAbwehr +
      (attributMittel - 60) * A.dpoy.attribut
    );
  };
  const verteidiger = besterNach(
    kandidaten.filter((k) => k.summe.min / k.summe.spiele >= 20 * 60),
    verteidigerPunkte,
  );

  const rookies = sammleKandidaten(liga, A.rookieMindestSpieleAnteil).filter((k) => k.s.neuling);
  const rookie = besterNach(rookies, (k) => k.wert);

  const sechster = besterNach(
    kandidaten.filter(
      (k) => k.summe.starts <= A.sechsterMannMaxStartAnteil * k.summe.spiele && k.summe.min / k.summe.spiele >= A.sechsterMannMinMinuten * 60,
    ),
    (k) => k.wert,
  );

  // Most Improved: braucht Vorjahreswerte (ab Meilenstein 5)
  const mitVorjahr = kandidaten.filter((k) => k.s.ovrVorjahr !== undefined);
  const mip = besterNach(mitVorjahr, (k) => (k.s.ovr - (k.s.ovrVorjahr as number)) * 2 + k.wert * 0.2);
  const mipPreis =
    mip && mip.s.ovrVorjahr !== undefined && mip.s.ovr > mip.s.ovrVorjahr
      ? preis(mip, `Wertung ${mip.s.ovrVorjahr} → ${mip.s.ovr}, ${f1(mip.summe.pts / mip.summe.spiele)} Punkte`)
      : null;

  // All-League: die besten 15 Spieler nach MVP-Wert in drei Teams zu je 5
  const rangfolge = [...kandidaten].sort((a, b) => mvpPunkte(b) - mvpPunkte(a) || a.s.id - b.s.id).slice(0, 15);
  const team = (von: number) => rangfolge.slice(von, von + 5).map((k) => k.s.id);

  // Trainer des Jahres: größte Überraschung gegenüber der Erwartung nach Teamstärke
  let trainer: Awards['trainer'] = null;
  let bestAbstand = -Infinity;
  for (const t of liga.teams) {
    const b = stand[t.id];
    if (!b || b.siege + b.niederlagen === 0) continue;
    const quote = b.siege / (b.siege + b.niederlagen);
    const erwartet = erwarteteSiegquote(staerkeRang(liga, t.id));
    // Überraschung gegenüber der Erwartung, Teams mit Siegbilanz bevorzugt
    const abstand = quote - erwartet + 0.6 * (quote - 0.5);
    if (abstand > bestAbstand) {
      bestAbstand = abstand;
      trainer = {
        teamId: t.id,
        text: `${b.siege}–${b.niederlagen} (erwartet waren etwa ${Math.round(erwartet * liga.saisonLaenge)} Siege)`,
      };
    }
  }

  return {
    mvp: preis(mvp),
    verteidiger: preis(
      verteidiger,
      verteidiger
        ? `${f1(verteidiger.summe.stl / verteidiger.summe.spiele)} Steals, ${f1(verteidiger.summe.blk / verteidiger.summe.spiele)} Blocks, ${f1((verteidiger.summe.reb - verteidiger.summe.oreb) / verteidiger.summe.spiele)} def. Rebounds`
        : undefined,
    ),
    rookie: preis(rookie),
    sechsterMann: preis(sechster),
    mostImproved: mipPreis,
    finalsMvp: null,
    trainer,
    allLeague: [team(0), team(5), team(10)],
  };
}

/** Finals-MVP: bester Spieler des Meisters in den Finals (Spielwert pro Spiel). */
export function berechneFinalsMvp(liga: Liga, finale: Serie): AwardPreis | null {
  const meister = finale.sieger;
  if (meister === null) return null;
  const summen = new Map<number, SpielerSumme>();
  for (const ref of finale.spiele) {
    const erg = liga.ergebnisse[ref.tag]?.[ref.index];
    if (!erg) continue;
    const box = erg.heim.teamId === meister ? erg.heim : erg.gast;
    for (const z of box.spieler) {
      const id = z[BX.id];
      const t = summen.get(id) ?? {
        spiele: 0, starts: 0, min: 0, pts: 0, reb: 0, oreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0,
        fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, pm: 0,
      };
      t.spiele++;
      t.starts += z[BX.start];
      t.min += z[BX.min];
      t.pts += z[BX.pts];
      t.reb += z[BX.reb];
      t.oreb += z[BX.oreb];
      t.ast += z[BX.ast];
      t.stl += z[BX.stl];
      t.blk += z[BX.blk];
      t.to += z[BX.to];
      t.pf += z[BX.pf];
      t.fgm += z[BX.fgm];
      t.fga += z[BX.fga];
      t.ftm += z[BX.ftm];
      t.fta += z[BX.fta];
      summen.set(id, t);
    }
  }
  let besterId = -1;
  let bester = -Infinity;
  for (const [id, z] of summen) {
    const w = spielwertProSpiel(z) + (z.min / z.spiele / 60) * 0.1;
    if (w > bester || (w === bester && id < besterId)) {
      bester = w;
      besterId = id;
    }
  }
  const z = summen.get(besterId);
  if (!z) return null;
  return {
    spielerId: besterId,
    teamId: meister,
    text: `${f1(z.pts / z.spiele)} Punkte, ${f1(z.reb / z.spiele)} Rebounds, ${f1(z.ast / z.spiele)} Assists in den Finals`,
  };
}
