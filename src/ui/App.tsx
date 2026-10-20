import { useCallback, useEffect, useState } from 'react';
import { neuerSeed } from '../engine/rng';
import { neuesSpiel, type SpielDaten } from '../engine/types';
import { saveStore } from '../store/saves';
import type { SlotInfo } from '../store/types';
import { Dialog } from './Dialog';
import { GameScreen } from './GameScreen';
import { useNav } from './nav';
import { NewGameDialog } from './NewGameDialog';
import { SlotScreen } from './SlotScreen';

function fehlerText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function App() {
  const { nav, gehe, ersetze, schliesseDialog } = useNav();
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktiverSlot, setAktiverSlot] = useState<number | null>(null);
  const [spiel, setSpiel] = useState<SpielDaten | null>(null);

  const ladeSlots = useCallback(async () => {
    try {
      setSlots(await saveStore.listeSlots());
      setFehler(null);
    } catch (e) {
      setFehler(`Spielstände konnten nicht geladen werden: ${fehlerText(e)}`);
    }
  }, []);

  useEffect(() => {
    void ladeSlots();
  }, [ladeSlots]);

  // Zurück-Taste führt zu einer Spielansicht ohne geladenes Spiel -> zurück ins Hauptmenü.
  useEffect(() => {
    if (nav.screen === 'game' && !spiel) ersetze({ screen: 'slots', tab: 'start', dialog: null });
  }, [nav.screen, spiel, ersetze]);

  // Beim Zurückkehren ins Hauptmenü die Liste aktualisieren.
  useEffect(() => {
    if (nav.screen === 'slots') void ladeSlots();
  }, [nav.screen, ladeSlots]);

  const starteNeu = async (slot: number, coachName: string, coachAlter: number) => {
    try {
      const rec = await saveStore.neu(slot, neuesSpiel(coachName, coachAlter, neuerSeed()));
      setAktiverSlot(slot);
      setSpiel(rec.daten);
      ersetze({ dialog: null });
      gehe({ screen: 'game', tab: 'start', dialog: null });
    } catch (e) {
      setFehler(`Neues Spiel konnte nicht angelegt werden: ${fehlerText(e)}`);
      schliesseDialog();
    }
  };

  const weiterSpielen = async (slot: number) => {
    try {
      const rec = await saveStore.laden(slot);
      if (!rec) {
        setFehler(`Speicherplatz ${slot} ist leer.`);
        await ladeSlots();
        return;
      }
      setAktiverSlot(slot);
      setSpiel(rec.daten);
      gehe({ screen: 'game', tab: 'start', dialog: null });
    } catch (e) {
      setFehler(`Spielstand konnte nicht geladen werden: ${fehlerText(e)}`);
    }
  };

  const loescheSlot = async (slot: number) => {
    try {
      await saveStore.loeschen(slot);
      if (slot === aktiverSlot) {
        setAktiverSlot(null);
        setSpiel(null);
      }
      await ladeSlots();
    } catch (e) {
      setFehler(`Spielstand konnte nicht gelöscht werden: ${fehlerText(e)}`);
    }
    schliesseDialog();
  };

  /** Änderung am Spielstand übernehmen und sofort speichern (Autosave). */
  const aendereSpiel = async (neu: SpielDaten) => {
    if (aktiverSlot === null) return;
    await saveStore.speichern(aktiverSlot, neu);
    setSpiel(neu);
  };

  return (
    <>
      {nav.screen === 'game' && spiel && aktiverSlot !== null ? (
        <GameScreen
          slot={aktiverSlot}
          spiel={spiel}
          tab={nav.tab}
          onTab={(tab) => gehe({ tab })}
          onAendern={aendereSpiel}
          onZuDenSlots={() => gehe({ screen: 'slots', tab: 'start', dialog: null })}
        />
      ) : (
        <SlotScreen
          slots={slots}
          fehler={fehler}
          onNeu={(slot) => gehe({ dialog: { typ: 'neu', slot } })}
          onWeiter={weiterSpielen}
          onLoeschen={(slot) => gehe({ dialog: { typ: 'loeschen', slot } })}
        />
      )}

      {nav.dialog?.typ === 'neu' && (
        <NewGameDialog
          slot={nav.dialog.slot}
          onAbbrechen={schliesseDialog}
          onStart={(name, alter) => {
            const slot = (nav.dialog as { slot: number }).slot;
            void starteNeu(slot, name, alter);
          }}
        />
      )}

      {nav.dialog?.typ === 'loeschen' && (
        <Dialog titel={`Platz ${nav.dialog.slot} löschen?`} onSchliessen={schliesseDialog}>
          <p>Der Spielstand wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.</p>
          <div className="knopfreihe">
            <button className="knopf zweit" onClick={schliesseDialog}>
              Abbrechen
            </button>
            <button
              className="knopf gefahr"
              onClick={() => void loescheSlot((nav.dialog as { slot: number }).slot)}
            >
              Endgültig löschen
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
