import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../engine/config';
import { gehaltSumme, staerkeRang, teamStaerke } from '../engine/league';
import { formatDatum, spieleVonTeam } from '../engine/schedule';
import {
  deadlineTag,
  eigeneErgebnisse,
  hauptrundeVorbei,
  naechsterEigenerSpieltag,
  spielIndex,
  zielTag,
  ZIEL_TEXT,
  type SimulationsZiel,
} from '../engine/season';
import { serieText, siegQuote, sortiereTabelle, spiele } from '../engine/stats';
import { CONFERENCES, DIVISIONEN, teamName } from '../engine/teams';
import type { Liga, SpielDaten, SpielErgebnis, Team } from '../engine/types';
import { ErgebnisseView } from './ErgebnisseView';
import { fmtGeld } from './format';
import { KaderTabelle } from './KaderTabelle';
import type { TabId } from './nav';
import { AbbruchFehler, simuliereImHintergrund, type Lauf } from './simulation';
import { SimOverlay } from './SimOverlay';
import { StatistikView } from './StatistikView';
import { TabelleView } from './TabelleView';
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
  onBox: (tag: number, index: number) => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'start', label: 'Start', icon: '🏠' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'liga', label: 'Liga', icon: '📊' },
  { id: 'buero', label: 'Büro', icon: '💼' },
  { id: 'menue', label: 'Menü', icon: '☰' },
];

export function GameScreen({ slot, spiel, tab, onTab, onAendern, onZuDenSlots, onTeam, onSpieler, onBox }: Props) {
  const eigenesTeam = spiel.liga.teams[spiel.userTeamId] as Team;
  const [sim, setSim] = useState<{ titel: string; fertig: number; gesamt: number } | null>(null);
  const [simFehler, setSimFehler] = useState<string | null>(null);
  const lauf = useRef<Lauf | null>(null);

  // Verlässt man das Spiel mitten in der Simulation, wird sie abgebrochen (Spielstand bleibt unverändert).
  useEffect(() => () => lauf.current?.abbrechen(), []);

  const simuliere = async (ziel: SimulationsZiel) => {
    const bis = zielTag(spiel, ziel);
    if (bis === null || lauf.current) return;
    setSimFehler(null);
    setSim({ titel: ZIEL_TEXT[ziel], fertig: 0, gesamt: bis - spiel.liga.tag });
    const l = simuliereImHintergrund(spiel, bis, (fertig, gesamt) => setSim((s) => (s ? { ...s, fertig, gesamt } : s)));
    lauf.current = l;
    try {
      const neu = await l.ergebnis;
      await onAendern(neu);
    } catch (e) {
      if (!(e instanceof AbbruchFehler)) setSimFehler(`Simulation oder Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      lauf.current = null;
      setSim(null);
    }
  };

  return (
    <div className="spiel">
      <header className="kopfleiste">
        <span className="kopf-team">
          <TeamLogo kuerzel={eigenesTeam.kuerzel} farbe1={eigenesTeam.farbe1} farbe2={eigenesTeam.farbe2} groesse={28} />
          <strong>Coach {spiel.coach.name}</strong>
        </span>
        <span>
          Saison {spiel.saison} ·{' '}
          {hauptrundeVorbei(spiel.liga)
            ? 'Hauptrunde beendet'
            : formatDatum(spiel.saison, spiel.liga.tag)}
        </span>
      </header>

      <main className="seite">
        {tab === 'start' && (
          <StartTab
            spiel={spiel}
            eigenesTeam={eigenesTeam}
            onTab={onTab}
            onSimuliere={(z) => void simuliere(z)}
            laeuft={sim !== null}
            fehler={simFehler}
            onBox={onBox}
          />
        )}
        {tab === 'team' && <TeamTab spiel={spiel} eigenesTeam={eigenesTeam} onSpieler={onSpieler} />}
        {tab === 'liga' && <LigaTab spiel={spiel} onTeam={onTeam} onSpieler={onSpieler} onBox={onBox} />}
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

      {sim && (
        <SimOverlay titel={sim.titel} fertig={sim.fertig} gesamt={sim.gesamt} onAbbrechen={() => lauf.current?.abbrechen()} />
      )}
    </div>
  );
}

// ---------- Start ----------

/** Platz des Teams in seiner Conference (1 = Erster). */
function conferencePlatz(liga: Liga, teamId: number): number {
  const team = liga.teams[teamId] as Team;
  const ids = liga.teams.filter((t) => t.conference === team.conference).map((t) => t.id);
  return sortiereTabelle(liga, ids).indexOf(teamId) + 1;
}

function Ergebniszeile({
  erg,
  liga,
  eigenesTeamId,
  index,
  onBox,
}: {
  erg: SpielErgebnis;
  liga: Liga;
  eigenesTeamId: number;
  index: number;
  onBox: (tag: number, index: number) => void;
}) {
  const zuHause = erg.heim.teamId === eigenesTeamId;
  const eigene = zuHause ? erg.heim : erg.gast;
  const gegnerBox = zuHause ? erg.gast : erg.heim;
  const gegner = liga.teams[gegnerBox.teamId] as Team;
  const gewonnen = eigene.punkte > gegnerBox.punkte;
  return (
    <button className="spielzeile" onClick={() => onBox(erg.tag, index)}>
      <span className={gewonnen ? 'ergebnis-badge sieg' : 'ergebnis-badge niederlage'}>{gewonnen ? 'S' : 'N'}</span>
      <span className="spielzeile-ha">{zuHause ? 'vs' : '@'}</span>
      <TeamLogo kuerzel={gegner.kuerzel} farbe1={gegner.farbe1} farbe2={gegner.farbe2} groesse={26} />
      <span className="spielzeile-name">{gegner.name}</span>
      <span className="erg-endstand">
        {eigene.punkte}:{gegnerBox.punkte}
        {erg.ot > 0 ? ` n.V.` : ''}
      </span>
    </button>
  );
}

function StartTab({
  spiel,
  eigenesTeam,
  onTab,
  onSimuliere,
  laeuft,
  fehler,
  onBox,
}: {
  spiel: SpielDaten;
  eigenesTeam: Team;
  onTab: (t: TabId) => void;
  onSimuliere: (z: SimulationsZiel) => void;
  laeuft: boolean;
  fehler: string | null;
  onBox: (tag: number, index: number) => void;
}) {
  const { liga } = spiel;
  const alleSpiele = spieleVonTeam(liga.spielplan, eigenesTeam.id);
  const naechstes = alleSpiele.find((s) => s.tag >= liga.tag);
  const gegner = naechstes ? (liga.teams[naechstes.gegner] as Team) : undefined;
  const rang = staerkeRang(liga, eigenesTeam.id);
  const b = liga.stand.teams[eigenesTeam.id]!;
  const gespielt = spiele(b);
  const vorbei = hauptrundeVorbei(liga);
  const deadline = deadlineTag(liga);
  const deadlineOffen = zielTag(spiel, 'deadline') !== null;
  const letzte = eigeneErgebnisse(spiel).slice(-5).reverse();
  const platz = conferencePlatz(liga, eigenesTeam.id);

  return (
    <>
      <h1>Start</h1>
      <section className="karte">
        <div className="teamkopf">
          <TeamLogo kuerzel={eigenesTeam.kuerzel} farbe1={eigenesTeam.farbe1} farbe2={eigenesTeam.farbe2} groesse={52} />
          <div>
            <strong>{teamName(eigenesTeam)}</strong>
            <span>
              {CONFERENCES[eigenesTeam.conference]} · {DIVISIONEN[eigenesTeam.division]} · Bilanz {b.siege}–{b.niederlagen}
            </span>
            <span>
              {gespielt === 0
                ? `Stärke Platz ${rang} von ${liga.teams.length}`
                : `Platz ${platz} im ${CONFERENCES[eigenesTeam.conference]} · ${(siegQuote(b) * 100).toFixed(0)} % · Serie ${serieText(b)}`}
            </span>
          </div>
        </div>
      </section>

      <section className="karte">
        <h2>{vorbei ? 'Hauptrunde beendet' : 'Nächstes Spiel'}</h2>
        {vorbei ? (
          <>
            <p>
              Endstand: {b.siege}–{b.niederlagen}, Platz {platz} im {CONFERENCES[eigenesTeam.conference]}.
            </p>
            <p className="hinweis">
              Playoffs, Awards und die Offseason folgen in den nächsten Meilensteinen. Du kannst dir Tabellen,
              Ergebnisse und Statistiken im Liga-Tab ansehen.
            </p>
          </>
        ) : naechstes && gegner ? (
          <>
            <div className="gegner">
              <TeamLogo kuerzel={gegner.kuerzel} farbe1={gegner.farbe1} farbe2={gegner.farbe2} groesse={40} />
              <div>
                <strong>
                  {naechstes.heim ? 'vs' : '@'} {teamName(gegner)}
                </strong>
                <span>
                  {formatDatum(spiel.saison, naechstes.tag)} · Spiel {alleSpiele.indexOf(naechstes) + 1} von {alleSpiele.length}
                </span>
                <span>
                  Bilanz {liga.stand.teams[gegner.id]!.siege}–{liga.stand.teams[gegner.id]!.niederlagen}
                </span>
              </div>
            </div>
            <button className="knopf" disabled={laeuft} onClick={() => onSimuliere('naechstesSpiel')}>
              Nächstes Spiel simulieren
            </button>
            <div className="knopfreihe drei">
              <button className="knopf zweit klein" disabled={laeuft} onClick={() => onSimuliere('woche')}>
                Eine Woche
              </button>
              <button
                className="knopf zweit klein"
                disabled={laeuft || !deadlineOffen}
                onClick={() => onSimuliere('deadline')}
                title={deadlineOffen ? '' : 'Die Trade Deadline ist schon vorbei'}
              >
                {deadlineOffen ? 'Bis Deadline' : 'Deadline vorbei'}
              </button>
              <button className="knopf zweit klein" disabled={laeuft} onClick={() => onSimuliere('saisonende')}>
                Bis Saisonende
              </button>
            </div>
            {deadlineOffen && (
              <p className="hinweis">
                Trade Deadline: {formatDatum(spiel.saison, deadline)} (nach etwa 60 % der Saison).
              </p>
            )}
          </>
        ) : (
          <p className="hinweis">Kein Spiel mehr angesetzt.</p>
        )}
        {fehler && <p className="fehler">{fehler}</p>}
        <button className="knopf zweit abstand" onClick={() => onTab('liga')}>
          Tabellen &amp; Spielplan ansehen
        </button>
      </section>

      {letzte.length > 0 && (
        <section className="karte">
          <h2>Letzte Spiele</h2>
          {letzte[0] && <p className="spieltext">{letzte[0].erg.text}</p>}
          <div className="spielplan">
            {letzte.map(({ erg, index }) => (
              <Ergebniszeile key={erg.tag} erg={erg} liga={liga} eigenesTeamId={eigenesTeam.id} index={index} onBox={onBox} />
            ))}
          </div>
          <p className="hinweis">Antippen für den Boxscore.</p>
        </section>
      )}

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

type LigaAnsicht = 'tabelle' | 'ergebnisse' | 'statistik' | 'teams' | 'spielplan';
const LIGA_ANSICHTEN: { id: LigaAnsicht; label: string }[] = [
  { id: 'tabelle', label: 'Tabelle' },
  { id: 'ergebnisse', label: 'Ergebnisse' },
  { id: 'statistik', label: 'Statistik' },
  { id: 'teams', label: 'Teams' },
  { id: 'spielplan', label: 'Spielplan' },
];

function LigaTab({
  spiel,
  onTeam,
  onSpieler,
  onBox,
}: {
  spiel: SpielDaten;
  onTeam: (id: number) => void;
  onSpieler: (id: number) => void;
  onBox: (tag: number, index: number) => void;
}) {
  const [ansicht, setAnsicht] = useState<LigaAnsicht>('tabelle');
  return (
    <>
      <h1>Liga</h1>
      <div className="auswahl scroll" role="tablist" aria-label="Ansicht">
        {LIGA_ANSICHTEN.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={ansicht === a.id}
            className={ansicht === a.id ? 'wahl aktiv' : 'wahl'}
            onClick={() => setAnsicht(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>
      {ansicht === 'tabelle' && <TabelleView liga={spiel.liga} userTeamId={spiel.userTeamId} onTeam={onTeam} />}
      {ansicht === 'ergebnisse' && (
        <ErgebnisseView liga={spiel.liga} saison={spiel.saison} userTeamId={spiel.userTeamId} onBox={onBox} />
      )}
      {ansicht === 'statistik' && <StatistikView liga={spiel.liga} onSpieler={onSpieler} />}
      {ansicht === 'teams' && <TeamListe spiel={spiel} onTeam={onTeam} />}
      {ansicht === 'spielplan' && <Spielplan spiel={spiel} onTeam={onTeam} onBox={onBox} />}
    </>
  );
}

function TeamListe({ spiel, onTeam }: { spiel: SpielDaten; onTeam: (id: number) => void }) {
  const { liga } = spiel;
  return (
    <>
      <p className="hinweis">Tippe ein Team für Kader und Details an.</p>
      {CONFERENCES.map((confName, c) => (
        <section key={confName}>
          <h2 className="zwischentitel">{confName}-Conference</h2>
          {DIVISIONEN.map((divName, d) => (
            <div className="karte divisionskarte" key={divName}>
              <h3>{divName}</h3>
              {liga.teams
                .filter((t) => t.conference === c && t.division === d)
                .map((t) => {
                  const b = liga.stand.teams[t.id]!;
                  return (
                    <button
                      key={t.id}
                      className={t.id === spiel.userTeamId ? 'teamzeile eigene' : 'teamzeile'}
                      onClick={() => onTeam(t.id)}
                    >
                      <TeamLogo kuerzel={t.kuerzel} farbe1={t.farbe1} farbe2={t.farbe2} groesse={30} />
                      <span className="teamzeile-name">{teamName(t)}</span>
                      <span className="teamzeile-bilanz">
                        {b.siege}–{b.niederlagen}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function Spielplan({
  spiel,
  onTeam,
  onBox,
}: {
  spiel: SpielDaten;
  onTeam: (id: number) => void;
  onBox: (tag: number, index: number) => void;
}) {
  const { liga } = spiel;
  const spieleDesTeams = spieleVonTeam(liga.spielplan, spiel.userTeamId);
  const naechster = naechsterEigenerSpieltag(spiel);
  return (
    <>
      <p className="hinweis">
        Dein Spielplan: {spieleDesTeams.length} Spiele an {liga.spielplan.length} Spieltagen. Gespielte Spiele öffnen den
        Boxscore, offene den Gegner.
      </p>
      <div className="karte spielplan">
        {spieleDesTeams.map((s, i) => {
          const g = liga.teams[s.gegner] as Team;
          const gespielt = s.tag < liga.tag;
          const idx = gespielt ? spielIndex(liga, s.tag, spiel.userTeamId) : -1;
          const erg = gespielt ? liga.ergebnisse[s.tag]?.[idx] : undefined;
          const eigene = erg ? (s.heim ? erg.heim.punkte : erg.gast.punkte) : 0;
          const fremde = erg ? (s.heim ? erg.gast.punkte : erg.heim.punkte) : 0;
          return (
            <button
              key={i}
              className={s.tag === naechster ? 'spielzeile naechstes' : 'spielzeile'}
              onClick={() => (erg ? onBox(s.tag, idx) : onTeam(g.id))}
            >
              <span className="spielzeile-nr">{i + 1}</span>
              <span className="spielzeile-datum">{formatDatum(spiel.saison, s.tag)}</span>
              <span className="spielzeile-ha">{s.heim ? 'vs' : '@'}</span>
              <TeamLogo kuerzel={g.kuerzel} farbe1={g.farbe1} farbe2={g.farbe2} groesse={26} />
              <span className="spielzeile-name">
                {g.stadt} {g.name}
              </span>
              {erg && (
                <span className="erg-endstand">
                  <span className={eigene > fremde ? 'ergebnis-badge sieg' : 'ergebnis-badge niederlage'}>
                    {eigene > fremde ? 'S' : 'N'}
                  </span>{' '}
                  {eigene}:{fremde}
                </span>
              )}
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
        <h2>Einstellungen</h2>
        <label className="schalter">
          <input
            type="checkbox"
            checked={spiel.einstellungen.pbp}
            onChange={(e) =>
              void speichern(
                { ...spiel, einstellungen: { ...spiel.einstellungen, pbp: e.target.checked } },
                e.target.checked ? 'Spielverlauf für eigene Spiele ist an ✔' : 'Spielverlauf für eigene Spiele ist aus ✔',
              )
            }
          />
          <span>Spielverlauf (Play-by-Play) für eigene Spiele speichern</span>
        </label>
        <p className="hinweis">
          Gilt für Spiele, die du ab jetzt simulierst. Gespeichert werden die letzten 10 eigenen Spiele.
        </p>
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
