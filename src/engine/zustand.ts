import { CONFIG } from './config';
import { istSchwer } from './injuries';
import { kaderVon } from './league';
import { BX } from './stats';
import type { Nachricht, NachrichtTyp, Spieler, SpielDaten, SpielErgebnis, TeamBox } from './types';

/**
 * Zustand der Spieler nach einem Spiel: laufende Verletzungen, neue Verletzungen und Moral.
 * Meldungen für das eigene Team landen im Posteingang; wichtige Meldungen halten die Simulation an.
 */

const MAX_NACHRICHTEN = 60;

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
const name = (s: Spieler) => `${s.vorname} ${s.nachname}`;

export function neueNachricht(
  spiel: SpielDaten,
  typ: NachrichtTyp,
  text: string,
  wichtig: boolean,
  spielerId?: number,
): Nachricht {
  const id = spiel.posteingang.reduce((m, n) => Math.max(m, n.id), 0) + 1;
  const n: Nachricht = { id, saison: spiel.saison, tag: spiel.liga.tag, typ, text, wichtig, gelesen: false };
  if (spielerId !== undefined) n.spielerId = spielerId;
  spiel.posteingang.push(n);
  if (spiel.posteingang.length > MAX_NACHRICHTEN) spiel.posteingang.splice(0, spiel.posteingang.length - MAX_NACHRICHTEN);
  return n;
}

/** Wichtigste noch ungelesene Meldung (neueste zuerst), zum Beispiel als Grund für einen Simulations-Stopp. */
export function letzteWichtigeNachricht(spiel: SpielDaten): Nachricht | undefined {
  for (let i = spiel.posteingang.length - 1; i >= 0; i--) {
    const n = spiel.posteingang[i] as Nachricht;
    if (n.wichtig && !n.gelesen) return n;
  }
  return undefined;
}

/** Spielzeit in Minuten laut Boxscore (0, wenn der Spieler nicht gespielt hat). */
function minuten(box: TeamBox, id: number): number {
  const z = box.spieler.find((r) => r[BX.id] === id);
  return z ? (z[BX.min] as number) / 60 : 0;
}

function aktualisiereTeam(spiel: SpielDaten, erg: SpielErgebnis, box: TeamBox, gewonnen: boolean): void {
  const { liga } = spiel;
  const eigen = box.teamId === spiel.userTeamId;
  const kader = kaderVon(liga, box.teamId);
  const nachRang = [...kader].sort((a, b) => b.ovr - a.ovr || a.id - b.id);
  const M = CONFIG.moral;

  // Wer vor dem Spiel fit war, bekommt Moral-Änderungen; Verletzte werden eine Woche näher an die Rückkehr gebracht.
  for (const s of kader) {
    if (s.verletzung) {
      s.verletzung.spieleVerbleibend--;
      if (s.verletzung.spieleVerbleibend <= 0) {
        s.verletzung = null;
        if (eigen) neueNachricht(spiel, 'rueckkehr', `${name(s)} ist wieder fit und kann spielen.`, false, s.id);
      }
      continue;
    }
    const rang = nachRang.indexOf(s);
    const erwartet = M.erwarteteMinuten[rang] ?? 0;
    const gespielt = minuten(box, s.id);
    let rolle = 0;
    if (erwartet > 0) {
      const ego = 0.6 + (s.persoenlichkeit.ego / 100) * 0.8;
      rolle = clamp((gespielt - erwartet) / 10, M.rollenGrenze.min, M.rollenGrenze.max) * M.rollenSchritt * ego;
    }
    const alt = s.moral;
    const neu = clamp(alt + rolle + (gewonnen ? M.sieg : M.niederlage) + (M.mitte - alt) * M.zumMittelwert, 0, 100);
    s.moral = Math.round(neu * 10) / 10;
    if (eigen && alt >= M.unzufriedenUnter && s.moral < M.unzufriedenUnter && rang < 8) {
      const grund = rolle < -0.3 ? 'Er wünscht sich mehr Spielzeit.' : 'Ihm fehlt der Erfolg des Teams.';
      neueNachricht(spiel, 'moral', `${name(s)} ist unzufrieden (Moral ${Math.round(s.moral)}). ${grund}`, true, s.id);
    }
  }

  // Neue Verletzungen aus diesem Spiel
  for (const v of erg.verletzungen ?? []) {
    if (v.teamId !== box.teamId) continue;
    const s = liga.spieler[v.spielerId];
    if (!s) continue;
    s.verletzung = { typ: v.typ, spieleGesamt: v.spiele, spieleVerbleibend: v.spiele };
    if (eigen) {
      const schwer = istSchwer(v.spiele, liga.saisonLaenge);
      neueNachricht(
        spiel,
        'verletzung',
        `${name(s)} hat sich verletzt: ${v.typ}. Ausfall: ${v.spiele} ${v.spiele === 1 ? 'Spiel' : 'Spiele'}.`,
        schwer,
        s.id,
      );
    }
  }
}

/** Verarbeitet ein gespieltes Spiel: Verletzungsdauer, neue Verletzungen, Moral. Verändert `spiel`. */
export function verarbeiteSpielZustand(spiel: SpielDaten, erg: SpielErgebnis): void {
  aktualisiereTeam(spiel, erg, erg.heim, erg.heim.punkte > erg.gast.punkte);
  aktualisiereTeam(spiel, erg, erg.gast, erg.gast.punkte > erg.heim.punkte);
}
