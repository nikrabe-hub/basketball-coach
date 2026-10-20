import { kaderVon } from '../engine/league';
import type { Liga, Spieler } from '../engine/types';
import { fmtGeldKurz, wertKlasse } from './format';
import { SortTable, type Spalte } from './SortTable';

export function kurzName(s: Spieler): string {
  return `${s.vorname.charAt(0)}. ${s.nachname}`;
}

const SPALTEN: Spalte<Spieler>[] = [
  { key: 'name', label: 'Name', wert: (s) => s.nachname, anzeige: kurzName },
  { key: 'pos', label: 'Pos', wert: (s) => ['PG', 'SG', 'SF', 'PF', 'C'].indexOf(s.position), anzeige: (s) => s.position, zahl: true },
  { key: 'ovr', label: 'OVR', wert: (s) => s.ovr, klasse: (s) => `fett ${wertKlasse(s.ovr)}`, zahl: true },
  { key: 'pot', label: 'POT', wert: (s) => s.pot, klasse: (s) => wertKlasse(s.pot), zahl: true },
  { key: 'alter', label: 'Alter', wert: (s) => s.alter, zahl: true },
  { key: 'gehalt', label: 'Gehalt', wert: (s) => s.vertrag.gehalt, anzeige: (s) => fmtGeldKurz(s.vertrag.gehalt), zahl: true },
  { key: 'jahre', label: 'Jahre', wert: (s) => s.vertrag.jahre, zahl: true },
  { key: 'groesse', label: 'Größe', wert: (s) => s.groesseCm, anzeige: (s) => `${s.groesseCm} cm`, zahl: true },
];

interface Props {
  liga: Liga;
  teamId: number;
  onSpieler: (spielerId: number) => void;
}

/** Kader eines Teams als sortierbare, wischbare Tabelle. Tippen auf eine Zeile öffnet die Spielerkarte. */
export function KaderTabelle({ liga, teamId, onSpieler }: Props) {
  return (
    <SortTable
      spalten={SPALTEN}
      zeilen={kaderVon(liga, teamId)}
      zeilenKey={(s) => s.id}
      onZeile={(s) => onSpieler(s.id)}
      start={{ key: 'ovr', absteigend: true }}
    />
  );
}
