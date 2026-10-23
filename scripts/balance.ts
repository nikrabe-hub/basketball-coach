/**
 * Balancing-Skript: simuliert mehrere komplette Hauptrunden ohne Oberfläche und
 * vergleicht die Liga-Durchschnitte mit den Zielwerten aus engine/config.ts (ziele).
 *
 * Aufruf:  npm run balance            (10 Saisons à 82 Spiele)
 *          npm run balance -- 4 29    (4 Saisons à 29 Spiele, schneller)
 */
import { CONFIG } from '../src/engine/config';
import { generiereLiga, staerkeRang } from '../src/engine/league';
import { simuliereBis } from '../src/engine/season';
import { BX, quote } from '../src/engine/stats';
import { neuesSpiel } from '../src/engine/types';

const saisons = Number(process.argv[2] ?? 10);
const laenge = Number(process.argv[3] ?? 82);

interface Summen {
  teamSpiele: number;
  poss: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  reb: number;
  oreb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  ot: number;
  spiele: number;
  heimSiege: number;
  starterMin: number[];
  rangMin: number[];
  rangN: number[];
}

const s: Summen = {
  teamSpiele: 0, poss: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, oreb: 0,
  ast: 0, stl: 0, blk: 0, to: 0, pf: 0, ot: 0, spiele: 0, heimSiege: 0,
  starterMin: [], rangMin: new Array(15).fill(0), rangN: new Array(15).fill(0),
};
const beste: number[] = [];
const schlechteste: number[] = [];
const topScorer: number[] = [];
const punktDiffSd: number[] = [];
const rangKorrelation: number[] = [];
const rekorde: { rang: number; quote: number }[] = [];
const startZeit = Date.now();
const abstaende: number[] = [];
const teamPunkte: number[] = [];
let letzteLiga: ReturnType<typeof generiereLiga> | null = null;

for (let i = 0; i < saisons; i++) {
  const seed = 1000 + i * 7919;
  const liga = generiereLiga(seed, laenge);
  const spiel = neuesSpiel('Balance', 40, seed, liga, 0);
  spiel.einstellungen.pbp = false;
  simuliereBis(spiel, liga.spielplan.length);

  for (const tag of liga.ergebnisse) {
    for (const erg of tag) {
      s.spiele++;
      abstaende.push(Math.abs(erg.heim.punkte - erg.gast.punkte));
      teamPunkte.push(erg.heim.punkte, erg.gast.punkte);
      s.ot += erg.ot;
      if (erg.heim.punkte > erg.gast.punkte) s.heimSiege++;
      for (const box of [erg.heim, erg.gast]) {
        s.teamSpiele++;
        s.pts += box.punkte;
        let fga = 0, fta = 0, oreb = 0, to = 0;
        // Rang der Spieler im Kader (nach OVR) für die Minutenverteilung
        const ids = liga.teams[box.teamId]!.kader;
        for (const z of box.spieler) {
          s.fgm += z[BX.fgm]; s.fga += z[BX.fga]; s.tpm += z[BX.tpm]; s.tpa += z[BX.tpa];
          s.ftm += z[BX.ftm]; s.fta += z[BX.fta]; s.reb += z[BX.reb]; s.oreb += z[BX.oreb];
          s.ast += z[BX.ast]; s.stl += z[BX.stl]; s.blk += z[BX.blk]; s.to += z[BX.to]; s.pf += z[BX.pf];
          fga += z[BX.fga]; fta += z[BX.fta]; oreb += z[BX.oreb]; to += z[BX.to];
          const rang = ids.indexOf(z[BX.id]);
          if (rang >= 0 && rang < 15) { s.rangMin[rang]! += z[BX.min]; }
        }
        for (let r = 0; r < ids.length && r < 15; r++) s.rangN[r]!++;
        s.poss += fga + 0.44 * fta - oreb + to;
      }
    }
  }

  const bilanzen = liga.stand.teams.map((b, id) => ({ id, q: b.siege / (b.siege + b.niederlagen), pd: (b.punkteFuer - b.punkteGegen) / (b.siege + b.niederlagen) }));
  beste.push(Math.max(...bilanzen.map((b) => b.q)) * 82);
  schlechteste.push(Math.min(...bilanzen.map((b) => b.q)) * 82);
  const mw = bilanzen.reduce((a, b) => a + b.pd, 0) / bilanzen.length;
  punktDiffSd.push(Math.sqrt(bilanzen.reduce((a, b) => a + (b.pd - mw) ** 2, 0) / bilanzen.length));
  for (const b of bilanzen) rekorde.push({ rang: staerkeRang(liga, b.id), quote: b.q });
  letzteLiga = liga;
  const ppg = Object.entries(liga.stand.spieler)
    .filter(([, v]) => v.spiele >= laenge * 0.5)
    .map(([, v]) => v.pts / v.spiele);
  topScorer.push(Math.max(...ppg));
  void rangKorrelation;
}

const pro = (x: number) => x / s.teamSpiele;
const mittel = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const z = CONFIG.ziele;
let ausserhalb = 0;

function zeile(name: string, wert: number, ziel: { min: number; max: number }, nachkomma = 1): void {
  const ok = wert >= ziel.min && wert <= ziel.max;
  if (!ok) ausserhalb++;
  const f = (x: number) => x.toFixed(nachkomma);
  console.log(`${ok ? '  ok ' : ' !!! '} ${name.padEnd(34)} ${f(wert).padStart(7)}   Ziel ${f(ziel.min)}–${f(ziel.max)}`);
}

console.log(`\nBalancing: ${saisons} Saisons à ${laenge} Spielen (${s.spiele} Spiele, ${((Date.now() - startZeit) / 1000).toFixed(1)} s)\n`);
zeile('Ballbesitze pro Team und Spiel', pro(s.poss), z.ballbesitzeProTeamUndSpiel);
zeile('Punkte pro Team und Spiel', pro(s.pts), z.punkteProTeamUndSpiel);
zeile('Wurfquote (FG%)', quote(s.fgm, s.fga), z.fgQuote, 3);
zeile('Dreierquote (3P%)', quote(s.tpm, s.tpa), z.dreierQuote, 3);
zeile('Dreieranteil an Würfen', quote(s.tpa, s.fga), z.dreierAnteilAnWuerfen, 3);
zeile('Freiwurfquote', quote(s.ftm, s.fta), z.freiwurfQuote, 3);
zeile('Freiwurfversuche pro Team', pro(s.fta), z.freiwurfVersucheProTeam);
zeile('Rebounds pro Team', pro(s.reb), z.reboundsProTeam);
zeile('Assists pro Team', pro(s.ast), z.assistsProTeam);
zeile('Turnovers pro Team', pro(s.to), z.turnoversProTeam);
zeile('Fouls pro Team', pro(s.pf), z.foulsProTeam);
zeile('Heimsiegquote', s.heimSiege / s.spiele, z.heimsiegQuote, 3);
zeile('Beste Bilanz (Siege von 82)', mittel(beste), z.besteBilanz, 1);
zeile('Schlechteste Bilanz (Siege von 82)', mittel(schlechteste), z.schlechtesteBilanz, 1);
zeile('Bester Punkteschnitt eines Spielers', mittel(topScorer), z.topScorer);
console.log(`\n  Streuung der Punktedifferenz zwischen Teams: ${mittel(punktDiffSd).toFixed(2)} (Ziel ca. 5–7; NBA ca. 5–6)`);
{
  const sd = Math.sqrt(abstaende.reduce((a, x) => a + x * x, 0) / abstaende.length);
  const anteil = (grenze: number) => (abstaende.filter((x) => x >= grenze).length / abstaende.length) * 100;
  const mp = mittel(teamPunkte);
  const psd = Math.sqrt(teamPunkte.reduce((a, x) => a + (x - mp) ** 2, 0) / teamPunkte.length);
  console.log(`  Spielausgang: Standardabweichung des Abstands ${sd.toFixed(1)} (NBA ca. 13), Siege mit 20+ Punkten ${anteil(20).toFixed(1)} % (NBA ca. 12 %), mit 30+ ${anteil(30).toFixed(1)} % (NBA ca. 3 %)`);
  console.log(`  Punkte eines Teams pro Spiel: Standardabweichung ${psd.toFixed(1)} (NBA ca. 12), Minimum ${Math.min(...teamPunkte)}, Maximum ${Math.max(...teamPunkte)}`);
}
console.log(`  Bester Punkteschnitt je Saison: ${topScorer.map((x) => x.toFixed(1)).join(', ')}`);
console.log(`  Spiele mit Verlängerung: ${((s.ot / s.spiele) * 100).toFixed(1)} % (NBA ca. 6 %; Endspiel-Taktik wie Foulen fehlt noch)`);
console.log(`  Steals ${pro(s.stl).toFixed(1)}, Blocks ${pro(s.blk).toFixed(1)} pro Team (NBA ca. 7–8 / 5)`);

console.log('\n  Durchschnittliche Minuten nach Kaderrang (nach OVR):');
console.log('  ' + s.rangMin.map((m, r) => `#${r + 1}: ${(m / 60 / (s.rangN[r] || 1)).toFixed(1)}`).join('  '));

// Siegquote nach Stärke-Rang (Gruppen zu je 5 Teams)
const gruppen = [0, 1, 2, 3, 4, 5].map((g) => {
  const teile = rekorde.filter((r) => r.rang > g * 5 && r.rang <= g * 5 + 5);
  return mittel(teile.map((t) => t.quote));
});
console.log('\n  Siegquote nach Stärke-Rang (1–5, 6–10, … 26–30):');
console.log('  ' + gruppen.map((q) => `${(q * 100).toFixed(0)} %`).join('   '));

if (letzteLiga) {
  const l = letzteLiga;
  const liste = Object.entries(l.stand.spieler)
    .map(([id, v]) => ({ sp: l.spieler[Number(id)]!, v }))
    .filter((x) => x.v.spiele >= laenge * 0.5);
  const top = (name: string, f: (v: (typeof liste)[number]['v']) => number) => {
    const t = [...liste].sort((a, b) => f(b.v) - f(a.v)).slice(0, 5);
    console.log(`  ${name}: ` + t.map((x) => `${x.sp.nachname} (OVR ${x.sp.ovr}) ${f(x.v).toFixed(1)}`).join(', '));
  };
  console.log('\n  Spitzenreiter der letzten Liga (pro Spiel):');
  top('Punkte  ', (v) => v.pts / v.spiele);
  top('Rebounds', (v) => v.reb / v.spiele);
  top('Assists ', (v) => v.ast / v.spiele);
  top('Steals  ', (v) => v.stl / v.spiele);
  top('Blocks  ', (v) => v.blk / v.spiele);
  top('Minuten ', (v) => v.min / 60 / v.spiele);
  const sehrGute = liste.filter((x) => x.sp.ovr >= 80);
  console.log(`  Spieler mit OVR >= 80: ${sehrGute.length}, Durchschnitt ${mittel(sehrGute.map((x) => x.v.pts / x.v.spiele)).toFixed(1)} Punkte`);
}

console.log(ausserhalb === 0 ? '\nAlle Zielwerte erreicht.\n' : `\n${ausserhalb} Wert(e) außerhalb des Ziels (mit !!! markiert).\n`);
