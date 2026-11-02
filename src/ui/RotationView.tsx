import { useEffect, useMemo, useRef, useState } from 'react';
import { kaderVon } from '../engine/league';
import { verletzungText } from '../engine/injuries';
import { minutenSumme, SPIELZEIT_GESAMT, vollstaendigeRotation, vorschlagRotation } from '../engine/rotation';
import type { Rotation, Spieler, SpielDaten } from '../engine/types';
import { kurzName } from './KaderTabelle';
import { moralKlasse, moralWort, wertKlasse } from './format';

interface Props {
  spiel: SpielDaten;
  onAendern: (neu: SpielDaten) => Promise<void>;
  onSpieler: (id: number) => void;
}

const MAX_MINUTEN = 40;
const SPEICHER_VERZOEGERUNG_MS = 400;

/**
 * Rotation des eigenen Teams: Automatik oder Starting Five plus Ziel-Minuten pro Spieler.
 * Beim Ziehen der Regler wird erst nach einer kurzen Pause gespeichert.
 */
export function RotationView({ spiel, onAendern, onSpieler }: Props) {
  const kader = useMemo(
    () => [...kaderVon(spiel.liga, spiel.userTeamId)].sort((a, b) => b.ovr - a.ovr || a.id - b.id),
    [spiel.liga, spiel.userTeamId],
  );
  const [rot, setRot] = useState<Rotation>(() => vollstaendigeRotation(kader, spiel.coaching.rotation));
  const neuestes = useRef({ spiel, rot });
  neuestes.current = { spiel, rot };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speichereJetzt = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { spiel: s, rot: r } = neuestes.current;
    void onAendern({ ...s, coaching: { ...s.coaching, rotation: r } });
  };
  const aendere = (neu: Rotation, sofort = false) => {
    neuestes.current = { ...neuestes.current, rot: neu };
    setRot(neu);
    if (timer.current) clearTimeout(timer.current);
    if (sofort) speichereJetzt();
    else timer.current = setTimeout(speichereJetzt, SPEICHER_VERZOEGERUNG_MS);
  };
  // Beim Verlassen der Ansicht eine noch ausstehende Änderung speichern.
  useEffect(
    () => () => {
      if (timer.current) speichereJetzt();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const gesund = kader.filter((s) => !s.verletzung);
  const summe = minutenSumme(kader, rot);
  const fehlendeStarter = 5 - rot.starter.filter((id) => gesund.some((s) => s.id === id)).length;
  const mitMinuten = gesund.filter((s) => (rot.minuten[String(s.id)] ?? 0) > 0).length;

  const setzeMinuten = (s: Spieler, m: number) =>
    aendere({ ...rot, minuten: { ...rot.minuten, [String(s.id)]: m } });
  const wechsleStarter = (s: Spieler) => {
    const ist = rot.starter.includes(s.id);
    if (!ist && rot.starter.filter((id) => gesund.some((g) => g.id === id)).length >= 5) return;
    aendere({ ...rot, starter: ist ? rot.starter.filter((id) => id !== s.id) : [...rot.starter, s.id] }, true);
  };
  const setzeAuto = (auto: boolean) => {
    if (auto) aendere({ ...rot, auto: true }, true);
    else {
      // Beim Wechsel zu eigener Rotation: bei leerer Einstellung mit dem Vorschlag beginnen
      const leer = rot.starter.length === 0 || Object.values(rot.minuten).every((m) => m === 0);
      aendere(leer ? vorschlagRotation(kader) : { ...rot, auto: false }, true);
    }
  };

  return (
    <>
      <section className="karte">
        <label className="schalter">
          <input type="checkbox" checked={rot.auto} onChange={(e) => setzeAuto(e.target.checked)} />
          <span>Automatische Rotation (der Computer entscheidet)</span>
        </label>
        <p className="hinweis">
          {rot.auto
            ? 'Die fünf Besten starten, die Spielzeit richtet sich nach Stärke, Müdigkeit und Spielstand. Schalte die Automatik aus, um Starter und Minuten selbst festzulegen.'
            : 'Du legst die Starting Five und die Ziel-Minuten fest. Müdigkeit, Foulprobleme und ein klarer Spielstand können im Spiel trotzdem zu Wechseln führen.'}
        </p>
      </section>

      {!rot.auto && (
        <section className="karte">
          <div className="fakten">
            <span>Summe Minuten</span>
            <span className={summe === SPIELZEIT_GESAMT ? 'w-gut' : 'fett'}>
              {summe} von {SPIELZEIT_GESAMT}
            </span>
            <span>Starter</span>
            <span className={fehlendeStarter === 0 ? 'w-gut' : 'w-schwach'}>{5 - fehlendeStarter} von 5</span>
            <span>Spieler mit Minuten</span>
            <span>{mitMinuten}</span>
          </div>
          {summe !== SPIELZEIT_GESAMT && (
            <p className="hinweis">
              Es müssen nicht genau {SPIELZEIT_GESAMT} sein: Die Minuten werden beim Spiel im selben Verhältnis auf {SPIELZEIT_GESAMT} umgerechnet.
            </p>
          )}
          {fehlendeStarter > 0 && <p className="hinweis">Es fehlen Starter – der Computer ergänzt sie mit den meisten Minuten.</p>}
          <button className="knopf zweit abstand" onClick={() => aendere(vorschlagRotation(kader), true)}>
            Vorschlag laden (wie Automatik)
          </button>
        </section>
      )}

      <div className="rotation-liste">
        {kader.map((s) => {
          const verletzt = s.verletzung !== null;
          const m = rot.minuten[String(s.id)] ?? 0;
          const starter = rot.starter.includes(s.id);
          return (
            <div key={s.id} className={verletzt ? 'rot-zeile verletzt' : 'rot-zeile'}>
              <div className="rot-kopf">
                <button className="rot-name" onClick={() => onSpieler(s.id)}>
                  <strong>{kurzName(s)}</strong>
                  <span className="rot-pos">{s.position}</span>
                  <span className={`fett ${wertKlasse(s.ovr)}`}>{s.ovr}</span>
                </button>
                <span className={`rot-moral ${moralKlasse(s.moral)}`} title="Moral">
                  {moralWort(s.moral)}
                </span>
                {!rot.auto && !verletzt && (
                  <label className="rot-starter">
                    <input
                      type="checkbox"
                      checked={starter}
                      disabled={!starter && 5 - fehlendeStarter >= 5}
                      onChange={() => wechsleStarter(s)}
                    />
                    <span>Starter</span>
                  </label>
                )}
              </div>
              {verletzt ? (
                <p className="rot-verletzt">🩹 {verletzungText(s)} – fällt aus</p>
              ) : (
                !rot.auto && (
                  <div className="rot-regler">
                    <input
                      type="range"
                      min={0}
                      max={MAX_MINUTEN}
                      step={1}
                      value={m}
                      aria-label={`Minuten ${s.nachname}`}
                      onChange={(e) => setzeMinuten(s, Number(e.target.value))}
                    />
                    <span className="rot-min">{m} Min</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
      <p className="hinweis">
        Auf dem Feld stehen immer mindestens ein Guard und ein großer Spieler. Verletzte Spieler werden automatisch übersprungen.
      </p>
    </>
  );
}
