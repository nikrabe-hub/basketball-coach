import type { SpielDaten } from '../engine/types';

/**
 * Führt eine Änderung am Spielstand auf einer Kopie aus und speichert sie.
 * Gibt eine Fehlermeldung zurück (oder null, wenn alles geklappt hat).
 */
export async function fuehreAus(
  spiel: SpielDaten,
  onAendern: (neu: SpielDaten) => Promise<void>,
  aenderung: (kopie: SpielDaten) => void,
): Promise<string | null> {
  const kopie = structuredClone(spiel);
  try {
    aenderung(kopie);
    await onAendern(kopie);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
