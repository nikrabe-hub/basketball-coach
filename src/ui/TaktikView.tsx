import {
  FOKUS_OPTIONEN,
  INTENSITAET_OPTIONEN,
  TEMPO_OPTIONEN,
  VERTEIDIGUNG_OPTIONEN,
  WURF_OPTIONEN,
  type Option,
} from '../engine/tactics';
import { STANDARD_TAKTIK, type SpielDaten, type Taktik } from '../engine/types';

interface Props {
  spiel: SpielDaten;
  onAendern: (neu: SpielDaten) => Promise<void>;
}

function Gruppe<T extends string>({
  titel,
  optionen,
  wert,
  onWahl,
}: {
  titel: string;
  optionen: Option<T>[];
  wert: T;
  onWahl: (w: T) => void;
}) {
  const gewaehlt = optionen.find((o) => o.wert === wert);
  return (
    <section className="karte">
      <h2>{titel}</h2>
      <div className="auswahl" role="radiogroup" aria-label={titel}>
        {optionen.map((o) => (
          <button
            key={o.wert}
            role="radio"
            aria-checked={o.wert === wert}
            className={o.wert === wert ? 'wahl aktiv' : 'wahl'}
            onClick={() => onWahl(o.wert)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {gewaehlt && <p className="hinweis">{gewaehlt.hinweis}</p>}
    </section>
  );
}

/** Taktik des eigenen Teams: fünf Einstellungen, jede mit Erklärung von Vor- und Nachteil. */
export function TaktikView({ spiel, onAendern }: Props) {
  const t = spiel.coaching.taktik;
  const setze = (teil: Partial<Taktik>) =>
    void onAendern({ ...spiel, coaching: { ...spiel.coaching, taktik: { ...t, ...teil } } });
  const istStandard = (Object.keys(STANDARD_TAKTIK) as (keyof Taktik)[]).every((k) => t[k] === STANDARD_TAKTIK[k]);

  return (
    <>
      <p className="hinweis">
        Die Taktik gilt ab dem nächsten Spiel. Keine Einstellung ist für alle Teams die beste: Sie hilft, wenn sie zu den
        Stärken deiner Spieler passt. Eine einzelne Einstellung ändert ein Spiel nur um ein bis zwei Punkte – auf die Mischung
        kommt es an.
      </p>
      <Gruppe titel="Tempo" optionen={TEMPO_OPTIONEN} wert={t.tempo} onWahl={(w) => setze({ tempo: w })} />
      <Gruppe titel="Wurfauswahl" optionen={WURF_OPTIONEN} wert={t.wurf} onWahl={(w) => setze({ wurf: w })} />
      <Gruppe titel="Offensiv-Fokus" optionen={FOKUS_OPTIONEN} wert={t.fokus} onWahl={(w) => setze({ fokus: w })} />
      <Gruppe titel="Verteidigung" optionen={VERTEIDIGUNG_OPTIONEN} wert={t.verteidigung} onWahl={(w) => setze({ verteidigung: w })} />
      <Gruppe titel="Intensität" optionen={INTENSITAET_OPTIONEN} wert={t.intensitaet} onWahl={(w) => setze({ intensitaet: w })} />
      <button className="knopf zweit abstand" disabled={istStandard} onClick={() => setze({ ...STANDARD_TAKTIK })}>
        Auf Standard zurücksetzen
      </button>
    </>
  );
}
