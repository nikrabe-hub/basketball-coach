import { HEIM_MUSTER, RUNDEN_NAMEN, laufendeSerieVon, nochImRennen, serienStand } from '../engine/postseason';
import { ergebnisText, erreichteRunde } from '../engine/karriere';
import type { SimulationsZiel } from '../engine/season';
import { teamName } from '../engine/teams';
import type { BesitzerTyp, PlayInSpiel, Postseason, SpielDaten, Team } from '../engine/types';
import { TeamLogo } from './TeamLogo';

const BESITZER_TEXT: Record<BesitzerTyp, string> = {
  geduldig: 'geduldig',
  ungeduldig: 'ungeduldig',
  sparsam: 'sparsam',
  siegen: 'will um jeden Preis gewinnen',
};

interface Props {
  spiel: SpielDaten;
  onSimuliere: (z: SimulationsZiel) => void;
  laeuft: boolean;
  fehler: string | null;
  onTab: (t: 'liga') => void;
}

const kurz = (liga: SpielDaten['liga'], id: number | null) => (id === null ? '?' : teamName(liga.teams[id] as Team));

function playInText(spiel: SpielDaten, post: Postseason): string {
  const { liga, userTeamId: u } = spiel;
  const ut = liga.teams[u] as Team;
  const platz = post.tabelle[ut.conference].indexOf(u) + 1;
  const eigene: PlayInSpiel[] = post.playin.filter((p) => p.heim === u || p.gast === u);
  const offen = nochImRennen(post, u);
  if (platz <= 6) return `Du bist als Nr. ${platz} direkt für die Playoffs qualifiziert. Das Play-In der Plätze 7–10 läuft noch.`;
  if (platz > 10) return `Du hast mit Platz ${platz} die Playoffs verpasst. Die anderen Teams spielen das Play-In aus.`;
  const naechstes = post.playin.find((p) => p.spiel === null && (p.heim === u || p.gast === u));
  if (naechstes) {
    const gegner = naechstes.heim === u ? naechstes.gast : naechstes.heim;
    return `Dein Play-In-Spiel gegen ${kurz(liga, gegner)} (${naechstes.heim === u ? 'zu Hause' : 'auswärts'}).`;
  }
  if (offen) return 'Du spielst im Play-In noch um Platz 8.';
  return eigene.length > 0 ? 'Dein Play-In ist gespielt.' : 'Du bist im Play-In.';
}

/** Start-Tab nach der Hauptrunde: Stand des Spieler-Teams in Play-In und Playoffs und die Simulationsknöpfe. */
export function PostseasonKarte({ spiel, onSimuliere, laeuft, fehler, onTab }: Props) {
  const { liga, userTeamId: u } = spiel;
  const post = liga.postseason;
  if (!post) {
    return (
      <section className="karte">
        <h2>Hauptrunde beendet</h2>
        <p className="hinweis">Play-In und Playoffs werden vorbereitet.</p>
      </section>
    );
  }
  const imRennen = nochImRennen(post, u);

  if (post.phase === 'beendet') {
    const meister = liga.teams[post.meister as number] as Team;
    const ergebnis = ergebnisText(erreichteRunde(post, u));
    const rueck = spiel.historie[spiel.historie.length - 1];
    return (
      <section className="karte">
        <h2>Saison beendet</h2>
        <div className="gegner">
          <TeamLogo kuerzel={meister.kuerzel} farbe1={meister.farbe1} farbe2={meister.farbe2} groesse={40} />
          <div>
            <strong>Meister: {teamName(meister)}</strong>
            <span>
              Dein Team: {rueck ? `${rueck.userSiege}–${rueck.userNiederlagen}, ` : ''}
              {ergebnis}
            </span>
          </div>
        </div>
        <button className="knopf zweit abstand" onClick={() => onTab('liga')}>
          Awards, Tableau und Historie ansehen
        </button>
        <p className="hinweis">
          Hier endet die Saison vorerst. Draft, Vertragsverlängerungen, Free Agency und der Start der nächsten Saison folgen in
          Meilenstein 5.
        </p>
      </section>
    );
  }

  let status: string;
  if (post.phase === 'playin') status = playInText(spiel, post);
  else {
    const serie = laufendeSerieVon(post, u);
    if (serie) {
      const gegnerId = serie.oben === u ? serie.unten : serie.oben;
      const nr = serie.spiele.length + 1;
      const zuHause = (HEIM_MUSTER[nr - 1] ?? true) === (serie.oben === u);
      status = `${RUNDEN_NAMEN[serie.runde]} gegen ${kurz(liga, gegnerId)}: ${serienStand(liga, serie)}. Nächstes Spiel: Spiel ${nr} (${zuHause ? 'zu Hause' : 'auswärts'}).`;
    } else {
      status = `${ergebnisText(erreichteRunde(post, u))}. Die Playoffs laufen ohne dich weiter.`;
    }
  }

  const titel = post.phase === 'playin' ? 'Play-In' : `Playoffs: ${RUNDEN_NAMEN[post.runde]}`;
  return (
    <section className="karte">
      <h2>{titel}</h2>
      <p>{status}</p>
      {imRennen && (
        <button className="knopf" disabled={laeuft} onClick={() => onSimuliere('naechstesSpiel')}>
          Nächstes Spiel simulieren
        </button>
      )}
      <div className="knopfreihe">
        <button className="knopf zweit klein" disabled={laeuft} onClick={() => onSimuliere('serie')}>
          {imRennen ? (post.phase === 'playin' ? 'Bis Ende Play-In' : 'Bis Serienende') : post.phase === 'playin' ? 'Play-In simulieren' : 'Runde simulieren'}
        </button>
        <button className="knopf zweit klein" disabled={laeuft} onClick={() => onSimuliere('playoffsEnde')}>
          Bis Ende der Playoffs
        </button>
      </div>
      {fehler && <p className="fehler">{fehler}</p>}
      <button className="knopf zweit abstand" onClick={() => onTab('liga')}>
        Tableau ansehen
      </button>
      <p className="hinweis">Rotation und Taktik im Team-Tab gelten auch in den Playoffs. In den Playoffs spielen die Stars mehr.</p>
    </section>
  );
}

/** Besitzer-Ziele, Jobsicherheit und Coach-Ruf. */
export function ZielKarte({ spiel }: { spiel: SpielDaten }) {
  const { karriere, liga, userTeamId } = spiel;
  const team = liga.teams[userTeamId] as Team;
  const b = liga.stand.teams[userTeamId];
  const balken = (wert: number, klasse: string) => (
    <div className="fortschritt" aria-hidden="true">
      <div className={`fortschritt-balken ${klasse}`} style={{ width: `${wert}%` }} />
    </div>
  );
  return (
    <section className="karte">
      <h2>Ziele &amp; Jobsicherheit</h2>
      <p className="hinweis">Dein Besitzer ist {BESITZER_TEXT[team.besitzer]}. Ziele dieser Saison:</p>
      <ul className="ziele">
        {karriere.ziele.map((z) => (
          <li key={z.text} className={z.erfuellt === true ? 'erfuellt' : z.erfuellt === false ? 'verfehlt' : ''}>
            <span aria-hidden="true">{z.erfuellt === true ? '✔' : z.erfuellt === false ? '✖' : '○'}</span>
            <span>
              {z.text}
              {z.typ === 'siege' && z.erfuellt === null && b ? ` (bisher ${b.siege})` : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="fakten">
        <span>Jobsicherheit</span>
        <span>{karriere.jobsicherheit} von 100</span>
        <span>Coach-Ruf</span>
        <span>{karriere.ruf.toFixed(0)} von 100</span>
      </div>
      {balken(karriere.jobsicherheit, karriere.jobsicherheit < 30 ? 'gefahr' : '')}
      <p className="hinweis">Nach den Playoffs werden die Ziele bewertet. Entlassung und Jobangebote folgen in Meilenstein 6.</p>
    </section>
  );
}
