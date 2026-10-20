import { CONFIG } from './config';
import type { Rng } from './rng';
import type { BesitzerTyp, Markt, Team } from './types';

export const CONFERENCES = ['Ost', 'West'] as const;
export const DIVISIONEN = ['Nord', 'Zentral', 'Süd'] as const;

/**
 * Alle 30 Teams sind frei erfunden (Städte, Namen, Farben).
 * Reihenfolge: je 5 Teams pro Division, 3 Divisionen pro Conference.
 * Team-ID = Position in dieser Liste.
 */
const VORLAGEN: readonly [stadt: string, name: string, kuerzel: string, farbe1: string, farbe2: string][] = [
  // Ost – Nord
  ['Harbor City', 'Comets', 'HAR', '#38bdf8', '#0b1f3a'],
  ['Ironvale', 'Forgers', 'IRV', '#f97316', '#1c1917'],
  ['Port Meridian', 'Pilots', 'PMP', '#22d3ee', '#0f172a'],
  ['Silverbrook', 'Sentinels', 'SIL', '#94a3b8', '#111827'],
  ['Northgate', 'Harriers', 'NOR', '#a3e635', '#14532d'],
  // Ost – Zentral
  ['Crestwood', 'Anchors', 'CRE', '#fb7185', '#1e1b4b'],
  ['Lakemont', 'Vipers', 'LAK', '#4ade80', '#052e16'],
  ['Stormhaven', 'Stallions', 'STO', '#facc15', '#1e293b'],
  ['Goldfield', 'Lancers', 'GOL', '#fbbf24', '#422006'],
  ['Pinecrest', 'Monarchs', 'PIN', '#c084fc', '#2e1065'],
  // Ost – Süd
  ['Brightwater', 'Ironclads', 'BRI', '#60a5fa', '#172554'],
  ['Westbrook', 'Voyagers', 'WBK', '#2dd4bf', '#042f2e'],
  ['Redstone', 'Blizzards', 'RED', '#ef4444', '#450a0a'],
  ['Sunharbor', 'Dingos', 'SUN', '#fdba74', '#431407'],
  ['Eastfall', 'Typhoons', 'EAF', '#818cf8', '#1e1b4b'],
  // West – Nord
  ['Cinder Peak', 'Embers', 'CIN', '#f87171', '#1f1f1f'],
  ['Glasswater', 'Glaciers', 'GLA', '#67e8f9', '#083344'],
  ['Highmoor', 'Peaks', 'HIG', '#a78bfa', '#3b0764'],
  ['Dunmere', 'Cyclones', 'DUN', '#fde047', '#1c1917'],
  ['Rivergate', 'Outlaws', 'RIV', '#34d399', '#022c22'],
  // West – Zentral
  ['Ashford', 'Scouts', 'ASH', '#e2e8f0', '#7f1d1d'],
  ['Thornfield', 'Phantoms', 'THO', '#d8b4fe', '#18181b'],
  ['Marlow Bay', 'Gladiators', 'MAR', '#38bdf8', '#7c2d12'],
  ['Kestrel Falls', 'Navigators', 'KES', '#fcd34d', '#1e3a8a'],
  ['Oakhaven', 'Prowlers', 'OAK', '#86efac', '#14532d'],
  // West – Süd
  ['Saltmarsh', 'Hammers', 'SAL', '#f472b6', '#500724'],
  ['Driftwood', 'Kites', 'DRI', '#fca5a5', '#0c4a6e'],
  ['Emberlyn', 'Wardens', 'EMB', '#fb923c', '#3f1d0b'],
  ['Quarry Hill', 'Miners', 'QUA', '#a8a29e', '#1c1917'],
  ['Velmora', 'Racers', 'VEL', '#e879f9', '#3b0764'],
];

const HALLEN_ENDUNGEN = ['Arena', 'Center', 'Dome', 'Forum', 'Pavilion', 'Coliseum'] as const;
const BESITZER: readonly BesitzerTyp[] = ['geduldig', 'ungeduldig', 'sparsam', 'siegen'];
const MAERKTE: readonly Markt[] = ['klein', 'mittel', 'gross'];

export function erzeugeTeams(rng: Rng): Team[] {
  if (VORLAGEN.length !== CONFIG.liga.teams) {
    throw new Error(`Es müssen genau ${CONFIG.liga.teams} Team-Vorlagen vorhanden sein.`);
  }
  const proConference = CONFIG.liga.teams / CONFIG.liga.conferences;
  const proDivision = proConference / CONFIG.liga.divisionsProConference;

  return VORLAGEN.map(([stadt, name, kuerzel, farbe1, farbe2], id) => {
    const markt = MAERKTE[rng.gewichtet([
      CONFIG.generator.marktGewichte.klein,
      CONFIG.generator.marktGewichte.mittel,
      CONFIG.generator.marktGewichte.gross,
    ])] as Markt;
    const budgetBereich = CONFIG.generator.budget[markt];
    const marktBonus = markt === 'gross' ? 8 : markt === 'klein' ? -8 : 0;
    return {
      id,
      stadt,
      name,
      kuerzel,
      farbe1,
      farbe2,
      conference: Math.floor(id / proConference) as 0 | 1,
      division: Math.floor((id % proConference) / proDivision) as 0 | 1 | 2,
      markt,
      fanBegeisterung: Math.max(20, Math.min(98, Math.round(rng.normal(62 + marktBonus, 14)))),
      budget: Math.round(rng.range(budgetBereich.min, budgetBereich.max) / 100_000) * 100_000,
      halle: `${stadt} ${rng.pick(HALLEN_ENDUNGEN)}`,
      besitzer: rng.pick(BESITZER),
      kader: [],
    };
  });
}

export function teamName(team: Team): string {
  return `${team.stadt} ${team.name}`;
}
