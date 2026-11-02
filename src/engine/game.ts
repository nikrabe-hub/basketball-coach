import { CONFIG } from './config';
import { anfaelligkeit, wuerfleVerletzung } from './injuries';
import type { Rng } from './rng';
import { eignungsFaktor, kombiVon, type Kombi } from './tactics';
import {
  STANDARD_TAKTIK,
  type AttributKey,
  type BoxZeile,
  type Coaching,
  type NeueVerletzung,
  type Spieler,
  type SpielErgebnis,
  type Taktik,
  type TeamBox,
} from './types';

/**
 * Ballbesitz-für-Ballbesitz-Simulation eines Spiels.
 * Reine Logik ohne Oberfläche; Zufall kommt nur aus dem übergebenen Rng.
 *
 * Ablauf eines Ballbesitzes (siehe gang()):
 *  Spielzug wählen -> Zeit vergeht -> Foul/Turnover möglich -> Wurf (Zone, Block, Foul,
 *  Treffer, Assist, Freiwürfe) -> Rebound -> nächster Ballbesitz.
 * Dazwischen wechselt die Rotation Spieler nach Müdigkeit und Foulproblemen ein und aus.
 */

const S = CONFIG.spiel;

export interface Mannschaft {
  teamId: number;
  /** Teamname ohne Stadt, z. B. "Comets" (für die Spielzusammenfassung) */
  name: string;
  kuerzel: string;
  /** Alle Spieler des Kaders */
  spieler: Spieler[];
  /** Rotation und Taktik; ohne Angabe: automatische Rotation und Standard-Taktik (KI-Teams) */
  coaching?: Coaching;
}

export interface SpielOptionen {
  tag: number;
  /** Play-by-Play-Zeilen mitschreiben */
  pbp: boolean;
  /** Spiele pro Team in der Hauptrunde (skaliert die Dauer von Verletzungen); Standard 82 */
  saisonLaenge?: number;
}

type Zug = 'iso' | 'pnr' | 'post' | 'spot' | 'drive' | 'fast' | 'putback';
/** Wie der Ballbesitz entstanden ist */
type Art = 'normal' | 'steal' | 'defReb' | 'putback';
const ZONE_RING = 0;
const ZONE_MITTE = 1;
const ZONE_DREIER = 2;
type Zone = 0 | 1 | 2;

const POS_INDEX: Record<string, number> = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };

interface Live {
  s: Spieler;
  seite: 0 | 1;
  /** Rang im Kader nach OVR (0 = bester) */
  rang: number;
  pos: number;
  /** Offensivwert: wie gefährlich der Spieler als Werfer ist */
  offWert: number;
  zonen: [number, number, number];
  verbrauch: number;
  gegner: Live | null;
  /** Wurf-Häufigkeit unter Berücksichtigung der Taktik (Fokus) */
  nutzungEff: number;
  /** Anpassung aller Attribute durch die Moral (negativ = schlechte Stimmung) */
  moralAdj: number;
  /** Ziel-Spielzeit in Sekunden bei eigener Rotation (0 = soll nicht spielen) */
  zielSek: number;
  /** Schon vor dem Spiel verletzt */
  verletzt: boolean;
  neueVerletzung: { typ: string; spiele: number } | null;
  energie: number;
  imSpiel: boolean;
  /** Spielzeit (gesamt, Sekunden), seit der Spieler aufs Feld kam */
  seit: number;
  draussen: boolean;
  starter: number;
  min: number;
  pts: number;
  reb: number;
  oreb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  pm: number;
}

interface Seite {
  m: Mannschaft;
  taktik: Taktik;
  /** Zusammengefasste Wirkung der Taktik */
  k: Kombi;
  /** Starting Five bei eigener Rotation (leer: die Starter ergeben sich aus der Rangfolge) */
  starter: Live[];
  /** Wirkung der Verteidigung auf den angreifenden Gegner (hängt von den Spielern auf dem Feld ab) */
  fxTrefferGegner: [number, number, number];
  fxTurnoverGegner: number;
  /** Bester Offensivspieler auf dem Feld */
  stern: Live | null;
  live: Live[];
  feld: Live[];
  punkte: number;
  viertel: number[];
  teamFouls: number;
  maxVorsprung: number;
}

interface Spielzustand {
  rng: Rng;
  seiten: [Seite, Seite];
  /** Periode 0..3 = Viertel, 4+ = Verlängerungen */
  periode: number;
  /** Restzeit der Periode in Sekunden */
  sek: number;
  /** Gespielte Zeit insgesamt in Sekunden */
  uhr: number;
  log: string[] | null;
  saisonLaenge: number;
  /** Spielmodus des aktuellen Ballbesitzes (Schlussminute) */
  modus: 'normal' | 'halten' | 'eilen';
  /** Gerade Beginn der zweiten Halbzeit: Starter werden bevorzugt */
  halbzeitStart: boolean;
}

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** Effektiver Attributwert unter Berücksichtigung der Müdigkeit. */
function w(l: Live, k: AttributKey): number {
  return 60 + (l.s.attribute[k] - 60) * S.attributWirkung - (100 - l.energie) * S.muedigkeit.attributProPunkt + l.moralAdj;
}

/** Attributwert ohne Angleichung (für die Frage "wer macht es?": Stars übernehmen mehr Verantwortung). */
function ra(l: Live, k: AttributKey): number {
  return l.s.attribute[k] - (100 - l.energie) * S.muedigkeit.attributProPunkt + l.moralAdj;
}

function kurz(l: Live): string {
  return `${l.s.vorname.charAt(0)}. ${l.s.nachname}`;
}

function moralAnpassung(moral: number): number {
  const M = CONFIG.moral;
  if (moral < M.malusUnter) return -(M.malusUnter - moral) * M.malusProPunkt;
  if (moral > M.bonusAb) return (moral - M.bonusAb) * M.bonusProPunkt;
  return 0;
}

function erzeugeLive(s: Spieler, seite: 0 | 1, rang: number): Live {
  const a = s.attribute;
  const offWert = 0.55 * s.ovr + 0.45 * Math.max(a.dunk, a.mitteldistanz, a.dreier);
  const sk = S.zonenSkala;
  const zb = S.zonenBasis;
  const ausd = clamp(a.ausdauer, 30, 99);
  return {
    s,
    seite,
    rang,
    pos: POS_INDEX[s.position] ?? 2,
    offWert,
    zonen: [
      zb[0] * Math.exp((a.dunk - 60) / sk),
      zb[1] * Math.exp((a.mitteldistanz - 60) / sk),
      zb[2] * Math.exp((a.dreier - 60) / sk),
    ],
    verbrauch: S.muedigkeit.verbrauchProSek * Math.pow(S.muedigkeit.ausdauerReferenz / ausd, 0.6),
    gegner: null,
    nutzungEff: Math.pow(offWert / 60, S.nutzungExponent),
    moralAdj: moralAnpassung(s.moral),
    zielSek: 0,
    verletzt: s.verletzung !== null,
    neueVerletzung: null,
    energie: 100,
    imSpiel: false,
    seit: 0,
    draussen: s.verletzung !== null,
    starter: 0,
    min: 0,
    pts: 0,
    reb: 0,
    oreb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    to: 0,
    pf: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    pm: 0,
  };
}

function erzeugeSeite(m: Mannschaft, index: 0 | 1): Seite {
  const sortiert = [...m.spieler].sort((x, y) => y.ovr - x.ovr || x.id - y.id);
  const live = sortiert.map((s, i) => erzeugeLive(s, index, i));
  // Sind weniger als 5 Spieler gesund, spielen die am wenigsten verletzten mit.
  const gesund = live.filter((l) => !l.draussen).length;
  if (gesund < 5) {
    const verletzte = live
      .filter((l) => l.draussen)
      .sort((a, b) => (a.s.verletzung?.spieleVerbleibend ?? 0) - (b.s.verletzung?.spieleVerbleibend ?? 0));
    for (const l of verletzte.slice(0, 5 - gesund)) l.draussen = false;
  }
  // Der Rang im Kader zählt nur die einsatzbereiten Spieler: fehlen Stars, rücken die anderen nach.
  let rang = 0;
  for (const l of live) if (!l.draussen) l.rang = rang++;
  for (const l of live) if (l.draussen) l.rang = rang++;
  const taktik = m.coaching?.taktik ?? STANDARD_TAKTIK;
  const seite: Seite = {
    m,
    taktik,
    k: kombiVon(taktik),
    starter: [],
    fxTrefferGegner: [0, 0, 0],
    fxTurnoverGegner: 0,
    stern: null,
    live,
    feld: [],
    punkte: 0,
    viertel: [],
    teamFouls: 0,
    maxVorsprung: 0,
  };
  const rot = m.coaching?.rotation;
  if (rot && !rot.auto) richteRotationEin(seite, rot.minuten, rot.starter);
  else richteRotationEin(seite, null, []);
  return seite;
}

/**
 * Rotation: Ziel-Spielzeiten (auf 240 Minuten Gesamtspielzeit normiert) und Starting Five.
 * Ohne Angabe (`minuten` = null, automatische Rotation) gelten die Standard-Minuten nach Rang der
 * einsatzbereiten Spieler, die Starter ergeben sich aus der Rangfolge.
 */
function richteRotationEin(seite: Seite, minuten: Record<string, number> | null, starterIds: number[]): void {
  const R = S.rotation;
  const verfuegbar = seite.live.filter((l) => !l.draussen);
  const ziel = new Map<Live, number>();
  for (const l of verfuegbar) {
    const m = minuten ? clamp(minuten[String(l.s.id)] ?? 0, 0, 48) : (R.standardMinuten[l.rang] ?? 0);
    if (m > 0) ziel.set(l, m);
  }
  // Zu wenige Spieler mit Minuten (z. B. wegen Verletzungen): die Besten ergänzen
  for (const l of verfuegbar) {
    if (ziel.size >= R.mindestRotation) break;
    if (!ziel.has(l)) ziel.set(l, R.notfallMinuten);
  }
  let summe = 0;
  for (const m of ziel.values()) summe += m;
  const faktor = summe > 0 ? (5 * 48 * 60) / summe : 0;
  for (const [l, m] of ziel) l.zielSek = m * faktor;

  if (!minuten) return;
  const starter: Live[] = [];
  for (const id of starterIds) {
    const l = verfuegbar.find((x) => x.s.id === id);
    if (l && !starter.includes(l)) starter.push(l);
  }
  const rest = verfuegbar.filter((l) => !starter.includes(l)).sort((a, b) => b.zielSek - a.zielSek || a.rang - b.rang);
  while (starter.length < 5 && rest.length > 0) starter.push(rest.shift() as Live);
  seite.starter = starter.slice(0, 5);
}

// ---------- Hilfen ----------

function waehle<T>(g: Spielzustand, liste: readonly T[], gewicht: (x: T) => number): T {
  let summe = 0;
  const ws = new Array<number>(liste.length);
  for (let i = 0; i < liste.length; i++) {
    const v = Math.max(0.0001, gewicht(liste[i] as T));
    ws[i] = v;
    summe += v;
  }
  let r = g.rng.next() * summe;
  for (let i = 0; i < liste.length; i++) {
    r -= ws[i] as number;
    if (r < 0) return liste[i] as T;
  }
  return liste[liste.length - 1] as T;
}

function zeitText(g: Spielzustand): string {
  const sek = Math.max(0, Math.ceil(g.sek));
  const mm = Math.floor(sek / 60);
  const ss = sek % 60;
  const p = g.periode < 4 ? `Q${g.periode + 1}` : `OT${g.periode - 3}`;
  return `${p} ${mm}:${ss.toString().padStart(2, '0')}`;
}

function logge(g: Spielzustand, off: Seite, text: string): void {
  if (!g.log) return;
  const [a, b] = g.seiten;
  g.log.push(`${zeitText(g)} · ${off.m.kuerzel} · ${text} (${a.m.kuerzel} ${a.punkte}:${b.punkte} ${b.m.kuerzel})`);
}

/** Verteidiger den Angreifern zuordnen: nach Position und Größe sortiert, Platz für Platz. */
function ordneZu(a: Seite, b: Seite): void {
  const sortiere = (s: Seite) =>
    [...s.feld].sort((x, y) => x.pos - y.pos || x.s.groesseCm - y.s.groesseCm);
  const sa = sortiere(a);
  const sb = sortiere(b);
  for (let i = 0; i < sa.length; i++) {
    const x = sa[i] as Live;
    const y = sb[i] as Live;
    x.gegner = y;
    y.gegner = x;
  }
  aktualisiereEffekte(a);
  aktualisiereEffekte(b);
}

/**
 * Wirkungen, die von den Spielern auf dem Feld abhängen (neu berechnet nach jedem Wechsel):
 * Wurfhäufigkeit nach Offensiv-Fokus, bester Offensivspieler und die Eignung der Verteidiger
 * für Zone und Pressing.
 */
function aktualisiereEffekte(seite: Seite): void {
  const T = S.taktik;
  const k = seite.k;
  let best: Live | null = null;
  for (const l of seite.feld) {
    let n = Math.pow(l.offWert / 60, S.nutzungExponent + k.nutzungExtra);
    if (l.pos >= 3) n *= k.nutzungBigs;
    else if (l.pos <= 1 && k.nutzungBigs > 1) n /= Math.sqrt(k.nutzungBigs);
    l.nutzungEff = n;
    if (!best || l.offWert > best.offWert) best = l;
  }
  seite.stern = best;

  const n = Math.max(1, seite.feld.length);
  let innen = 0;
  let druck = 0;
  for (const l of seite.feld) {
    innen += (l.s.attribute.innenDef + l.s.attribute.block) / 2;
    druck += (l.s.attribute.steal + l.s.attribute.perimeterDef) / 2;
  }
  const zoneFit = eignungsFaktor(innen / n);
  const druckFit = eignungsFaktor(druck / n);
  const vert = T.verteidigung[seite.taktik.verteidigung];
  const inten = T.intensitaet[seite.taktik.intensitaet];
  for (let z = 0; z < 3; z++) {
    let v = vert.trefferGegner[z] as number;
    if (seite.taktik.verteidigung === 'zone' && v < 0) v *= zoneFit;
    seite.fxTrefferGegner[z] = v + (inten.trefferGegner[z] as number);
  }
  seite.fxTurnoverGegner =
    vert.turnoverGegner * (seite.taktik.verteidigung === 'pressing' ? druckFit : 1) + inten.turnoverGegner;
}

// ---------- Zeit, Punkte ----------

function zeit(g: Spielzustand, dauer: number): void {
  g.sek -= dauer;
  g.uhr += dauer;
  for (const seite of g.seiten) {
    for (const l of seite.live) {
      if (l.imSpiel) {
        l.energie = Math.max(0, l.energie - dauer * l.verbrauch * seite.k.muedigkeit);
        l.min += dauer;
      } else {
        l.energie = Math.min(100, l.energie + dauer * S.muedigkeit.erholungProSek);
      }
    }
  }
}

function punkte(g: Spielzustand, off: Seite, n: number): void {
  const def = g.seiten[off === g.seiten[0] ? 1 : 0];
  off.punkte += n;
  off.viertel[g.periode] = (off.viertel[g.periode] ?? 0) + n;
  for (const l of off.feld) l.pm += n;
  for (const l of def.feld) l.pm -= n;
  const diff = off.punkte - def.punkte;
  if (diff > off.maxVorsprung) off.maxVorsprung = diff;
}

// ---------- Rotation ----------

function istGarbageTime(g: Spielzustand): boolean {
  if (g.periode !== 3) return false;
  const r = S.rotation;
  return g.sek <= r.garbageSekunden && Math.abs(g.seiten[0].punkte - g.seiten[1].punkte) >= r.garbageAbstand;
}

function rotationsWert(g: Spielzustand, l: Live, garbage: boolean): number {
  if (l.draussen) return -9999;
  const r = S.rotation;
  // Wer hinter seiner Ziel-Spielzeit liegt, kommt aufs Feld; Müdigkeit zählt mit.
  if (l.zielSek <= 0) return -500 - l.rang;
  const soll = l.zielSek * (g.uhr / (4 * S.viertelSekunden));
  let wert = ((soll - l.min) / 60) * r.defizitProMinute + (l.energie - 100) * S.muedigkeit.wertungProPunkt - l.rang * 0.01;
  if (g.halbzeitStart && l.starter) wert += r.starterNachHalbzeit;
  if (garbage && l.starter) wert -= r.garbageStarterAbzug;
  // Foulprobleme: wer bald ausfoult, setzt lieber aus
  if (l.pf >= S.ausgefoult - 1 && g.periode < 3) wert -= r.foulProblem5;
  if (l.imSpiel) wert += r.traegheit;
  return wert;
}

/** Die 5 besten (nach Rotationswert), mit mindestens einem Guard und einem großen Spieler. */
function waehleAufstellung(g: Spielzustand, seite: Seite): Live[] {
  const garbage = istGarbageTime(g);
  const kandidaten = seite.live
    .filter((l) => !l.draussen)
    .map((l) => ({ l, v: rotationsWert(g, l, garbage) }))
    .sort((a, b) => b.v - a.v || a.l.rang - b.l.rang);

  const istGuard = (l: Live) => l.pos <= 1;
  const istBig = (l: Live) => l.pos >= 3;
  const hatGuard = kandidaten.some((k) => istGuard(k.l));
  const hatBig = kandidaten.some((k) => istBig(k.l));

  const wahl: Live[] = [];
  let guards = 0;
  let bigs = 0;
  for (const k of kandidaten) {
    if (wahl.length === 5) break;
    const l = k.l;
    const platzNach = 5 - wahl.length - 1;
    const g2 = guards + (istGuard(l) ? 1 : 0);
    const b2 = bigs + (istBig(l) ? 1 : 0);
    const fehlt = (hatGuard && g2 < 1 ? 1 : 0) + (hatBig && b2 < 1 ? 1 : 0);
    if (fehlt > platzNach) continue;
    wahl.push(l);
    guards = g2;
    bigs = b2;
  }
  return wahl;
}

function wechsle(g: Spielzustand, frei: boolean): void {
  let geaendert = false;
  for (const seite of g.seiten) {
    const startet = seite.feld.length === 0 && seite.starter.length === 5;
    const soll = startet ? seite.starter : waehleAufstellung(g, seite);
    if (soll.length < 5) continue;
    if (seite.feld.length === 0) {
      seite.feld = soll;
      for (const l of soll) {
        l.imSpiel = true;
        l.seit = g.uhr;
      }
      geaendert = true;
      continue;
    }
    const raus = seite.feld.filter((l) => !soll.includes(l));
    const rein = soll.filter((l) => !seite.feld.includes(l));
    const paare = Math.min(raus.length, rein.length);
    for (let i = 0; i < paare; i++) {
      const aus = raus[i] as Live;
      const ein = rein[i] as Live;
      if (!frei && !aus.draussen && g.uhr - aus.seit < S.rotation.minEinsatz) continue;
      const idx = seite.feld.indexOf(aus);
      seite.feld[idx] = ein;
      aus.imSpiel = false;
      ein.imSpiel = true;
      ein.seit = g.uhr;
      geaendert = true;
    }
  }
  if (geaendert) ordneZu(g.seiten[0], g.seiten[1]);
}

// ---------- Ballbesitz ----------

function waehleZug(g: Spielzustand, off: Seite, art: Art): Zug {
  if (art === 'putback') return 'putback';
  if (art === 'steal' && g.rng.chance(S.fastbreak.nachSteal * off.k.fast)) return 'fast';
  if (art === 'defReb' && g.rng.chance(S.fastbreak.nachRebound * off.k.fast)) return 'fast';

  const f = off.feld;
  let maxBh = 0;
  let maxOff = 0;
  let bestPost = 0;
  let dreierSumme = 0;
  let speedSumme = 0;
  for (const l of f) {
    maxBh = Math.max(maxBh, w(l, 'ballhandling'));
    maxOff = Math.max(maxOff, l.offWert);
    if (l.pos >= 3) bestPost = Math.max(bestPost, w(l, 'postMoves'));
    dreierSumme += w(l, 'dreier');
    speedSumme += w(l, 'speed');
  }
  const z = S.zugGewichte;
  const zk = off.k.zuege;
  const gew = [
    z.iso * zk.iso * Math.pow(maxOff / 65, 2),
    z.pnr * zk.pnr * Math.pow(maxBh / 60, 1.5),
    z.post * zk.post * (bestPost === 0 ? 0.2 : Math.pow(bestPost / 60, 2)),
    z.spot * zk.spot * Math.pow(dreierSumme / 5 / 60, 2),
    z.drive * zk.drive * (speedSumme / 5 / 60),
  ];
  const zuege: Zug[] = ['iso', 'pnr', 'post', 'spot', 'drive'];
  return zuege[g.rng.gewichtet(gew)] as Zug;
}

function ziehDauer(g: Spielzustand, zug: Zug, off: Seite): number {
  const E = S.endspiel;
  if (g.modus === 'halten') return clamp(g.rng.normal(E.haltenDauer[0], E.haltenDauer[1]), 8, 24);
  const [mittel, streu] = S.dauer[zug];
  let d = g.rng.normal(mittel, streu) * S.tempoFaktor * off.k.dauer;
  if (g.modus === 'eilen') d *= E.eilenDauer;
  return clamp(d, 2, 24);
}

interface Wurf {
  schuetze: Live;
  zone: Zone;
  /** Hat der Spielzug eine eigene Assist-Wahrscheinlichkeit? */
  assistChance: number;
}

function waehleZone(g: Spielzustand, l: Live): Zone {
  const zf = (g.seiten[l.seite] as Seite).k.zonen;
  const rueckstand = (g.seiten[l.seite === 0 ? 1 : 0] as Seite).punkte - (g.seiten[l.seite] as Seite).punkte;
  const dreierEile = g.modus === 'eilen' && rueckstand >= 3 ? S.endspiel.eilenDreier : 1;
  // Letzter Angriff bei genau 3 Punkten Rückstand: Es wird auf den Ausgleich geworfen.
  if (g.modus === 'eilen' && rueckstand === 3 && g.sek <= S.endspiel.ausgleichswurfSekunden) return ZONE_DREIER;
  return g.rng.gewichtet([
    l.zonen[0] * zf[0],
    l.zonen[1] * zf[1],
    l.zonen[2] * zf[2] * dreierEile,
  ]) as Zone;
}

function waehleWurf(g: Spielzustand, off: Seite, zug: Zug, letzterRebounder: Live | null): Wurf {
  const f = off.feld;
  const A = S.assist;
  switch (zug) {
    case 'putback': {
      const s =
        letzterRebounder && g.rng.chance(0.6)
          ? letzterRebounder
          : waehle(g, f, (l) => l.nutzungEff);
      const zone: Zone = g.rng.chance(0.85) ? ZONE_RING : g.rng.chance(0.5) ? ZONE_MITTE : ZONE_DREIER;
      return { schuetze: s, zone, assistChance: 0 };
    }
    case 'iso': {
      const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'ballhandling') / 60, 2));
      return { schuetze: s, zone: waehleZone(g, s), assistChance: A.iso };
    }
    case 'pnr': {
      if (g.rng.chance(0.55)) {
        const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'ballhandling') / 60, 2));
        return { schuetze: s, zone: waehleZone(g, s), assistChance: A.pnrHandler };
      }
      const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'dunk') / 60, 2) * (l.pos >= 3 ? 1.5 : 0.7));
      return { schuetze: s, zone: g.rng.chance(0.9) ? ZONE_RING : ZONE_MITTE, assistChance: A.pnrRoller };
    }
    case 'post': {
      const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'postMoves') / 60, 2) * (l.pos >= 3 ? 1.5 : 0.5));
      return { schuetze: s, zone: g.rng.chance(0.72) ? ZONE_RING : ZONE_MITTE, assistChance: A.post };
    }
    case 'spot': {
      const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'dreier') / 60, 2));
      return { schuetze: s, zone: g.rng.chance(0.85) ? ZONE_DREIER : ZONE_MITTE, assistChance: A.spot };
    }
    case 'drive': {
      if (g.rng.chance(0.45)) {
        const s = waehle(g, f, (l) => l.nutzungEff * Math.pow((ra(l, 'speed') + ra(l, 'dunk')) / 120, 2));
        return { schuetze: s, zone: ZONE_RING, assistChance: A.driveRim };
      }
      const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'dreier') / 60, 2));
      return { schuetze: s, zone: g.rng.chance(0.9) ? ZONE_DREIER : ZONE_MITTE, assistChance: A.driveKick };
    }
    case 'fast': {
      const s = waehle(g, f, (l) => l.nutzungEff * Math.pow(ra(l, 'speed') / 60, 2));
      return { schuetze: s, zone: g.rng.chance(0.78) ? ZONE_RING : ZONE_DREIER, assistChance: A.fast };
    }
  }
}

/** Qualität des Verteidigers gegen eine Wurfzone (Skala wie die Attribute). */
function abwehrWert(d: Live, zone: Zone): number {
  switch (zone) {
    case ZONE_RING:
      return 0.5 * w(d, 'innenDef') + 0.2 * w(d, 'block') + 0.3 * w(d, 'perimeterDef');
    case ZONE_MITTE:
      return 0.55 * w(d, 'perimeterDef') + 0.25 * w(d, 'innenDef') + 0.2 * w(d, 'block');
    default:
      return 0.8 * w(d, 'perimeterDef') + 0.2 * w(d, 'speed');
  }
}

function angriffsWert(l: Live, zone: Zone, zug: Zug): number {
  switch (zone) {
    case ZONE_RING:
      return zug === 'post' ? 0.5 * w(l, 'dunk') + 0.5 * w(l, 'postMoves') : w(l, 'dunk');
    case ZONE_MITTE:
      return w(l, 'mitteldistanz');
    default:
      return w(l, 'dreier');
  }
}

function trefferChance(g: Spielzustand, wurf: Wurf, zug: Zug, off: Seite, def: Seite): number {
  const t = S.treffer;
  const z = wurf.zone;
  const l = wurf.schuetze;
  const d = l.gegner;
  let p = t.basis[z] + (angriffsWert(l, z, zug) - 60) * t.angriffProPunkt[z];
  if (d) p -= (abwehrWert(d, z) - 55) * t.abwehrProPunkt[z];
  if (z === ZONE_RING && d) {
    let hilfe = 0;
    let n = 0;
    for (const x of def.feld) {
      if (x !== d) {
        hilfe += w(x, 'innenDef');
        n++;
      }
    }
    if (n > 0) p -= (hilfe / n - 55) * t.hilfeProPunkt;
  }
  p += (w(l, 'spielIq') - 60) * t.iqProPunkt;
  p += off.k.trefferEigen[z] + def.fxTrefferGegner[z];
  if (l === off.stern) p += off.k.trefferStar;
  if (zug === 'spot' || (zug === 'drive' && z !== ZONE_RING)) p += t.frei;
  if (zug === 'putback') p += 0.04;
  // Spielverlauf: Wer klar führt, spielt lockerer/verwaltet den Vorsprung, wer zurückliegt, kämpft.
  // Das hält die Abstände realistisch (ohne Ausgleich gäbe es zu viele Kantersiege).
  // In der engen Schlussphase gilt der Ausgleich stärker (der Rückstand wird mit aller Kraft bekämpft).
  const C = S.endspiel.clutch;
  const eng = g.periode >= 3 && g.sek <= C.sekunden && Math.abs(off.punkte - def.punkte) <= C.abstand;
  p -= S.ausgleich * (eng ? C.faktor : 1) * clamp(off.punkte - def.punkte, -S.ausgleichMaxAbstand, S.ausgleichMaxAbstand);
  if (off === g.seiten[0]) p += S.heimvorteil / 2;
  else p -= S.heimvorteil / 2;
  return clamp(p, t.min, t.max);
}

function freiwurfChance(l: Live): number {
  return clamp(S.freiwurf.basis + (w(l, 'freiwurf') - 25) * S.freiwurf.proPunkt, 0.4, 0.97);
}

/** Foul des Verteidigers: wer foult? Große Spieler und Spieler mit wenig Spiel-IQ öfter. */
function waehleFoulenden(g: Spielzustand, def: Seite): Live {
  return waehle(g, def.feld, (l) => (110 - l.s.attribute.spielIq) * (l.pos === 4 ? 1.3 : l.pos === 3 ? 1.15 : 1) * (l.pf >= 5 ? 0.5 : 1));
}

function begeheFoul(def: Seite, foulender: Live): void {
  foulender.pf++;
  def.teamFouls++;
  if (foulender.pf >= S.ausgefoult) foulender.draussen = true;
}

type Weiter = { naechster: 0 | 1; art: Art; rebounder?: Live };

/** Freiwürfe werfen. Rückgabe: Ballbesitz nach dem letzten Freiwurf (oder offener Rebound). */
function freiwuerfe(g: Spielzustand, off: Seite, def: Seite, l: Live, anzahl: number): Weiter {
  const offIdx = off === g.seiten[0] ? 0 : 1;
  const defIdx = offIdx === 0 ? 1 : 0;
  let letzterTreffer = false;
  for (let i = 0; i < anzahl; i++) {
    l.fta++;
    letzterTreffer = g.rng.chance(freiwurfChance(l));
    if (letzterTreffer) {
      l.ftm++;
      l.pts++;
      punkte(g, off, 1);
    }
  }
  if (letzterTreffer) return { naechster: defIdx, art: 'normal' };
  // letzter Freiwurf verfehlt: Rebound
  const r = rebound(g, off, def, S.rebound.freiwurfFaktor);
  return r.offensiv
    ? { naechster: offIdx, art: 'putback', rebounder: r.l }
    : { naechster: defIdx, art: 'defReb' };
}

function rebound(g: Spielzustand, off: Seite, def: Seite, faktor: number): { offensiv: boolean; l: Live } {
  const rb = S.rebound;
  const meanOff = off.feld.reduce((s, l) => s + w(l, 'reboundOff'), 0) / off.feld.length;
  const meanDef = def.feld.reduce((s, l) => s + w(l, 'reboundDef'), 0) / def.feld.length;
  const p = clamp(
    rb.offensivBasis * Math.pow(meanOff / Math.max(meanDef, 20), 2) * faktor * off.k.oreb,
    rb.min * faktor,
    rb.max * faktor,
  );
  const gewicht = (l: Live, k: AttributKey) =>
    Math.pow(Math.max(ra(l, k), 20) / 60, 2) * Math.exp((l.s.groesseCm - 200) / 24);
  // Ein Teil der Fehlwürfe geht ins Aus: Team-Rebound ohne Spielerwertung
  const teamRebound = g.rng.chance(rb.teamAnteil);
  if (g.rng.chance(p)) {
    const l = waehle(g, off.feld, (x) => gewicht(x, 'reboundOff'));
    if (!teamRebound) {
      l.reb++;
      l.oreb++;
    }
    return { offensiv: true, l };
  }
  const l = waehle(g, def.feld, (x) => gewicht(x, 'reboundDef'));
  if (!teamRebound) l.reb++;
  return { offensiv: false, l };
}

/** Ein Ballbesitz samt anschließender Verletzungsprüfung. */
function gang(g: Spielzustand, offIdx: 0 | 1, art: Art, rebounder: Live | null): Weiter {
  const t0 = g.uhr;
  const res = gangKern(g, offIdx, art, rebounder);
  pruefeVerletzungen(g, g.uhr - t0);
  return res;
}

/** Wer verletzt sich in den letzten Sekunden? Verletzte Spieler verlassen sofort das Feld. */
function pruefeVerletzungen(g: Spielzustand, dauer: number): void {
  if (dauer <= 0) return;
  const V = CONFIG.verletzungen;
  for (const seite of g.seiten) {
    for (const l of seite.feld) {
      if (l.draussen || l.neueVerletzung) continue;
      const p = V.rateProSekunde * dauer * anfaelligkeit(l.s);
      if (!g.rng.chance(p)) continue;
      const v = wuerfleVerletzung(g.rng, g.saisonLaenge);
      l.neueVerletzung = v;
      l.draussen = true;
      logge(g, seite, `${kurz(l)} verletzt sich (${v.typ}) und muss raus`);
    }
  }
}

/** Das zurückliegende Team foult absichtlich, um die Uhr anzuhalten. */
function absichtlichesFoul(g: Spielzustand, off: Seite, def: Seite, offIdx: 0 | 1): Weiter {
  const E = S.endspiel;
  zeit(g, Math.min(g.sek, g.rng.range(E.foulDauer[0], E.foulDauer[1])));
  const frei = def.feld.filter((l) => l.pf < S.ausgefoult - 1);
  const foulender = waehle(g, frei.length > 0 ? frei : def.feld, (l) => 1 + (S.ausgefoult - l.pf));
  // Gefoult wird, wer den Ball hat: eher die schwächeren Freiwerfer
  const gefoult = waehle(g, off.feld, (l) => 105 - l.s.attribute.freiwurf);
  begeheFoul(def, foulender);
  logge(g, off, `Absichtliches Foul von ${kurz(foulender)} an ${kurz(gefoult)}`);
  if (def.teamFouls >= S.bonusAb) return freiwuerfe(g, off, def, gefoult, 2);
  return { naechster: offIdx, art: 'normal' };
}

/** Ein kompletter Ballbesitz. */
function gangKern(g: Spielzustand, offIdx: 0 | 1, art: Art, rebounder: Live | null): Weiter {
  const off = g.seiten[offIdx];
  const defIdx: 0 | 1 = offIdx === 0 ? 1 : 0;
  const def = g.seiten[defIdx];
  const T = S.turnover;
  const abgabe: Weiter = { naechster: defIdx, art: 'normal' };

  // Schlussminute: Wer führt, lässt die Uhr laufen; wer zurückliegt, foult oder wirft schnell.
  g.modus = 'normal';
  if (g.periode >= 3) {
    const E = S.endspiel;
    const vorsprung = off.punkte - def.punkte;
    if (vorsprung > 0 && g.sek <= E.foulenAb && vorsprung <= E.foulenRueckstand + g.sek / E.foulenTeiler && art !== 'putback') {
      return absichtlichesFoul(g, off, def, offIdx);
    }
    if (vorsprung > 0 && vorsprung <= E.haltenVorsprungMax && g.sek <= E.haltenAb) g.modus = 'halten';
    else if (vorsprung < 0 && g.sek <= E.eilenAb) g.modus = 'eilen';
  }

  const zug = waehleZug(g, off, art);
  const dauer = Math.min(g.sek, ziehDauer(g, zug, off));
  zeit(g, dauer);

  // 1. Foul des Verteidigers vor dem Wurf
  if (zug !== 'putback' && g.rng.chance(S.foulOhneWurf * def.k.foulOhneWurf)) {
    const foulender = waehleFoulenden(g, def);
    const gefoult = waehle(g, off.feld, (l) => l.nutzungEff);
    begeheFoul(def, foulender);
    if (def.teamFouls >= S.bonusAb) {
      logge(g, off, `Foul von ${kurz(foulender)}, ${kurz(gefoult)} an der Linie`);
      return freiwuerfe(g, off, def, gefoult, 2);
    }
    logge(g, off, `Foul von ${kurz(foulender)}`);
  }

  // 2. Turnover
  let pTo: number = T.basis;
  {
    let handler = 0;
    let druck = 0;
    for (const l of off.feld) handler += (w(l, 'ballhandling') + w(l, 'passen')) / 2;
    for (const l of def.feld) druck += (w(l, 'perimeterDef') + w(l, 'steal')) / 2;
    pTo = clamp(
      T.basis + (druck / 5 - handler / 5) * T.proPunkt + off.k.turnoverEigen + def.fxTurnoverGegner,
      T.min,
      T.max,
    );
    if (zug === 'fast') pTo = T.fastbreak;
    if (zug === 'putback') pTo = 0.04;
  }
  if (g.rng.chance(pTo)) {
    const verlierer = waehle(g, off.feld, (l) => l.nutzungEff * (140 - ra(l, 'ballhandling')));
    verlierer.to++;
    if (g.rng.chance(T.stealAnteil + def.k.stealAnteil)) {
      const dieb = waehle(g, def.feld, (l) => Math.pow(Math.max(ra(l, 'steal'), 20) / 60, 2));
      dieb.stl++;
      logge(g, off, `Ballverlust von ${kurz(verlierer)}, Steal ${kurz(dieb)}`);
      return { naechster: defIdx, art: 'steal' };
    }
    if (g.rng.chance(T.offensivfoulAnteil)) {
      verlierer.pf++;
      off.teamFouls++;
      if (verlierer.pf >= S.ausgefoult) verlierer.draussen = true;
      logge(g, off, `Offensivfoul von ${kurz(verlierer)}`);
    } else {
      logge(g, off, `Ballverlust von ${kurz(verlierer)}`);
    }
    return abgabe;
  }

  // 3. Wurf
  const wurf = waehleWurf(g, off, zug, rebounder);
  const l = wurf.schuetze;
  const z = wurf.zone;
  const drei = z === ZONE_DREIER;
  const zoneText = z === ZONE_RING ? 'am Ring' : z === ZONE_MITTE ? 'aus der Mitteldistanz' : 'von draußen';

  // Block
  const d = l.gegner;
  if (z !== ZONE_DREIER || g.rng.chance(0.3)) {
    const blocker = waehle(g, def.feld, (x) => Math.pow(Math.max(ra(x, 'block'), 20) / 60, 3));
    const pBlock =
      S.blockBasis[z] *
      Math.pow(Math.max(w(blocker, 'block'), 20) / 60, 2) *
      (1 + (w(blocker, 'sprungkraft') - 60) / 200) *
      Math.pow(60 / Math.max(angriffsWert(l, z, zug), 30), 0.5);
    if (g.rng.chance(pBlock)) {
      l.fga++;
      if (drei) l.tpa++;
      blocker.blk++;
      logge(g, off, `${kurz(l)} wird von ${kurz(blocker)} geblockt`);
      const r = rebound(g, off, def, S.rebound.blockFaktor);
      return r.offensiv ? { naechster: offIdx, art: 'putback', rebounder: r.l } : { naechster: defIdx, art: 'defReb' };
    }
  }

  const pTreffer = trefferChance(g, wurf, zug, off, def);

  // Foul beim Wurf
  const ziehen = clamp(Math.pow(l.offWert / 60, 1.5), 0.6, 1.8);
  if (g.rng.chance(S.foulBeimWurf[z] * ziehen * def.k.foulBeimWurf)) {
    const foulender = d && g.rng.chance(0.75) ? d : waehleFoulenden(g, def);
    begeheFoul(def, foulender);
    const getroffen = g.rng.chance(pTreffer * 0.8);
    if (getroffen) {
      l.fga++;
      l.fgm++;
      if (drei) {
        l.tpa++;
        l.tpm++;
      }
      const pkt = drei ? 3 : 2;
      l.pts += pkt;
      punkte(g, off, pkt);
      vergibAssist(g, off, l, wurf.assistChance);
      logge(g, off, `${kurz(l)} trifft ${zoneText} und wird von ${kurz(foulender)} gefoult`);
      return freiwuerfe(g, off, def, l, 1);
    }
    logge(g, off, `${kurz(l)} wird ${zoneText} von ${kurz(foulender)} gefoult`);
    return freiwuerfe(g, off, def, l, drei ? 3 : 2);
  }

  l.fga++;
  if (drei) l.tpa++;
  if (g.rng.chance(pTreffer)) {
    l.fgm++;
    if (drei) l.tpm++;
    const pkt = drei ? 3 : 2;
    l.pts += pkt;
    punkte(g, off, pkt);
    const assistent = vergibAssist(g, off, l, wurf.assistChance);
    logge(g, off, `${kurz(l)} trifft ${drei ? 'den Dreier' : zoneText}${assistent ? ` (Assist ${kurz(assistent)})` : ''}`);
    return abgabe;
  }

  const r = rebound(g, off, def, 1);
  logge(g, off, `${kurz(l)} verwirft ${zoneText}, ${r.offensiv ? 'Offensiv-' : ''}Rebound ${kurz(r.l)}`);
  return r.offensiv ? { naechster: offIdx, art: 'putback', rebounder: r.l } : { naechster: defIdx, art: 'defReb' };
}

function vergibAssist(g: Spielzustand, off: Seite, schuetze: Live, chance: number): Live | null {
  if (chance <= 0 || !g.rng.chance(Math.min(0.97, chance * S.assistFaktor * off.k.assist))) return null;
  const kandidaten = off.feld.filter((x) => x !== schuetze);
  const a = waehle(g, kandidaten, (x) => Math.pow(Math.max(ra(x, 'passen'), 20) / 60, 3) * (ra(x, 'ballhandling') / 60));
  a.ast++;
  return a;
}

// ---------- Spiel ----------

function zuBoxZeile(l: Live): BoxZeile {
  return [
    l.s.id,
    Math.round(l.min),
    l.pts,
    l.reb,
    l.oreb,
    l.ast,
    l.stl,
    l.blk,
    l.to,
    l.pf,
    l.fgm,
    l.fga,
    l.tpm,
    l.tpa,
    l.ftm,
    l.fta,
    l.pm,
    l.starter,
  ];
}

function zuTeamBox(seite: Seite): TeamBox {
  const gespielt = seite.live.filter((l) => l.min > 0);
  gespielt.sort((a, b) => b.starter - a.starter || b.min - a.min);
  return {
    teamId: seite.m.teamId,
    punkte: seite.punkte,
    viertel: seite.viertel.map((v) => v ?? 0),
    spieler: gespielt.map(zuBoxZeile),
  };
}

function beginnePeriode(g: Spielzustand, periode: number): void {
  g.periode = periode;
  g.sek = periode < 4 ? S.viertelSekunden : S.otSekunden;
  if (periode < 4) for (const s of g.seiten) s.teamFouls = 0;
  for (const s of g.seiten) s.viertel[periode] = 0;
  if (periode > 0) {
    const bonus = periode === 2 ? S.muedigkeit.erholungHalbzeit : S.muedigkeit.erholungViertel;
    for (const s of g.seiten) for (const l of s.live) l.energie = Math.min(100, l.energie + bonus);
  }
  g.halbzeitStart = periode === 2;
  wechsle(g, true);
  g.halbzeitStart = false;
  if (periode === 0) {
    for (const s of g.seiten) for (const l of s.feld) l.starter = 1;
  }
}

/** Simuliert ein komplettes Spiel. */
export function simuliereSpiel(rng: Rng, heim: Mannschaft, gast: Mannschaft, opt: SpielOptionen): SpielErgebnis {
  const g: Spielzustand = {
    rng,
    seiten: [erzeugeSeite(heim, 0), erzeugeSeite(gast, 1)],
    periode: 0,
    sek: 0,
    uhr: 0,
    log: opt.pbp ? [] : null,
    saisonLaenge: opt.saisonLaenge ?? 82,
    modus: 'normal',
    halbzeitStart: false,
  };

  // Sprungball: wer ihn gewinnt, startet Viertel 1 und 4 mit Ball, der andere Viertel 2 und 3.
  const tipp: 0 | 1 = rng.chance(0.5) ? 0 : 1;
  const andere: 0 | 1 = tipp === 0 ? 1 : 0;
  const beginner = (periode: number): 0 | 1 => (periode === 0 || periode === 3 ? tipp : andere);

  const spielPeriode = (periode: number, start: 0 | 1) => {
    beginnePeriode(g, periode);
    // Beim ersten Mal die Feldspieler einander zuordnen (nach der Aufstellung)
    ordneZu(g.seiten[0], g.seiten[1]);
    let besitz: 0 | 1 = start;
    let art: Art = 'normal';
    let rebounder: Live | null = null;
    while (g.sek > 0) {
      wechsle(g, false);
      const res = gang(g, besitz, art, rebounder);
      besitz = res.naechster;
      art = res.art;
      rebounder = res.rebounder ?? null;
    }
  };

  for (let p = 0; p < 4; p++) spielPeriode(p, beginner(p));
  let ot = 0;
  while (g.seiten[0].punkte === g.seiten[1].punkte) {
    ot++;
    spielPeriode(3 + ot, rng.chance(0.5) ? 0 : 1);
    if (ot > 10) throw new Error('Spiel endet nie (mehr als 10 Verlängerungen)');
  }

  const [a, b] = g.seiten;
  const ergebnis: SpielErgebnis = {
    tag: opt.tag,
    heim: zuTeamBox(a),
    gast: zuTeamBox(b),
    ot,
    text: '',
  };
  const verletzungen: NeueVerletzung[] = [];
  for (const seite of g.seiten) {
    for (const l of seite.live) {
      if (l.neueVerletzung) {
        verletzungen.push({ spielerId: l.s.id, teamId: seite.m.teamId, typ: l.neueVerletzung.typ, spiele: l.neueVerletzung.spiele });
      }
    }
  }
  if (verletzungen.length > 0) ergebnis.verletzungen = verletzungen;
  ergebnis.text = spielText(g, ergebnis);
  if (g.log) ergebnis.pbp = g.log;
  return ergebnis;
}

// ---------- Zusammenfassung ----------

function topWert(seite: Seite, wert: (l: Live) => number): Live {
  let best = seite.live[0] as Live;
  for (const l of seite.live) if (wert(l) > wert(best)) best = l;
  return best;
}

function spielText(g: Spielzustand, erg: SpielErgebnis): string {
  const [a, b] = g.seiten;
  const heimGewinnt = a.punkte > b.punkte;
  const sieger = heimGewinnt ? a : b;
  const verlierer = heimGewinnt ? b : a;
  const ps = sieger.punkte;
  const pv = verlierer.punkte;
  const diff = ps - pv;
  const rueckstand = verlierer.maxVorsprung;
  const S1 = sieger.m.name;
  const V1 = verlierer.m.name;

  let satz: string;
  if (erg.ot >= 2) satz = `${S1} gewinnt ${ps}:${pv} nach ${erg.ot} Verlängerungen gegen ${V1}.`;
  else if (erg.ot === 1) satz = `${S1} gewinnt ${ps}:${pv} nach Verlängerung gegen ${V1}.`;
  else if (rueckstand >= 12 && diff <= 10) satz = `${S1} dreht einen ${rueckstand}-Punkte-Rückstand und gewinnt ${ps}:${pv} gegen ${V1}.`;
  else if (diff <= 3) satz = `${S1} gewinnt knapp ${ps}:${pv} gegen ${V1}.`;
  else if (diff >= 25) satz = `${S1} deklassiert ${V1} mit ${ps}:${pv}.`;
  else if (diff >= 15) satz = `Klarer Sieg: ${S1} schlägt ${V1} ${ps}:${pv}.`;
  else satz = `${S1} besiegt ${V1} ${ps}:${pv}.`;

  const star = topWert(sieger, (l) => l.pts + l.reb * 0.5 + l.ast * 0.5);
  const doppelt = [star.pts, star.reb, star.ast, star.stl, star.blk].filter((x) => x >= 10).length;
  const name = `${star.s.vorname} ${star.s.nachname}`;
  let zusatz: string;
  if (doppelt >= 3) zusatz = ` ${name} gelingt ein Triple-Double (${star.pts} Punkte, ${star.reb} Rebounds, ${star.ast} Assists).`;
  else if (doppelt >= 2 && star.pts >= 10) zusatz = ` ${name} legt ein Double-Double auf (${star.pts} Punkte, ${star.reb} Rebounds, ${star.ast} Assists).`;
  else zusatz = ` ${name} führt ${S1} mit ${star.pts} Punkten an.`;

  const gegenStar = topWert(verlierer, (l) => l.pts);
  const gegen = gegenStar.pts >= 30 ? ` Bei ${V1} hält ${gegenStar.s.vorname} ${gegenStar.s.nachname} mit ${gegenStar.pts} Punkten dagegen.` : '';
  const verletzte = [...a.live, ...b.live].filter((l) => l.neueVerletzung);
  const verl =
    verletzte.length === 0
      ? ''
      : ' ' +
        verletzte
          .map((l) => `${l.s.vorname} ${l.s.nachname} (${l.seite === 0 ? a.m.name : b.m.name}) verletzt sich: ${(l.neueVerletzung as { typ: string }).typ}.`)
          .join(' ');
  return satz + zusatz + gegen + verl;
}
