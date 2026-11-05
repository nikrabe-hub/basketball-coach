import { useState } from 'react';
import { aktuellerPick } from '../engine/draft';
import { gehaltSumme, kaderVon } from '../engine/league';
import {
  entlasseSpieler,
  kannNeueSaisonStarten,
  offseasonStatus,
  starteDraft,
  starteLotterie,
  starteNeueSaison,
  starteOffseason,
} from '../engine/offseason';
import { CONFIG } from '../engine/config';
import type { EntwicklungsZeile, Offseason, SpielDaten, Spieler, Team } from '../engine/types';
import { fuehreAus } from './aktion';
import { fmtGeld, plusKlasse, wertKlasse } from './format';

interface Props {
  spiel: SpielDaten;
  onAendern: (neu: SpielDaten) => Promise<void>;
  onSpieler: (id: number) => void;
  onTab: (t: 'liga' | 'team') => void;
}

const name = (s: Spieler) => `${s.vorname} ${s.nachname}`;

/** Start-Tab nach den Finals: führt Schritt für Schritt durch die Offseason bis zur neuen Saison. */
export function OffseasonKarte({ spiel, onAendern, onSpieler, onTab }: Props) {
  const [fehler, setFehler] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const status = offseasonStatus(spiel);
  if (status === 'keine') return null;
  const { liga } = spiel;
  const o = liga.offseason;

  const aktion = async (aenderung: (k: SpielDaten) => void) => {
    setBeschaeftigt(true);
    setFehler(await fuehreAus(spiel, onAendern, aenderung));
    setBeschaeftigt(false);
  };

  const schritte = ['Entwicklung', 'Lotterie', 'Draft', 'Kader', `Saison ${spiel.saison + 1}`];
  const aktiv = { start: 0, bericht: 1, lotterie: 2, draft: 2, kader: 3 }[status];

  return (
    <>
      <section className="karte">
        <h2>Offseason</h2>
        <ol className="schritte">
          {schritte.map((t, i) => (
            <li key={t} className={i < aktiv ? 'fertig' : i === aktiv ? 'aktiv' : ''}>
              {t}
            </li>
          ))}
        </ol>

        {status === 'start' && (
          <>
            <p>
              Die Saison ist vorbei. Als Erstes hören ältere Spieler auf, dann werden alle ein Jahr älter: junge Spieler entwickeln sich, ältere bauen ab.
              Danach folgen Draft-Lotterie, Draft und die Kaderplanung.
            </p>
            <button className="knopf" disabled={beschaeftigt} onClick={() => void aktion(starteOffseason)}>
              Offseason starten
            </button>
          </>
        )}

        {status === 'bericht' && o && (
          <>
            <p>
              Alle Spieler sind jetzt ein Jahr älter. Hier siehst du, wer sich entwickelt hat und wer aufgehört hat.
            </p>
            <button className="knopf" disabled={beschaeftigt} onClick={() => void aktion(starteLotterie)}>
              Weiter zur Draft-Lotterie
            </button>
          </>
        )}

        {status === 'lotterie' && o?.lotterie && (
          <>
            <p>
              Die Lotterie ist gezogen: Die ersten vier Picks wurden unter den 14 Teams ohne Playoffs ausgelost, der Rest folgt nach Bilanz.
            </p>
            <LotterieTabelle spiel={spiel} o={o} />
            <button className="knopf abstand" disabled={beschaeftigt} onClick={() => void aktion(starteDraft)}>
              Draft beginnen
            </button>
          </>
        )}

        {status === 'draft' && (
          <>
            <DraftHinweis spiel={spiel} />
            <button className="knopf abstand" onClick={() => onTab('liga')}>
              Zum Draft
            </button>
          </>
        )}

        {status === 'kader' && o && (
          <KaderPhase spiel={spiel} o={o} beschaeftigt={beschaeftigt} aktion={aktion} onSpieler={onSpieler} onTab={onTab} />
        )}
        {fehler && <p className="fehler">{fehler}</p>}
      </section>

      {(status === 'bericht' || status === 'lotterie' || status === 'draft' || status === 'kader') && o && (
        <Bericht spiel={spiel} o={o} onSpieler={onSpieler} />
      )}
    </>
  );
}

function DraftHinweis({ spiel }: { spiel: SpielDaten }) {
  const pick = aktuellerPick(spiel.liga, spiel.saison);
  const meine = spiel.liga.picks.filter((p) => p.saison === spiel.saison && p.besitzer === spiel.userTeamId && p.nr !== null);
  return (
    <>
      <p>
        Der Draft läuft. Deine Picks: {meine.map((p) => `#${p.nr}`).join(', ') || 'keine'}.{' '}
        {pick ? (pick.besitzer === spiel.userTeamId ? 'Du bist am Zug!' : `Gerade wählt Pick ${pick.nr}.`) : ''}
      </p>
    </>
  );
}

function LotterieTabelle({ spiel, o }: { spiel: SpielDaten; o: Offseason }) {
  const { liga } = spiel;
  const lot = o.lotterie;
  if (!lot) return null;
  const nrVon = (teamId: number) => liga.picks.find((p) => p.saison === spiel.saison && p.runde === 1 && p.ursprung === teamId)?.nr ?? 0;
  return (
    <div className="lotterie">
      {lot.teams.map((id, i) => {
        const t = liga.teams[id] as Team;
        const nr = nrVon(id);
        const gewonnen = lot.gelost.includes(id);
        return (
          <div className={`lotterie-zeile${id === spiel.userTeamId ? ' eigene' : ''}`} key={id}>
            <span>{t.kuerzel}</span>
            <span className="lotterie-chance">{(lot.chancen[i] ?? 0).toString().replace('.', ',')} % auf Pick 1</span>
            <strong className={gewonnen ? 'w-top' : ''}>Pick {nr}</strong>
          </div>
        );
      })}
    </div>
  );
}

function KaderPhase({
  spiel,
  o,
  beschaeftigt,
  aktion,
  onSpieler,
  onTab,
}: {
  spiel: SpielDaten;
  o: Offseason;
  beschaeftigt: boolean;
  aktion: (f: (k: SpielDaten) => void) => Promise<void>;
  onSpieler: (id: number) => void;
  onTab: (t: 'liga' | 'team') => void;
}) {
  const { liga } = spiel;
  const [sicher, setSicher] = useState<number | null>(null);
  const kader = kaderVon(liga, spiel.userTeamId);
  const pruefung = kannNeueSaisonStarten(spiel);
  const zuViele = kader.length - CONFIG.offseason.kader.max;
  const gedraftet = kader.filter((s) => s.draft?.saison === spiel.saison);
  return (
    <>
      <p>
        Der Draft ist vorbei. Dein Kader hat <strong>{kader.length}</strong> Spieler (erlaubt: {CONFIG.offseason.kader.min}–{CONFIG.offseason.kader.max}).
        {gedraftet.length > 0 && <> Neu: {gedraftet.map(name).join(', ')}.</>}{' '}
        Gehaltssumme: {fmtGeld(gehaltSumme(liga, spiel.userTeamId))}.
      </p>
      {o.vertraege.length > 0 && (
        <p className="hinweis">
          Vorläufig wurden {o.vertraege.length} auslaufende Verträge zum Marktwert verlängert. Echte Vertragsverhandlungen und Free Agency kommen
          in Meilenstein 5b.
        </p>
      )}
      {zuViele > 0 && <p className="fehler">Bitte entlasse {zuViele} Spieler, bevor die Saison beginnt.</p>}
      <div className="kaderliste">
        {kader.map((s) => (
          <div className="kaderzeile" key={s.id}>
            <button className="textknopf" onClick={() => onSpieler(s.id)}>
              {name(s)}
            </button>
            <span className="pos-klein">
              {s.position} · {s.alter} J.{s.draft?.saison === spiel.saison ? ' · Rookie' : ''}
            </span>
            <span className={wertKlasse(s.ovr)}>
              {s.ovr}/{s.pot}
            </span>
            <span className="pos-klein">
              {fmtGeld(s.vertrag.gehalt)} · {s.vertrag.jahre} J.
            </span>
            <button
              className={sicher === s.id ? 'knopf gefahr klein' : 'knopf zweit klein'}
              disabled={beschaeftigt}
              onClick={() => {
                if (sicher === s.id) {
                  setSicher(null);
                  void aktion((k) => entlasseSpieler(k, s.id));
                } else setSicher(s.id);
              }}
            >
              {sicher === s.id ? 'Sicher?' : 'Entlassen'}
            </button>
          </div>
        ))}
      </div>
      <p className="hinweis">Entlassene Spieler werden Free Agents. Das Restgehalt zählt erst ab Meilenstein 5b gegen die Gehaltsobergrenze.</p>
      <button className="knopf abstand" disabled={beschaeftigt || !pruefung.ok} onClick={() => void aktion(starteNeueSaison)}>
        Saison {spiel.saison + 1} starten
      </button>
      {!pruefung.ok && pruefung.grund && <p className="hinweis">{pruefung.grund}</p>}
      <button className="knopf zweit abstand" onClick={() => onTab('team')}>
        Rotation und Taktik ansehen
      </button>
    </>
  );
}

/** Bericht: Karriereende und Entwicklung (bleibt während der ganzen Offseason sichtbar). */
function Bericht({ spiel, o, onSpieler }: { spiel: SpielDaten; o: Offseason; onSpieler: (id: number) => void }) {
  const { liga } = spiel;
  const eigene = o.entwicklung.filter((z) => z.teamId === spiel.userTeamId);
  const andere = o.entwicklung.filter((z) => z.teamId !== spiel.userTeamId);
  const delta = (z: EntwicklungsZeile) => z.ovrNeu - z.ovrAlt;
  const hoch = andere.filter((z) => delta(z) > 0).sort((a, b) => delta(b) - delta(a)).slice(0, 5);
  const runter = andere.filter((z) => delta(z) < 0).sort((a, b) => delta(a) - delta(b)).slice(0, 5);

  const zeile = (z: EntwicklungsZeile, mitTeam: boolean) => {
    const s = liga.spieler[z.spielerId] as Spieler;
    const d = delta(z);
    return (
      <div className="entw-zeile" key={z.spielerId}>
        <button className="textknopf" onClick={() => onSpieler(z.spielerId)}>
          {name(s)}
        </button>
        <span className="pos-klein">
          {s.position} · {z.alter} J.{mitTeam && z.teamId !== null ? ` · ${(liga.teams[z.teamId] as Team).kuerzel}` : ''}
        </span>
        <span>
          {z.ovrAlt} → <strong className={wertKlasse(z.ovrNeu)}>{z.ovrNeu}</strong>{' '}
          <span className={plusKlasse(d)}>({d > 0 ? `+${d}` : d})</span>
        </span>
        <span className="pos-klein">POT {z.potNeu}</span>
      </div>
    );
  };

  const ruhestand = o.ruhestand.map((id) => liga.spieler[id] as Spieler);
  return (
    <>
      <section className="karte">
        <h2>Entwicklung deines Teams</h2>
        {eigene.length === 0 && <p className="hinweis">Keine Daten.</p>}
        {eigene.map((z) => zeile(z, false))}
      </section>
      <section className="karte">
        <h2>Größte Sprünge der Liga</h2>
        <h3 className="klein-titel">Aufsteiger</h3>
        {hoch.map((z) => zeile(z, true))}
        <h3 className="klein-titel">Absteiger</h3>
        {runter.map((z) => zeile(z, true))}
      </section>
      <section className="karte">
        <h2>Karriereende</h2>
        {ruhestand.length === 0 ? (
          <p className="hinweis">Diesmal hat kein bekannter Spieler aufgehört.</p>
        ) : (
          ruhestand
            .sort((a, b) => b.ovr - a.ovr)
            .slice(0, 12)
            .map((s) => (
              <div className="entw-zeile" key={s.id}>
                <button className="textknopf" onClick={() => onSpieler(s.id)}>
                  {name(s)}
                </button>
                <span className="pos-klein">
                  {s.position} · {s.alter} J.
                </span>
                <span className={wertKlasse(s.ovr)}>OVR {s.ovr}</span>
                <span />
              </div>
            ))
        )}
        <p className="hinweis">Im Bericht stehen nur bekannte Spieler (Stammspieler, Spieler deines Teams und Veteranen).</p>
      </section>
    </>
  );
}

