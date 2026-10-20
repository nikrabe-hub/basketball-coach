import { useEffect, useMemo, useState } from 'react';
import { erwartung, kaderVon, staerkeRanking } from '../engine/league';
import { teamName } from '../engine/teams';
import type { Liga } from '../engine/types';
import { kurzName } from './KaderTabelle';
import { TeamLogo } from './TeamLogo';

interface Props {
  liga: Liga;
  coachName: string;
  onWaehle: (teamId: number) => void;
  onNeueLiga: () => void;
  onKaderAnsehen: (teamId: number) => void;
}

/** Bildschirm "Team wählen": alle 30 Teams, sortiert nach Stärke, mit Erwartung der Besitzer. */
export function TeamPicker({ liga, coachName, onWaehle, onNeueLiga, onKaderAnsehen }: Props) {
  const ranking = useMemo(() => staerkeRanking(liga), [liga]);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);

  const waehleZufall = () => {
    const eintrag = ranking[Math.floor(Math.random() * ranking.length)];
    if (eintrag) setGewaehlt(eintrag.teamId);
  };
  const gewaehltesTeam = gewaehlt !== null ? liga.teams[gewaehlt] : undefined;

  // Gewähltes Team (z. B. per Zufall) in die Bildschirmmitte scrollen
  useEffect(() => {
    if (gewaehlt !== null) document.getElementById(`team-${gewaehlt}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [gewaehlt]);

  return (
    <div className="teamwahl">
      <header className="kopfleiste">
        <strong>Team wählen</strong>
        <span>Coach {coachName}</span>
      </header>

      <main className="seite">
        <p className="hinweis">
          Starke Teams haben hohe Erwartungen, schwache Teams mehr Zeit zum Aufbauen. Tippe ein Team an, um Details zu
          sehen.
        </p>
        {ranking.map(({ teamId, staerke, rang }) => {
          const t = liga.teams[teamId];
          if (!t) return null;
          const offen = gewaehlt === teamId;
          return (
            <div key={teamId} id={`team-${teamId}`} className={offen ? 'karte teamkarte offen' : 'karte teamkarte'}>
              <button
                className="teamkarte-kopf"
                aria-expanded={offen}
                onClick={() => setGewaehlt(offen ? null : teamId)}
              >
                <TeamLogo kuerzel={t.kuerzel} farbe1={t.farbe1} farbe2={t.farbe2} groesse={44} />
                <span className="teamkarte-text">
                  <strong>{teamName(t)}</strong>
                  <small>
                    Platz {rang} · Stärke {staerke.toFixed(1).replace('.', ',')} · Markt {t.markt}
                  </small>
                </span>
              </button>
              {offen && (
                <div className="teamkarte-detail">
                  <p>
                    <strong>Erwartung:</strong> {erwartung(rang)}
                  </p>
                  <p className="hinweis">
                    Beste Spieler:{' '}
                    {kaderVon(liga, teamId)
                      .slice(0, 3)
                      .map((s) => `${kurzName(s)} (${s.ovr})`)
                      .join(', ')}
                  </p>
                  <button className="knopf zweit klein" onClick={() => onKaderAnsehen(teamId)}>
                    Kader ansehen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </main>

      <div className="aktionsleiste">
        <div className="knopfreihe">
          <button className="knopf zweit" onClick={waehleZufall}>
            Zufälliges Team
          </button>
          <button className="knopf zweit" onClick={onNeueLiga}>
            Neue Liga
          </button>
        </div>
        <button
          className="knopf gross"
          disabled={!gewaehltesTeam}
          onClick={() => gewaehlt !== null && onWaehle(gewaehlt)}
        >
          {gewaehltesTeam ? `${teamName(gewaehltesTeam)} übernehmen` : 'Wähle ein Team'}
        </button>
      </div>
    </div>
  );
}
