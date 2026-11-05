import { CONFIG } from './config';
import type { Rng } from './rng';
import type { BesitzerTyp, Markt, Team } from './types';

export const CONFERENCES = ['Ost', 'West'] as const;
export const DIVISIONEN = ['Nord', 'Zentral', 'Süd'] as const;

/**
 * Die 30 Städte sind echte US-Städte, die Teamnamen (Spitznamen), Kürzel und Farben sind frei erfunden
 * (bewusst keine echten NBA-Namen). Conferences und Divisionen folgen grob der Geografie.
 * Der Markt (Budget, Fans) richtet sich nach der Größe der Stadt.
 * Reihenfolge: je 5 Teams pro Division, 3 Divisionen pro Conference. Team-ID = Position in dieser Liste.
 */
type Vorlage = readonly [stadt: string, name: string, kuerzel: string, farbe1: string, farbe2: string, markt: Markt];
const VORLAGEN: readonly Vorlage[] = [
  // Ost – Nord
  ['Boston', 'Harbormen', 'BOS', '#38bdf8', '#0b1f3a', 'mittel'],
  ['New York', 'Skyliners', 'NYC', '#f97316', '#1c1917', 'gross'],
  ['Philadelphia', 'Founders', 'PHI', '#22d3ee', '#0f172a', 'gross'],
  ['Pittsburgh', 'Forgers', 'PIT', '#fbbf24', '#111827', 'klein'],
  ['Buffalo', 'Blizzards', 'BUF', '#a3e635', '#14532d', 'klein'],
  // Ost – Zentral
  ['Chicago', 'Gales', 'CHI', '#fb7185', '#1e1b4b', 'gross'],
  ['Detroit', 'Ironclads', 'DET', '#94a3b8', '#18181b', 'mittel'],
  ['Cleveland', 'Lancers', 'CLE', '#facc15', '#1e293b', 'klein'],
  ['Indianapolis', 'Racers', 'IND', '#e879f9', '#3b0764', 'klein'],
  ['Columbus', 'Pioneers', 'COL', '#4ade80', '#052e16', 'klein'],
  // Ost – Süd
  ['Miami', 'Barracudas', 'MIA', '#2dd4bf', '#042f2e', 'mittel'],
  ['Atlanta', 'Firebirds', 'ATL', '#ef4444', '#450a0a', 'mittel'],
  ['Charlotte', 'Monarchs', 'CLT', '#c084fc', '#2e1065', 'klein'],
  ['Tampa', 'Stingrays', 'TPA', '#60a5fa', '#172554', 'mittel'],
  ['Washington', 'Sentinels', 'WAS', '#818cf8', '#1e1b4b', 'gross'],
  // West – Nord
  ['Seattle', 'Evergreens', 'SEA', '#34d399', '#022c22', 'mittel'],
  ['Portland', 'Loggers', 'PDX', '#f87171', '#1f1f1f', 'klein'],
  ['Minneapolis', 'Voyagers', 'MSP', '#67e8f9', '#083344', 'mittel'],
  ['Denver', 'Peaks', 'DEN', '#a78bfa', '#3b0764', 'mittel'],
  ['Salt Lake City', 'Flyers', 'SLC', '#fde047', '#1c1917', 'klein'],
  // West – Zentral
  ['Dallas', 'Outlaws', 'DAL', '#e2e8f0', '#7f1d1d', 'gross'],
  ['Houston', 'Pilots', 'HOU', '#d8b4fe', '#18181b', 'gross'],
  ['San Antonio', 'Missions', 'SAT', '#38bdf8', '#7c2d12', 'mittel'],
  ['Oklahoma City', 'Wranglers', 'OKC', '#fcd34d', '#1e3a8a', 'klein'],
  ['Kansas City', 'Cyclones', 'KAN', '#86efac', '#14532d', 'klein'],
  // West – Süd
  ['Los Angeles', 'Waves', 'LAX', '#f472b6', '#500724', 'gross'],
  ['San Diego', 'Admirals', 'SDG', '#fca5a5', '#0c4a6e', 'mittel'],
  ['San Francisco', 'Fog', 'SFO', '#fb923c', '#3f1d0b', 'gross'],
  ['Phoenix', 'Scorpions', 'PHX', '#a8a29e', '#1c1917', 'mittel'],
  ['Las Vegas', 'High Rollers', 'LVG', '#facc15', '#3b0764', 'mittel'],
];

const HALLEN_ENDUNGEN = ['Arena', 'Center', 'Dome', 'Forum', 'Pavilion', 'Coliseum'] as const;
const BESITZER: readonly BesitzerTyp[] = ['geduldig', 'ungeduldig', 'sparsam', 'siegen'];

export function erzeugeTeams(rng: Rng): Team[] {
  if (VORLAGEN.length !== CONFIG.liga.teams) {
    throw new Error(`Es müssen genau ${CONFIG.liga.teams} Team-Vorlagen vorhanden sein.`);
  }
  const proConference = CONFIG.liga.teams / CONFIG.liga.conferences;
  const proDivision = proConference / CONFIG.liga.divisionsProConference;

  return VORLAGEN.map(([stadt, name, kuerzel, farbe1, farbe2, markt], id) => {
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
