import { useState } from 'react';
import { Dialog } from './Dialog';

interface Props {
  slot: number;
  onStart: (coachName: string, coachAlter: number) => void;
  onAbbrechen: () => void;
}

export function NewGameDialog({ slot, onStart, onAbbrechen }: Props) {
  const [name, setName] = useState('');
  const [alterText, setAlterText] = useState('40');

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
      <p className="hinweis">
        Die Wahl des Startteams kommt mit dem Liga-Generator (Meilenstein 2).
      </p>
      <div className="knopfreihe">
        <button className="knopf zweit" onClick={onAbbrechen}>
          Abbrechen
        </button>
        <button
          className="knopf"
          disabled={!nameOk || !alterOk}
          onClick={() => onStart(name.trim(), alter)}
        >
          Spiel starten
        </button>
      </div>
    </Dialog>
  );
}
