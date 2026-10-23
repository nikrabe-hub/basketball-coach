import { useState } from 'react';
import { proSpiel, quote } from '../engine/stats';
import type { Liga, Spieler, SpielerSumme } from '../engine/types';
import { fmt1, fmtProz, wertKlasse } from './format';
import { kurzName } from './KaderTabelle';
import { SortTable, type Spalte } from './SortTable';

interface Zeile {
  sp: Spieler;
  v: SpielerSumme;
}

const pg = (f: (v: SpielerSumme) => number) => (z: Zeile) => proSpiel(z.v, f(z.v));

function baueSpalten(liga: Liga): Spalte<Zeile>[] {
  return [
    { key: 'name', label: 'Spieler', wert: (z) => z.sp.nachname, anzeige: (z) => kurzName(z.sp) },
    { key: 'team', label: 'Team', wert: (z) => (z.sp.teamId === null ? '' : (liga.teams[z.sp.teamId]?.kuerzel ?? '')) },
    { key: 'gp', label: 'SP', wert: (z) => z.v.spiele, zahl: true },
    {
      key: 'min',
      label: 'MIN',
      wert: pg((v) => v.min / 60),
      anzeige: (z) => fmt1(proSpiel(z.v, z.v.min / 60)),
      zahl: true,
    },
    {
      key: 'pts',
      label: 'PTS',
      wert: pg((v) => v.pts),
      anzeige: (z) => fmt1(proSpiel(z.v, z.v.pts)),
      klasse: () => 'fett',
      zahl: true,
    },
    { key: 'reb', label: 'REB', wert: pg((v) => v.reb), anzeige: (z) => fmt1(proSpiel(z.v, z.v.reb)), zahl: true },
    { key: 'ast', label: 'AST', wert: pg((v) => v.ast), anzeige: (z) => fmt1(proSpiel(z.v, z.v.ast)), zahl: true },
    { key: 'stl', label: 'STL', wert: pg((v) => v.stl), anzeige: (z) => fmt1(proSpiel(z.v, z.v.stl)), zahl: true },
    { key: 'blk', label: 'BLK', wert: pg((v) => v.blk), anzeige: (z) => fmt1(proSpiel(z.v, z.v.blk)), zahl: true },
    { key: 'to', label: 'TO', wert: pg((v) => v.to), anzeige: (z) => fmt1(proSpiel(z.v, z.v.to)), zahl: true },
    {
      key: 'fg',
      label: 'FG%',
      wert: (z) => quote(z.v.fgm, z.v.fga),
      anzeige: (z) => fmtProz(quote(z.v.fgm, z.v.fga)),
      zahl: true,
    },
    {
      key: '3p',
      label: '3P%',
      wert: (z) => quote(z.v.tpm, z.v.tpa),
      anzeige: (z) => fmtProz(quote(z.v.tpm, z.v.tpa)),
      zahl: true,
    },
    {
      key: 'ft',
      label: 'FT%',
      wert: (z) => quote(z.v.ftm, z.v.fta),
      anzeige: (z) => fmtProz(quote(z.v.ftm, z.v.fta)),
      zahl: true,
    },
    { key: 'ovr', label: 'OVR', wert: (z) => z.sp.ovr, klasse: (z) => wertKlasse(z.sp.ovr), zahl: true },
  ];
}

interface Props {
  liga: Liga;
  onSpieler: (spielerId: number) => void;
}

/** Statistik aller Spieler der Liga (pro Spiel), sortierbar. */
export function StatistikView({ liga, onSpieler }: Props) {
  const [nurQualifiziert, setNurQualifiziert] = useState(true);
  const alle: Zeile[] = [];
  let maxSpiele = 0;
  for (const b of liga.stand.teams) maxSpiele = Math.max(maxSpiele, b.siege + b.niederlagen);
  for (const [id, v] of Object.entries(liga.stand.spieler)) {
    const sp = liga.spieler[Number(id)];
    if (sp) alle.push({ sp, v });
  }
  if (alle.length === 0)
    return <p className="hinweis">Noch keine Statistik. Simuliere zuerst ein Spiel auf dem Start-Tab.</p>;

  const mindestSpiele = Math.ceil(maxSpiele * 0.25);
  const zeilen = nurQualifiziert ? alle.filter((z) => z.v.spiele >= mindestSpiele) : alle;

  return (
    <>
      <label className="schalter">
        <input type="checkbox" checked={nurQualifiziert} onChange={(e) => setNurQualifiziert(e.target.checked)} />
        <span>
          Nur Spieler mit mindestens {mindestSpiele} {mindestSpiele === 1 ? 'Spiel' : 'Spielen'}
        </span>
      </label>
      <p className="hinweis">Werte pro Spiel. Spalte antippen zum Sortieren, Spieler antippen für die Spielerkarte.</p>
      <SortTable
        spalten={baueSpalten(liga)}
        zeilen={zeilen}
        zeilenKey={(z) => z.sp.id}
        onZeile={(z) => onSpieler(z.sp.id)}
        start={{ key: 'pts', absteigend: true }}
      />
    </>
  );
}
