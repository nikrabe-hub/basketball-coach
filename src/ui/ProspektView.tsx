import { useState } from 'react';
import { CONFIG } from '../engine/config';
import { aktuellerPick } from '../engine/draft';
import { draftWaehle, offseasonStatus } from '../engine/offseason';
import { ATTRIBUT_GRUPPEN, ATTRIBUT_INFO } from '../engine/player';
import { ansichtVon, naechsteStufeKosten, scoute, stufeVon, type Spanne } from '../engine/scouting';
import type { SpielDaten } from '../engine/types';
import { fuehreAus } from './aktion';
import { wertKlasse } from './format';

const STUFEN_TEXT = ['grobe Einschätzung', 'etwas genauer', 'ziemlich genau', 'fast sicher'];
const MAX_STUFE = CONFIG.offseason.scouting.kosten.length - 1;

const spannenText = ([von, bis]: Spanne) => (von === bis ? String(von) : `${von}–${bis}`);
const mitte = ([von, bis]: Spanne) => (von + bis) / 2;

interface Props {
  spiel: SpielDaten;
  spielerId: number;
  onAendern: (neu: SpielDaten) => Promise<void>;
  onSchliessen: () => void;
}

/** Karte eines Draft-Kandidaten: Wertungen nur als Spannen, mit Scouting wird die Spanne enger. */
export function ProspektView({ spiel, spielerId, onAendern, onSchliessen }: Props) {
  const [fehler, setFehler] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const s = spiel.liga.spieler[spielerId];
  if (!s) return null;
  const a = ansichtVon(spiel, s);
  const stufe = stufeVon(spiel, s.id);
  const kosten = naechsteStufeKosten(spiel, s.id);
  const pick = offseasonStatus(spiel) === 'draft' ? aktuellerPick(spiel.liga, spiel.saison) : null;
  const ichBinDran = pick !== null && pick.besitzer === spiel.userTeamId;

  const ausfuehren = async (aenderung: (k: SpielDaten) => void, danachSchliessen = false) => {
    setBeschaeftigt(true);
    const f = await fuehreAus(spiel, onAendern, aenderung);
    setBeschaeftigt(false);
    setFehler(f);
    if (!f && danachSchliessen) onSchliessen();
  };

  return (
    <div className="spielerkarte">
      <div className="sk-kopf">
        <div className="sk-wertung">
          <span className={`sk-ovr klein ${wertKlasse(mitte(a.ovr))}`}>{spannenText(a.ovr)}</span>
          <span className="sk-label">OVR</span>
        </div>
        <div className="sk-name">
          <strong>
            {s.vorname} {s.nachname}
          </strong>
          <span>
            {s.position} · {s.alter} Jahre · {s.groesseCm} cm · {s.gewichtKg} kg
          </span>
          <span>{s.nationalitaet} · Draft-Kandidat</span>
        </div>
        <div className="sk-wertung">
          <span className={`sk-ovr klein ${wertKlasse(mitte(a.pot))}`}>{spannenText(a.pot)}</span>
          <span className="sk-label">POT</span>
        </div>
      </div>

      <div className="sk-block">
        <h3>Scouting</h3>
        <p>
          Stufe {stufe} von {MAX_STUFE}: {STUFEN_TEXT[stufe]}. Du hast noch <strong>{spiel.scouting.punkte}</strong> Scouting-Punkte.
        </p>
        <button
          className="knopf zweit abstand"
          disabled={beschaeftigt || kosten === null || kosten > spiel.scouting.punkte}
          onClick={() => void ausfuehren((k) => void scoute(k, s.id))}
        >
          {kosten === null ? 'Höchste Stufe erreicht' : `Genauer ansehen (−${kosten} Punkte)`}
        </button>
        <p className="hinweis">Je genauer du hinsiehst, desto enger werden alle Spannen. Der wahre Wert liegt immer darin.</p>
      </div>

      {ichBinDran && (
        <button className="knopf abstand" disabled={beschaeftigt} onClick={() => void ausfuehren((k) => draftWaehle(k, s.id), true)}>
          Diesen Spieler draften (Pick {pick?.nr})
        </button>
      )}
      {fehler && <p className="fehler">{fehler}</p>}

      {ATTRIBUT_GRUPPEN.map((gruppe) => (
        <div className="sk-block" key={gruppe}>
          <h3>{gruppe}</h3>
          {ATTRIBUT_INFO.filter((i) => i.gruppe === gruppe).map((i) => {
            const sp = a.attribute[i.key];
            return (
              <div className="attr spanne" key={i.key}>
                <span className="attr-name">{i.label}</span>
                <span className="attr-balken">
                  <span
                    className={`attr-fuell ${wertKlasse(mitte(sp))}`}
                    style={{ left: `${((sp[0] - 25) / 74) * 100}%`, width: `${Math.max(2, ((sp[1] - sp[0]) / 74) * 100)}%` }}
                  />
                </span>
                <span className={`attr-wert ${wertKlasse(mitte(sp))}`}>{spannenText(sp)}</span>
              </div>
            );
          })}
        </div>
      ))}
      <p className="hinweis">Persönlichkeit (Arbeitsethik, Ego, ...) siehst du erst, wenn der Spieler in deinem Team ist.</p>
    </div>
  );
}
