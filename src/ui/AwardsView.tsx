import type { ReactNode } from 'react';
import type { AwardPreis, Awards, SpielDaten, Team } from '../engine/types';
import { teamName } from '../engine/teams';
import { TeamLogo } from './TeamLogo';

interface Props {
  spiel: SpielDaten;
  onSpieler: (id: number) => void;
}

/** Auszeichnungen der Saison, All-League-Teams und die Liga-Historie. */
export function AwardsView({ spiel, onSpieler }: Props) {
  const { liga, historie } = spiel;
  const post = liga.postseason;
  const name = (id: number) => {
    const s = liga.spieler[id];
    return s ? `${s.vorname} ${s.nachname}` : '?';
  };
  const teamKuerzel = (id: number) => liga.teams[id]?.kuerzel ?? '?';

  const preisZeile = (titel: string, p: AwardPreis | null, leer: string) => (
    <div className="award" key={titel}>
      <span className="award-titel">{titel}</span>
      {p ? (
        <>
          <button className="textknopf" onClick={() => onSpieler(p.spielerId)}>
            {name(p.spielerId)} <span className="award-team">({teamKuerzel(p.teamId)})</span>
          </button>
          <small>{p.text}</small>
        </>
      ) : (
        <small>{leer}</small>
      )}
    </div>
  );

  return (
    <>
      {post ? (
        <AwardsKarte awards={post.awards} saison={spiel.saison} fertig={post.phase === 'beendet'} liga={liga} preisZeile={preisZeile} onSpieler={onSpieler} name={name} teamKuerzel={teamKuerzel} />
      ) : (
        <p className="hinweis">Die Auszeichnungen werden vergeben, sobald die Hauptrunde gespielt ist.</p>
      )}

      <h2 className="zwischentitel">Liga-Historie</h2>
      {historie.length === 0 ? (
        <p className="hinweis">Noch keine abgeschlossene Saison.</p>
      ) : (
        <div className="karte">
          {[...historie].reverse().map((h) => {
            const m = liga.teams[h.meisterId] as Team;
            return (
              <div className="historie-zeile" key={h.saison}>
                <strong>Saison {h.saison}</strong>
                <span className="historie-meister">
                  <TeamLogo kuerzel={m.kuerzel} farbe1={m.farbe1} farbe2={m.farbe2} groesse={22} /> {teamName(m)}
                </span>
                <small>
                  Dein Team: {h.userSiege}–{h.userNiederlagen}, {h.userErgebnis}
                </small>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AwardsKarte({
  awards,
  saison,
  fertig,
  liga,
  preisZeile,
  onSpieler,
  name,
  teamKuerzel,
}: {
  awards: Awards;
  saison: number;
  fertig: boolean;
  liga: SpielDaten['liga'];
  preisZeile: (titel: string, p: AwardPreis | null, leer: string) => ReactNode;
  onSpieler: (id: number) => void;
  name: (id: number) => string;
  teamKuerzel: (id: number) => string;
}) {
  const trainerTeam = awards.trainer ? liga.teams[awards.trainer.teamId] : undefined;
  return (
    <>
      <section className="karte">
        <h2>Auszeichnungen Saison {saison}</h2>
        {preisZeile('MVP', awards.mvp, '–')}
        {preisZeile('Verteidiger des Jahres', awards.verteidiger, '–')}
        {preisZeile('Rookie des Jahres', awards.rookie, 'Kein Rookie mit genug Einsätzen')}
        {preisZeile('Sechster Mann', awards.sechsterMann, '–')}
        {preisZeile('Most Improved', awards.mostImproved, 'Gibt es ab der zweiten Saison (braucht die Entwicklung aus der Offseason)')}
        <div className="award">
          <span className="award-titel">Trainer des Jahres</span>
          {trainerTeam && awards.trainer ? (
            <>
              <strong>{teamName(trainerTeam)}</strong>
              <small>{awards.trainer.text}</small>
            </>
          ) : (
            <small>–</small>
          )}
        </div>
        {preisZeile('Finals-MVP', awards.finalsMvp, fertig ? '–' : 'Wird nach den Finals vergeben')}
      </section>

      <section className="karte">
        <h2>All-League-Teams</h2>
        {['Erstes Team', 'Zweites Team', 'Drittes Team'].map((titel, i) => (
          <div className="allleague" key={titel}>
            <span className="award-titel">{titel}</span>
            <div>
              {(awards.allLeague[i] ?? []).map((id) => (
                <button className="textknopf allleague-spieler" key={id} onClick={() => onSpieler(id)}>
                  {name(id)} <span className="award-team">({teamKuerzel(liga.spieler[id]?.teamId ?? -1)})</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
