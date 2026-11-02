import type {
  Liga,
  Saisonstand,
  SpielErgebnis,
  SpielerSumme,
  TeamBilanz,
} from './types';

/** Indizes in einer Boxscore-Zeile (siehe BoxZeile in types.ts). */
export const BX = {
  id: 0,
  min: 1,
  pts: 2,
  reb: 3,
  oreb: 4,
  ast: 5,
  stl: 6,
  blk: 7,
  to: 8,
  pf: 9,
  fgm: 10,
  fga: 11,
  tpm: 12,
  tpa: 13,
  ftm: 14,
  fta: 15,
  pm: 16,
  start: 17,
} as const;

export function leereBilanz(): TeamBilanz {
  return {
    siege: 0,
    niederlagen: 0,
    heimSiege: 0,
    heimNiederlagen: 0,
    auswSiege: 0,
    auswNiederlagen: 0,
    divSiege: 0,
    divNiederlagen: 0,
    confSiege: 0,
    confNiederlagen: 0,
    punkteFuer: 0,
    punkteGegen: 0,
    serie: 0,
    letzte: [],
  };
}

export function leereSumme(): SpielerSumme {
  return {
    spiele: 0,
    starts: 0,
    min: 0,
    pts: 0,
    reb: 0,
    oreb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    to: 0,
    pf: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    pm: 0,
  };
}

export function leererStand(anzahlTeams: number): Saisonstand {
  return {
    teams: Array.from({ length: anzahlTeams }, leereBilanz),
    spieler: {},
  };
}

/** Rechnet ein Spielergebnis in die Saison-Tabellen und -Statistiken ein. */
export function verbucheErgebnis(liga: Liga, erg: SpielErgebnis): void {
  const { heim, gast } = erg;
  const hTeam = liga.teams[heim.teamId];
  const gTeam = liga.teams[gast.teamId];
  const hb = liga.stand.teams[heim.teamId];
  const gb = liga.stand.teams[gast.teamId];
  if (!hTeam || !gTeam || !hb || !gb) throw new Error('verbucheErgebnis: unbekanntes Team');

  const heimGewinnt = heim.punkte > gast.punkte;
  const gleicheDivision = hTeam.conference === gTeam.conference && hTeam.division === gTeam.division;
  const gleicheConference = hTeam.conference === gTeam.conference;

  const buche = (b: TeamBilanz, gewonnen: boolean, zuHause: boolean, fuer: number, gegen: number) => {
    b.punkteFuer += fuer;
    b.punkteGegen += gegen;
    if (gewonnen) {
      b.siege++;
      if (zuHause) b.heimSiege++;
      else b.auswSiege++;
      if (gleicheDivision) b.divSiege++;
      if (gleicheConference) b.confSiege++;
      b.serie = b.serie > 0 ? b.serie + 1 : 1;
    } else {
      b.niederlagen++;
      if (zuHause) b.heimNiederlagen++;
      else b.auswNiederlagen++;
      if (gleicheDivision) b.divNiederlagen++;
      if (gleicheConference) b.confNiederlagen++;
      b.serie = b.serie < 0 ? b.serie - 1 : -1;
    }
    b.letzte.push(gewonnen ? 1 : 0);
    if (b.letzte.length > 10) b.letzte.shift();
  };
  buche(hb, heimGewinnt, true, heim.punkte, gast.punkte);
  buche(gb, !heimGewinnt, false, gast.punkte, heim.punkte);

  for (const box of [heim, gast]) {
    for (const z of box.spieler) {
      const key = String(z[BX.id]);
      const s = (liga.stand.spieler[key] ??= leereSumme());
      s.spiele++;
      s.starts += z[BX.start];
      s.min += z[BX.min];
      s.pts += z[BX.pts];
      s.reb += z[BX.reb];
      s.oreb += z[BX.oreb];
      s.ast += z[BX.ast];
      s.stl += z[BX.stl];
      s.blk += z[BX.blk];
      s.to += z[BX.to];
      s.pf += z[BX.pf];
      s.fgm += z[BX.fgm];
      s.fga += z[BX.fga];
      s.tpm += z[BX.tpm];
      s.tpa += z[BX.tpa];
      s.ftm += z[BX.ftm];
      s.fta += z[BX.fta];
      s.pm += z[BX.pm];
    }
  }
}

// ---------- Anzeige-Helfer ----------

export function spiele(b: TeamBilanz): number {
  return b.siege + b.niederlagen;
}

/** Siegquote 0..1 (0 vor dem ersten Spiel). */
export function siegQuote(b: TeamBilanz): number {
  const n = spiele(b);
  return n === 0 ? 0 : b.siege / n;
}

export function punktDifferenz(b: TeamBilanz): number {
  return b.punkteFuer - b.punkteGegen;
}

// Cache für Direktvergleiche: gilt für genau diese Ergebnisliste und diesen Stand der Hauptrunde
const direktvergleichCache = new WeakMap<object, { tage: number; siege: Map<number, number> }>();

/** Siege von Team a gegen Team b in der Hauptrunde (Schlüssel: a * 1000 + b). */
function direktvergleiche(liga: Liga): Map<number, number> {
  const tage = Math.min(liga.tag, liga.spielplan.length);
  const alt = direktvergleichCache.get(liga.ergebnisse);
  if (alt && alt.tage === tage) return alt.siege;
  const siege = new Map<number, number>();
  for (let tag = 0; tag < tage; tag++) {
    for (const erg of liga.ergebnisse[tag] ?? []) {
      const heimGewinnt = erg.heim.punkte > erg.gast.punkte;
      const gewinner = heimGewinnt ? erg.heim.teamId : erg.gast.teamId;
      const verlierer = heimGewinnt ? erg.gast.teamId : erg.heim.teamId;
      const k = gewinner * 1000 + verlierer;
      siege.set(k, (siege.get(k) ?? 0) + 1);
    }
  }
  direktvergleichCache.set(liga.ergebnisse, { tage, siege });
  return siege;
}

const quoteVon = (siege: number, niederlagen: number) => (siege + niederlagen === 0 ? 0.5 : siege / (siege + niederlagen));

/**
 * Entscheidet Gleichstände bei gleicher Siegquote (vereinfachte NBA-Regeln):
 * 1. Direktvergleich innerhalb der Gruppe, 2. Bilanz gegen Division-Gegner (nur wenn alle aus derselben Division),
 * 3. Bilanz gegen Teams der eigenen Conference, 4. Punktedifferenz, 5. Team-ID (fester Ersatz für den Münzwurf).
 */
function loeseGleichstand(liga: Liga, gruppe: number[]): number[] {
  if (gruppe.length < 2) return gruppe;
  const stand = liga.stand.teams;
  const m = direktvergleiche(liga);
  const direkt = (id: number) => {
    let w = 0;
    let l = 0;
    for (const o of gruppe) {
      if (o === id) continue;
      w += m.get(id * 1000 + o) ?? 0;
      l += m.get(o * 1000 + id) ?? 0;
    }
    return quoteVon(w, l);
  };
  const dRate = new Map(gruppe.map((id) => [id, direkt(id)] as const));
  const sortiert = [...gruppe].sort((a, b) => (dRate.get(b) as number) - (dRate.get(a) as number) || a - b);

  // Teilgruppen mit gleichem Direktvergleich weiter entscheiden
  const ergebnis: number[] = [];
  for (let i = 0; i < sortiert.length; ) {
    let j = i + 1;
    while (j < sortiert.length && Math.abs((dRate.get(sortiert[j] as number) as number) - (dRate.get(sortiert[i] as number) as number)) < 1e-9) j++;
    const teil = sortiert.slice(i, j);
    if (teil.length > 1) {
      const gleicheDivision = teil.every((id) => {
        const t = liga.teams[id];
        const t0 = liga.teams[teil[0] as number];
        return t && t0 && t.conference === t0.conference && t.division === t0.division;
      });
      const divQ = (id: number) => quoteVon((stand[id] as TeamBilanz).divSiege, (stand[id] as TeamBilanz).divNiederlagen);
      const confQ = (id: number) => quoteVon((stand[id] as TeamBilanz).confSiege, (stand[id] as TeamBilanz).confNiederlagen);
      teil.sort(
        (a, b) =>
          (gleicheDivision ? divQ(b) - divQ(a) : 0) ||
          confQ(b) - confQ(a) ||
          punktDifferenz(stand[b] as TeamBilanz) - punktDifferenz(stand[a] as TeamBilanz) ||
          a - b,
      );
    }
    ergebnis.push(...teil);
    i = j;
  }
  return ergebnis;
}

/** Tabellenreihenfolge: Siegquote, bei Gleichstand siehe `loeseGleichstand`. */
export function sortiereTabelle(liga: Liga, teamIds: number[]): number[] {
  const stand = liga.stand.teams;
  const q = (id: number) => siegQuote(stand[id] as TeamBilanz);
  const grob = [...teamIds].sort((a, b) => q(b) - q(a) || a - b);
  const ergebnis: number[] = [];
  for (let i = 0; i < grob.length; ) {
    let j = i + 1;
    while (j < grob.length && Math.abs(q(grob[j] as number) - q(grob[i] as number)) < 1e-9) j++;
    ergebnis.push(...loeseGleichstand(liga, grob.slice(i, j)));
    i = j;
  }
  return ergebnis;
}

/** Spiele Rückstand auf den Ersten der Gruppe. */
export function spieleZurueck(erster: TeamBilanz, b: TeamBilanz): number {
  return (erster.siege - b.siege + (b.niederlagen - erster.niederlagen)) / 2;
}

/** "W3" / "L2" oder "–" vor dem ersten Spiel. */
export function serieText(b: TeamBilanz): string {
  if (b.serie === 0) return '–';
  return b.serie > 0 ? `S${b.serie}` : `N${-b.serie}`;
}

/** Bilanz der letzten (bis zu) 10 Spiele, z. B. "7–3". */
export function letzte10Text(b: TeamBilanz): string {
  const s = b.letzte.reduce((a, x) => a + x, 0);
  return `${s}–${b.letzte.length - s}`;
}

export function proSpiel(summe: SpielerSumme, wert: number): number {
  return summe.spiele === 0 ? 0 : wert / summe.spiele;
}

/** Wurfquote 0..1 (0 ohne Versuche). */
export function quote(getroffen: number, versucht: number): number {
  return versucht === 0 ? 0 : getroffen / versucht;
}
