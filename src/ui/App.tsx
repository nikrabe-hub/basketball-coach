import { useCallback, useEffect, useState } from 'react';
import { generiereLiga } from '../engine/league';
import { neuerSeed } from '../engine/rng';
import { teamName } from '../engine/teams';
import { neuesSpiel, type Liga, type SpielDaten } from '../engine/types';
import { saveStore } from '../store/saves';
import type { SlotInfo } from '../store/types';
import { BoxscoreView } from './BoxscoreView';
import { Dialog } from './Dialog';
import { lesbareTextfarbe } from './format';
import { GameScreen } from './GameScreen';
import { useNav } from './nav';
import { NewGameDialog } from './NewGameDialog';
import { PlayerCard } from './PlayerCard';
import { SlotScreen } from './SlotScreen';
import { TeamPicker } from './TeamPicker';
import { TeamView } from './TeamView';

function fehlerText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Angaben aus dem "Neues Spiel"-Dialog, solange das Team noch gewählt wird. */
interface Entwurf {
  slot: number;
  coachName: string;
  coachAlter: number;
  saisonLaenge: number;
  seed: number;
  liga: Liga;
}

export function App() {
  const { nav, gehe, ersetze, schliesseDialog } = useNav();
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktiverSlot, setAktiverSlot] = useState<number | null>(null);
  const [spiel, setSpiel] = useState<SpielDaten | null>(null);
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);

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

  // Zurück-Taste führt zu einer Ansicht ohne die nötigen Daten -> zurück ins Hauptmenü.
  useEffect(() => {
    if ((nav.screen === 'game' && !spiel) || (nav.screen === 'teamwahl' && !entwurf)) {
      ersetze({ screen: 'slots', tab: 'start', dialog: null });
    }
  }, [nav.screen, spiel, entwurf, ersetze]);

  // Beim Zurückkehren ins Hauptmenü die Liste aktualisieren.
  useEffect(() => {
    if (nav.screen === 'slots') void ladeSlots();
  }, [nav.screen, ladeSlots]);

  // Akzentfarbe = Farbe des eigenen Teams (nur im Spiel)
  useEffect(() => {
    const root = document.documentElement;
    const team = nav.screen === 'game' && spiel ? spiel.liga.teams[spiel.userTeamId] : undefined;
    if (team) {
      root.style.setProperty('--akzent', team.farbe1);
      root.style.setProperty('--akzent-text', lesbareTextfarbe(team.farbe1));
    } else {
      root.style.removeProperty('--akzent');
      root.style.removeProperty('--akzent-text');
    }
  }, [nav.screen, spiel]);

  // Schritt 1 des neuen Spiels: Liga erzeugen, dann Team wählen lassen.
  const zurTeamwahl = (slot: number, coachName: string, coachAlter: number, saisonLaenge: number) => {
    try {
      const seed = neuerSeed();
      setEntwurf({ slot, coachName, coachAlter, saisonLaenge, seed, liga: generiereLiga(seed, saisonLaenge) });
      ersetze({ dialog: null });
      gehe({ screen: 'teamwahl', dialog: null });
    } catch (e) {
      setFehler(`Liga konnte nicht erzeugt werden: ${fehlerText(e)}`);
      schliesseDialog();
    }
  };

  const wuerfleNeueLiga = () => {
    if (!entwurf) return;
    const seed = neuerSeed();
    setEntwurf({ ...entwurf, seed, liga: generiereLiga(seed, entwurf.saisonLaenge) });
  };

  // Schritt 2: Team übernehmen, Spielstand anlegen und losspielen.
  const starteMitTeam = async (teamId: number) => {
    if (!entwurf) return;
    try {
      const daten = neuesSpiel(entwurf.coachName, entwurf.coachAlter, entwurf.seed, entwurf.liga, teamId);
      const rec = await saveStore.neu(entwurf.slot, daten);
      setAktiverSlot(entwurf.slot);
      setSpiel(rec.daten);
      setEntwurf(null);
      // Den Teamwahl-Eintrag ersetzen: Zurück führt dann ins Hauptmenü, nicht zur Teamwahl.
      ersetze({ screen: 'game', tab: 'start', dialog: null });
    } catch (e) {
      setFehler(`Neues Spiel konnte nicht angelegt werden: ${fehlerText(e)}`);
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
    // Erst anzeigen, dann speichern: Schalter und Ergebnisse reagieren sofort.
    // Schlägt das Speichern fehl, gibt die Funktion den Fehler weiter (Anzeige beim Aufrufer).
    setSpiel(neu);
    await saveStore.speichern(aktiverSlot, neu);
  };

  const liga: Liga | undefined = nav.screen === 'teamwahl' ? entwurf?.liga : spiel?.liga;
  const dialog = nav.dialog;
  const ansehenTeam = (teamId: number) => gehe({ dialog: { typ: 'team', teamId } });
  const ansehenSpieler = (spielerId: number) => gehe({ dialog: { typ: 'spieler', spielerId } });

  let bildschirm;
  if (nav.screen === 'game' && spiel && aktiverSlot !== null) {
    bildschirm = (
      <GameScreen
        slot={aktiverSlot}
        spiel={spiel}
        tab={nav.tab}
        onTab={(tab) => gehe({ tab })}
        onAendern={aendereSpiel}
        onZuDenSlots={() => gehe({ screen: 'slots', tab: 'start', dialog: null })}
        onTeam={ansehenTeam}
        onSpieler={ansehenSpieler}
        onBox={(tag, index) => gehe({ dialog: { typ: 'box', tag, index } })}
      />
    );
  } else if (nav.screen === 'teamwahl' && entwurf) {
    bildschirm = (
      <TeamPicker
        key={entwurf.seed}
        liga={entwurf.liga}
        coachName={entwurf.coachName}
        onWaehle={(id) => void starteMitTeam(id)}
        onNeueLiga={wuerfleNeueLiga}
        onKaderAnsehen={ansehenTeam}
      />
    );
  } else {
    bildschirm = (
      <SlotScreen
        slots={slots}
        fehler={fehler}
        onNeu={(slot) => gehe({ dialog: { typ: 'neu', slot } })}
        onWeiter={weiterSpielen}
        onLoeschen={(slot) => gehe({ dialog: { typ: 'loeschen', slot } })}
      />
    );
  }

  return (
    <>
      {bildschirm}

      {dialog?.typ === 'neu' && (
        <NewGameDialog
          slot={dialog.slot}
          onAbbrechen={schliesseDialog}
          onWeiter={(name, alter, laenge) => zurTeamwahl(dialog.slot, name, alter, laenge)}
        />
      )}

      {dialog?.typ === 'loeschen' && (
        <Dialog titel={`Platz ${dialog.slot} löschen?`} onSchliessen={schliesseDialog}>
          <p>Der Spielstand wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.</p>
          <div className="knopfreihe">
            <button className="knopf zweit" onClick={schliesseDialog}>
              Abbrechen
            </button>
            <button className="knopf gefahr" onClick={() => void loescheSlot(dialog.slot)}>
              Endgültig löschen
            </button>
          </div>
        </Dialog>
      )}

      {dialog?.typ === 'team' && liga?.teams[dialog.teamId] && (
        <Dialog titel={teamName(liga.teams[dialog.teamId]!)} onSchliessen={schliesseDialog} gross>
          <TeamView liga={liga} teamId={dialog.teamId} onSpieler={ansehenSpieler} />
        </Dialog>
      )}

      {dialog?.typ === 'box' && liga?.ergebnisse[dialog.tag]?.[dialog.index] && spiel && (
        <Dialog titel="Boxscore" onSchliessen={schliesseDialog} gross>
          <BoxscoreView
            liga={liga}
            erg={liga.ergebnisse[dialog.tag]![dialog.index]!}
            saison={spiel.saison}
            onSpieler={ansehenSpieler}
          />
        </Dialog>
      )}

      {dialog?.typ === 'spieler' && liga?.spieler[dialog.spielerId] && (
        <Dialog titel="Spielerkarte" onSchliessen={schliesseDialog} gross>
          <PlayerCard spieler={liga.spieler[dialog.spielerId]!} liga={liga} />
        </Dialog>
      )}
    </>
  );
}
