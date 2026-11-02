import { CONFIG } from './config';
import { simuliereSpiel, type Mannschaft } from './game';
import { berechneAwards, berechneFinalsMvp } from './awards';
import { bewerteSaison } from './karriere';
import { mischeSeed, Rng } from './rng';
import { sortiereTabelle } from './stats';
import { kaderVon } from './league';
import { CONFERENCES } from './teams';
import { neueNachricht, verarbeiteSpielZustand } from './zustand';
import type { Liga, PlayInSpiel, PostSpiel, Postseason, Serie, SpielDaten, SpielErgebnis, SpielRef, Spiel } from './types';

/**
 * Play-In und Playoffs (NBA-Format):
 *  - Pro Conference spielen Platz 7 gegen 8 und 9 gegen 10 je ein Spiel. Der Sieger von 7:8 ist Nr. 7.
 *    Der Verlierer von 7:8 spielt gegen den Sieger von 9:10 um Nr. 8.
 *  - Danach acht Teams je Conference: 1:8, 4:5, 3:6, 2:7 im Best-of-7, dann Runde 2, Conference Finals
 *    und Finals. Heimrecht-Muster 2-2-1-1-1, das bessere Team der Hauptrunde hat das Heimrecht.
 *  - Alle Serien einer Runde spielen im gleichen Takt: An jedem Tag spielt jede laufende Serie ein Spiel.
 * Play-In- und Playoff-Spiele zählen nicht in Tabelle und Saisonstatistik.
 */

export const RUNDEN_NAMEN = ['Play-In', 'Erste Runde', 'Zweite Runde', 'Conference Finals', 'Finals'] as const;

/** Spielt die besser gesetzte Mannschaft ("oben") im n-ten Spiel (1-basiert) zu Hause? 2-2-1-1-1 */
export const HEIM_MUSTER = [true, true, false, false, true, false, true] as const;

/** Paarungen der ersten Runde nach Platz, in Tableau-Reihenfolge: 1-8 und 4-5 treffen später aufeinander, ebenso 3-6 und 2-7. */
const ERSTE_RUNDE = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7],
] as const;

const SIEGE_NOETIG = Math.ceil(CONFIG.saison.playoffSerieBestOf / 2);

// ---------- Spielplan-Zugriff ----------

/** Spiele eines Kalendertags: Hauptrunde oder (danach) Play-In/Playoffs. */
export function spieleAmTag(liga: Liga, tag: number): readonly Spiel[] {
  if (tag < liga.spielplan.length) return liga.spielplan[tag] ?? [];
  return liga.postseason?.tage[tag - liga.spielplan.length] ?? [];
}

export function nachseasonLaeuft(liga: Liga): boolean {
  return liga.postseason !== undefined && liga.postseason.phase !== 'beendet';
}

// ---------- Aufbau ----------

/** Wird aufgerufen, sobald der letzte Tag der Hauptrunde gespielt ist. */
export function erzeugePostseason(spiel: SpielDaten): void {
  const { liga } = spiel;
  if (liga.postseason) return;
  const ids = (c: 0 | 1) => liga.teams.filter((t) => t.conference === c).map((t) => t.id);
  const tabelle: [number[], number[]] = [sortiereTabelle(liga, ids(0)), sortiereTabelle(liga, ids(1))];
  const seeds: [number[], number[]] = [
    [...tabelle[0].slice(0, 6), -1, -1],
    [...tabelle[1].slice(0, 6), -1, -1],
  ];

  const playin: PlayInSpiel[] = [];
  for (const c of [0, 1] as const) {
    const t = tabelle[c];
    const neu = (typ: PlayInSpiel['typ'], heim: number | null, gast: number | null) =>
      playin.push({ id: playin.length, conference: c, typ, heim, gast, spiel: null, sieger: null, verlierer: null });
    neu('7v8', t[6] as number, t[7] as number);
    neu('9v10', t[8] as number, t[9] as number);
    neu('finale8', null, null);
  }

  const post: Postseason = {
    phase: 'playin',
    tabelle,
    playin,
    seeds,
    serien: [],
    runde: 0,
    tage: [],
    meister: null,
    awards: berechneAwards(liga),
  };
  liga.postseason = post;

  // Meldung für den Spieler
  const u = spiel.userTeamId;
  const ut = liga.teams[u];
  if (ut) {
    const platz = (tabelle[ut.conference] as number[]).indexOf(u) + 1;
    const b = liga.stand.teams[u];
    const bilanz = b ? `${b.siege}–${b.niederlagen}` : '';
    let text: string;
    if (platz <= 6) text = `Hauptrunde beendet (${bilanz}). Du bist als Nr. ${platz} direkt für die Playoffs qualifiziert.`;
    else if (platz <= 10) text = `Hauptrunde beendet (${bilanz}). Mit Platz ${platz} musst du ins Play-In.`;
    else text = `Hauptrunde beendet (${bilanz}). Mit Platz ${platz} hast du die Playoffs verpasst.`;
    neueNachricht(spiel, 'playoffs', text, true);
  }
}

// ---------- Tage planen und spielen ----------

function planeTag(post: Postseason): PostSpiel[] {
  const spiele: PostSpiel[] = [];
  if (post.phase === 'playin') {
    const ersteRunde = post.playin.filter((p) => p.typ !== 'finale8');
    if (ersteRunde.some((p) => p.spiel === null)) {
      for (const p of ersteRunde) spiele.push({ heim: p.heim as number, gast: p.gast as number, art: 'playin', ref: p.id });
    } else {
      for (const p of post.playin.filter((x) => x.typ === 'finale8' && x.spiel === null)) {
        const siebenAcht = post.playin.find((x) => x.conference === p.conference && x.typ === '7v8') as PlayInSpiel;
        const neunZehn = post.playin.find((x) => x.conference === p.conference && x.typ === '9v10') as PlayInSpiel;
        p.heim = siebenAcht.verlierer;
        p.gast = neunZehn.sieger;
        spiele.push({ heim: p.heim as number, gast: p.gast as number, art: 'playin', ref: p.id });
      }
    }
  } else if (post.phase === 'playoffs') {
    for (const s of post.serien) {
      if (s.runde !== post.runde || s.sieger !== null) continue;
      const nr = s.spiele.length;
      const obenHeim = HEIM_MUSTER[nr] ?? true;
      spiele.push({ heim: obenHeim ? s.oben : s.unten, gast: obenHeim ? s.unten : s.oben, art: 'serie', ref: s.id });
    }
  }
  return spiele;
}

/** Spielt den nächsten Tag von Play-In oder Playoffs. Verändert `spiel`. */
export function simuliereNachseasonTag(spiel: SpielDaten): SpielErgebnis[] {
  const { liga } = spiel;
  const post = liga.postseason;
  if (!post || post.phase === 'beendet') throw new Error('Keine Play-In- oder Playoff-Spiele mehr offen');
  const tag = liga.spielplan.length + post.tage.length;
  const geplant = planeTag(post);
  if (geplant.length === 0) throw new Error('Postseason steckt fest: kein Spiel planbar');
  post.tage.push(geplant);
  liga.tag = tag;

  // Mannschaften nur einmal zusammenstellen
  const mannschaften = new Map<number, Mannschaft>();
  const holen = (id: number): Mannschaft => {
    let m = mannschaften.get(id);
    if (!m) {
      const t = liga.teams[id];
      if (!t) throw new Error(`Unbekanntes Team ${id}`);
      m = { teamId: id, name: t.name, kuerzel: t.kuerzel, spieler: kaderVon(liga, id) };
      if (id === spiel.userTeamId) m.coaching = spiel.coaching;
      mannschaften.set(id, m);
    }
    return m;
  };

  const ergebnisse: SpielErgebnis[] = [];
  geplant.forEach((sp, i) => {
    const eigenes = sp.heim === spiel.userTeamId || sp.gast === spiel.userTeamId;
    const rng = new Rng(mischeSeed(liga.seed, spiel.saison, tag, i, 0x5ba11));
    const erg = simuliereSpiel(rng, holen(sp.heim), holen(sp.gast), {
      tag,
      pbp: eigenes && spiel.einstellungen.pbp,
      saisonLaenge: liga.saisonLaenge,
      playoffs: true,
    });
    ergebnisse.push(erg);
    verbucheNachseasonSpiel(spiel, sp, erg, { tag, index: i });
  });
  liga.ergebnisse[tag] = ergebnisse;
  liga.tag = tag + 1;

  pruefeFortschritt(spiel);
  return ergebnisse;
}

function verbucheNachseasonSpiel(spiel: SpielDaten, sp: PostSpiel, erg: SpielErgebnis, ref: SpielRef): void {
  const post = spiel.liga.postseason as Postseason;
  verarbeiteSpielZustand(spiel, erg);
  const heimGewinnt = erg.heim.punkte > erg.gast.punkte;
  const gewinner = heimGewinnt ? sp.heim : sp.gast;
  const verlierer = heimGewinnt ? sp.gast : sp.heim;

  if (sp.art === 'playin') {
    const p = post.playin[sp.ref] as PlayInSpiel;
    p.spiel = ref;
    p.sieger = gewinner;
    p.verlierer = verlierer;
    if (sp.heim === spiel.userTeamId || sp.gast === spiel.userTeamId) {
      const gegner = spiel.liga.teams[gewinner === spiel.userTeamId ? verlierer : gewinner];
      const ich = gewinner === spiel.userTeamId;
      neueNachricht(
        spiel,
        'playoffs',
        `Play-In: ${ich ? 'Sieg' : 'Niederlage'} gegen ${gegner?.stadt ?? ''} ${gegner?.name ?? ''} (${erg.heim.punkte}:${erg.gast.punkte}).`,
        false,
      );
    }
    return;
  }

  const s = post.serien[sp.ref] as Serie;
  s.spiele.push(ref);
  if (gewinner === s.oben) s.siegeOben++;
  else s.siegeUnten++;
  if (s.siegeOben >= SIEGE_NOETIG) s.sieger = s.oben;
  else if (s.siegeUnten >= SIEGE_NOETIG) s.sieger = s.unten;
  if (s.sieger !== null) meldeSerieEnde(spiel, s);
}

function teamText(liga: Liga, id: number): string {
  const t = liga.teams[id];
  return t ? `${t.stadt} ${t.name}` : '?';
}

function meldeSerieEnde(spiel: SpielDaten, s: Serie): void {
  const u = spiel.userTeamId;
  if (s.oben !== u && s.unten !== u) return;
  const ich = s.sieger === u;
  const gegner = s.oben === u ? s.unten : s.oben;
  const meine = s.oben === u ? s.siegeOben : s.siegeUnten;
  const ihre = s.oben === u ? s.siegeUnten : s.siegeOben;
  const runde = RUNDEN_NAMEN[s.runde];
  if (ich && s.runde === 4) return; // Titel wird in der Abschlussmeldung gemeldet
  neueNachricht(
    spiel,
    'playoffs',
    ich
      ? `${runde}: Serie gegen ${teamText(spiel.liga, gegner)} mit ${meine}–${ihre} gewonnen.`
      : `${runde}: Ausgeschieden gegen ${teamText(spiel.liga, gegner)} (${meine}–${ihre}).`,
    true,
  );
}

// ---------- Phasenwechsel ----------

function neueSerie(post: Postseason, runde: Serie['runde'], conference: 0 | 1 | null, slot: number, oben: number, unten: number, seedOben: number, seedUnten: number): void {
  post.serien.push({
    id: post.serien.length,
    runde,
    conference,
    slot,
    oben,
    unten,
    seedOben,
    seedUnten,
    siegeOben: 0,
    siegeUnten: 0,
    spiele: [],
    sieger: null,
  });
}

function pruefeFortschritt(spiel: SpielDaten): void {
  const { liga } = spiel;
  const post = liga.postseason as Postseason;

  if (post.phase === 'playin') {
    if (post.playin.some((p) => p.sieger === null)) return;
    // Setzliste vervollständigen und Playoffs beginnen
    for (const c of [0, 1] as const) {
      const siebenAcht = post.playin.find((p) => p.conference === c && p.typ === '7v8') as PlayInSpiel;
      const finale = post.playin.find((p) => p.conference === c && p.typ === 'finale8') as PlayInSpiel;
      const seeds = post.seeds[c];
      seeds[6] = siebenAcht.sieger as number;
      seeds[7] = finale.sieger as number;
    }
    post.phase = 'playoffs';
    post.runde = 1;
    for (const c of [0, 1] as const) {
      ERSTE_RUNDE.forEach(([a, b], slot) => {
        neueSerie(post, 1, c, slot, post.seeds[c][a - 1] as number, post.seeds[c][b - 1] as number, a, b);
      });
    }
    meldePlayInEnde(spiel);
    return;
  }

  if (post.phase !== 'playoffs') return;
  const aktuelle = post.serien.filter((s) => s.runde === post.runde);
  if (aktuelle.some((s) => s.sieger === null)) return;

  if (post.runde === 4) {
    schliesseSaisonAb(spiel);
    return;
  }

  const naechste = (post.runde + 1) as 2 | 3 | 4;
  if (naechste === 4) {
    const ost = aktuelle.find((s) => s.conference === 0) as Serie;
    const west = aktuelle.find((s) => s.conference === 1) as Serie;
    const platzOst = ost.sieger === ost.oben ? ost.seedOben : ost.seedUnten;
    const platzWest = west.sieger === west.oben ? west.seedOben : west.seedUnten;
    const [a, b] = [ost.sieger as number, west.sieger as number];
    // Bessere Hauptrunden-Bilanz hat das Heimrecht
    const besser = sortiereTabelle(liga, [a, b])[0] as number;
    if (besser === a) neueSerie(post, 4, null, 0, a, b, platzOst, platzWest);
    else neueSerie(post, 4, null, 0, b, a, platzWest, platzOst);
  } else {
    for (const c of [0, 1] as const) {
      const vorher = aktuelle.filter((s) => s.conference === c).sort((x, y) => x.slot - y.slot);
      for (let k = 0; k * 2 < vorher.length; k++) {
        const s1 = vorher[2 * k] as Serie;
        const s2 = vorher[2 * k + 1] as Serie;
        const seed1 = s1.sieger === s1.oben ? s1.seedOben : s1.seedUnten;
        const seed2 = s2.sieger === s2.oben ? s2.seedOben : s2.seedUnten;
        const [t1, t2] = [s1.sieger as number, s2.sieger as number];
        if (seed1 < seed2) neueSerie(post, naechste, c, k, t1, t2, seed1, seed2);
        else neueSerie(post, naechste, c, k, t2, t1, seed2, seed1);
      }
    }
  }
  post.runde = naechste;
}

function meldePlayInEnde(spiel: SpielDaten): void {
  const { liga } = spiel;
  const post = liga.postseason as Postseason;
  const u = spiel.userTeamId;
  const ut = liga.teams[u];
  if (!ut) return;
  const imPlayIn = post.playin.some((p) => p.heim === u || p.gast === u);
  if (!imPlayIn) return;
  const seed = post.seeds[ut.conference].indexOf(u) + 1;
  neueNachricht(
    spiel,
    'playoffs',
    seed > 0
      ? `Play-In geschafft: Du bist als Nr. ${seed} in den Playoffs.`
      : 'Play-In verloren: Die Saison ist für dich beendet.',
    true,
  );
}

function schliesseSaisonAb(spiel: SpielDaten): void {
  const { liga } = spiel;
  const post = liga.postseason as Postseason;
  const finale = post.serien.find((s) => s.runde === 4) as Serie;
  post.meister = finale.sieger;
  post.phase = 'beendet';
  post.awards.finalsMvp = berechneFinalsMvp(liga, finale);
  bewerteSaison(spiel);
}

// ---------- Abfragen für Simulation und Oberfläche ----------

/** Die laufende (noch nicht entschiedene) Serie des Spieler-Teams, falls vorhanden. */
export function laufendeSerieVon(post: Postseason, teamId: number): Serie | undefined {
  return post.serien.find((s) => s.sieger === null && (s.oben === teamId || s.unten === teamId));
}

/** Hat das Team in dieser Postseason noch ein Spiel vor sich (Play-In-Spiel oder laufende Serie)? */
export function nochImRennen(post: Postseason, teamId: number): boolean {
  if (post.phase === 'beendet') return false;
  if (post.phase === 'playoffs') return laufendeSerieVon(post, teamId) !== undefined;
  // Play-In
  const ersteSpiele = post.playin.some((p) => p.typ !== 'finale8' && p.sieger === null && (p.heim === teamId || p.gast === teamId));
  if (ersteSpiele) return true;
  return post.playin.some((p) => {
    if (p.typ !== 'finale8' || p.spiel !== null) return false;
    const a = post.playin.find((x) => x.conference === p.conference && x.typ === '7v8') as PlayInSpiel;
    const b = post.playin.find((x) => x.conference === p.conference && x.typ === '9v10') as PlayInSpiel;
    return a.verlierer === teamId || b.sieger === teamId;
  });
}

/** Grobe Schätzung der noch fehlenden Tage (für den Fortschrittsbalken). */
export function schaetzeRestTage(post: Postseason): number {
  if (post.phase === 'beendet') return 0;
  const proRunde = 5.5;
  if (post.phase === 'playin') {
    const offen = post.playin.filter((p) => p.sieger === null).length > 2 ? 2 : 1;
    return offen + 4 * proRunde;
  }
  const gespielt = post.serien
    .filter((s) => s.runde === post.runde)
    .reduce((m, s) => Math.max(m, s.spiele.length), 0);
  return Math.max(1, proRunde - gespielt) + (4 - post.runde) * proRunde;
}

/** Kurztext für eine Serie, z. B. "BOS führt 3–1" oder "NYC gewinnt 4–2". */
export function serienStand(liga: Liga, s: Serie): string {
  const o = liga.teams[s.oben]?.kuerzel ?? '?';
  const u = liga.teams[s.unten]?.kuerzel ?? '?';
  if (s.sieger !== null) {
    const siegerK = s.sieger === s.oben ? o : u;
    const [a, b] = s.sieger === s.oben ? [s.siegeOben, s.siegeUnten] : [s.siegeUnten, s.siegeOben];
    return `${siegerK} gewinnt ${a}–${b}`;
  }
  if (s.siegeOben === s.siegeUnten) return s.siegeOben === 0 ? 'Serie beginnt' : `Gleichstand ${s.siegeOben}–${s.siegeUnten}`;
  const fuehrt = s.siegeOben > s.siegeUnten;
  return `${fuehrt ? o : u} führt ${Math.max(s.siegeOben, s.siegeUnten)}–${Math.min(s.siegeOben, s.siegeUnten)}`;
}

/** Beschriftung eines Spiels nach der Hauptrunde, z. B. "Erste Runde · Spiel 3" (null bei Hauptrundenspielen). */
export function spielKontext(liga: Liga, tag: number, index: number): string | null {
  const post = liga.postseason;
  if (!post || tag < liga.spielplan.length) return null;
  const g = post.tage[tag - liga.spielplan.length]?.[index];
  if (!g) return null;
  if (g.art === 'playin') {
    const p = post.playin[g.ref];
    if (!p) return 'Play-In';
    const was = p.typ === '7v8' ? 'Platz 7 gegen 8' : p.typ === '9v10' ? 'Platz 9 gegen 10' : 'Spiel um Platz 8';
    return `Play-In · ${CONFERENCES[p.conference]} · ${was}`;
  }
  const s = post.serien[g.ref];
  if (!s) return 'Playoffs';
  const nr = s.spiele.findIndex((r) => r.tag === tag && r.index === index) + 1;
  return `${RUNDEN_NAMEN[s.runde]}${s.conference !== null ? ` · ${CONFERENCES[s.conference]}` : ''} · Spiel ${nr}`;
}

/** Überschrift eines Kalendertags nach der Hauptrunde, z. B. "Play-In" oder "Playoffs · Zweite Runde". */
export function tagTitel(liga: Liga, tag: number): string | null {
  const post = liga.postseason;
  if (!post || tag < liga.spielplan.length) return null;
  const g = post.tage[tag - liga.spielplan.length]?.[0];
  if (!g) return null;
  if (g.art === 'playin') return 'Play-In';
  const s = post.serien[g.ref];
  return s ? `Playoffs · ${RUNDEN_NAMEN[s.runde]}` : 'Playoffs';
}
