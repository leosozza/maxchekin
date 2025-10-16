export type TransitionType = 
  | 'bloom-fade'
  | 'chromatic-split'
  | 'parallax-deep'
  | 'vortex-spin'
  | 'glass-morph'
  | 'runway-walk';

const TRANSITION_TYPES: TransitionType[] = [
  'runway-walk',      // Fashion runway effect (higher probability - listed first)
  'runway-walk',      // Double entry for higher selection chance
  'bloom-fade',
  'chromatic-split',
  'parallax-deep',
  'vortex-spin',
  'glass-morph',
];

export class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  // Mulberry32 PRNG algorithm
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  pickTransition(): TransitionType {
    const index = Math.floor(this.next() * TRANSITION_TYPES.length);
    return TRANSITION_TYPES[index];
  }

  pickColor(): string {
    const hue = Math.floor(this.next() * 60) + 40; // Gold range: 40-100
    const saturation = Math.floor(this.next() * 20) + 70; // 70-90%
    const lightness = Math.floor(this.next() * 20) + 50; // 50-70%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  pickTaglineIndex(count: number): number {
    return Math.floor(this.next() * count);
  }
}
