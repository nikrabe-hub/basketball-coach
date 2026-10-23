import { App as CapApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useCallback, useEffect, useRef, useState } from 'react';

export type TabId = 'start' | 'team' | 'liga' | 'buero' | 'menue';

export type DialogState =
  | { typ: 'neu'; slot: number }
  | { typ: 'loeschen'; slot: number }
  | { typ: 'team'; teamId: number }
  | { typ: 'spieler'; spielerId: number }
  | { typ: 'box'; tag: number; index: number }
  | null;

export interface NavState {
  screen: 'slots' | 'teamwahl' | 'game';
  tab: TabId;
  dialog: DialogState;
}

const START: NavState = { screen: 'slots', tab: 'start', dialog: null };

/**
 * Navigation, die mit dem Browser-Verlauf (History) verknüpft ist.
 * Dadurch funktioniert die Android-Zurück-Taste sinnvoll:
 * Sie schließt zuerst Dialoge und geht dann zur vorherigen Ansicht.
 * Im Browser macht das die Zurück-Taste des Browsers selbst, in der Android-App
 * übernimmt der backButton-Handler weiter unten.
 */
export function useNav() {
  const [nav, setNavState] = useState<NavState>(START);
  const navRef = useRef<NavState>(START);

  const setzen = useCallback((neu: NavState) => {
    navRef.current = neu;
    setNavState(neu);
  }, []);

  useEffect(() => {
    // Nach einem Neuladen immer sauber beim Hauptmenü beginnen.
    window.history.replaceState(START, '');
    const beiZurueck = (e: PopStateEvent) => {
      setzen((e.state as NavState | null) ?? START);
    };
    window.addEventListener('popstate', beiZurueck);
    return () => window.removeEventListener('popstate', beiZurueck);
  }, [setzen]);

  // Android-Zurück-Taste (nur in der APK): Capacitor schließt sonst einfach die App.
  // Hier: immer einen Schritt im Verlauf zurück (Dialog schließen, vorheriger Tab,
  // Spielansicht -> Speicherplätze). Nur im Hauptmenü ohne Dialog wird die App beendet.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: PluginListenerHandle | undefined;
    let aufgeraeumt = false;
    void CapApp.addListener('backButton', () => {
      const aktuell = navRef.current;
      if (aktuell.screen === 'slots' && !aktuell.dialog) {
        void CapApp.exitApp();
      } else {
        window.history.back();
      }
    }).then((h) => {
      if (aufgeraeumt) void h.remove();
      else handle = h;
    });
    return () => {
      aufgeraeumt = true;
      void handle?.remove();
    };
  }, []);

  /** Zu einer neuen Ansicht wechseln (neuer Verlaufseintrag). */
  const gehe = useCallback(
    (aenderung: Partial<NavState>) => {
      const neu = { ...navRef.current, ...aenderung };
      window.history.pushState(neu, '');
      setzen(neu);
    },
    [setzen],
  );

  /** Ansicht ersetzen, ohne neuen Verlaufseintrag (z. B. nach dem Laden eines Spielstands). */
  const ersetze = useCallback(
    (aenderung: Partial<NavState>) => {
      const neu = { ...navRef.current, ...aenderung };
      window.history.replaceState(neu, '');
      setzen(neu);
    },
    [setzen],
  );

  /** Dialog schließen: einen Schritt zurück, wenn der Dialog im Verlauf steht. */
  const schliesseDialog = useCallback(() => {
    if ((window.history.state as NavState | null)?.dialog) {
      window.history.back();
    } else {
      setzen({ ...navRef.current, dialog: null });
    }
  }, [setzen]);

  return { nav, gehe, ersetze, schliesseDialog };
}
