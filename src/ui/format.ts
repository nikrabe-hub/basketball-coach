/** Kleine Anzeige-Helfer (Zahlen, Farben). */

/** 12345678 -> "12,3 Mio. $" */
export function fmtGeld(dollar: number): string {
  return `${(dollar / 1_000_000).toFixed(1).replace('.', ',')} Mio. $`;
}

/** Kurzform für enge Tabellen: "12,3 M" */
export function fmtGeldKurz(dollar: number): string {
  return `${(dollar / 1_000_000).toFixed(1).replace('.', ',')} M`;
}

/** CSS-Klasse für farbige Werte: grün = stark, rot = schwach. */
export function wertKlasse(wert: number): string {
  if (wert >= 80) return 'w-top';
  if (wert >= 65) return 'w-gut';
  if (wert >= 50) return 'w-mittel';
  return 'w-schwach';
}

/** Persönlichkeitswert in ein Wort übersetzen. */
export function wertWort(wert: number): string {
  if (wert >= 80) return 'sehr hoch';
  if (wert >= 65) return 'hoch';
  if (wert >= 45) return 'mittel';
  if (wert >= 30) return 'niedrig';
  return 'sehr niedrig';
}

/** Schwarz oder Weiß – je nachdem, was auf der Farbe besser lesbar ist. */
export function lesbareTextfarbe(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return '#111111';
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h as string, 16) / 255) as [number, number, number];
  const hell = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return hell > 0.55 ? '#111111' : '#ffffff';
}
