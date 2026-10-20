import { useState } from 'react';
import { CONFIG } from '../engine/config';
import { gehaltSumme, staerkeRang, teamStaerke } from '../engine/league';
import { formatDatum, spieleVonTeam } from '../engine/schedule';
import { CONFERENCES, DIVISIONEN, teamName } from '../engine/teams';
import type { SpielDaten, Team } from '../engine/types';
import { fmtGeld } from './format';
import { KaderTabelle } from './KaderTabelle';
import type { TabId } from './nav';
import { TeamLogo } from './TeamLogo';

interface Props {
  slot: number;
  spiel: SpielDaten;
  tab: TabId;
  onTab: (tab: TabId) => void;
  onAendern: (neu: SpielDaten) => Promise<void>;
  onZuDenSlots: () => void;
  onTeam: (teamId: number) => void;
  onSpieler: (spielerId: number) => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'start', label: 'Start', icon: '🏠' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'liga', label: 'Liga', icon: '📊' },
  { id: 'buero', label: 'Büro', icon: '💼' },
  { id: 'menue', label: 'Menü', icon: '☰' },
];

export function GameScreen({ slot, spiel, tab, onTab, onAendern, onZuDenSlots, onTeam, onSpieler }: Props) {
  const eigenesTeam = spiel.liga.teams[spiel.userTeamId] as Team;

  return (
    <div className="spiel">
      <header className="kopfleiste">
        <span className="kopf-team">
          <TeamLogo kuerzel={eigenesTeam.kuerzel} farbe1={eigenesTeam.farbe1} farbe2={eigenesTeam.farbe2} groesse={28} />
          <strong>Coach {spiel.coach.name}</strong>
        </span>
        <span>
          Saison {spiel.saison} · Tag {spiel.liga.tag + 1}
        </span>
      </header>

      <main className="seite">
        {tab === 'start' && <StartTab spiel={spiel} eigenesTeam={eigenesTeam} onTab={onTab} />}
        {tab === 'team' && <TeamTab spiel={spiel} eigenesTeam={eigenesTeam} onSpieler={onSpieler} />}
        {tab === 'liga' && <LigaTab spiel={spiel} onTeam={onTeam} />}
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

// ---------- Start ----------

function StartTab({ spiel, eigenesTeam, onTab }: { spiel: SpielDaten; eigenesTeam: Team; onTab: (t: TabId) => void }) {
  const { liga } = spiel;
  const spiele = spieleVonTeam(liga.spielplan, eigenesTeam.id);
  const naechstes = spiele.find((s) => s.tag >= liga.tag);
  const gegner = naechstes ? (liga.teams[naechstes.gegner] as Team) : undefined;
  const rang = staerkeRang(liga, eigenesTeam.id);

  return (
    <>
      <h1>Start</h1>
      <section className="karte">
        <div className="teamkopf">
          <TeamLogo kuerzel={eigenesTeam.kuerzel} farbe1={eigenesTeam.farbe1} farbe2={eigenesTeam.farbe2} groesse={52} />
          <div>
            <strong>{teamName(eigenesTeam)}</strong>
            <span>
              {CONFERENCES[eigenesTeam.conference]} · {DIVISIONEN[eigenesTeam.division]} · Bilanz 0–0
            </span>
            <span>
              Stärke Platz {rang} von {liga.teams.length}
            </span>
          </div>
        </div>
      </section>

      <section className="karte">
        <h2>Nächstes Spiel</h2>
        {naechstes && gegner ? (
          <>
            <div className="gegner">
              <TeamLogo kuerzel={gegner.kuerzel} farbe1={gegner.farbe1} farbe2={gegner.farbe2} groesse={40} />
              <div>
                <strong>
                  {naechstes.heim ? 'vs' : '@'} {teamName(gegner)}
                </strong>
                <span>
                  {formatDatum(spiel.saison, naechstes.tag)} · Spiel {spiele.indexOf(naechstes) + 1} von {spiele.length}
                </span>
              </div>
            </div>
            <p className="hinweis">Die Spielsimulation kommt in Meilenstein 3.</p>
          </>
        ) : (
          <p className="hinweis">Kein Spiel mehr angesetzt.</p>
        )}
        <button className="knopf" disabled>
          Nächstes Spiel simulieren
        </button>
        <button className="knopf zweit abstand" onClick={() => onTab('liga')}>
          Spielplan ansehen
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

// ---------- Team ----------

function TeamTab({
  spiel,
  eigenesTeam,
  onSpieler,
}: {
  spiel: SpielDaten;
  eigenesTeam: Team;
  onSpieler: (id: number) => void;
}) {
  const { liga } = spiel;
  const gehalt = gehaltSumme(liga, eigenesTeam.id);
  const { salaryCap, luxussteuerGrenze } = CONFIG.finanzen;
  const status =
    gehalt > luxussteuerGrenze ? 'über der Luxussteuer-Grenze' : gehalt > salaryCap ? 'über der Gehaltsobergrenze' : 'unter der Gehaltsobergrenze';

  return (
    <>
      <h1>Team</h1>
      <section className="karte">
        <h2>Gehaltsstatus</h2>
        <div className="fakten">
          <span>Gehälter</span>
          <span>{fmtGeld(gehalt)}</span>
          <span>Cap</span>
          <span>{fmtGeld(salaryCap)}</span>
          <span>Luxussteuer ab</span>
          <span>{fmtGeld(luxussteuerGrenze)}</span>
          <span>Status</span>
          <span>{status}</span>
          <span>Kader</span>
          <span>
            {eigenesTeam.kader.length} von {CONFIG.liga.kaderMax} Spielern
          </span>
          <span>Stärke</span>
          <span>{teamStaerke(liga, eigenesTeam.id).toFixed(1).replace('.', ',')}</span>
        </div>
      </section>
      <h2 className="zwischentitel">Kader</h2>
      <p className="hinweis">Spalten antippen zum Sortieren, Spieler antippen für die Spielerkarte. Rotation, Taktik und Verträge folgen in Meilenstein 4.</p>
      <KaderTabelle liga={liga} teamId={eigenesTeam.id} onSpieler={onSpieler} />
    </>
  );
}

// ---------- Liga ----------

function LigaTab({ spiel, onTeam }: { spiel: SpielDaten; onTeam: (id: number) => void }) {
  const [ansicht, setAnsicht] = useState<'tabelle' | 'spielplan'>('tabelle');
  return (
    <>
      <h1>Liga</h1>
      <div className="auswahl" role="tablist" aria-label="Ansicht">
        <button
          role="tab"
          aria-selected={ansicht === 'tabelle'}
          className={ansicht === 'tabelle' ? 'wahl aktiv' : 'wahl'}
          onClick={() => setAnsicht('tabelle')}
        >
          Teams
        </button>
        <button
          role="tab"
          aria-selected={ansicht === 'spielplan'}
          className={ansicht === 'spielplan' ? 'wahl aktiv' : 'wahl'}
          onClick={() => setAnsicht('spielplan')}
        >
          Spielplan
        </button>
      </div>
      {ansicht === 'tabelle' ? <TeamListe spiel={spiel} onTeam={onTeam} /> : <Spielplan spiel={spiel} onTeam={onTeam} />}
    </>
  );
}

function TeamListe({ spiel, onTeam }: { spiel: SpielDaten; onTeam: (id: number) => void }) {
  const { liga } = spiel;
  return (
    <>
      <p className="hinweis">Tabellen mit Siegen und Niederlagen gibt es ab Meilenstein 3. Tippe ein Team für Kader und Details an.</p>
      {CONFERENCES.map((confName, c) => (
        <section key={confName}>
          <h2 className="zwischentitel">{confName}-Conference</h2>
          {DIVISIONEN.map((divName, d) => (
            <div className="karte divisionskarte" key={divName}>
              <h3>{divName}</h3>
              {liga.teams
                .filter((t) => t.conference === c && t.division === d)
                .map((t) => (
                  <button
                    key={t.id}
                    className={t.id === spiel.userTeamId ? 'teamzeile eigene' : 'teamzeile'}
                    onClick={() => onTeam(t.id)}
                  >
                    <TeamLogo kuerzel={t.kuerzel} farbe1={t.farbe1} farbe2={t.farbe2} groesse={30} />
                    <span className="teamzeile-name">{teamName(t)}</span>
                    <span className="teamzeile-bilanz">0–0</span>
                  </button>
                ))}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function Spielplan({ spiel, onTeam }: { spiel: SpielDaten; onTeam: (id: number) => void }) {
  const { liga } = spiel;
  const spiele = spieleVonTeam(liga.spielplan, spiel.userTeamId);
  return (
    <>
      <p className="hinweis">
        Dein Spielplan: {spiele.length} Spiele an {liga.spielplan.length} Spieltagen. Antippen für den Gegner.
      </p>
      <div className="karte spielplan">
        {spiele.map((s, i) => {
          const g = liga.teams[s.gegner] as Team;
          return (
            <button key={i} className="spielzeile" onClick={() => onTeam(g.id)}>
              <span className="spielzeile-nr">{i + 1}</span>
              <span className="spielzeile-datum">{formatDatum(spiel.saison, s.tag)}</span>
              <span className="spielzeile-ha">{s.heim ? 'vs' : '@'}</span>
              <TeamLogo kuerzel={g.kuerzel} farbe1={g.farbe1} farbe2={g.farbe2} groesse={26} />
              <span className="spielzeile-name">{g.stadt} {g.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------- Büro (Platzhalter) ----------

function Platzhalter({ titel, inhalt, meilenstein }: { titel: string; inhalt: string; meilenstein: string }) {
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

// ---------- Menü ----------

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
          Speicherplatz {slot} · Coach {spiel.coach.name} ({spiel.coach.alter}) · Saison {spiel.saison}
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
          Erhöht die Saison um 1 und speichert sofort. Schließe danach die App komplett und öffne sie neu: Die
          Saisonzahl muss erhalten bleiben. (Wird später entfernt.)
        </p>
        <button
          className="knopf zweit"
          onClick={() => speichern({ ...spiel, saison: spiel.saison + 1 }, 'Saison erhöht und gespeichert ✔')}
        >
          Saison +1 (Test)
        </button>
      </section>

      <section className="karte">
        <h2>Info</h2>
        <p className="hinweis">
          App-Version {__APP_VERSION__} · Spielstand-Format {CONFIG.saveVersion} · Liga-Seed {spiel.liga.seed} ·{' '}
          {spiel.liga.saisonLaenge} Spiele pro Saison
        </p>
      </section>
    </>
  );
}
