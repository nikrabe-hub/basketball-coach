import { CONFIG } from './config';
import { NamenGenerator } from './names';
import { begrenze, erzeugeSpieler } from './player';
import { Rng } from './rng';
import { erzeugeSpielplan } from './schedule';
import { leererStand } from './stats';
import { erzeugeTeams } from './teams';
import { POSITIONEN, type Liga, type Position, type Spieler, type Team } from './types';

/** Gehalt in Dollar, das ein Spieler dieser OVR "wert" ist (vor der Skalierung auf das Teambudget). */
function gehaltFuerOvr(ovr: number): number {
  const g = CONFIG.generator;
  const { mindestGehalt, maximalGehalt } = CONFIG.finanzen;
  const anteil = begrenze((ovr - g.gehaltOvrMin) / (g.gehaltOvrMax - g.gehaltOvrMin), 0, 1);
  return mindestGehalt + (maximalGehalt - mindestGehalt) * Math.pow(anteil, g.gehaltExponent);
}

/** Vergibt Verträge an alle Spieler eines Teams, sodass die Gehaltssumme grob zur Obergrenze passt. */
function vergebeVertraege(rng: Rng, spieler: Spieler[]): void {
  const g = CONFIG.generator;
  const { salaryCap, mindestGehalt, maximalGehalt } = CONFIG.finanzen;

  const roh = spieler.map((s) => gehaltFuerOvr(s.ovr) * rng.range(1 - g.gehaltStreuung, 1 + g.gehaltStreuung));
  const summe = roh.reduce((a, b) => a + b, 0);
  const ziel = salaryCap * rng.range(g.payrollAnteilCap.min, g.payrollAnteilCap.max);
  const faktor = ziel / summe;

  spieler.forEach((s, i) => {
    const gehalt = begrenze(Math.round(((roh[i] as number) * faktor) / 10_000) * 10_000, mindestGehalt, maximalGehalt);
    const rookie = s.alter <= g.rookieAlterBis;
    const jahre = rookie ? rng.int(2, 3) : s.ovr >= 65 ? rng.int(2, 5) : rng.int(1, 4);
    s.vertrag = { gehalt, jahre };
  });
}

/** Positionen eines Kaders: von jeder Position mindestens 2, der Rest zufällig. */
function waehlePositionen(rng: Rng, anzahl: number): Position[] {
  const positionen: Position[] = [];
  for (const p of POSITIONEN) positionen.push(p, p);
  while (positionen.length < anzahl) positionen.push(rng.pick(POSITIONEN));
  return rng.shuffle(positionen).slice(0, anzahl);
}

/**
 * Erzeugt eine komplette Liga: 30 Teams mit Kadern, Verträgen und Spielplan.
 * Gleicher Seed (und gleiche Saisonlänge) ergibt immer die gleiche Liga.
 */
export function generiereLiga(seed: number, saisonLaenge: number): Liga {
  const rng = new Rng(seed);
  const gen = CONFIG.generator;
  const teams = erzeugeTeams(rng);
  const namen = new NamenGenerator();
  const spieler: Spieler[] = [];

  for (const team of teams) {
    const anzahl = rng.pick(gen.spielerProTeam);
    const staerke = begrenze(rng.normal(0, gen.teamStaerkeAbweichung), -gen.teamStaerkeMax, gen.teamStaerkeMax);
    const positionen = waehlePositionen(rng, anzahl);

    const talente = gen.talentKurve.slice(0, anzahl).map((wert) => wert + staerke + rng.normal(0, gen.spielerAbweichung));
    if (rng.chance(gen.superstarChance)) talente[0] = (talente[0] as number) + gen.superstarBonus;

    const kader: Spieler[] = [];
    talente.forEach((talent, i) => {
      const s = erzeugeSpieler(rng, namen, {
        id: spieler.length + i,
        teamId: team.id,
        position: positionen[i] as Position,
        talent,
      });
      kader.push({ ...s, vertrag: { gehalt: 0, jahre: 1 } });
    });
    vergebeVertraege(rng, kader);

    kader.sort((a, b) => b.ovr - a.ovr);
    // IDs müssen dem Index in der Liste entsprechen. Beim Sortieren bleiben sie erhalten,
    // daher wird die Liste anhand der ID eingefügt.
    for (const s of kader) spieler[s.id] = s;
    team.kader = kader.map((s) => s.id);
  }

  const spielplan = erzeugeSpielplan(rng, teams, saisonLaenge);
  return { seed, saisonLaenge, teams, spieler, spielplan, tag: 0, ergebnisse: [], stand: leererStand(teams.length) };
}

// ---------- Auswertungen (nur lesen, nichts verändern) ----------

export function kaderVon(liga: Liga, teamId: number): Spieler[] {
  const team = liga.teams[teamId] as Team;
  return team.kader.map((id) => liga.spieler[id] as Spieler);
}

export function gehaltSumme(liga: Liga, teamId: number): number {
  return kaderVon(liga, teamId).reduce((s, sp) => s + sp.vertrag.gehalt, 0);
}

const STAERKE_GEWICHTE = [0.19, 0.16, 0.14, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.03] as const;

/** Teamstärke: gewichteter Durchschnitt der besten 10 Spieler (die Besten zählen am meisten). */
export function teamStaerke(liga: Liga, teamId: number): number {
  const ovrs = kaderVon(liga, teamId)
    .map((s) => s.ovr)
    .sort((a, b) => b - a);
  let summe = 0;
  let gewicht = 0;
  STAERKE_GEWICHTE.forEach((w, i) => {
    const ovr = ovrs[i];
    if (ovr !== undefined) {
      summe += ovr * w;
      gewicht += w;
    }
  });
  return Math.round((summe / gewicht) * 10) / 10;
}

/** Alle Teams nach Stärke sortiert (Rang 1 = stärkstes Team). */
export function staerkeRanking(liga: Liga): { teamId: number; staerke: number; rang: number }[] {
  return liga.teams
    .map((t) => ({ teamId: t.id, staerke: teamStaerke(liga, t.id) }))
    .sort((a, b) => b.staerke - a.staerke || a.teamId - b.teamId)
    .map((e, i) => ({ ...e, rang: i + 1 }));
}

/** Rang der Teamstärke (1 = stärkstes Team der Liga). */
export function staerkeRang(liga: Liga, teamId: number): number {
  const eigene = teamStaerke(liga, teamId);
  let rang = 1;
  for (const t of liga.teams) {
    if (t.id !== teamId && teamStaerke(liga, t.id) > eigene) rang++;
  }
  return rang;
}

/** Was die Besitzer vom Team erwarten, abhängig von der Teamstärke. */
export function erwartung(rang: number): string {
  if (rang <= 5) return 'Titelkandidat – hoher Druck';
  if (rang <= 16) return 'Playoffs erreichen';
  if (rang <= 24) return 'Play-In-Plätze anpeilen';
  return 'Junge Spieler entwickeln – wenig Druck';
}
