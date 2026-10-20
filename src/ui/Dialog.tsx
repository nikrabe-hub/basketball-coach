import type { ReactNode } from 'react';

interface Props {
  titel: string;
  onSchliessen: () => void;
  children: ReactNode;
}

/** Einfacher Dialog von unten ("Bottom Sheet"), gut mit dem Daumen erreichbar. */
export function Dialog({ titel, onSchliessen, children }: Props) {
  return (
    <div className="dialog-hintergrund" onClick={onSchliessen}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{titel}</h2>
        {children}
      </div>
    </div>
  );
}
