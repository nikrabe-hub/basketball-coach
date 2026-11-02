/**
 * Taktik-Skript: misst, wie stark Rotation und Taktik die Ergebnisse verändern.
 *
 * Ein Prüfteam spielt viele Spiele gegen die Liga (Gegner: automatische Rotation, Standard-Taktik).
 * Für jede Einstellung wird der Abstand pro Spiel mit der Standard-Einstellung verglichen.
 * Der Brief verlangt: Taktik-Effekte müssen spürbar, aber nicht übermächtig sein, und
 * Rotation und Taktik müssen Ergebnisse messbar verändern.
 *
 * Aufruf:  npm run taktik            (ca. 1–2 Minuten)
 *          npm run taktik -- 400     (weniger Spiele je Messung, schneller aber ungenauer)
 *          npm run taktik -- 800 1,3 (nur Teil 1 und 3)
 */
import { mannschaftVon } from '../src/engine/season';
import { simuliereSpiel } from '../src/engine/game';
import { generiereLiga, kaderVon, staerkeRanking } from '../src/engine/league';
import { Rng } from '../src/engine/rng';
import {
  FOKUS_OPTIONEN,
  INTENSITAET_OPTIONEN,
  TEMPO_OPTIONEN,
  VERTEIDIGUNG_OPTIONEN,
  WURF_OPTIONEN,
} from '../src/engine/tactics';
import { standardCoaching, type Coaching, type Liga, type Taktik } from '../src/engine/types';

const SPIELE = Number(process.argv[2] ?? 800);
/** Welche Teile laufen sollen (1 = Einzel-Taktik, 2 = Rotation, 3 = Passung), z. B. "1,3" */
const TEILE = (process.argv[3] ?? '1,2,3').split(',');
const liga = generiereLiga(31337, 82);
const ranking = staerkeRanking(liga);
const GRENZE = 5; // Punkte pro Spiel: mehr gilt als übermächtig

interface Messung {
  abstand: number;
  se: number;
  siege: number;
}

function messe(testTeam: number, coaching: Coaching, spiele = SPIELE): Messung {
  const gegner = liga.teams.map((t) => t.id).filter((id) => id !== testTeam);
  const rng = new Rng(9000 + testTeam);
  const diffs: number[] = [];
  let siege = 0;
  const eigen = mannschaftVon(liga, testTeam, coaching);
  for (let i = 0; i < spiele; i++) {
    const g = gegner[i % gegner.length] as number;
    const heim = i % 2 === 0;
    const andere = mannschaftVon(liga, g);
    const erg = heim
      ? simuliereSpiel(new Rng(rng.int(1, 2 ** 30)), eigen, andere, { tag: 0, pbp: false })
      : simuliereSpiel(new Rng(rng.int(1, 2 ** 30)), andere, eigen, { tag: 0, pbp: false });
    const e = heim ? erg.heim.punkte : erg.gast.punkte;
    const a = heim ? erg.gast.punkte : erg.heim.punkte;
    diffs.push(e - a);
    if (e > a) siege++;
  }
  const mw = diffs.reduce((x, y) => x + y, 0) / diffs.length;
  const sd = Math.sqrt(diffs.reduce((x, y) => x + (y - mw) ** 2, 0) / (diffs.length - 1));
  return { abstand: mw, se: sd / Math.sqrt(diffs.length), siege: siege / spiele };
}

function mitTaktik(teil: Partial<Taktik>): Coaching {
  const c = standardCoaching();
  c.taktik = { ...c.taktik, ...teil };
  return c;
}

const vz = (x: number, nk = 1) => (x >= 0 ? '+' : '') + x.toFixed(nk);
let zuStark = 0;
let unmessbar = 0;

function tabelle(titel: string, teams: { label: string; id: number }[], zeilen: { label: string; coaching: Coaching }[], erwartetMessbar = true): void {
  console.log(`\n${titel}`);
  console.log('  ' + 'Einstellung'.padEnd(24) + teams.map((t) => t.label.padStart(22)).join(''));
  const basis = teams.map((t) => messe(t.id, standardCoaching()));
  console.log('  ' + 'Standard (Abstand/Spiel)'.padEnd(24) + basis.map((b) => `${vz(b.abstand)} (±${(1.96 * b.se).toFixed(1)})`.padStart(22)).join(''));
  for (const z of zeilen) {
    const zellen = teams.map((t, i) => {
      const m = messe(t.id, z.coaching);
      const d = m.abstand - (basis[i] as Messung).abstand;
      const fehler = 1.96 * Math.sqrt(m.se ** 2 + (basis[i] as Messung).se ** 2);
      if (Math.abs(d) > GRENZE) zuStark++;
      return `${vz(d)} (±${fehler.toFixed(1)})`.padStart(22);
    });
    console.log('  ' + z.label.padEnd(24) + zellen.join(''));
  }
  void erwartetMessbar;
  void unmessbar;
}

const stark = ranking[2]!.teamId;
const mitte = ranking[14]!.teamId;
const schwach = ranking[27]!.teamId;
const teams = [
  { label: `stark (Platz 3)`, id: stark },
  { label: `Mitte (Platz 15)`, id: mitte },
  { label: `schwach (Platz 28)`, id: schwach },
];

console.log(`Taktik-Messung: ${SPIELE} Spiele je Team und Einstellung (Änderung des Abstands gegenüber Standard, Punkte pro Spiel, ±95 %-Fehler)`);
const t0 = Date.now();

const einzel: { label: string; coaching: Coaching }[] = [];
for (const o of TEMPO_OPTIONEN) if (o.wert !== 'normal') einzel.push({ label: `Tempo ${o.label}`, coaching: mitTaktik({ tempo: o.wert }) });
for (const o of WURF_OPTIONEN) if (o.wert !== 'ausgewogen') einzel.push({ label: `Wurf ${o.label}`, coaching: mitTaktik({ wurf: o.wert }) });
for (const o of FOKUS_OPTIONEN) if (o.wert !== 'ballbewegung') einzel.push({ label: `Fokus ${o.label}`, coaching: mitTaktik({ fokus: o.wert }) });
for (const o of VERTEIDIGUNG_OPTIONEN) if (o.wert !== 'mann') einzel.push({ label: `Abwehr ${o.label}`, coaching: mitTaktik({ verteidigung: o.wert }) });
for (const o of INTENSITAET_OPTIONEN) if (o.wert !== 'normal') einzel.push({ label: `Intensität ${o.label}`, coaching: mitTaktik({ intensitaet: o.wert }) });
if (TEILE.includes('1')) tabelle('1. Einzelne Taktik-Einstellungen', teams, einzel);

// ---------- Rotation ----------

function rotation(liga: Liga, teamId: number, minuten: number[], auto = false): Coaching {
  const c = standardCoaching();
  const kader = [...kaderVon(liga, teamId)].sort((a, b) => b.ovr - a.ovr);
  c.rotation = {
    auto,
    starter: kader.slice(0, 5).map((s) => s.id),
    minuten: Object.fromEntries(kader.map((s, i) => [String(s.id), minuten[i] ?? 0])),
  };
  return c;
}

const rotZeilen: { label: string; coaching: (id: number) => Coaching }[] = [
  { label: 'Eigene = ähnlich Auto', coaching: (id) => rotation(liga, id, [34, 32, 30, 28, 26, 22, 20, 18, 14, 10, 6]) },
  { label: 'Stars viel (40/38/36)', coaching: (id) => rotation(liga, id, [40, 38, 36, 30, 26, 20, 16, 12, 10, 6]) },
  { label: 'Kurze Rotation (7)', coaching: (id) => rotation(liga, id, [36, 34, 32, 30, 28, 24, 20]) },
  { label: 'Nur die Starter (5)', coaching: (id) => rotation(liga, id, [44, 44, 44, 44, 44]) },
  { label: 'Bank statt Stars', coaching: (id) => rotation(liga, id, [16, 16, 16, 16, 16, 28, 28, 28, 28, 28]) },
  { label: 'Beste draußen (0 Min.)', coaching: (id) => rotation(liga, id, [0, 0, 0, 30, 30, 30, 30, 30, 30, 30, 30]) },
];
if (TEILE.includes('2')) console.log('\n2. Rotation (eigene Minuten statt automatischer Rotation)');
if (TEILE.includes('2')) console.log('  ' + 'Rotation'.padEnd(24) + teams.map((t) => t.label.padStart(22)).join(''));
const rotBasis = TEILE.includes('2') ? teams.map((t) => messe(t.id, standardCoaching())) : [];
for (const z of TEILE.includes('2') ? rotZeilen : []) {
  const zellen = teams.map((t, i) => {
    const m = messe(t.id, z.coaching(t.id));
    const d = m.abstand - (rotBasis[i] as Messung).abstand;
    const fehler = 1.96 * Math.sqrt(m.se ** 2 + (rotBasis[i] as Messung).se ** 2);
    return `${vz(d)} (±${fehler.toFixed(1)})`.padStart(22);
  });
  console.log('  ' + z.label.padEnd(24) + zellen.join(''));
}

// ---------- Passung: Taktik hilft je nach Kader ----------

function mittel(liga: Liga, teamId: number, f: (s: ReturnType<typeof kaderVon>[number]) => number): number {
  const top = [...kaderVon(liga, teamId)].sort((a, b) => b.ovr - a.ovr).slice(0, 8);
  return top.reduce((a, s) => a + f(s), 0) / top.length;
}

function passung(titel: string, f: (s: ReturnType<typeof kaderVon>[number]) => number, coaching: Coaching, istAngriff: boolean): void {
  // Teams ähnlicher Stärke (Platz 8–23), geordnet nach der Eigenschaft: obere und untere 4 vergleichen
  const kandidaten = ranking.slice(7, 23).map((r) => r.teamId);
  const sortiert = [...kandidaten].sort((a, b) => mittel(liga, b, f) - mittel(liga, a, f));
  const oben = sortiert.slice(0, 4);
  const unten = sortiert.slice(-4);
  const delta = (ids: number[]) => {
    let summe = 0;
    for (const id of ids) {
      const b = messe(id, standardCoaching(), 500);
      const m = messe(id, coaching, 500);
      summe += m.abstand - b.abstand;
    }
    return summe / ids.length;
  };
  const d1 = delta(oben);
  const d2 = delta(unten);
  console.log(
    `  ${titel.padEnd(34)} gute ${istAngriff ? 'Schützen' : 'Verteidiger'}: ${vz(d1)}   schwache: ${vz(d2)}   Unterschied ${vz(d1 - d2)}`,
  );
}

if (TEILE.includes('3')) {
  console.log('\n3. Passung zum Kader (Teams ähnlicher Stärke, je 4 mit den besten und den schlechtesten Werten; Änderung des Abstands pro Spiel)');
  passung('Mehr Dreier', (s) => s.attribute.dreier, mitTaktik({ wurf: 'dreier' }), true);
  passung('Mehr Zone (Wurf)', (s) => (s.attribute.dunk + s.attribute.postMoves) / 2, mitTaktik({ wurf: 'zone' }), true);
  passung('Zonenverteidigung', (s) => (s.attribute.innenDef + s.attribute.block) / 2, mitTaktik({ verteidigung: 'zone' }), false);
  passung('Pressing', (s) => (s.attribute.steal + s.attribute.perimeterDef) / 2, mitTaktik({ verteidigung: 'pressing' }), false);
  passung('Tempo schnell (Ausdauer)', (s) => s.attribute.ausdauer, mitTaktik({ tempo: 'schnell' }), true);
}

console.log(`\nDauer: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(zuStark === 0 ? `Keine Einstellung verändert den Abstand um mehr als ${GRENZE} Punkte (nicht übermächtig).\n` : `${zuStark} Messung(en) mit mehr als ${GRENZE} Punkten Veränderung: zu stark.\n`);
