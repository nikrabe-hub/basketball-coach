import { CONFIG } from '../engine/config';
import type { SpielDaten } from '../engine/types';
import { BasketballDb, db as standardDb } from './db';
import { migrate } from './migrations';
import type { SaveRecord, SlotInfo } from './types';

function pruefeSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > CONFIG.saveSlots) {
    throw new Error(`Ungültiger Speicherplatz: ${slot}`);
  }
}

/** Verwaltung der Speicherplätze. Die Datenbank ist austauschbar (für Tests). */
export class SaveStore {
  constructor(private readonly db: BasketballDb = standardDb) {}

  /** Infos zu allen Speicherplätzen (leere Plätze eingeschlossen). */
  async listeSlots(): Promise<SlotInfo[]> {
    const alle = await this.db.saves.toArray();
    const infos: SlotInfo[] = [];
    for (let slot = 1; slot <= CONFIG.saveSlots; slot++) {
      const rec = alle.find((r) => r.slot === slot);
      infos.push(
        rec
          ? {
              slot,
              leer: false,
              coachName: rec.daten.coach.name,
              saison: rec.daten.saison,
              geaendertAm: rec.geaendertAm,
            }
          : { slot, leer: true },
      );
    }
    return infos;
  }

  /** Neuen Spielstand in einen Platz schreiben (überschreibt, was dort war). */
  async neu(slot: number, daten: SpielDaten): Promise<SaveRecord> {
    pruefeSlot(slot);
    const jetzt = Date.now();
    const rec: SaveRecord = {
      slot,
      version: CONFIG.saveVersion,
      erstelltAm: jetzt,
      geaendertAm: jetzt,
      daten,
    };
    await this.db.saves.put(rec);
    return rec;
  }

  /** Spielstand laden und bei Bedarf auf die aktuelle Version migrieren. */
  async laden(slot: number): Promise<SaveRecord | undefined> {
    pruefeSlot(slot);
    const rec = await this.db.saves.get(slot);
    if (!rec) return undefined;
    const migriert = migrate(rec);
    if (migriert !== rec) await this.db.saves.put(migriert);
    return migriert;
  }

  /** Autosave: Daten eines bestehenden Spielstands aktualisieren. */
  async speichern(slot: number, daten: SpielDaten): Promise<void> {
    pruefeSlot(slot);
    const rec = await this.db.saves.get(slot);
    if (!rec) throw new Error(`Speicherplatz ${slot} ist leer.`);
    await this.db.saves.put({ ...rec, daten, geaendertAm: Date.now() });
  }

  async loeschen(slot: number): Promise<void> {
    pruefeSlot(slot);
    await this.db.saves.delete(slot);
  }
}

export const saveStore = new SaveStore();
