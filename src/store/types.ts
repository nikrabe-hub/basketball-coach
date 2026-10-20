import type { SpielDaten } from '../engine/types';

/** So wird ein Spielstand in IndexedDB abgelegt. */
export interface SaveRecord {
  /** Speicherplatz, 1..CONFIG.saveSlots (dient als Schlüssel) */
  slot: number;
  /** Format-Version des Spielstands, siehe migrations.ts */
  version: number;
  erstelltAm: number;
  geaendertAm: number;
  daten: SpielDaten;
}

/** Kurzinfo für die Anzeige der Speicherplätze (ohne den ganzen Spielstand zu laden). */
export interface SlotInfo {
  slot: number;
  leer: boolean;
  coachName?: string;
  /** Name des Teams, z. B. "Harbor City Comets", plus Farben für das Logo */
  teamName?: string;
  teamKuerzel?: string;
  teamFarbe1?: string;
  teamFarbe2?: string;
  saison?: number;
  geaendertAm?: number;
}
