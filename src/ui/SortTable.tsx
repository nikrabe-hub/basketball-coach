import { useState, type ReactNode } from 'react';

export interface Spalte<T> {
  key: string;
  label: string;
  /** Wert zum Sortieren (Zahl oder Text) */
  wert: (zeile: T) => number | string;
  /** Anzeige in der Zelle (Standard: der Sortierwert) */
  anzeige?: (zeile: T) => ReactNode;
  klasse?: (zeile: T) => string;
  /** Zahlen rechtsbündig */
  zahl?: boolean;
}

interface Props<T> {
  spalten: Spalte<T>[];
  zeilen: T[];
  zeilenKey: (zeile: T) => string | number;
  onZeile?: (zeile: T) => void;
  /** Spalte, nach der zuerst sortiert wird, und Richtung */
  start?: { key: string; absteigend: boolean };
  /** Zeile hervorheben (z. B. eigenes Team) */
  hervorheben?: (zeile: T) => boolean;
}

/**
 * Tabelle für das Handy: horizontal wischbar, die erste Spalte bleibt stehen,
 * Sortieren per Tippen auf die Spaltenüberschrift.
 */
export function SortTable<T>({ spalten, zeilen, zeilenKey, onZeile, start, hervorheben }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(start?.key ?? null);
  const [absteigend, setAbsteigend] = useState(start?.absteigend ?? true);

  const sortSpalte = spalten.find((s) => s.key === sortKey);
  const sortiert = sortSpalte
    ? [...zeilen].sort((a, b) => {
        const x = sortSpalte.wert(a);
        const y = sortSpalte.wert(b);
        const ergebnis = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'de');
        return absteigend ? -ergebnis : ergebnis;
      })
    : zeilen;

  const tippeKopf = (s: Spalte<T>) => {
    if (sortKey === s.key) {
      setAbsteigend(!absteigend);
    } else {
      setSortKey(s.key);
      // Zahlen zuerst absteigend (beste oben), Texte aufsteigend
      setAbsteigend(!!s.zahl);
    }
  };

  return (
    <div className="tabelle-box">
      <table className="tabelle">
        <thead>
          <tr>
            {spalten.map((s, i) => (
              <th
                key={s.key}
                className={`${i === 0 ? 'fix' : ''} ${s.zahl ? 'zahl' : ''}`}
                onClick={() => tippeKopf(s)}
                aria-sort={sortKey === s.key ? (absteigend ? 'descending' : 'ascending') : 'none'}
              >
                {s.label}
                {sortKey === s.key && <span className="pfeil">{absteigend ? ' ▼' : ' ▲'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortiert.map((z) => (
            <tr
              key={zeilenKey(z)}
              className={`${onZeile ? 'klickbar' : ''} ${hervorheben?.(z) ? 'eigene' : ''}`}
              onClick={onZeile ? () => onZeile(z) : undefined}
            >
              {spalten.map((s, i) => (
                <td key={s.key} className={`${i === 0 ? 'fix' : ''} ${s.zahl ? 'zahl' : ''} ${s.klasse?.(z) ?? ''}`}>
                  {s.anzeige ? s.anzeige(z) : s.wert(z)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
