import { simuliereBis } from '../engine/season';
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
 * Simuliert bis zum Tag `bis` in einem Web Worker (die Oberfläche bleibt bedienbar).
 * Wo es keine Worker gibt (z. B. in Tests), läuft dasselbe in kleinen Schritten im Hauptthread.
 */
export function simuliereImHintergrund(
  spiel: SpielDaten,
  bis: number,
  onFortschritt: (fertig: number, gesamt: number) => void,
): Lauf {
  if (typeof Worker === 'undefined') return simuliereOhneWorker(spiel, bis, onFortschritt);

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
    worker.postMessage({ spiel, bis } satisfies WorkerAuftrag);
  });
  return {
    ergebnis,
    abbrechen: () => {
      worker.terminate();
      ablehnen(new AbbruchFehler());
    },
  };
}

function simuliereOhneWorker(
  original: SpielDaten,
  bis: number,
  onFortschritt: (fertig: number, gesamt: number) => void,
): Lauf {
  let abgebrochen = false;
  const ergebnis = (async () => {
    const spiel = structuredClone(original);
    const start = spiel.liga.tag;
    const ende = Math.min(bis, spiel.liga.spielplan.length);
    while (spiel.liga.tag < ende) {
      if (abgebrochen) throw new AbbruchFehler();
      simuliereBis(spiel, spiel.liga.tag + 1);
      onFortschritt(spiel.liga.tag - start, ende - start);
      await new Promise((r) => setTimeout(r, 0));
    }
    return spiel;
  })();
  return {
    ergebnis,
    abbrechen: () => {
      abgebrochen = true;
    },
  };
}
