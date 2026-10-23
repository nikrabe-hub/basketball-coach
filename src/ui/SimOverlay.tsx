interface Props {
  titel: string;
  fertig: number;
  gesamt: number;
  onAbbrechen: () => void;
}

/** Fortschrittsanzeige, solange im Hintergrund simuliert wird. */
export function SimOverlay({ titel, fertig, gesamt, onAbbrechen }: Props) {
  const prozent = gesamt > 0 ? Math.min(100, Math.round((fertig / gesamt) * 100)) : 0;
  return (
    <div className="dialog-hintergrund sim-overlay" role="alertdialog" aria-label="Simulation läuft" aria-live="polite">
      <div className="dialog">
        <h2>{titel}</h2>
        <p>
          Tag {fertig} von {gesamt} · {prozent} %
        </p>
        <div
          className="fortschritt"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={prozent}
        >
          <div className="fortschritt-balken" style={{ width: `${prozent}%` }} />
        </div>
        <button className="knopf zweit abstand" onClick={onAbbrechen}>
          Abbrechen
        </button>
        <p className="hinweis">Beim Abbrechen bleibt der Spielstand unverändert.</p>
      </div>
    </div>
  );
}
