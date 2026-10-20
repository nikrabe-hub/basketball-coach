import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG } from '../engine/config';
import { neuesSpiel } from '../engine/types';
import { BasketballDb } from './db';
import { migrate } from './migrations';
import { SaveStore } from './saves';
import type { SaveRecord } from './types';

let zaehler = 0;
let db: BasketballDb;
let store: SaveStore;

beforeEach(() => {
  db = new BasketballDb(`test-db-${zaehler++}`);
  store = new SaveStore(db);
});

describe('SaveStore', () => {
  it('zeigt am Anfang drei leere Speicherplätze', async () => {
    const slots = await store.listeSlots();
    expect(slots).toHaveLength(CONFIG.saveSlots);
    expect(slots.every((s) => s.leer)).toBe(true);
  });

  it('legt einen Spielstand an und lädt ihn wieder', async () => {
    await store.neu(2, neuesSpiel('  Max Muster ', 41, 123));
    const geladen = await store.laden(2);
    expect(geladen?.daten.coach).toEqual({ name: 'Max Muster', alter: 41 });
    expect(geladen?.version).toBe(CONFIG.saveVersion);

    const slots = await store.listeSlots();
    expect(slots[0]?.leer).toBe(true);
    expect(slots[1]).toMatchObject({ leer: false, coachName: 'Max Muster', saison: 1 });
  });

  it('speichert Änderungen (Autosave)', async () => {
    await store.neu(1, neuesSpiel('A', 30, 1));
    const rec = await store.laden(1);
    await store.speichern(1, { ...rec!.daten, saison: 5 });
    expect((await store.laden(1))?.daten.saison).toBe(5);
  });

  it('löscht einen Spielstand', async () => {
    await store.neu(3, neuesSpiel('A', 30, 1));
    await store.loeschen(3);
    expect(await store.laden(3)).toBeUndefined();
  });

  it('lehnt ungültige Speicherplätze ab', async () => {
    await expect(store.neu(0, neuesSpiel('A', 30, 1))).rejects.toThrow();
    await expect(store.laden(CONFIG.saveSlots + 1)).rejects.toThrow();
  });

  it('speichern auf leerem Platz schlägt fehl', async () => {
    await expect(store.speichern(1, neuesSpiel('A', 30, 1))).rejects.toThrow();
  });
});

describe('Migrationen', () => {
  const alt: SaveRecord = {
    slot: 1,
    version: 1,
    erstelltAm: 0,
    geaendertAm: 0,
    daten: neuesSpiel('A', 30, 1),
  };

  it('lässt aktuelle Spielstände unverändert', () => {
    expect(migrate(alt, 1)).toBe(alt);
  });

  it('wendet Migrationsschritte nacheinander an', () => {
    const ergebnis = migrate(alt, 3, {
      1: (r) => ({ ...r, version: 2, daten: { ...r.daten, saison: 10 } }),
      2: (r) => ({ ...r, version: 3, daten: { ...r.daten, saison: r.daten.saison + 1 } }),
    });
    expect(ergebnis.version).toBe(3);
    expect(ergebnis.daten.saison).toBe(11);
  });

  it('meldet fehlende Migrationen und zu neue Spielstände', () => {
    expect(() => migrate(alt, 2, {})).toThrow(/Keine Migration/);
    expect(() => migrate({ ...alt, version: 5 }, 2, {})).toThrow(/neueren/);
  });
});
