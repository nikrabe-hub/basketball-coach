import { useState } from 'react';
import { RUNDEN_NAMEN, serienStand } from '../engine/postseason';
import { CONFERENCES, teamName } from '../engine/teams';
import type { Liga, PlayInSpiel, Postseason, Serie, SpielDaten, Team } from '../engine/types';
import { TeamLogo } from './TeamLogo';

interface Props {
  spiel: SpielDaten;
  onSerie: (serieId: number) => void;
  onBox: (tag: number, index: number) => void;
}

const KURZ = ['Play-In', 'Runde 1', 'Runde 2', 'Conf. Finals', 'Finals'];

/** Play-In und Playoff-Tableau: Runde wählen, Serie antippen für die Einzelspiele. */
export function PlayoffsView({ spiel, onSerie, onBox }: Props) {
  const { liga } = spiel;
  const post = liga.postseason;
  const aktuell = post ? (post.phase === 'beendet' ? 4 : post.runde) : 0;
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  if (!post) {
    return (
      <p className="hinweis">
        Play-In (Platz 7–10) und Playoffs (16 Teams, Best-of-7) beginnen nach der Hauptrunde. Hier siehst du dann das
        Tableau mit allen Serien.
      </p>
    );
  }
  const runde = Math.min(gewaehlt ?? aktuell, 4);
  const sichtbar = [0, 1, 2, 3, 4].filter((r) => r === 0 || r <= aktuell);

  return (
    <>
      <p className="hinweis">
        {post.phase === 'beendet'
          ? `Die Saison ist beendet. Meister: ${post.meister !== null ? teamName(liga.teams[post.meister] as Team) : '–'}.`
          : post.phase === 'playin'
            ? 'Das Play-In läuft. Die Sieger spielen die letzten zwei Playoff-Plätze je Conference aus.'
            : `Playoffs: ${RUNDEN_NAMEN[post.runde]}.`}
      </p>
      <div className="auswahl scroll" role="tablist" aria-label="Runde">
        {sichtbar.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={runde === r}
            className={runde === r ? 'wahl aktiv' : 'wahl'}
            onClick={() => setGewaehlt(r)}
          >
            {KURZ[r]}
          </button>
        ))}
      </div>
      {runde === 0 ? (
        <PlayInAnsicht liga={liga} post={post} userTeamId={spiel.userTeamId} onBox={onBox} />
      ) : (
        <RundenAnsicht liga={liga} post={post} runde={runde} userTeamId={spiel.userTeamId} onSerie={onSerie} />
      )}
    </>
  );
}

function RundenAnsicht({
  liga,
  post,
  runde,
  userTeamId,
  onSerie,
}: {
  liga: Liga;
  post: Postseason;
  runde: number;
  userTeamId: number;
  onSerie: (id: number) => void;
}) {
  const serien = post.serien.filter((s) => s.runde === runde);
  if (serien.length === 0) return <p className="hinweis">Diese Runde hat noch nicht begonnen.</p>;
  const gruppen: { titel: string; serien: Serie[] }[] =
    runde === 4
      ? [{ titel: 'Finals', serien }]
      : ([0, 1] as const).map((c) => ({
          titel: `${CONFERENCES[c]}-Conference`,
          serien: serien.filter((s) => s.conference === c).sort((a, b) => a.slot - b.slot),
        }));
  return (
    <>
      {gruppen.map((g) => (
        <section key={g.titel}>
          <h2 className="zwischentitel">{g.titel}</h2>
          <div className="serien">
            {g.serien.map((s) => (
              <SerienKarte key={s.id} liga={liga} serie={s} userTeamId={userTeamId} onSerie={onSerie} />
            ))}
          </div>
        </section>
      ))}
      <p className="hinweis">Serie antippen für die einzelnen Spiele.</p>
    </>
  );
}

function SerienKarte({ liga, serie, userTeamId, onSerie }: { liga: Liga; serie: Serie; userTeamId: number; onSerie: (id: number) => void }) {
  const zeile = (teamId: number, seed: number, siege: number) => {
    const t = liga.teams[teamId] as Team;
    const gewinner = serie.sieger === teamId;
    return (
      <div className={gewinner ? 'serie-team sieger' : serie.sieger !== null ? 'serie-team verloren' : 'serie-team'}>
        <TeamLogo kuerzel={t.kuerzel} farbe1={t.farbe1} farbe2={t.farbe2} groesse={26} />
        <span className="serie-seed">{seed}</span>
        <span className="serie-name">{t.stadt}</span>
        <strong>{siege}</strong>
      </div>
    );
  };
  const eigene = serie.oben === userTeamId || serie.unten === userTeamId;
  return (
    <button className={eigene ? 'serie-karte eigene' : 'serie-karte'} onClick={() => onSerie(serie.id)}>
      {zeile(serie.oben, serie.seedOben, serie.siegeOben)}
      {zeile(serie.unten, serie.seedUnten, serie.siegeUnten)}
      <small>{serienStand(liga, serie)}</small>
    </button>
  );
}

function PlayInAnsicht({ liga, post, userTeamId, onBox }: { liga: Liga; post: Postseason; userTeamId: number; onBox: (tag: number, index: number) => void }) {
  return (
    <>
      {([0, 1] as const).map((c) => {
        const spiele = post.playin.filter((p) => p.conference === c);
        const direkt = post.tabelle[c].slice(0, 6).map((id) => liga.teams[id]?.kuerzel ?? '?');
        return (
          <section className="karte" key={c}>
            <h2>{CONFERENCES[c]}-Conference</h2>
            <p className="hinweis">Direkt qualifiziert (Platz 1–6): {direkt.join(', ')}</p>
            <div className="spielplan">
              {spiele.map((p) => (
                <PlayInZeile key={p.id} liga={liga} p={p} userTeamId={userTeamId} onBox={onBox} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

const PLAYIN_TITEL: Record<PlayInSpiel['typ'], string> = { '7v8': 'Platz 7 gegen 8', '9v10': 'Platz 9 gegen 10', finale8: 'Spiel um Platz 8' };

function PlayInZeile({ liga, p, userTeamId, onBox }: { liga: Liga; p: PlayInSpiel; userTeamId: number; onBox: (tag: number, index: number) => void }) {
  const h = p.heim !== null ? (liga.teams[p.heim] as Team) : null;
  const g = p.gast !== null ? (liga.teams[p.gast] as Team) : null;
  const erg = p.spiel ? liga.ergebnisse[p.spiel.tag]?.[p.spiel.index] : undefined;
  const eigene = p.heim === userTeamId || p.gast === userTeamId;
  return (
    <button
      className={eigene ? 'ergebniszeile eigene' : 'ergebniszeile'}
      disabled={!p.spiel}
      onClick={() => p.spiel && onBox(p.spiel.tag, p.spiel.index)}
    >
      <span className="playin-titel">{PLAYIN_TITEL[p.typ]}</span>
      <span className={p.sieger === p.heim && p.sieger !== null ? 'erg-name sieger' : 'erg-name'}>{h?.kuerzel ?? '?'}</span>
      <span className="erg-punkte">{erg ? erg.heim.punkte : ''}</span>
      <span className="erg-trenner">:</span>
      <span className="erg-punkte">{erg ? erg.gast.punkte : ''}</span>
      <span className={p.sieger === p.gast && p.sieger !== null ? 'erg-name sieger' : 'erg-name'}>{g?.kuerzel ?? '?'}</span>
    </button>
  );
}
