import type { SlotInfo } from '../store/types';
import { TeamLogo } from './TeamLogo';

interface Props {
  slots: SlotInfo[] | null;
  fehler: string | null;
  onNeu: (slot: number) => void;
  onWeiter: (slot: number) => void;
  onLoeschen: (slot: number) => void;
}

function datum(ms: number): string {
  return new Date(ms).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Hauptmenü: die Speicherplätze. */
export function SlotScreen({ slots, fehler, onNeu, onWeiter, onLoeschen }: Props) {
  return (
    <main className="seite slots">
      <header className="kopf-gross">
        <div className="logo">🏀</div>
        <h1>Basketball Coach</h1>
        <p>Wähle einen Speicherplatz</p>
      </header>

      {fehler && <p className="fehler">{fehler}</p>}
      {!slots && !fehler && <p className="hinweis">Lade Spielstände …</p>}

      {slots?.map((s) =>
        s.leer ? (
          <button key={s.slot} className="karte slot leer" onClick={() => onNeu(s.slot)}>
            <span className="slot-nr">Platz {s.slot}</span>
            <span className="slot-titel">Leer – neues Spiel starten</span>
          </button>
        ) : (
          <div key={s.slot} className="karte slot">
            <span className="slot-nr">Platz {s.slot}</span>
            <span className="slot-titel">Coach {s.coachName}</span>
            {s.teamName && (
              <span className="slot-team">
                {s.teamKuerzel && s.teamFarbe1 && s.teamFarbe2 && (
                  <TeamLogo kuerzel={s.teamKuerzel} farbe1={s.teamFarbe1} farbe2={s.teamFarbe2} groesse={24} />
                )}
                {s.teamName}
              </span>
            )}
            <span className="slot-info">
              Saison {s.saison}
              {s.geaendertAm ? ` · zuletzt ${datum(s.geaendertAm)}` : ''}
            </span>
            <div className="knopfreihe">
              <button className="knopf klein gefahr" onClick={() => onLoeschen(s.slot)}>
                Löschen
              </button>
              <button className="knopf klein" onClick={() => onWeiter(s.slot)}>
                Weiter spielen
              </button>
            </div>
          </div>
        ),
      )}
    </main>
  );
}
