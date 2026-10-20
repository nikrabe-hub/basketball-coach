import Dexie, { type EntityTable } from 'dexie';
import type { SaveRecord } from './types';

/**
 * IndexedDB-Datenbank (über Dexie). Hier liegen alle Spielstände.
 * Achtung: Das ist die Version des DATENBANK-Schemas (Tabellen/Indizes),
 * nicht des Spielstand-Formats. Letzteres steht in CONFIG.saveVersion.
 */
export class BasketballDb extends Dexie {
  saves!: EntityTable<SaveRecord, 'slot'>;

  constructor(name = 'basketball-coach') {
    super(name);
    this.version(1).stores({
      saves: 'slot, geaendertAm',
    });
  }
}

export const db = new BasketballDb();
