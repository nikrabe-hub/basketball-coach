import { CONFIG } from './config';
import { ATTRIBUT_INFO, begrenze, berechneOvr } from './player';
import type { Rng } from './rng';
import type { Attribute, AttributKey, Spieler } from './types';

const D = CONFIG.offseason.entwicklung;
const KEYS: readonly AttributKey[] = ATTRIBUT_INFO.map((a) => a.key);
const ATHLETIK: ReadonlySet<AttributKey> = new Set<AttributKey>(['speed', 'sprungkraft', 'kraft', 'ausdauer']);

/** Erwartete OVR-Änderung beim Abbau (ab 27), für das neue Alter. */
function abbauWert(alter: number): number {
  const i = Math.min(D.abbau.length - 1, Math.max(0, alter - D.abbauStartAlter));
  return D.abbau[i] as number;
}

/**
 * Entwickelt einen Spieler um ein Jahr: Alter +1, neue Attribute, OVR und POT.
 * `minProSpiel` = durchschnittliche Spielzeit der letzten Saison (0 ohne Einsätze).
 */
export function entwickleSpieler(rng: Rng, s: Spieler, minProSpiel: number): void {
  s.ovrVorjahr = s.ovr;
  s.alter += 1;
  const alter = s.alter;
  const arbeit = (s.persoenlichkeit.arbeitsethik - 60) / 40; // etwa -1..+1

  let delta: number;
  if (alter < D.abbauStartAlter) {
    const anteil = D.lueckeAnteil[Math.min(26, Math.max(19, alter))] as number;
    const luecke = Math.max(0, s.pot - s.ovr);
    let faktor = 1 + arbeit * D.arbeitsethikEinfluss;
    if (minProSpiel >= D.spielzeitViel) faktor += D.spielzeitBonus;
    else if (minProSpiel < D.spielzeitWenig) faktor -= D.spielzeitMalus;
    delta = luecke * anteil * Math.max(0.3, faktor) + rng.normal(0, D.rauschen);
  } else {
    // Wer hart arbeitet, baut etwas langsamer ab.
    const daempfung = 1 - arbeit * 0.2;
    delta = abbauWert(alter) * daempfung + rng.normal(0, D.rauschen * 0.8);
  }
  if (rng.chance(D.ueberraschungChance)) {
    const positiv = rng.chance(alter < D.abbauStartAlter ? 0.6 : 0.35);
    const groesse = Math.abs(rng.normal(D.ueberraschungMittel, 2));
    delta += positiv ? groesse : -groesse;
  }
  delta = begrenze(delta, -8, 9);
  // Mehr als ein paar Punkte über dem Potenzial geht nicht (Zufall und Überraschungen eingerechnet).
  const ziel = begrenze(Math.min(s.ovr + delta, Math.max(s.pot, s.ovr) + 2), 30, 97);

  // Verteilung der Änderung auf die Attribute: Abbau trifft Athletik zuerst, Wachstum junger Spieler auch die Athletik.
  const neu = {} as Attribute;
  for (const k of KEYS) {
    let anteil = 1;
    if (delta < 0) anteil = D.abbauAttribut[k] ?? 1;
    else if (ATHLETIK.has(k) && alter > D.athletikWachstumBis) anteil = 0.4;
    neu[k] = s.attribute[k] + delta * anteil + rng.normal(0, D.attributRauschen);
  }
  const { attributMin, attributMax } = CONFIG.spieler;
  const runde = (): Attribute => {
    const a = {} as Attribute;
    for (const k of KEYS) a[k] = begrenze(Math.round(neu[k]), attributMin, attributMax);
    return a;
  };
  // Gemeinsam verschieben, bis die Gesamtwertung zum Ziel passt.
  let attribute = runde();
  for (let durchgang = 0; durchgang < 4; durchgang++) {
    const diff = ziel - berechneOvr(attribute, s.position);
    if (Math.abs(diff) < 0.5) break;
    for (const k of KEYS) neu[k] += diff;
    attribute = runde();
  }
  s.attribute = attribute;
  s.ovr = berechneOvr(attribute, s.position);

  // Potenzial: junge Spieler schwanken noch, danach schrumpft die Lücke auf 0.
  if (alter <= D.potSchwankungBis) s.pot = begrenze(s.pot + Math.round(rng.normal(0, D.potSchwankung)), s.ovr, attributMax);
  else if (alter <= D.potSchwankungBis + 2) s.pot = begrenze(Math.min(s.pot, s.ovr + 2), s.ovr, attributMax);
  else s.pot = s.ovr;
  if (s.pot < s.ovr) s.pot = s.ovr;
}

/** Chance, dass ein Spieler (Alter am Saisonende) aufhört. `hatTeam` = false: Free Agent. */
export function karriereendeChance(s: Spieler, hatTeam: boolean): number {
  const K = CONFIG.offseason.karriereende;
  if (s.alter >= K.pflichtAlter) return 1;
  let p = 0;
  if (s.alter >= K.abAlter) {
    p = K.grundChance + K.proJahr * (s.alter - K.abAlter);
    p += (60 - s.ovr) * K.ovrFaktor;
    if (s.ovr >= 75) p -= K.starBonus;
  }
  if (!hatTeam && s.alter >= K.freeAgentAlter && s.ovr < K.freeAgentOvr) p = Math.max(p, K.freeAgentChance);
  return begrenze(p, 0, 1);
}
