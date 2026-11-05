/**
 * Langzeit-Skript (Meilenstein 5): simuliert viele Saisons am Stück samt Karriereende, Entwicklung, Draft und Saisonwechsel
 * und prüft, ob die Liga stabil bleibt (keine Dauer-Dynastie, keine absurden Werte, Kader 13–15, Talent bleibt gleich).
 *
 * Aufruf:  npm run seasons           (20 Saisons à 29 Spiele)
 *          npm run seasons -- 20 82   (20 Saisons à 82 Spiele, dauert länger)
 */
import { sichereDraftDaten } from '../src/engine/draft';
import { sichereSaisonZiele } from '../src/engine/karriere';
import { generiereLiga, kaderVon, teamStaerke } from '../src/engine/league';
import { offseasonStatus, freieSpieler, wechsleSaisonAutomatisch } from '../src/engine/offseason';
import { hauptrundeVorbei, simuliereZiel } from '../src/engine/season';
import { neuesSpiel, type SpielDaten } from '../src/engine/types';

const saisons = Number(process.argv[2] ?? 20);
const laenge = Number(process.argv[3] ?? 29);
const seed = Number(process.argv[4] ?? 4242);

const sp: SpielDaten = neuesSpiel('Langzeit', 40, seed, generiereLiga(seed, laenge), 0);
sichereSaisonZiele(sp);
sichereDraftDaten(sp);
sp.einstellungen.pbp = false;

const mittel = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const fehler: string[] = [];
const titel = new Map<number, number>();
const zeilen: string[] = [];
const t0 = Date.now();

function pruefe(label: string): void {
  const { liga } = sp;
  liga.spieler.forEach((s, i) => {
    if (s.id !== i) fehler.push(`${label}: Spieler ${i} hat ID ${s.id}`);
    if (s.ovr > 99 || s.ovr < 25 || s.pot > 99 || s.pot < s.ovr) fehler.push(`${label}: ${s.nachname} OVR ${s.ovr} POT ${s.pot}`);
    if (s.ruhestand !== undefined && s.teamId !== null) fehler.push(`${label}: Ruheständler ${s.nachname} hat ein Team`);
  });
  for (const t of liga.teams) {
    if (t.kader.length < 13 || t.kader.length > 15) fehler.push(`${label}: ${t.kuerzel} hat ${t.kader.length} Spieler`);
    for (const id of t.kader) {
      const s = liga.spieler[id];
      if (!s || s.teamId !== t.id) fehler.push(`${label}: ${t.kuerzel} Kader-ID ${id} passt nicht`);
    }
  }
}

for (let i = 1; i <= saisons; i++) {
  for (let n = 0; n < 2000 && !hauptrundeVorbei(sp.liga); n++) simuliereZiel(sp, 'saisonende');
  for (let n = 0; n < 2000 && sp.liga.postseason?.phase !== 'beendet'; n++) simuliereZiel(sp, 'playoffsEnde');
  const post = sp.liga.postseason;
  if (!post || post.phase !== 'beendet') throw new Error('Saison nicht beendet');
  const meister = post.meister as number;
  titel.set(meister, (titel.get(meister) ?? 0) + 1);

  const { liga } = sp;
  const rotation = liga.teams.flatMap((t) => kaderVon(liga, t.id).slice(0, 10));
  const alle = liga.teams.flatMap((t) => kaderVon(liga, t.id));
  const staerke = liga.teams.map((t) => teamStaerke(liga, t.id));
  const summen = Object.values(liga.stand.spieler);
  const sum = (f: (z: (typeof summen)[number]) => number) => summen.reduce((a, z) => a + f(z), 0);
  const teamSpiele = liga.stand.teams.reduce((a, b) => a + b.siege + b.niederlagen, 0);
  const ppg = liga.stand.teams.reduce((a, b) => a + b.punkteFuer, 0) / teamSpiele;
  zeilen.push(
    [
      `S${String(sp.saison).padStart(2)}`,
      `Top10-OVR ${mittel(rotation.map((s) => s.ovr)).toFixed(1)}`,
      `Alter ${mittel(rotation.map((s) => s.alter)).toFixed(1)}`,
      `OVR>=80: ${alle.filter((s) => s.ovr >= 80).length}`,
      `OVR>=75: ${alle.filter((s) => s.ovr >= 75).length}`,
      `Bester ${Math.max(...alle.map((s) => s.ovr))}`,
      `Stärke ${Math.min(...staerke).toFixed(0)}–${Math.max(...staerke).toFixed(0)}`,
      `Pool ${freieSpieler(liga).length}`,
      `PPG ${ppg.toFixed(1)} FG ${((sum((z) => z.fgm) / sum((z) => z.fga)) * 100).toFixed(1)} 3P ${((sum((z) => z.tpm) / sum((z) => z.tpa)) * 100).toFixed(1)}`,
      `Meister ${liga.teams[meister]?.kuerzel}`,
    ].join(' | '),
  );
  wechsleSaisonAutomatisch(sp);
  pruefe(`Saison ${sp.saison}`);
  if (offseasonStatus(sp) !== 'keine') fehler.push('Offseason läuft nach dem Wechsel noch');
}

console.log(`Langzeitmessung: ${saisons} Saisons à ${laenge} Spiele (${((Date.now() - t0) / 1000).toFixed(1)} s, ${sp.liga.spieler.length} Spieler in der Datei)\n`);
console.log(zeilen.join('\n'));

const meisterListe = [...titel.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\nTitel: ${meisterListe.map(([id, n]) => `${sp.liga.teams[id]?.kuerzel} ${n}`).join(', ')}`);
const maxTitel = meisterListe[0]?.[1] ?? 0;
if (maxTitel > Math.ceil(saisons * 0.3)) fehler.push(`Dynastie: ein Team hat ${maxTitel} von ${saisons} Titeln`);

const draftErste = sp.liga.drafts.map((d) => {
  const [, , id] = d.picks[0] as [number, number, number];
  const s = sp.liga.spieler[id];
  return s ? `${s.ovr}/${s.pot}` : '?';
});
console.log(`Pick 1 der Drafts (aktuelle OVR/POT): ${draftErste.join(' ')}`);
const jung = sp.liga.spieler.filter((s) => s.draft && s.ruhestand === undefined && s.teamId !== null);
console.log(`Gedraftete Spieler aktiv: ${jung.length}, Ø OVR ${mittel(jung.map((s) => s.ovr)).toFixed(1)}`);
const ruhe = sp.liga.spieler.filter((s) => s.ruhestand !== undefined);
console.log(`Karriereenden insgesamt: ${ruhe.length}, Ø Alter ${mittel(ruhe.map((s) => s.alter)).toFixed(1)}`);

if (fehler.length > 0) {
  console.log(`\n${fehler.length} Fehler:`);
  for (const f of fehler.slice(0, 25)) console.log('  !!! ' + f);
  process.exit(1);
}
console.log('\nAlle Prüfungen bestanden.');
