import { useState } from 'react';
import { quote, BX } from '../engine/stats';
import type { BoxZeile, Liga, SpielErgebnis, Team, TeamBox } from '../engine/types';
import { formatDatum } from '../engine/schedule';
import { fmtMin, fmtPlus, fmtProz, plusKlasse } from './format';
import { kurzName } from './KaderTabelle';
import { SortTable, type Spalte } from './SortTable';
import { TeamLogo } from './TeamLogo';

interface Props {
  liga: Liga;
  erg: SpielErgebnis;
  saison: number;
  onSpieler: (spielerId: number) => void;
}

function summe(box: TeamBox, idx: number): number {
  return box.spieler.reduce((s, z) => s + (z[idx] as number), 0);
}

/** Boxscore, Viertelergebnisse, Zusammenfassung und (falls gespeichert) Spielverlauf eines Spiels. */
export function BoxscoreView({ liga, erg, saison, onSpieler }: Props) {
  const [ansicht, setAnsicht] = useState<'box' | 'verlauf'>('box');
  const heim = liga.teams[erg.heim.teamId] as Team;
  const gast = liga.teams[erg.gast.teamId] as Team;
  const heimGewinnt = erg.heim.punkte > erg.gast.punkte;
  const perioden = erg.heim.viertel.length;
  const kopf = Array.from({ length: perioden }, (_, i) => (i < 4 ? `${i + 1}` : i === 4 ? 'OT' : `${i - 3}OT`));

  return (
    <div className="boxscore">
      <p className="hinweis">
        {formatDatum(saison, erg.tag)}
        {erg.ot > 0 ? ` · ${erg.ot === 1 ? 'Verlängerung' : `${erg.ot} Verlängerungen`}` : ''}
      </p>

      <div className="box-ergebnis">
        <div className={heimGewinnt ? 'box-team sieger' : 'box-team'}>
          <TeamLogo kuerzel={heim.kuerzel} farbe1={heim.farbe1} farbe2={heim.farbe2} groesse={44} />
          <span>{heim.name}</span>
          <strong>{erg.heim.punkte}</strong>
        </div>
        <span className="box-trenner">:</span>
        <div className={!heimGewinnt ? 'box-team sieger' : 'box-team'}>
          <TeamLogo kuerzel={gast.kuerzel} farbe1={gast.farbe1} farbe2={gast.farbe2} groesse={44} />
          <span>{gast.name}</span>
          <strong>{erg.gast.punkte}</strong>
        </div>
      </div>

      <table className="kurztabelle">
        <thead>
          <tr>
            <th></th>
            {kopf.map((k) => (
              <th key={k}>{k}</th>
            ))}
            <th>Ges.</th>
          </tr>
        </thead>
        <tbody>
          {[
            [heim, erg.heim],
            [gast, erg.gast],
          ].map(([t, b]) => (
            <tr key={(t as Team).id}>
              <td>{(t as Team).kuerzel}</td>
              {(b as TeamBox).viertel.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
              <td className="fett">{(b as TeamBox).punkte}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="spieltext">{erg.text}</p>

      {erg.pbp && (
        <div className="auswahl" role="tablist" aria-label="Ansicht">
          <button
            role="tab"
            aria-selected={ansicht === 'box'}
            className={ansicht === 'box' ? 'wahl aktiv' : 'wahl'}
            onClick={() => setAnsicht('box')}
          >
            Boxscore
          </button>
          <button
            role="tab"
            aria-selected={ansicht === 'verlauf'}
            className={ansicht === 'verlauf' ? 'wahl aktiv' : 'wahl'}
            onClick={() => setAnsicht('verlauf')}
          >
            Spielverlauf
          </button>
        </div>
      )}

      {ansicht === 'box' || !erg.pbp ? (
        <>
          <TeamBoxTabelle liga={liga} team={heim} box={erg.heim} onSpieler={onSpieler} />
          <TeamBoxTabelle liga={liga} team={gast} box={erg.gast} onSpieler={onSpieler} />
        </>
      ) : (
        <ol className="verlauf">
          {[...erg.pbp].reverse().map((zeile, i) => (
            <li key={i}>{zeile}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TeamBoxTabelle({
  liga,
  team,
  box,
  onSpieler,
}: {
  liga: Liga;
  team: Team;
  box: TeamBox;
  onSpieler: (id: number) => void;
}) {
  const sp = (z: BoxZeile) => liga.spieler[z[BX.id]]!;
  const spalten: Spalte<BoxZeile>[] = [
    {
      key: 'name',
      label: 'Spieler',
      wert: (z) => sp(z).nachname,
      anzeige: (z) => (
        <>
          {kurzName(sp(z))}
          <span className="pos-klein"> {sp(z).position}</span>
        </>
      ),
    },
    { key: 'min', label: 'MIN', wert: (z) => z[BX.min], anzeige: (z) => fmtMin(z[BX.min]), zahl: true },
    { key: 'pts', label: 'PTS', wert: (z) => z[BX.pts], klasse: () => 'fett', zahl: true },
    { key: 'reb', label: 'REB', wert: (z) => z[BX.reb], zahl: true },
    { key: 'ast', label: 'AST', wert: (z) => z[BX.ast], zahl: true },
    { key: 'stl', label: 'STL', wert: (z) => z[BX.stl], zahl: true },
    { key: 'blk', label: 'BLK', wert: (z) => z[BX.blk], zahl: true },
    { key: 'to', label: 'TO', wert: (z) => z[BX.to], zahl: true },
    { key: 'pf', label: 'PF', wert: (z) => z[BX.pf], zahl: true },
    { key: 'fg', label: 'FG', wert: (z) => z[BX.fgm], anzeige: (z) => `${z[BX.fgm]}-${z[BX.fga]}`, zahl: true },
    { key: '3p', label: '3P', wert: (z) => z[BX.tpm], anzeige: (z) => `${z[BX.tpm]}-${z[BX.tpa]}`, zahl: true },
    { key: 'ft', label: 'FT', wert: (z) => z[BX.ftm], anzeige: (z) => `${z[BX.ftm]}-${z[BX.fta]}`, zahl: true },
    {
      key: 'pm',
      label: '+/-',
      wert: (z) => z[BX.pm],
      anzeige: (z) => fmtPlus(z[BX.pm]),
      klasse: (z) => plusKlasse(z[BX.pm]),
      zahl: true,
    },
  ];
  const fg = [summe(box, BX.fgm), summe(box, BX.fga)] as const;
  const tp = [summe(box, BX.tpm), summe(box, BX.tpa)] as const;
  const ft = [summe(box, BX.ftm), summe(box, BX.fta)] as const;
  return (
    <section>
      <h3 className="zwischentitel">
        {team.stadt} {team.name}
      </h3>
      <SortTable
        spalten={spalten}
        zeilen={box.spieler}
        zeilenKey={(z) => z[BX.id]}
        onZeile={(z) => onSpieler(z[BX.id])}
      />
      <p className="hinweis summenzeile">
        FG {fg[0]}/{fg[1]} ({fmtProz(quote(...fg))} %) · 3P {tp[0]}/{tp[1]} ({fmtProz(quote(...tp))} %) · FT {ft[0]}/
        {ft[1]} · REB {summe(box, BX.reb)} · AST {summe(box, BX.ast)} · TO {summe(box, BX.to)}
      </p>
    </section>
  );
}
