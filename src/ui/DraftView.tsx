import { useState } from 'react';
import { aktuellerPick, pickReihenfolge, verfuegbareKandidaten } from '../engine/draft';
import { draftAutoPick, draftKomplett, offseasonStatus } from '../engine/offseason';
import { ansichtVon } from '../engine/scouting';
import { teamName } from '../engine/teams';
import type { DraftPick, SpielDaten, Spieler, Team } from '../engine/types';
import { fuehreAus } from './aktion';
import { wertKlasse } from './format';
import { SortTable, type Spalte } from './SortTable';

type Abschnitt = 'kandidaten' | 'picks' | 'ergebnis';

interface Props {
  spiel: SpielDaten;
  onAendern: (neu: SpielDaten) => Promise<void>;
  onSpieler: (id: number) => void;
}

const name = (s: Spieler) => `${s.vorname} ${s.nachname}`;
const spannenText = ([von, bis]: [number, number]) => (von === bis ? String(von) : `${von}–${bis}`);

/** Liga -> Draft: Kandidaten (mit Scouting), Pick-Reihenfolge und Ergebnisse. */
export function DraftView({ spiel, onAendern, onSpieler }: Props) {
  const { liga } = spiel;
  const [abschnitt, setAbschnitt] = useState<Abschnitt>('kandidaten');
  const [fehler, setFehler] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const status = offseasonStatus(spiel);
  const imDraft = status === 'draft';
  const pick = imDraft ? aktuellerPick(liga, spiel.saison) : null;
  const ichBinDran = pick !== null && pick.besitzer === spiel.userTeamId;

  const aktion = async (aenderung: (k: SpielDaten) => void) => {
    setBeschaeftigt(true);
    setFehler(await fuehreAus(spiel, onAendern, aenderung));
    setBeschaeftigt(false);
  };

  const abschnitte: { id: Abschnitt; label: string }[] = [
    { id: 'kandidaten', label: 'Kandidaten' },
    { id: 'picks', label: 'Picks' },
    ...(liga.drafts.length > 0 ? [{ id: 'ergebnis' as const, label: 'Letzter Draft' }] : []),
  ];

  return (
    <>
      <div className="auswahl scroll" role="tablist" aria-label="Draft-Ansicht">
        {abschnitte.map((a) => (
          <button key={a.id} role="tab" aria-selected={abschnitt === a.id} className={abschnitt === a.id ? 'wahl aktiv' : 'wahl'} onClick={() => setAbschnitt(a.id)}>
            {a.label}
          </button>
        ))}
      </div>

      {imDraft && pick && (
        <section className="karte">
          <h2>Draft läuft: Pick {pick.nr} von 60</h2>
          <p>
            {ichBinDran ? (
              <strong>Du bist am Zug.</strong>
            ) : (
              <>Am Zug: {teamName(liga.teams[pick.besitzer] as Team)}.</>
            )}{' '}
            Tippe einen Kandidaten an, um ihn zu draften.
          </p>
          <div className="knopfreihe">
            <button className="knopf zweit klein" disabled={beschaeftigt || !ichBinDran} onClick={() => void aktion(draftAutoPick)}>
              Auto-Pick
            </button>
            <button className="knopf zweit klein" disabled={beschaeftigt} onClick={() => void aktion(draftKomplett)}>
              Rest automatisch
            </button>
          </div>
          {fehler && <p className="fehler">{fehler}</p>}
        </section>
      )}

      {abschnitt === 'kandidaten' && <Kandidaten spiel={spiel} onSpieler={onSpieler} />}
      {abschnitt === 'picks' && <Picks spiel={spiel} />}
      {abschnitt === 'ergebnis' && <Ergebnis spiel={spiel} onSpieler={onSpieler} />}
    </>
  );
}

interface KandZeile {
  s: Spieler;
  ovr: [number, number];
  pot: [number, number];
  wert: number;
  stufe: number;
}

function Kandidaten({ spiel, onSpieler }: { spiel: SpielDaten; onSpieler: (id: number) => void }) {
  const { liga } = spiel;
  const klasse = liga.draftKlasse;
  if (klasse.length === 0) {
    return (
      <section className="karte">
        <p className="hinweis">Im Moment gibt es keine Kandidaten. Die neue Klasse erscheint mit der nächsten Saison.</p>
      </section>
    );
  }
  const verfuegbar = new Set(verfuegbareKandidaten(liga).map((s) => s.id));
  const zeilen: KandZeile[] = klasse
    .filter((id) => verfuegbar.has(id))
    .map((id) => {
      const s = liga.spieler[id] as Spieler;
      const a = ansichtVon(spiel, s);
      return { s, ovr: a.ovr, pot: a.pot, wert: a.wert, stufe: spiel.scouting.stufen[String(id)] ?? 0 };
    });
  const spalten: Spalte<KandZeile>[] = [
    { key: 'name', label: 'Name', wert: (z) => z.s.nachname, anzeige: (z) => name(z.s) },
    { key: 'wert', label: 'Bewertung', wert: (z) => z.wert, anzeige: (z) => z.wert.toFixed(0), zahl: true, klasse: (z) => wertKlasse(z.wert) },
    { key: 'pos', label: 'Pos', wert: (z) => z.s.position },
    { key: 'alter', label: 'Alter', wert: (z) => z.s.alter, zahl: true },
    { key: 'ovr', label: 'OVR', wert: (z) => (z.ovr[0] + z.ovr[1]) / 2, anzeige: (z) => spannenText(z.ovr), zahl: true },
    { key: 'pot', label: 'POT', wert: (z) => (z.pot[0] + z.pot[1]) / 2, anzeige: (z) => spannenText(z.pot), zahl: true },
    { key: 'scout', label: 'Scout', wert: (z) => z.stufe, anzeige: (z) => '●'.repeat(z.stufe) + '○'.repeat(3 - z.stufe) },
  ];
  return (
    <>
      <section className="karte">
        <h2>Draft-Kandidaten Saison {spiel.saison}</h2>
        <p>
          Scouting-Punkte: <strong>{spiel.scouting.punkte}</strong>. Die Zahlen sind Spannen. Tippe einen Kandidaten an und scoute ihn genauer.
        </p>
      </section>
      <SortTable spalten={spalten} zeilen={zeilen} zeilenKey={(z) => z.s.id} onZeile={(z) => onSpieler(z.s.id)} start={{ key: 'wert', absteigend: true }} />
    </>
  );
}

function PickZeile({ p, liga }: { p: DraftPick; liga: SpielDaten['liga'] }) {
  const s = p.spielerId !== null ? liga.spieler[p.spielerId] : undefined;
  return (
    <div className="pickzeile">
      <span className="pick-nr">{p.nr ?? '–'}</span>
      <span>{(liga.teams[p.besitzer] as Team).kuerzel}</span>
      <span className="pick-name">{s ? `${name(s)} (${s.position})` : ''}</span>
    </div>
  );
}

function Picks({ spiel }: { spiel: SpielDaten }) {
  const { liga } = spiel;
  const status = offseasonStatus(spiel);
  const gezogen = pickReihenfolge(liga, spiel.saison);
  const meine = liga.picks.filter((p) => p.besitzer === spiel.userTeamId).sort((a, b) => a.saison - b.saison || a.runde - b.runde);
  return (
    <>
      <section className="karte">
        <h2>Deine Draft-Picks</h2>
        {meine.map((p) => (
          <div className="pickzeile" key={`${p.saison}-${p.runde}`}>
            <span className="pick-nr">{p.nr ?? ''}</span>
            <span>Saison {p.saison}, Runde {p.runde}</span>
            <span className="pick-name">
              {p.ursprung !== spiel.userTeamId ? `von ${(liga.teams[p.ursprung] as Team).kuerzel}` : ''}
              {p.spielerId !== null ? ` · ${name(liga.spieler[p.spielerId] as Spieler)}` : ''}
            </span>
          </div>
        ))}
        <p className="hinweis">Picks lassen sich ab Meilenstein 6 tauschen.</p>
      </section>
      {gezogen.length > 0 ? (
        <section className="karte">
          <h2>Reihenfolge Saison {spiel.saison}</h2>
          {gezogen.map((p) => (
            <PickZeile key={p.nr} p={p} liga={liga} />
          ))}
        </section>
      ) : (
        <p className="hinweis">
          {status === 'keine'
            ? 'Die Reihenfolge steht nach den Playoffs fest: Die 14 Teams ohne Playoffs ziehen in der Lotterie die ersten 4 Picks, danach geht es nach Bilanz.'
            : 'Die Reihenfolge wird mit der Lotterie festgelegt.'}
        </p>
      )}
    </>
  );
}

function Ergebnis({ spiel, onSpieler }: { spiel: SpielDaten; onSpieler: (id: number) => void }) {
  const { liga } = spiel;
  const d = liga.drafts[liga.drafts.length - 1];
  if (!d) return null;
  return (
    <section className="karte">
      <h2>Draft Saison {d.saison}</h2>
      {d.picks.map(([nr, teamId, id]) => {
        const s = liga.spieler[id] as Spieler;
        const sichtbar = (liga.teams[teamId] as Team).kuerzel;
        return (
          <button className="pickzeile klickbar" key={nr} onClick={() => onSpieler(id)}>
            <span className="pick-nr">{nr}</span>
            <span>{sichtbar}</span>
            <span className="pick-name">
              {name(s)} ({s.position}, {s.alter})
            </span>
            <span className={wertKlasse(s.ovr)}>
              {s.ovr}/{s.pot}
            </span>
          </button>
        );
      })}
      <p className="hinweis">OVR/POT sind die aktuellen Werte der Spieler.</p>
    </section>
  );
}
