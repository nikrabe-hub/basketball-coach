import { useCallback, useEffect, useRef, useState } from 'react';

export type TabId = 'start' | 'team' | 'liga' | 'buero' | 'menue';

export type DialogState =
  | { typ: 'neu'; slot: number }
  | { typ: 'loeschen'; slot: number }
  | null;

export interface NavState {
  screen: 'slots' | 'game';
  tab: TabId;
  dialog: DialogState;
}

const START: NavState = { screen: 'slots', tab: 'start', dialog: null };

/**
 * Navigation, die mit dem Browser-Verlauf (History) verknüpft ist.
 * Dadurch funktioniert die Android-Zurück-Taste sinnvoll:
 * Sie schließt zuerst Dialoge und geht dann zur vorherigen Ansicht.
 * (Capacitor ruft auf Android history.back() auf; ist der Verlauf leer, wird die App beendet.)
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
