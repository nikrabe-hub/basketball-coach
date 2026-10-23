import { useState } from 'react';
import { formatDatum } from '../engine/schedule';
import type { Liga, Team } from '../engine/types';
import { TeamLogo } from './TeamLogo';

interface Props {
  liga: Liga;
  saison: number;
  userTeamId: number;
  onBox: (tag: number, index: number) => void;
}

/** Ergebnisse aller Spiele eines Tages, mit Blättern von Tag zu Tag. */
export function ErgebnisseView({ liga, saison, userTeamId, onBox }: Props) {
  const letzter = liga.tag - 1;
  const [gewaehlt, setTag] = useState<number | null>(null);
  if (letzter < 0) return <p className="hinweis">Noch kein Spiel gespielt. Simuliere ein Spiel auf dem Start-Tab.</p>;
  const tag = Math.min(gewaehlt ?? letzter, letzter);
  const spieleDesTages = liga.ergebnisse[tag] ?? [];

  return (
    <>
      <div className="tagwahl">
        <button
          className="knopf zweit klein"
          disabled={tag <= 0}
          onClick={() => setTag(tag - 1)}
          aria-label="Vorheriger Tag"
        >
          ◀
        </button>
        <div>
          <strong>{formatDatum(saison, tag)}</strong>
          <span>
            Tag {tag + 1} von {liga.spielplan.length}
          </span>
        </div>
        <button
          className="knopf zweit klein"
          disabled={tag >= letzter}
          onClick={() => setTag(tag + 1)}
          aria-label="Nächster Tag"
        >
          ▶
        </button>
      </div>
      <div className="karte spielplan">
        {spieleDesTages.length === 0 && <p className="hinweis">Kein Spiel an diesem Tag.</p>}
        {spieleDesTages.map((e, i) => {
          const h = liga.teams[e.heim.teamId] as Team;
          const g = liga.teams[e.gast.teamId] as Team;
          const heimGewinnt = e.heim.punkte > e.gast.punkte;
          const eigen = h.id === userTeamId || g.id === userTeamId;
          return (
            <button key={i} className={eigen ? 'ergebniszeile eigene' : 'ergebniszeile'} onClick={() => onBox(tag, i)}>
              <TeamLogo kuerzel={h.kuerzel} farbe1={h.farbe1} farbe2={h.farbe2} groesse={26} />
              <span className={heimGewinnt ? 'erg-name sieger' : 'erg-name'}>{h.kuerzel}</span>
              <span className={heimGewinnt ? 'erg-punkte sieger' : 'erg-punkte'}>{e.heim.punkte}</span>
              <span className="erg-trenner">{e.ot > 0 ? (e.ot === 1 ? 'OT' : `${e.ot}OT`) : ':'}</span>
              <span className={!heimGewinnt ? 'erg-punkte sieger' : 'erg-punkte'}>{e.gast.punkte}</span>
              <span className={!heimGewinnt ? 'erg-name sieger' : 'erg-name'}>{g.kuerzel}</span>
              <TeamLogo kuerzel={g.kuerzel} farbe1={g.farbe1} farbe2={g.farbe2} groesse={26} />
            </button>
          );
        })}
      </div>
    </>
  );
}
