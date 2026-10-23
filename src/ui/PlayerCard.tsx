import { ATTRIBUT_GRUPPEN, ATTRIBUT_INFO, PERSOENLICHKEIT_INFO } from '../engine/player';
import { proSpiel, quote } from '../engine/stats';
import { teamName } from '../engine/teams';
import type { Liga, Spieler, Team } from '../engine/types';
import { fmt1, fmtGeld, fmtProz, wertKlasse, wertWort } from './format';
import { TeamLogo } from './TeamLogo';

interface Props {
  spieler: Spieler;
  liga: Liga;
}

/** Spielerkarte: Profil, Wertungen, Vertrag, alle Attribute und Persönlichkeit. */
export function PlayerCard({ spieler: s, liga }: Props) {
  const team: Team | undefined = s.teamId !== null ? liga.teams[s.teamId] : undefined;

  return (
    <div className="spielerkarte">
      <div className="sk-kopf">
        <div className="sk-wertung">
          <span className={`sk-ovr ${wertKlasse(s.ovr)}`}>{s.ovr}</span>
          <span className="sk-label">OVR</span>
        </div>
        <div className="sk-name">
          <strong>
            {s.vorname} {s.nachname}
          </strong>
          <span>
            {s.position} · {s.alter} Jahre · {s.groesseCm} cm · {s.gewichtKg} kg
          </span>
          <span>{s.nationalitaet}</span>
        </div>
        <div className="sk-wertung">
          <span className={`sk-ovr ${wertKlasse(s.pot)}`}>{s.pot}</span>
          <span className="sk-label">POT</span>
        </div>
      </div>

      {team && (
        <div className="sk-team">
          <TeamLogo kuerzel={team.kuerzel} farbe1={team.farbe1} farbe2={team.farbe2} groesse={28} />
          <span>{teamName(team)}</span>
        </div>
      )}

      <div className="sk-block">
        <h3>Vertrag</h3>
        <p>
          {fmtGeld(s.vertrag.gehalt)} pro Jahr · noch {s.vertrag.jahre} {s.vertrag.jahre === 1 ? 'Jahr' : 'Jahre'}
        </p>
      </div>

      <StatistikBlock spieler={s} liga={liga} />

      {ATTRIBUT_GRUPPEN.map((gruppe) => (
        <div className="sk-block" key={gruppe}>
          <h3>{gruppe}</h3>
          {ATTRIBUT_INFO.filter((a) => a.gruppe === gruppe).map((a) => {
            const wert = s.attribute[a.key];
            return (
              <div className="attr" key={a.key}>
                <span className="attr-name">{a.label}</span>
                <span className="attr-balken">
                  <span className={`attr-fuell ${wertKlasse(wert)}`} style={{ width: `${((wert - 25) / 74) * 100}%` }} />
                </span>
                <span className={`attr-wert ${wertKlasse(wert)}`}>{wert}</span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="sk-block">
        <h3>Persönlichkeit</h3>
        {PERSOENLICHKEIT_INFO.map((p) => (
          <div className="pers" key={p.key}>
            <span>{p.label}</span>
            <span>{wertWort(s.persoenlichkeit[p.key])}</span>
          </div>
        ))}
        <p className="hinweis">Aktionen wie Trade, Vertragsverlängerung und Entlassung kommen in späteren Meilensteinen.</p>
      </div>
    </div>
  );
}

/** Saison-Statistik pro Spiel; vor dem ersten Einsatz ein Hinweis. */
function StatistikBlock({ spieler, liga }: { spieler: Spieler; liga: Liga }) {
  const v = liga.stand.spieler[String(spieler.id)];
  if (!v || v.spiele === 0) {
    return (
      <div className="sk-block">
        <h3>Statistik (laufende Saison)</h3>
        <p className="hinweis">Noch kein Einsatz in dieser Saison.</p>
      </div>
    );
  }
  const feld = (label: string, wert: string) => (
    <div className="stat-feld" key={label}>
      <strong>{wert}</strong>
      <span>{label}</span>
    </div>
  );
  return (
    <div className="sk-block">
      <h3>Statistik (laufende Saison, pro Spiel)</h3>
      <div className="stat-raster">
        {feld('Spiele', String(v.spiele))}
        {feld('Min', fmt1(proSpiel(v, v.min / 60)))}
        {feld('Punkte', fmt1(proSpiel(v, v.pts)))}
        {feld('Rebounds', fmt1(proSpiel(v, v.reb)))}
        {feld('Assists', fmt1(proSpiel(v, v.ast)))}
        {feld('Steals', fmt1(proSpiel(v, v.stl)))}
        {feld('Blocks', fmt1(proSpiel(v, v.blk)))}
        {feld('Turnovers', fmt1(proSpiel(v, v.to)))}
        {feld('FG %', fmtProz(quote(v.fgm, v.fga)))}
        {feld('3P %', fmtProz(quote(v.tpm, v.tpa)))}
        {feld('FT %', fmtProz(quote(v.ftm, v.fta)))}
        {feld('+/-', fmt1(proSpiel(v, v.pm)))}
      </div>
    </div>
  );
}
