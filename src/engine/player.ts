import { CONFIG } from './config';
import type { NamenGenerator } from './names';
import type { Rng } from './rng';
import type {
  Attribute,
  AttributKey,
  Persoenlichkeit,
  PersoenlichkeitKey,
  Position,
  Spieler,
} from './types';

/** Alle Attribute mit deutschem Namen und Gruppe (Reihenfolge = Anzeige auf der Spielerkarte). */
export const ATTRIBUT_INFO: readonly { key: AttributKey; label: string; gruppe: string }[] = [
  { key: 'dunk', label: 'Korbleger/Dunk', gruppe: 'Wurf' },
  { key: 'mitteldistanz', label: 'Mitteldistanz', gruppe: 'Wurf' },
  { key: 'dreier', label: 'Dreier', gruppe: 'Wurf' },
  { key: 'freiwurf', label: 'Freiwurf', gruppe: 'Wurf' },
  { key: 'ballhandling', label: 'Ballhandling', gruppe: 'Spielmacher' },
  { key: 'passen', label: 'Passen', gruppe: 'Spielmacher' },
  { key: 'spielIq', label: 'Spiel-IQ', gruppe: 'Spielmacher' },
  { key: 'postMoves', label: 'Post-Moves', gruppe: 'Innen' },
  { key: 'reboundOff', label: 'Rebound Offense', gruppe: 'Innen' },
  { key: 'reboundDef', label: 'Rebound Defense', gruppe: 'Innen' },
  { key: 'block', label: 'Block', gruppe: 'Innen' },
  { key: 'perimeterDef', label: 'Perimeter-Defense', gruppe: 'Verteidigung' },
  { key: 'innenDef', label: 'Innen-Defense', gruppe: 'Verteidigung' },
  { key: 'steal', label: 'Steal', gruppe: 'Verteidigung' },
  { key: 'speed', label: 'Speed', gruppe: 'Athletik' },
  { key: 'sprungkraft', label: 'Sprungkraft', gruppe: 'Athletik' },
  { key: 'kraft', label: 'Kraft', gruppe: 'Athletik' },
  { key: 'ausdauer', label: 'Ausdauer', gruppe: 'Athletik' },
];

export const ATTRIBUT_GRUPPEN = ['Wurf', 'Spielmacher', 'Innen', 'Verteidigung', 'Athletik'] as const;

export const PERSOENLICHKEIT_INFO: readonly { key: PersoenlichkeitKey; label: string }[] = [
  { key: 'arbeitsethik', label: 'Arbeitsethik' },
  { key: 'ego', label: 'Ego' },
  { key: 'loyalitaet', label: 'Loyalität' },
  { key: 'geldgier', label: 'Geldgier' },
  { key: 'verletzungsanfaelligkeit', label: 'Verletzungsanfälligkeit' },
];

const ATTRIBUT_KEYS: readonly AttributKey[] = ATTRIBUT_INFO.map((a) => a.key);

/**
 * Wie wichtig jedes Attribut für die Gesamtwertung (OVR) einer Position ist.
 * Die Rohgewichte werden unten auf Summe 1 normiert.
 */
const ROH_GEWICHTE: Record<Position, Record<AttributKey, number>> = {
  PG: {
    dunk: 0.6, mitteldistanz: 0.9, dreier: 1.3, freiwurf: 0.5,
    ballhandling: 1.6, passen: 1.6, spielIq: 1.4,
    postMoves: 0.1, reboundOff: 0.1, reboundDef: 0.2, block: 0.1,
    perimeterDef: 1.0, innenDef: 0.1, steal: 0.8,
    speed: 1.1, sprungkraft: 0.3, kraft: 0.2, ausdauer: 0.4,
  },
  SG: {
    dunk: 0.9, mitteldistanz: 1.3, dreier: 1.6, freiwurf: 0.8,
    ballhandling: 1.0, passen: 0.7, spielIq: 1.0,
    postMoves: 0.1, reboundOff: 0.2, reboundDef: 0.3, block: 0.2,
    perimeterDef: 1.1, innenDef: 0.2, steal: 0.7,
    speed: 0.9, sprungkraft: 0.6, kraft: 0.2, ausdauer: 0.4,
  },
  SF: {
    dunk: 1.0, mitteldistanz: 1.0, dreier: 1.1, freiwurf: 0.6,
    ballhandling: 0.7, passen: 0.6, spielIq: 1.0,
    postMoves: 0.4, reboundOff: 0.4, reboundDef: 0.6, block: 0.4,
    perimeterDef: 1.0, innenDef: 0.5, steal: 0.6,
    speed: 0.8, sprungkraft: 0.8, kraft: 0.6, ausdauer: 0.5,
  },
  PF: {
    dunk: 1.2, mitteldistanz: 0.8, dreier: 0.6, freiwurf: 0.5,
    ballhandling: 0.3, passen: 0.4, spielIq: 0.9,
    postMoves: 1.0, reboundOff: 0.9, reboundDef: 1.1, block: 0.8,
    perimeterDef: 0.5, innenDef: 1.1, steal: 0.4,
    speed: 0.4, sprungkraft: 0.8, kraft: 1.0, ausdauer: 0.5,
  },
  C: {
    dunk: 1.3, mitteldistanz: 0.3, dreier: 0.2, freiwurf: 0.4,
    ballhandling: 0.1, passen: 0.3, spielIq: 0.8,
    postMoves: 1.3, reboundOff: 1.2, reboundDef: 1.4, block: 1.3,
    perimeterDef: 0.2, innenDef: 1.5, steal: 0.3,
    speed: 0.2, sprungkraft: 0.8, kraft: 1.1, ausdauer: 0.5,
  },
};

function normiere(roh: Record<AttributKey, number>): Record<AttributKey, number> {
  const summe = ATTRIBUT_KEYS.reduce((s, k) => s + roh[k], 0);
  const ergebnis = {} as Record<AttributKey, number>;
  for (const k of ATTRIBUT_KEYS) ergebnis[k] = roh[k] / summe;
  return ergebnis;
}

const GEWICHTE: Record<Position, Record<AttributKey, number>> = {
  PG: normiere(ROH_GEWICHTE.PG),
  SG: normiere(ROH_GEWICHTE.SG),
  SF: normiere(ROH_GEWICHTE.SF),
  PF: normiere(ROH_GEWICHTE.PF),
  C: normiere(ROH_GEWICHTE.C),
};

/** Gesamtwertung: gewichteter Durchschnitt der Attribute je nach Position. */
export function berechneOvr(attribute: Attribute, position: Position): number {
  const g = GEWICHTE[position];
  let summe = 0;
  for (const k of ATTRIBUT_KEYS) summe += attribute[k] * g[k];
  return Math.round(summe);
}

export function begrenze(wert: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, wert));
}

const GROESSE: Record<Position, { mittel: number; abweichung: number }> = {
  PG: { mittel: 188, abweichung: 4 },
  SG: { mittel: 195, abweichung: 4 },
  SF: { mittel: 201, abweichung: 4 },
  PF: { mittel: 206, abweichung: 3.5 },
  C: { mittel: 212, abweichung: 4 },
};

/** Erzeugt Attribute passend zur Position, die zusammen etwa die Ziel-OVR ergeben. */
function erzeugeAttribute(rng: Rng, position: Position, zielOvr: number): Attribute {
  const { attributMin, attributMax } = CONFIG.spieler;
  const g = GEWICHTE[position];
  const mittleresGewicht = 1 / ATTRIBUT_KEYS.length;
  const werte = {} as Record<AttributKey, number>;
  for (const k of ATTRIBUT_KEYS) {
    const bias = (g[k] / mittleresGewicht - 1) * CONFIG.generator.positionsBonus;
    werte[k] = zielOvr + bias + rng.normal(0, CONFIG.generator.attributAbweichung);
  }
  // Alle Attribute gemeinsam verschieben, bis die OVR zum Ziel passt.
  for (let durchgang = 0; durchgang < 4; durchgang++) {
    const gerundet = {} as Attribute;
    for (const k of ATTRIBUT_KEYS) gerundet[k] = begrenze(Math.round(werte[k]), attributMin, attributMax);
    const diff = zielOvr - berechneOvr(gerundet, position);
    if (Math.abs(diff) < 0.5) break;
    for (const k of ATTRIBUT_KEYS) werte[k] += diff;
  }
  const attribute = {} as Attribute;
  for (const k of ATTRIBUT_KEYS) attribute[k] = begrenze(Math.round(werte[k]), attributMin, attributMax);
  return attribute;
}

function erzeugePersoenlichkeit(rng: Rng): Persoenlichkeit {
  const { persoenlichkeitMittel: m, persoenlichkeitAbweichung: a } = CONFIG.generator;
  const wert = () => begrenze(Math.round(rng.normal(m, a)), 20, 99);
  return {
    arbeitsethik: wert(),
    ego: wert(),
    loyalitaet: wert(),
    geldgier: wert(),
    verletzungsanfaelligkeit: begrenze(Math.round(rng.normal(50, 15)), 15, 95),
  };
}

export interface SpielerVorgabe {
  id: number;
  teamId: number | null;
  position: Position;
  /** Gewünschtes Talent-Niveau (ungefähre OVR eines 24-Jährigen) */
  talent: number;
}

/** Erzeugt einen Spieler ohne Vertrag (der kommt vom Liga-Generator). */
export function erzeugeSpieler(rng: Rng, namen: NamenGenerator, vorgabe: SpielerVorgabe): Omit<Spieler, 'vertrag'> {
  const gen = CONFIG.generator;
  const alter = begrenze(Math.round(rng.normal(gen.alterMittel, gen.alterAbweichung)), gen.alterMin, gen.alterMax);

  // Junge Spieler sind noch schwächer, haben dafür mehr Potenzial.
  const jugendAbzug = Math.max(0, 24 - alter) * gen.jugendAbzugProJahr;
  const zielOvr = begrenze(vorgabe.talent - jugendAbzug, 30, 96);

  const attribute = erzeugeAttribute(rng, vorgabe.position, zielOvr);
  const ovr = berechneOvr(attribute, vorgabe.position);

  let luecke: number;
  if (alter <= 24) luecke = Math.max(0, rng.normal(7 + (25 - alter) * 1.5, 5));
  else if (alter <= 28) luecke = Math.max(0, rng.normal(1.5, 2));
  else luecke = 0;
  const pot = begrenze(ovr + Math.round(luecke), ovr, CONFIG.spieler.attributMax);

  const groesse = GROESSE[vorgabe.position];
  const groesseCm = Math.round(rng.normal(groesse.mittel, groesse.abweichung));
  const gewichtKg = Math.round((groesseCm - 100) * 0.9 + 8 + rng.normal(0, 5));

  const name = namen.erzeuge(rng);
  return {
    id: vorgabe.id,
    vorname: name.vorname,
    nachname: name.nachname,
    position: vorgabe.position,
    groesseCm,
    gewichtKg,
    alter,
    nationalitaet: name.nationalitaet,
    attribute,
    persoenlichkeit: erzeugePersoenlichkeit(rng),
    ovr,
    pot,
    teamId: vorgabe.teamId,
  };
}
