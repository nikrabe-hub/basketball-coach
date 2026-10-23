/// <reference lib="webworker" />
import { simuliereBis } from '../engine/season';
import type { SpielDaten } from '../engine/types';

/**
 * Web Worker: simuliert Spieltage im Hintergrund, damit die Oberfläche nicht einfriert.
 * Eingabe: ein Spielstand und der Tag, bis zu dem simuliert wird (ausschließlich).
 * Ausgabe: laufende Fortschrittsmeldungen und am Ende der veränderte Spielstand.
 */
export interface WorkerAuftrag {
  spiel: SpielDaten;
  bis: number;
}

export type WorkerAntwort =
  | { typ: 'fortschritt'; fertig: number; gesamt: number }
  | { typ: 'fertig'; spiel: SpielDaten }
  | { typ: 'fehler'; text: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (e: MessageEvent<WorkerAuftrag>) => {
  const { spiel, bis } = e.data;
  try {
    let letzteMeldung = 0;
    simuliereBis(spiel, bis, {
      onFortschritt: (fertig, gesamt) => {
        const jetzt = Date.now();
        // höchstens ca. 20 Meldungen pro Sekunde
        if (jetzt - letzteMeldung > 50 || fertig === gesamt) {
          letzteMeldung = jetzt;
          scope.postMessage({ typ: 'fortschritt', fertig, gesamt } satisfies WorkerAntwort);
        }
      },
    });
    scope.postMessage({ typ: 'fertig', spiel } satisfies WorkerAntwort);
  } catch (err) {
    scope.postMessage({ typ: 'fehler', text: err instanceof Error ? err.message : String(err) } satisfies WorkerAntwort);
  }
};
