import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG } from '../engine/config';
import { generiereLiga } from '../engine/league';
import { neuesSpiel } from '../engine/types';
import { BasketballDb } from './db';
import { migrate } from './migrations';
import { SaveStore } from './saves';
import type { SaveRecord } from './types';

let zaehler = 0;
let db: BasketballDb;
let store: SaveStore;

// Eine kleine Liga reicht für die Tests (wird nur einmal erzeugt).
const liga = generiereLiga(1, 29);
const spiel = (name: string, alter = 30) => neuesSpiel(name, alter, 1, structuredClone(liga), 4);

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

  it('legt einen Spielstand an und lädt ihn wieder (mit Liga und Team)', async () => {
    await store.neu(2, spiel('  Max Muster ', 41));
    const geladen = await store.laden(2);
    expect(geladen?.daten.coach).toEqual({ name: 'Max Muster', alter: 41 });
    expect(geladen?.daten.userTeamId).toBe(4);
    expect(geladen?.daten.liga.teams).toHaveLength(30);
    expect(geladen?.daten.liga.spieler.length).toBeGreaterThan(380);
    expect(geladen?.version).toBe(CONFIG.saveVersion);

    const slots = await store.listeSlots();
    expect(slots[0]?.leer).toBe(true);
    expect(slots[1]).toMatchObject({
      leer: false,
      coachName: 'Max Muster',
      saison: 1,
      teamName: `${liga.teams[4]?.stadt} ${liga.teams[4]?.name}`,
    });
  });

  it('speichert Änderungen (Autosave)', async () => {
    await store.neu(1, spiel('A'));
    const rec = await store.laden(1);
    await store.speichern(1, { ...rec!.daten, saison: 5 });
    expect((await store.laden(1))?.daten.saison).toBe(5);
  });

  it('löscht einen Spielstand', async () => {
    await store.neu(3, spiel('A'));
    await store.loeschen(3);
    expect(await store.laden(3)).toBeUndefined();
  });

  it('lehnt ungültige Speicherplätze ab', async () => {
    await expect(store.neu(0, spiel('A'))).rejects.toThrow();
    await expect(store.laden(CONFIG.saveSlots + 1)).rejects.toThrow();
  });

  it('speichern auf leerem Platz schlägt fehl', async () => {
    await expect(store.speichern(1, spiel('A'))).rejects.toThrow();
  });

  it('hebt einen alten Spielstand (Format 1) beim Laden automatisch auf Format 2', async () => {
    const alt = {
      slot: 1,
      version: 1,
      erstelltAm: 1,
      geaendertAm: 2,
      daten: { coach: { name: 'Alt', alter: 50 }, seed: 99, saison: 3 },
    };
    await db.saves.put(alt as unknown as SaveRecord);

    // Die Slot-Übersicht darf mit dem alten Format nicht abstürzen.
    const slots = await store.listeSlots();
    expect(slots[0]).toMatchObject({ leer: false, coachName: 'Alt', saison: 3 });

    const geladen = await store.laden(1);
    expect(geladen?.version).toBe(2);
    expect(geladen?.daten.coach.name).toBe('Alt');
    expect(geladen?.daten.saison).toBe(3);
    expect(geladen?.daten.userTeamId).toBe(0);
    expect(geladen?.daten.liga.teams).toHaveLength(30);

    // Und wurde dauerhaft gespeichert:
    expect((await db.saves.get(1))?.version).toBe(2);
  });
});

describe('Migrationen', () => {
  const alt: SaveRecord = {
    slot: 1,
    version: 1,
    erstelltAm: 0,
    geaendertAm: 0,
    daten: spiel('A'),
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
