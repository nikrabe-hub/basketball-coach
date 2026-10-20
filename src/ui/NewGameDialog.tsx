import { useState } from 'react';
import { CONFIG } from '../engine/config';
import { Dialog } from './Dialog';

interface Props {
  slot: number;
  onWeiter: (coachName: string, coachAlter: number, saisonLaenge: number) => void;
  onAbbrechen: () => void;
}

export function NewGameDialog({ slot, onWeiter, onAbbrechen }: Props) {
  const [name, setName] = useState('');
  const [alterText, setAlterText] = useState('40');
  const [laenge, setLaenge] = useState<number>(CONFIG.saison.spieleOptionen[0]);

  const alter = Number(alterText);
  const nameOk = name.trim().length >= 2;
  const alterOk = Number.isInteger(alter) && alter >= 25 && alter <= 80;

  return (
    <Dialog titel={`Neues Spiel – Platz ${slot}`} onSchliessen={onAbbrechen}>
      <label className="feld">
        <span>Coach-Name</span>
        <input
          type="text"
          value={name}
          maxLength={30}
          autoFocus
          autoComplete="off"
          placeholder="z. B. Alex Beispiel"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="feld">
        <span>Alter (25–80)</span>
        <input
          type="number"
          inputMode="numeric"
          value={alterText}
          min={25}
          max={80}
          onChange={(e) => setAlterText(e.target.value)}
        />
      </label>
      <div className="feld">
        <span>Länge der Saison (Spiele pro Team)</span>
        <div className="auswahl" role="radiogroup" aria-label="Saisonlänge">
          {CONFIG.saison.spieleOptionen.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={laenge === n}
              className={laenge === n ? 'wahl aktiv' : 'wahl'}
              onClick={() => setLaenge(n)}
            >
              {n}
              <small>{n === 82 ? 'Standard' : n === 58 ? 'kürzer' : 'kurz'}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="knopfreihe">
        <button className="knopf zweit" onClick={onAbbrechen}>
          Abbrechen
        </button>
        <button className="knopf" disabled={!nameOk || !alterOk} onClick={() => onWeiter(name.trim(), alter, laenge)}>
          Weiter: Team wählen
        </button>
      </div>
    </Dialog>
  );
}
