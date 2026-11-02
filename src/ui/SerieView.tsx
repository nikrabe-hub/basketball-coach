import { RUNDEN_NAMEN, serienStand } from '../engine/postseason';
import { CONFERENCES } from '../engine/teams';
import type { Liga, Serie, Team } from '../engine/types';
import { TeamLogo } from './TeamLogo';

interface Props {
  liga: Liga;
  serie: Serie;
  onBox: (tag: number, index: number) => void;
}

/** Eine Playoff-Serie: Spielstand und alle bisher gespielten Spiele. */
export function SerieView({ liga, serie, onBox }: Props) {
  const oben = liga.teams[serie.oben] as Team;
  const unten = liga.teams[serie.unten] as Team;
  const kopf = (t: Team, seed: number, siege: number, gewinner: boolean) => (
    <div className={gewinner ? 'box-team sieger' : 'box-team'}>
      <TeamLogo kuerzel={t.kuerzel} farbe1={t.farbe1} farbe2={t.farbe2} groesse={44} />
      <span>
        {t.name} <small>({seed})</small>
      </span>
      <strong>{siege}</strong>
    </div>
  );
  return (
    <div className="boxscore">
      <p className="hinweis">
        {RUNDEN_NAMEN[serie.runde]}
        {serie.conference !== null ? ` · ${CONFERENCES[serie.conference]}` : ''} · {serienStand(liga, serie)}
      </p>
      <div className="box-ergebnis">
        {kopf(oben, serie.seedOben, serie.siegeOben, serie.sieger === serie.oben)}
        <span className="box-trenner">:</span>
        {kopf(unten, serie.seedUnten, serie.siegeUnten, serie.sieger === serie.unten)}
      </div>
      <div className="karte spielplan">
        {serie.spiele.length === 0 && <p className="hinweis">Noch kein Spiel gespielt.</p>}
        {serie.spiele.map((ref, i) => {
          const e = liga.ergebnisse[ref.tag]?.[ref.index];
          if (!e) return null;
          const h = liga.teams[e.heim.teamId] as Team;
          const g = liga.teams[e.gast.teamId] as Team;
          const heimGewinnt = e.heim.punkte > e.gast.punkte;
          return (
            <button key={i} className="ergebniszeile" onClick={() => onBox(ref.tag, ref.index)}>
              <span className="serie-spielnr">Spiel {i + 1}</span>
              <span className={heimGewinnt ? 'erg-name sieger' : 'erg-name'}>{h.kuerzel}</span>
              <span className={heimGewinnt ? 'erg-punkte sieger' : 'erg-punkte'}>{e.heim.punkte}</span>
              <span className="erg-trenner">{e.ot > 0 ? (e.ot === 1 ? 'OT' : `${e.ot}OT`) : ':'}</span>
              <span className={!heimGewinnt ? 'erg-punkte sieger' : 'erg-punkte'}>{e.gast.punkte}</span>
              <span className={!heimGewinnt ? 'erg-name sieger' : 'erg-name'}>{g.kuerzel}</span>
            </button>
          );
        })}
      </div>
      <p className="hinweis">Spiel antippen für den Boxscore. Heimrecht im Muster 2-2-1-1-1.</p>
    </div>
  );
}
