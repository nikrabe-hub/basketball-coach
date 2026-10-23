import { useState } from 'react';
import { CONFIG } from '../engine/config';
import {
  letzte10Text,
  punktDifferenz,
  serieText,
  siegQuote,
  sortiereTabelle,
  spieleZurueck,
  spiele,
} from '../engine/stats';
import { CONFERENCES, DIVISIONEN } from '../engine/teams';
import type { Liga, Team, TeamBilanz } from '../engine/types';
import { fmt1, fmtPlus, plusKlasse } from './format';
import { SortTable, type Spalte } from './SortTable';

interface Zeile {
  team: Team;
  b: TeamBilanz;
  rang: number;
  zurueck: number;
}

const prozent = (b: TeamBilanz) =>
  spiele(b) === 0 ? '–' : siegQuote(b).toFixed(3).replace('0.', '.').replace('1.000', '1.00');
const proSpiel = (b: TeamBilanz, wert: number) => (spiele(b) === 0 ? 0 : wert / spiele(b));

const SPALTEN: Spalte<Zeile>[] = [
  {
    key: 'team',
    label: 'Team',
    wert: (z) => z.rang,
    anzeige: (z) => (
      <>
        <span className="rang">{z.rang}</span> {z.team.stadt}
      </>
    ),
  },
  { key: 's', label: 'S', wert: (z) => z.b.siege, klasse: () => 'fett', zahl: true },
  { key: 'n', label: 'N', wert: (z) => z.b.niederlagen, zahl: true },
  { key: 'pct', label: 'PCT', wert: (z) => siegQuote(z.b), anzeige: (z) => prozent(z.b), zahl: true },
  {
    key: 'gb',
    label: 'GB',
    wert: (z) => -z.zurueck,
    anzeige: (z) => (z.zurueck === 0 ? '–' : fmt1(z.zurueck)),
    zahl: true,
  },
  {
    key: 'heim',
    label: 'Heim',
    wert: (z) => z.b.heimSiege,
    anzeige: (z) => `${z.b.heimSiege}-${z.b.heimNiederlagen}`,
    zahl: true,
  },
  {
    key: 'ausw',
    label: 'Ausw',
    wert: (z) => z.b.auswSiege,
    anzeige: (z) => `${z.b.auswSiege}-${z.b.auswNiederlagen}`,
    zahl: true,
  },
  {
    key: 'div',
    label: 'Div',
    wert: (z) => z.b.divSiege,
    anzeige: (z) => `${z.b.divSiege}-${z.b.divNiederlagen}`,
    zahl: true,
  },
  {
    key: 'pf',
    label: 'PF',
    wert: (z) => proSpiel(z.b, z.b.punkteFuer),
    anzeige: (z) => fmt1(proSpiel(z.b, z.b.punkteFuer)),
    zahl: true,
  },
  {
    key: 'pa',
    label: 'PA',
    wert: (z) => proSpiel(z.b, z.b.punkteGegen),
    anzeige: (z) => fmt1(proSpiel(z.b, z.b.punkteGegen)),
    zahl: true,
  },
  {
    key: 'diff',
    label: 'Diff',
    wert: (z) => proSpiel(z.b, punktDifferenz(z.b)),
    anzeige: (z) => fmtPlus(proSpiel(z.b, punktDifferenz(z.b)), 1),
    klasse: (z) => plusKlasse(punktDifferenz(z.b)),
    zahl: true,
  },
  {
    key: 'serie',
    label: 'Serie',
    wert: (z) => z.b.serie,
    anzeige: (z) => serieText(z.b),
    klasse: (z) => plusKlasse(z.b.serie),
    zahl: true,
  },
  {
    key: 'l10',
    label: 'L10',
    wert: (z) => z.b.letzte.reduce((a, x) => a + x, 0),
    anzeige: (z) => letzte10Text(z.b),
    zahl: true,
  },
];

function zeilen(liga: Liga, ids: number[]): Zeile[] {
  const sortiert = sortiereTabelle(liga, ids);
  const stand = liga.stand.teams;
  const erster = stand[sortiert[0] as number] as TeamBilanz;
  return sortiert.map((id, i) => ({
    team: liga.teams[id] as Team,
    b: stand[id] as TeamBilanz,
    rang: i + 1,
    zurueck: spieleZurueck(erster, stand[id] as TeamBilanz),
  }));
}

interface Props {
  liga: Liga;
  userTeamId: number;
  onTeam: (teamId: number) => void;
}

/** Tabellen: nach Conference (mit Playoff-Zonen) oder nach Division. */
export function TabelleView({ liga, userTeamId, onTeam }: Props) {
  const [modus, setModus] = useState<'conference' | 'division'>('conference');
  const direktBis: number = CONFIG.saison.playInPlaetze[0] - 1;
  const playInBis: number = CONFIG.saison.playInPlaetze[3];

  const tabelle = (zs: Zeile[], zonen: boolean) => (
    <SortTable
      spalten={SPALTEN}
      zeilen={zs}
      zeilenKey={(z) => z.team.id}
      onZeile={(z) => onTeam(z.team.id)}
      start={{ key: 'team', absteigend: false }}
      hervorheben={(z) => z.team.id === userTeamId}
      zeilenKlasse={(z) =>
        !zonen ? '' : z.rang <= direktBis ? 'zone-direkt' : z.rang <= playInBis ? 'zone-playin' : ''
      }
    />
  );

  return (
    <>
      <div className="auswahl" role="tablist" aria-label="Tabellenart">
        <button
          role="tab"
          aria-selected={modus === 'conference'}
          className={modus === 'conference' ? 'wahl aktiv' : 'wahl'}
          onClick={() => setModus('conference')}
        >
          Conference
        </button>
        <button
          role="tab"
          aria-selected={modus === 'division'}
          className={modus === 'division' ? 'wahl aktiv' : 'wahl'}
          onClick={() => setModus('division')}
        >
          Division
        </button>
      </div>
      {CONFERENCES.map((confName, c) => {
        const alle = liga.teams.filter((t) => t.conference === c).map((t) => t.id);
        return (
          <section key={confName}>
            <h2 className="zwischentitel">{confName}-Conference</h2>
            {modus === 'conference'
              ? tabelle(zeilen(liga, alle), true)
              : DIVISIONEN.map((divName, d) => (
                  <div key={divName} className="divisionsblock">
                    <h3 className="klein-titel">{divName}</h3>
                    {tabelle(
                      zeilen(
                        liga,
                        liga.teams.filter((t) => t.conference === c && t.division === d).map((t) => t.id),
                      ),
                      false,
                    )}
                  </div>
                ))}
          </section>
        );
      })}
      {modus === 'conference' && (
        <p className="hinweis legende">
          <span className="punkt zone-direkt-punkt" /> Plätze 1–{direktBis}: direkt für die Playoffs ·{' '}
          <span className="punkt zone-playin-punkt" /> Plätze {direktBis + 1}–{playInBis}: Play-In. Antippen für Kader
          und Details. GB = Spiele Rückstand, PF/PA = Punkte pro Spiel, L10 = letzte 10 Spiele.
        </p>
      )}
    </>
  );
}
