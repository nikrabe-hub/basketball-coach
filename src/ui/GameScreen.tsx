import { useState } from 'react';
import { CONFIG } from '../engine/config';
import type { SpielDaten } from '../engine/types';
import type { TabId } from './nav';

interface Props {
  slot: number;
  spiel: SpielDaten;
  tab: TabId;
  onTab: (tab: TabId) => void;
  onAendern: (neu: SpielDaten) => Promise<void>;
  onZuDenSlots: () => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'start', label: 'Start', icon: '🏠' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'liga', label: 'Liga', icon: '📊' },
  { id: 'buero', label: 'Büro', icon: '💼' },
  { id: 'menue', label: 'Menü', icon: '☰' },
];

export function GameScreen({ slot, spiel, tab, onTab, onAendern, onZuDenSlots }: Props) {
  return (
    <div className="spiel">
      <header className="kopfleiste">
        <strong>Coach {spiel.coach.name}</strong>
        <span>Saison {spiel.saison}</span>
      </header>

      <main className="seite">
        {tab === 'start' && <StartTab />}
        {tab === 'team' && (
          <Platzhalter
            titel="Team"
            inhalt="Kader, Rotation, Taktik, Verträge und Gehaltsstatus."
            meilenstein="2–4"
          />
        )}
        {tab === 'liga' && (
          <Platzhalter
            titel="Liga"
            inhalt="Tabellen, Spielplan und Ergebnisse, Bestenlisten und Historie."
            meilenstein="2–3"
          />
        )}
        {tab === 'buero' && (
          <Platzhalter
            titel="Büro"
            inhalt="Trades, Free Agency, Draft & Scouting und dein Coach-Profil."
            meilenstein="5–6"
          />
        )}
        {tab === 'menue' && (
          <MenueTab slot={slot} spiel={spiel} onAendern={onAendern} onZuDenSlots={onZuDenSlots} />
        )}
      </main>

      <nav className="tableiste" aria-label="Hauptnavigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab aktiv' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => t.id !== tab && onTab(t.id)}
          >
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tab-text">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function StartTab() {
  return (
    <>
      <h1>Start</h1>
      <section className="karte">
        <h2>Nächstes Spiel</h2>
        <p className="hinweis">
          Noch kein Spielplan. Der Liga-Generator mit 30 Teams kommt in Meilenstein 2, die
          Spielsimulation in Meilenstein 3.
        </p>
        <button className="knopf" disabled>
          Nächstes Spiel simulieren
        </button>
      </section>
      <section className="karte">
        <h2>Posteingang</h2>
        <p className="hinweis">Keine Nachrichten.</p>
      </section>
      <section className="karte">
        <h2>Ziele &amp; Jobsicherheit</h2>
        <p className="hinweis">Die Besitzer-Ziele kommen in Meilenstein 6.</p>
      </section>
    </>
  );
}

function Platzhalter({
  titel,
  inhalt,
  meilenstein,
}: {
  titel: string;
  inhalt: string;
  meilenstein: string;
}) {
  return (
    <>
      <h1>{titel}</h1>
      <section className="karte">
        <p>{inhalt}</p>
        <p className="hinweis">Kommt in Meilenstein {meilenstein}.</p>
      </section>
    </>
  );
}

function MenueTab({
  slot,
  spiel,
  onAendern,
  onZuDenSlots,
}: Pick<Props, 'slot' | 'spiel' | 'onAendern' | 'onZuDenSlots'>) {
  const [meldung, setMeldung] = useState<string | null>(null);

  const speichern = async (neu: SpielDaten, text: string) => {
    try {
      await onAendern(neu);
      setMeldung(text);
    } catch (e) {
      setMeldung(`Fehler beim Speichern: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <>
      <h1>Menü</h1>

      <section className="karte">
        <h2>Spielstand</h2>
        <p>
          Speicherplatz {slot} · Coach {spiel.coach.name} ({spiel.coach.alter}) · Saison{' '}
          {spiel.saison}
        </p>
        <div className="knopfreihe">
          <button className="knopf" onClick={() => speichern(spiel, 'Gespeichert ✔')}>
            Jetzt speichern
          </button>
          <button className="knopf zweit" onClick={onZuDenSlots}>
            Speicherplätze
          </button>
        </div>
        {meldung && <p className="meldung">{meldung}</p>}
      </section>

      <section className="karte">
        <h2>Test: Speichern prüfen</h2>
        <p className="hinweis">
          Erhöht die Saison um 1 und speichert sofort. Schließe danach die App komplett und öffne
          sie neu: Die Saisonzahl muss erhalten bleiben. (Wird später entfernt.)
        </p>
        <button
          className="knopf zweit"
          onClick={() =>
            speichern({ ...spiel, saison: spiel.saison + 1 }, 'Saison erhöht und gespeichert ✔')
          }
        >
          Saison +1 (Test)
        </button>
      </section>

      <section className="karte">
        <h2>Info</h2>
        <p className="hinweis">
          App-Version {__APP_VERSION__} · Spielstand-Format {CONFIG.saveVersion}
        </p>
      </section>
    </>
  );
}
