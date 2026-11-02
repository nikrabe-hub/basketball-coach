import { simuliereZiel, type SimulationsZiel } from '../engine/season';
import type { SpielDaten } from '../engine/types';
import type { WorkerAntwort, WorkerAuftrag } from '../worker/sim.worker';

export interface Lauf {
  /** Der veränderte Spielstand (Original bleibt unberührt). Wird bei Abbruch abgelehnt. */
  ergebnis: Promise<SpielDaten>;
  abbrechen: () => void;
}

export class AbbruchFehler extends Error {
  constructor() {
    super('Simulation abgebrochen');
    this.name = 'AbbruchFehler';
  }
}

/**
 * Simuliert das Ziel (Hauptrunde, Play-In oder Playoffs) in einem Web Worker (die Oberfläche bleibt bedienbar).
 * Wo es keine Worker gibt (z. B. in Tests), läuft dasselbe direkt im Hauptthread.
 * Bei einer wichtigen Meldung (z. B. schwere Verletzung) hält die Simulation früher an.
 */
export function simuliereImHintergrund(
  spiel: SpielDaten,
  ziel: SimulationsZiel,
  onFortschritt: (fertig: number, gesamt: number) => void,
): Lauf {
  if (typeof Worker === 'undefined') return simuliereOhneWorker(spiel, ziel, onFortschritt);

  const worker = new Worker(new URL('../worker/sim.worker.ts', import.meta.url), { type: 'module' });
  let ablehnen: (e: Error) => void = () => {};
  const ergebnis = new Promise<SpielDaten>((resolve, reject) => {
    ablehnen = reject;
    worker.onmessage = (e: MessageEvent<WorkerAntwort>) => {
      const a = e.data;
      if (a.typ === 'fortschritt') onFortschritt(a.fertig, a.gesamt);
      else if (a.typ === 'fertig') {
        worker.terminate();
        resolve(a.spiel);
      } else {
        worker.terminate();
        reject(new Error(a.text));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Fehler im Simulations-Worker'));
    };
    worker.postMessage({ spiel, ziel } satisfies WorkerAuftrag);
  });
  return {
    ergebnis,
    abbrechen: () => {
      worker.terminate();
      ablehnen(new AbbruchFehler());
    },
  };
}

function simuliereOhneWorker(original: SpielDaten, ziel: SimulationsZiel, onFortschritt: (fertig: number, gesamt: number) => void): Lauf {
  let abgebrochen = false;
  const ergebnis = (async () => {
    await new Promise((r) => setTimeout(r, 0));
    if (abgebrochen) throw new AbbruchFehler();
    const spiel = structuredClone(original);
    simuliereZiel(spiel, ziel, { onFortschritt });
    return spiel;
  })();
  return {
    ergebnis,
    abbrechen: () => {
      abgebrochen = true;
    },
  };
}
