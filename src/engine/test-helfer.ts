import { hauptrundeVorbei, simuliereZiel } from './season';
import type { SpielDaten } from './types';

/** Nur für Tests und Skripte: spielt Hauptrunde, Play-In und Playoffs komplett durch (ohne an Meldungen anzuhalten). */
export function spieleSaisonBisEnde(sp: SpielDaten): void {
  for (let n = 0; n < 5000 && !hauptrundeVorbei(sp.liga); n++) simuliereZiel(sp, 'saisonende');
  for (let n = 0; n < 5000 && sp.liga.postseason?.phase !== 'beendet'; n++) simuliereZiel(sp, 'playoffsEnde');
}
