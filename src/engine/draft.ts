import { CONFIG } from './config';
import { kaderVon, sortiereKader } from './league';
import { NamenGenerator } from './names';
import { begrenze, erzeugeSpielerMitWerten } from './player';
import { Rng, mischeSeed } from './rng';
import { ansichtVon, potGewicht } from './scouting';
import { sortiereTabelle } from './stats';
import { POSITIONEN, type DraftPick, type Liga, type Lotterie, type Position, type Spieler, type SpielDaten } from './types';

const DR = CONFIG.offseason.draft;
const PICKS_GESAMT = DR.runden * DR.picksProRunde;

// ---------- Picks und Draft-Klasse ----------

function erzeugePicks(liga: Liga, saison: number): DraftPick[] {
  const picks: DraftPick[] = [];
  for (let runde = 1; runde <= DR.runden; runde++) {
    for (const t of liga.teams) {
      picks.push({ saison, runde: runde as 1 | 2, ursprung: t.id, besitzer: t.id, nr: null, spielerId: null });
    }
  }
  return picks;
}

/** Erzeugt die Kandidaten für den Draft nach der Saison `draftSaison` und hängt sie an die Spielerliste an. */
export function erzeugeDraftKlasse(spiel: SpielDaten, draftSaison: number): number[] {
  const { liga } = spiel;
  const K = DR.kandidat;
  const rng = new Rng(mischeSeed(liga.seed, draftSaison, 0xd2af7));
  const namen = new NamenGenerator();
  for (const s of liga.spieler) namen.registriere(s.vorname, s.nachname);
  const ids: number[] = [];
  for (let rang = 0; rang < DR.kandidaten; rang++) {
    const alterIdx = rng.gewichtet(rang < 10 ? K.alterGewichteTop : K.alterGewichte);
    const [mittel, streuung] = K.luecke[alterIdx] as readonly [number, number];
    const pot = Math.min(
      K.potMax,
      Math.round(K.potBasis + K.potSpanne * Math.exp(-rang / K.potTau) + rng.normal(0, K.potStreuung)),
    );
    const ovr = begrenze(Math.round(pot - Math.max(0, rng.normal(mittel, streuung))), 30, K.ovrMax);
    const s = erzeugeSpielerMitWerten(rng, namen, {
      id: liga.spieler.length,
      position: rng.pick(POSITIONEN),
      alter: 19 + alterIdx,
      ovr,
      pot,
    });
    liga.spieler.push(s);
    ids.push(s.id);
  }
  return ids;
}

/** Legt Draft-Picks (laufendes Jahr + 3 Jahre) und die Kandidaten an, falls noch nicht vorhanden. */
export function sichereDraftDaten(spiel: SpielDaten): void {
  const { liga } = spiel;
  for (let j = 0; j < 4; j++) {
    const saison = spiel.saison + j;
    if (!liga.picks.some((p) => p.saison === saison)) liga.picks.push(...erzeugePicks(liga, saison));
  }
  if (liga.draftKlasse.length === 0 && !liga.drafts.some((d) => d.saison === spiel.saison)) {
    liga.draftKlasse = erzeugeDraftKlasse(spiel, spiel.saison);
  }
}

/** Picks eines Draft-Jahres in der Reihenfolge des Drafts (erst nach der Lotterie sinnvoll). */
export function pickReihenfolge(liga: Liga, saison: number): DraftPick[] {
  return liga.picks.filter((p) => p.saison === saison && p.nr !== null).sort((a, b) => (a.nr as number) - (b.nr as number));
}

// ---------- Lotterie ----------

/** Zieht die Lotterie, legt die Pick-Nummern 1–60 fest und gibt das Ergebnis zurück. */
export function fuehreLotterieAus(spiel: SpielDaten): Lotterie {
  const { liga } = spiel;
  const post = liga.postseason;
  if (!post) throw new Error('Die Lotterie gibt es erst nach den Playoffs.');
  const rng = new Rng(mischeSeed(liga.seed, spiel.saison, 0x107e));

  const playoffTeams = new Set(post.seeds.flat().filter((id) => id >= 0));
  const schlechtZuerst = sortiereTabelle(liga, liga.teams.map((t) => t.id)).reverse();
  const lotterieTeams = schlechtZuerst.filter((id) => !playoffTeams.has(id));
  const uebrige = schlechtZuerst.filter((id) => playoffTeams.has(id));
  const chancen = lotterieTeams.map((_, i) => (DR.lotterieChancen[i] ?? 0));

  // Die ersten Picks werden nacheinander gezogen (ohne Zurücklegen).
  const gelost: number[] = [];
  const topf = lotterieTeams.map((id, i) => ({ id, gewicht: chancen[i] as number }));
  for (let z = 0; z < Math.min(DR.lotterieZiehungen, topf.length); z++) {
    const idx = rng.gewichtet(topf.map((t) => t.gewicht));
    gelost.push((topf[idx] as { id: number }).id);
    topf.splice(idx, 1);
  }
  const runde1 = [...gelost, ...lotterieTeams.filter((id) => !gelost.includes(id)), ...uebrige];
  const runde2 = schlechtZuerst;

  const setze = (reihenfolge: number[], runde: 1 | 2, offset: number) => {
    reihenfolge.forEach((teamId, i) => {
      const pick = liga.picks.find((p) => p.saison === spiel.saison && p.runde === runde && p.ursprung === teamId);
      if (!pick) throw new Error(`Pick fehlt: Saison ${spiel.saison}, Runde ${runde}, Team ${teamId}`);
      pick.nr = offset + i + 1;
    });
  };
  setze(runde1, 1, 0);
  setze(runde2, 2, DR.picksProRunde);
  return { teams: lotterieTeams, chancen, gelost };
}

// ---------- Draften ----------

/** Rookie-Vertrag nach Pick-Nummer. */
export function rookieVertrag(nr: number): { gehalt: number; jahre: number } {
  const R = DR.rookie;
  if (nr > DR.picksProRunde) return { gehalt: CONFIG.finanzen.mindestGehalt, jahre: R.jahreRunde2 };
  const anteil = (nr - 1) / (DR.picksProRunde - 1);
  const gehalt = R.pick1 * Math.pow(R.pick30 / R.pick1, anteil);
  return { gehalt: Math.round(gehalt / 10_000) * 10_000, jahre: R.jahreRunde1 };
}

/** Kandidaten, die noch zu haben sind. */
export function verfuegbareKandidaten(liga: Liga): Spieler[] {
  return liga.draftKlasse.map((id) => liga.spieler[id] as Spieler).filter((s) => s.teamId === null);
}

/** Der Pick, der als Nächstes dran ist (null, wenn der Draft vorbei ist). */
export function aktuellerPick(liga: Liga, saison: number): DraftPick | null {
  const o = liga.offseason;
  if (!o) return null;
  return pickReihenfolge(liga, saison)[o.draftZeiger] ?? null;
}

function unterschreibePick(liga: Liga, pick: DraftPick, s: Spieler): void {
  const nr = pick.nr as number;
  s.teamId = pick.besitzer;
  s.vertrag = rookieVertrag(nr);
  s.draft = { saison: pick.saison, runde: pick.runde, pick: nr };
  s.neuling = true;
  s.moral = CONFIG.moral.start;
  pick.spielerId = s.id;
  const team = liga.teams[pick.besitzer];
  if (team) {
    team.kader.push(s.id);
    sortiereKader(liga, pick.besitzer);
  }
}

/** Wählt für das Team am Zug einen Kandidaten und rückt zum nächsten Pick vor. */
function waehle(spiel: SpielDaten, spielerId: number): void {
  const { liga } = spiel;
  const pick = aktuellerPick(liga, spiel.saison);
  const s = liga.spieler[spielerId];
  if (!pick || !s || s.teamId !== null || !liga.draftKlasse.includes(spielerId)) {
    throw new Error('Dieser Kandidat ist nicht mehr zu haben.');
  }
  unterschreibePick(liga, pick, s);
  (liga.offseason as NonNullable<Liga['offseason']>).draftZeiger++;
}

/** Wahl eines KI-Teams: Talent (OVR und POT je nach Alter) plus Bedarf an der Position plus etwas Zufall. */
function kiWahl(spiel: SpielDaten, rng: Rng, teamId: number): number {
  const { liga } = spiel;
  const kader = kaderVon(liga, teamId);
  const proPosition = new Map<Position, number>();
  for (const s of kader.slice(0, 10)) proPosition.set(s.position, (proPosition.get(s.position) ?? 0) + 1);
  let beste: Spieler | null = null;
  let besterWert = -Infinity;
  for (const k of verfuegbareKandidaten(liga)) {
    const w = potGewicht(k.alter);
    let wert = k.ovr * (1 - w) + k.pot * w + rng.normal(0, DR.ki.rauschen);
    if ((proPosition.get(k.position) ?? 0) < 2) wert += DR.ki.bedarfBonus;
    if (wert > besterWert) {
      besterWert = wert;
      beste = k;
    }
  }
  if (!beste) throw new Error('Keine Kandidaten mehr.');
  return beste.id;
}

/** Der eigene Pick des Spielers: ein Kandidat seiner Wahl. */
export function waehleKandidat(spiel: SpielDaten, spielerId: number): void {
  const pick = aktuellerPick(spiel.liga, spiel.saison);
  if (!pick || pick.besitzer !== spiel.userTeamId) throw new Error('Du bist gerade nicht am Zug.');
  waehle(spiel, spielerId);
}

/** Bester verfügbarer Kandidat nach der eigenen Einschätzung (mit Scouting). */
export function autoPickUser(spiel: SpielDaten): void {
  const beste = verfuegbareKandidaten(spiel.liga)
    .map((k) => ({ id: k.id, wert: ansichtVon(spiel, k).wert }))
    .sort((a, b) => b.wert - a.wert || a.id - b.id)[0];
  if (!beste) throw new Error('Keine Kandidaten mehr.');
  waehleKandidat(spiel, beste.id);
}

/** Lässt die KI-Teams wählen, bis der Spieler am Zug ist (oder der Draft vorbei ist). */
export function simuliereDraftBisUser(spiel: SpielDaten): 'user' | 'ende' {
  const { liga } = spiel;
  const rng = new Rng(mischeSeed(liga.seed, spiel.saison, 0xd2a57, liga.offseason?.draftZeiger ?? 0));
  for (;;) {
    const pick = aktuellerPick(liga, spiel.saison);
    if (!pick) return 'ende';
    if (pick.besitzer === spiel.userTeamId) return 'user';
    waehle(spiel, kiWahl(spiel, rng, pick.besitzer));
  }
}

/** Der komplette Rest des Drafts, auch die eigenen Picks (automatisch). */
export function simuliereDraftKomplett(spiel: SpielDaten): void {
  while (simuliereDraftBisUser(spiel) === 'user') autoPickUser(spiel);
}

/** Schließt den Draft ab: Ergebnis in die Historie, Picks des Jahres weg, neues Pick-Jahr dazu. Nicht gedraftete Kandidaten werden Free Agents. */
export function schliesseDraftAb(spiel: SpielDaten): void {
  const { liga } = spiel;
  const gezogen = pickReihenfolge(liga, spiel.saison);
  if (gezogen.length !== PICKS_GESAMT || gezogen.some((p) => p.spielerId === null)) throw new Error('Der Draft ist noch nicht beendet.');
  liga.drafts.push({
    saison: spiel.saison,
    picks: gezogen.map((p) => [p.nr as number, p.besitzer, p.spielerId as number]),
  });
  liga.picks = liga.picks.filter((p) => p.saison !== spiel.saison);
  const neuesJahr = spiel.saison + 4;
  if (!liga.picks.some((p) => p.saison === neuesJahr)) liga.picks.push(...erzeugePicks(liga, neuesJahr));
  liga.draftKlasse = [];
}
