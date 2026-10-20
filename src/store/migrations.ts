import { CONFIG } from '../engine/config';
import type { SaveRecord } from './types';

/**
 * Migrationen für alte Spielstände.
 *
 * Wenn sich das Format eines Spielstands ändert:
 *  1. CONFIG.saveVersion in engine/config.ts um 1 erhöhen,
 *  2. hier unter dem ALTEN Versionsstand eine Funktion eintragen, die den
 *     Spielstand auf die nächste Version hebt.
 * Beispiel (später): 1: (rec) => ({ ...rec, version: 2, daten: { ...rec.daten, neuesFeld: 0 } })
 */
type Migration = (record: SaveRecord) => SaveRecord;

export const MIGRATIONEN: Record<number, Migration> = {
  // Noch keine – Version 1 ist das erste Format.
};

/** Hebt einen Spielstand Schritt für Schritt auf die aktuelle Version. */
export function migrate(
  record: SaveRecord,
  zielVersion: number = CONFIG.saveVersion,
  migrationen: Record<number, Migration> = MIGRATIONEN,
): SaveRecord {
  if (record.version > zielVersion) {
    throw new Error(
      `Spielstand stammt aus einer neueren App-Version (${record.version} > ${zielVersion}).`,
    );
  }
  let aktuell = record;
  while (aktuell.version < zielVersion) {
    const schritt = migrationen[aktuell.version];
    if (!schritt) {
      throw new Error(`Keine Migration von Version ${aktuell.version} vorhanden.`);
    }
    const vorher = aktuell.version;
    aktuell = schritt(aktuell);
    if (aktuell.version <= vorher) {
      throw new Error(`Migration von Version ${vorher} hat die Version nicht erhöht.`);
    }
  }
  return aktuell;
}
