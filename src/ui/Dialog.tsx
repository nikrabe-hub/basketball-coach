import type { ReactNode } from 'react';

interface Props {
  titel: string;
  onSchliessen: () => void;
  children: ReactNode;
  /** Hoher Dialog (fast bildschirmfüllend) für Teams und Spielerkarten */
  gross?: boolean;
}

/** Einfacher Dialog von unten ("Bottom Sheet"), gut mit dem Daumen erreichbar. */
export function Dialog({ titel, onSchliessen, children, gross }: Props) {
  return (
    <div className="dialog-hintergrund" onClick={onSchliessen}>
      <div
        className={gross ? 'dialog gross' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-kopf">
          <h2>{titel}</h2>
          {gross && (
            <button className="schliessen" onClick={onSchliessen} aria-label="Schließen">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
