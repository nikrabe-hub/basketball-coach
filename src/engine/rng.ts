/**
 * Seedbarer Zufallsgenerator (mulberry32).
 * Gleicher Seed => immer gleiche Zahlenfolge. So sind Simulationen
 * reproduzierbar und testbar. Math.random() wird in der Engine NICHT verwendet.
 */
export class Rng {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Zahl im Bereich [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganze Zahl von min bis max (beide inklusive) */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** true mit Wahrscheinlichkeit p (0..1) */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Zufälliges Element einer Liste */
  pick<T>(liste: readonly T[]): T {
    if (liste.length === 0) throw new Error('pick() auf leerer Liste');
    return liste[Math.floor(this.next() * liste.length)] as T;
  }

  /** Normalverteilte Zahl (Box-Muller) */
  normal(mittel = 0, abweichung = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    return mittel + abweichung * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Neue, gemischte Kopie einer Liste (Fisher-Yates) */
  shuffle<T>(liste: readonly T[]): T[] {
    const kopie = [...liste];
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j] as T, kopie[i] as T];
    }
    return kopie;
  }
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Zufälligen Seed für ein neues Spiel erzeugen (einzige Stelle mit Math.random). */
export function neuerSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
