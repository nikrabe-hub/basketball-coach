import { CONFIG } from './config';
import type { Rng } from './rng';
import type { Spiel, Team } from './types';

/**
 * Spielplan-Generator (Kalendertage im NBA-Stil).
 *
 * Paarungen je Saisonlänge (jedes Team spielt genau so viele Spiele wie angegeben):
 *  - 29 Spiele: jedes Team spielt gegen jedes andere einmal.
 *  - 58 Spiele: jedes Team spielt gegen jedes andere zweimal (Heim und Auswärts).
 *  - 82 Spiele: wie 58, dazu 2 Zusatzspiele gegen jeden der 4 Division-Gegner (insgesamt 4),
 *    1 Zusatzspiel gegen jeden der 10 Conference-Gegner anderer Divisionen (insgesamt 3)
 *    und 1 Zusatzspiel gegen 6 von 15 Teams der anderen Conference (insgesamt 2 oder 3).
 *
 * Danach werden alle Spiele auf Kalendertage verteilt: Ein Team spielt höchstens einmal pro Tag,
 * im Schnitt etwa jeden zweiten Tag (CONFIG.saison.tageProSpiel).
 */

interface Paarung {
  a: number;
  b: number;
  /** Anzahl Spiele zwischen a und b */
  anzahl: number;
}

function paarSchluessel(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function baueZusatzspiele82(teams: Team[]): Map<string, number> {
  const extra = new Map<string, number>();
  const addiere = (a: number, b: number, n: number) => {
    const k = paarSchluessel(a, b);
    extra.set(k, (extra.get(k) ?? 0) + n);
  };

  // Teams je Conference in ID-Reihenfolge
  const conf: number[][] = [[], []];
  for (const t of teams) (conf[t.conference] as number[]).push(t.id);

  for (const liste of conf) {
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const x = teams[liste[i] as number] as Team;
        const y = teams[liste[j] as number] as Team;
        // Division-Gegner: +2, andere Conference-Gegner: +1
        addiere(x.id, y.id, x.division === y.division ? 2 : 1);
      }
    }
  }

  // Zwischen den Conferences: jedes Team bekommt 6 zusätzliche Gegner (zirkulantes Muster)
  const ost = conf[0] as number[];
  const west = conf[1] as number[];
  const n = ost.length;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 6; k++) {
      addiere(ost[i] as number, west[(i + k) % n] as number, 1);
    }
  }
  return extra;
}

function baueSpiele(rng: Rng, teams: Team[], spieleProTeam: number): Spiel[] {
  const basis = spieleProTeam === 29 ? 1 : 2;
  const extra = spieleProTeam === 82 ? baueZusatzspiele82(teams) : new Map<string, number>();

  const paarungen: Paarung[] = [];
  for (let a = 0; a < teams.length; a++) {
    for (let b = a + 1; b < teams.length; b++) {
      paarungen.push({ a, b, anzahl: basis + (extra.get(paarSchluessel(a, b)) ?? 0) });
    }
  }

  // Kontrolle: Jedes Team muss genau spieleProTeam Spiele haben.
  const summe = new Array<number>(teams.length).fill(0);
  for (const p of paarungen) {
    summe[p.a] = (summe[p.a] as number) + p.anzahl;
    summe[p.b] = (summe[p.b] as number) + p.anzahl;
  }
  if (summe.some((s) => s !== spieleProTeam)) {
    throw new Error('Interner Fehler: Spielplan-Paarungen ergeben nicht die gewünschte Spielzahl.');
  }

  // Heimrecht: Gerade Anzahl => je zur Hälfte. Ungerade => das letzte Spiel wird
  // dem Team mit weniger bisherigen Heimspielen gegeben (reihum gemischt).
  const spiele: Spiel[] = [];
  const heimspiele = new Array<number>(teams.length).fill(0);
  const einzel: Paarung[] = [];
  for (const p of paarungen) {
    const paarweise = Math.floor(p.anzahl / 2);
    for (let i = 0; i < paarweise; i++) {
      spiele.push({ heim: p.a, gast: p.b });
      spiele.push({ heim: p.b, gast: p.a });
    }
    heimspiele[p.a] = (heimspiele[p.a] as number) + paarweise;
    heimspiele[p.b] = (heimspiele[p.b] as number) + paarweise;
    if (p.anzahl % 2 === 1) einzel.push(p);
  }
  for (const p of rng.shuffle(einzel)) {
    const ha = heimspiele[p.a] as number;
    const hb = heimspiele[p.b] as number;
    const heim = ha < hb ? p.a : hb < ha ? p.b : rng.chance(0.5) ? p.a : p.b;
    const gast = heim === p.a ? p.b : p.a;
    spiele.push({ heim, gast });
    heimspiele[heim] = (heimspiele[heim] as number) + 1;
  }
  return spiele;
}

/** Verteilt alle Spiele auf Kalendertage. Ergebnis: tage[tag] = Spiele dieses Tages. */
export function erzeugeSpielplan(rng: Rng, teams: Team[], spieleProTeam: number): Spiel[][] {
  if (!(CONFIG.saison.spieleOptionen as readonly number[]).includes(spieleProTeam)) {
    throw new Error(`Ungültige Saisonlänge: ${spieleProTeam}`);
  }
  const alle = baueSpiele(rng, teams, spieleProTeam);

  interface Kandidat {
    spiel: Spiel;
    zufall: number;
  }
  let offen: Kandidat[] = alle.map((spiel) => ({ spiel, zufall: rng.next() }));
  const rest = new Array<number>(teams.length).fill(spieleProTeam);

  const zielTage = spieleProTeam * CONFIG.saison.tageProSpiel;
  const maxProTag = Math.floor(teams.length / 2);
  const tage: Spiel[][] = [];

  while (offen.length > 0) {
    const tag = tage.length;
    const tageUebrig = Math.max(zielTage - tag, 1);
    const kontingent = Math.min(maxProTag, Math.ceil(offen.length / tageUebrig));

    // Teams mit den meisten offenen Spielen kommen zuerst dran, damit niemand zurückbleibt.
    offen.sort((x, y) => {
      const px = (rest[x.spiel.heim] as number) + (rest[x.spiel.gast] as number);
      const py = (rest[y.spiel.heim] as number) + (rest[y.spiel.gast] as number);
      return py - px || x.zufall - y.zufall;
    });

    const belegt = new Set<number>();
    const heute: Spiel[] = [];
    const genommen = new Set<Kandidat>();
    for (const k of offen) {
      if (heute.length >= kontingent) break;
      if (belegt.has(k.spiel.heim) || belegt.has(k.spiel.gast)) continue;
      belegt.add(k.spiel.heim);
      belegt.add(k.spiel.gast);
      heute.push(k.spiel);
      genommen.add(k);
      rest[k.spiel.heim] = (rest[k.spiel.heim] as number) - 1;
      rest[k.spiel.gast] = (rest[k.spiel.gast] as number) - 1;
    }
    offen = offen.filter((k) => !genommen.has(k));
    tage.push(heute);
  }
  return tage;
}

/** Alle Spiele eines Teams in zeitlicher Reihenfolge. */
export function spieleVonTeam(
  spielplan: Spiel[][],
  teamId: number,
): { tag: number; heim: boolean; gegner: number }[] {
  const liste: { tag: number; heim: boolean; gegner: number }[] = [];
  spielplan.forEach((spiele, tag) => {
    for (const s of spiele) {
      if (s.heim === teamId) liste.push({ tag, heim: true, gegner: s.gast });
      else if (s.gast === teamId) liste.push({ tag, heim: false, gegner: s.heim });
    }
  });
  return liste;
}

/** Kalenderdatum eines Spieltags (nur zur Anzeige). */
export function datumFuerTag(saison: number, tag: number): Date {
  const { startJahr, startMonat, startTag } = CONFIG.saison;
  return new Date(Date.UTC(startJahr + saison - 1, startMonat - 1, startTag + tag));
}

export function formatDatum(saison: number, tag: number): string {
  return datumFuerTag(saison, tag).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
