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

/** Spielzeit in Sekunden -> "34:12" */
export function fmtMin(sek: number): string {
  const m = Math.floor(sek / 60);
  const s = Math.round(sek - m * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Kommazahl mit einer Nachkommastelle: 12.34 -> "12,3" */
export function fmt1(x: number): string {
  return x.toFixed(1).replace('.', ',');
}

/** Quote 0..1 als Prozentzahl mit Komma: 0.4634 -> "46,3" */
export function fmtProz(q: number): string {
  return fmt1(q * 100);
}

/** Mit Vorzeichen: 3 -> "+3", -2.5 -> "-2,5" (bei 0 ohne Vorzeichen) */
export function fmtPlus(x: number, nachkomma = 0): string {
  const t = Math.abs(x).toFixed(nachkomma).replace('.', ',');
  return x > 0 ? `+${t}` : x < 0 ? `-${t}` : t;
}

/** CSS-Klasse für Plus/Minus-Werte */
export function plusKlasse(x: number): string {
  return x > 0 ? 'w-gut' : x < 0 ? 'w-schwach' : '';
}
