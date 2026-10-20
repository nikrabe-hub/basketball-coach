import { erwartung, gehaltSumme, staerkeRang, teamStaerke } from '../engine/league';
import { CONFIG } from '../engine/config';
import { teamName } from '../engine/teams';
import { CONFERENCES, DIVISIONEN } from '../engine/teams';
import type { Liga } from '../engine/types';
import { fmtGeld } from './format';
import { KaderTabelle } from './KaderTabelle';
import { TeamLogo } from './TeamLogo';

const BESITZER_TEXT = {
  geduldig: 'geduldig',
  ungeduldig: 'ungeduldig',
  sparsam: 'sparsam',
  siegen: 'will gewinnen um jeden Preis',
} as const;

interface Props {
  liga: Liga;
  teamId: number;
  onSpieler: (spielerId: number) => void;
}

/** Steckbrief und Kader eines beliebigen Teams (Inhalt für den Team-Dialog). */
export function TeamView({ liga, teamId, onSpieler }: Props) {
  const team = liga.teams[teamId];
  if (!team) return null;
  const rang = staerkeRang(liga, teamId);
  const gehalt = gehaltSumme(liga, teamId);

  return (
    <div>
      <div className="teamkopf">
        <TeamLogo kuerzel={team.kuerzel} farbe1={team.farbe1} farbe2={team.farbe2} groesse={56} />
        <div>
          <strong>{teamName(team)}</strong>
          <span>
            {CONFERENCES[team.conference]} · {DIVISIONEN[team.division]}
          </span>
        </div>
      </div>
      <div className="fakten">
        <span>Stärke</span>
        <span>
          {teamStaerke(liga, teamId).toFixed(1).replace('.', ',')} (Platz {rang} von {liga.teams.length})
        </span>
        <span>Markt</span>
        <span>{team.markt}</span>
        <span>Fans</span>
        <span>{team.fanBegeisterung} / 100</span>
        <span>Halle</span>
        <span>{team.halle}</span>
        <span>Besitzer</span>
        <span>{BESITZER_TEXT[team.besitzer]}</span>
        <span>Gehälter</span>
        <span>
          {fmtGeld(gehalt)} (Cap {fmtGeld(CONFIG.finanzen.salaryCap)})
        </span>
        <span>Erwartung</span>
        <span>{erwartung(rang)}</span>
      </div>
      <h3 className="zwischentitel">Kader ({team.kader.length})</h3>
      <KaderTabelle liga={liga} teamId={teamId} onSpieler={onSpieler} />
    </div>
  );
}
