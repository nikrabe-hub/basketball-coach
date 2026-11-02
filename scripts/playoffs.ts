/**
 * Playoff-Skript: simuliert mehrere Saisons samt Play-In und Playoffs und prüft, ob die Ergebnisse plausibel sind.
 * Erwartung (grob NBA): bessere Setzung gewinnt eine Serie in Runde 1 zu ca. 75–85 %, insgesamt gewinnt eines der
 * drei stärksten Teams den Titel in ca. 45–70 % der Fälle, 7-Spiele-Serien sind selten (ca. 12–20 %).
 *
 * Aufruf:  npm run playoffs          (8 Saisons à 82 Spiele, ca. 30 s)
 *          npm run playoffs -- 4 29  (4 Saisons à 29 Spiele)
 */
import { generiereLiga, staerkeRanking } from '../src/engine/league';
import { sichereSaisonZiele } from '../src/engine/karriere';
import { BX } from '../src/engine/stats';
import { simuliereZiel, type SimulationsZiel } from '../src/engine/season';
import { neuesSpiel, type Serie, type SpielDaten } from '../src/engine/types';

const saisons = Number(process.argv[2] ?? 8);
const laenge = Number(process.argv[3] ?? 82);

function bis(sp: SpielDaten, ziel: SimulationsZiel): void {
  for (let i = 0; i < 1000; i++) if (simuliereZiel(sp, ziel)) return;
}

const mittel = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const rundeObenGewinnt: number[][] = [[], [], [], []];
const serienLaenge: number[] = [];
const meisterRang: number[] = [];
const playinOben: number[] = [];
let tageGesamt = 0;
let spieleGesamt = 0;
const punkte: number[] = [];
const sternMinutenHaupt: number[] = [];
const sternMinutenPlay: number[] = [];
let zeitGesamt = 0;

for (let i = 0; i < saisons; i++) {
  const seed = 500 + i * 7919;
  const sp = neuesSpiel('Playoffs', 40, seed, generiereLiga(seed, laenge), 0);
  sichereSaisonZiele(sp);
  sp.einstellungen.pbp = false;
  const t0 = Date.now();
  bis(sp, 'saisonende');
  const ranking = staerkeRanking(sp.liga);
  bis(sp, 'playoffsEnde');
  zeitGesamt += Date.now() - t0;

  const post = sp.liga.postseason!;
  tageGesamt += post.tage.length;
  for (const s of post.serien as Serie[]) {
    rundeObenGewinnt[s.runde - 1]!.push(s.sieger === s.oben ? 1 : 0);
    serienLaenge.push(s.spiele.length);
    spieleGesamt += s.spiele.length;
  }
  for (const p of post.playin) if (p.sieger !== null && p.typ !== 'finale8') playinOben.push(p.sieger === p.heim ? 1 : 0);
  meisterRang.push(ranking.find((r) => r.teamId === post.meister)!.rang);

  // Punkte und Minuten der besten Spieler jedes Teams in den Playoffs
  for (let d = 0; d < post.tage.length; d++) {
    for (const erg of sp.liga.ergebnisse[sp.liga.spielplan.length + d] ?? []) {
      punkte.push(erg.heim.punkte + erg.gast.punkte);
      for (const box of [erg.heim, erg.gast]) {
        const stern = sp.liga.teams[box.teamId]!.kader[0]!;
        const z = box.spieler.find((r) => r[BX.id] === stern);
        if (z) sternMinutenPlay.push(z[BX.min] / 60);
      }
    }
  }
  for (const t of sp.liga.teams) {
    const v = sp.liga.stand.spieler[String(t.kader[0])];
    if (v && v.spiele > 0) sternMinutenHaupt.push(v.min / 60 / v.spiele);
  }
}

const pz = (x: number) => `${(x * 100).toFixed(0)} %`;
console.log(`Playoff-Messung: ${saisons} Saisons à ${laenge} Spielen (Dauer inkl. Hauptrunde und Playoffs: ${(zeitGesamt / saisons / 1000).toFixed(1)} s pro Saison)`);
console.log(`  Besser gesetztes Team gewinnt die Serie: Runde 1 ${pz(mittel(rundeObenGewinnt[0]!))}, Runde 2 ${pz(mittel(rundeObenGewinnt[1]!))}, Conference Finals ${pz(mittel(rundeObenGewinnt[2]!))}, Finals ${pz(mittel(rundeObenGewinnt[3]!))}`);
console.log(`  Serienlänge: Ø ${mittel(serienLaenge).toFixed(2)} Spiele; 4:0 ${pz(mittel(serienLaenge.map((n) => (n === 4 ? 1 : 0))))}, 7 Spiele ${pz(mittel(serienLaenge.map((n) => (n === 7 ? 1 : 0))))}`);
console.log(`  Titel: Rang nach Teamstärke der Meister: ${meisterRang.join(', ')}; Top 3 ${pz(mittel(meisterRang.map((r) => (r <= 3 ? 1 : 0))))}, Top 8 ${pz(mittel(meisterRang.map((r) => (r <= 8 ? 1 : 0))))}`);
console.log(`  Play-In: Heimteam gewinnt ${pz(mittel(playinOben))}`);
console.log(`  Postseason: Ø ${(tageGesamt / saisons).toFixed(1)} Tage, ${(spieleGesamt / saisons).toFixed(1)} Serienspiele pro Saison; Gesamtpunkte pro Spiel Ø ${mittel(punkte).toFixed(1)}`);
console.log(`  Beste Spieler der Teams: ${mittel(sternMinutenHaupt).toFixed(1)} Min. in der Hauptrunde, ${mittel(sternMinutenPlay).toFixed(1)} Min. in den Playoffs`);
