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

/** Tabellenreihenfolge: Siegquote, dann Punktedifferenz, dann Team-ID. */
export function sortiereTabelle(liga: Liga, teamIds: number[]): number[] {
  const stand = liga.stand.teams;
  return [...teamIds].sort((a, b) => {
    const ba = stand[a] as TeamBilanz;
    const bb = stand[b] as TeamBilanz;
    return (
      siegQuote(bb) - siegQuote(ba) ||
      punktDifferenz(bb) - punktDifferenz(ba) ||
      a - b
    );
  });
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
