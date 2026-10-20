interface Props {
  kuerzel: string;
  farbe1: string;
  farbe2: string;
  groesse?: number;
}

/** Einfaches generiertes Logo: Kreis in Teamfarbe mit dem Kürzel. */
export function TeamLogo({ kuerzel, farbe1, farbe2, groesse = 40 }: Props) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 40 40"
      role="img"
      aria-label={`Logo ${kuerzel}`}
      className="logo-svg"
    >
      <circle cx="20" cy="20" r="18.5" fill={farbe1} stroke={farbe2} strokeWidth="3" />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        fill={farbe2}
      >
        {kuerzel}
      </text>
    </svg>
  );
}
