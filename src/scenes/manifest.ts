/**
 * The scene manifest.
 *
 * The entire experience is driven from this file — never from scattered
 * animation calls. Each scene declares what it owns: its scroll length,
 * its label, its text, and (as the project grows) its camera, assets,
 * audio state, shader state and transition.
 *
 * This is the contract that keeps the project buildable one bounded
 * scene at a time.
 */

export interface Scene {
  /** Stable id — also the name used in asset folders and discussions. */
  id: string;
  /** The time-scale label shown in the HUD ("1 SECOND", "1 YEAR", …). */
  label: string;
  /** Scroll length in viewport-heights. Time is scroll; longer = slower. */
  lengthVh: number;
  /** Center-screen text, if the scene speaks. */
  caption?: string;
  /**
   * How fast the world's internal clock runs inside this scene,
   * in simulated-seconds per scrolled-viewport-height. The placeholder
   * world uses it to spin; the real world will use it to drive sun
   * position, seasons, crowds.
   */
  timeRate: number;
}

export const scenes: Scene[] = [
  {
    id: 'scene-01-now',
    label: '1 SECOND',
    lengthVh: 150,
    timeRate: 1,
  },
  {
    id: 'scene-02-ten-minutes',
    label: '10 MINUTES',
    lengthVh: 150,
    timeRate: 600,
  },
  {
    id: 'scene-03-day',
    label: '1 DAY',
    lengthVh: 150,
    timeRate: 86_400,
  },
  {
    id: 'scene-04-year',
    label: '1 YEAR',
    lengthVh: 200,
    timeRate: 31_557_600,
  },
  {
    id: 'scene-05-lifetime',
    label: 'A LIFETIME',
    lengthVh: 200,
    timeRate: 2_524_608_000,
  },
  {
    id: 'scene-06-return',
    label: '',
    lengthVh: 100,
    caption: 'But that isn’t how you experienced it.',
    timeRate: 0,
  },
  {
    id: 'scene-07-attention',
    label: '1 SECOND',
    lengthVh: 150,
    timeRate: 0.1,
  },
  {
    id: 'scene-08-two-clocks',
    label: '10 MINUTES',
    lengthVh: 200,
    caption: 'Same ten minutes. Different time.',
    timeRate: 600,
  },
  {
    id: 'scene-09-memory-compression',
    label: '30 DAYS',
    lengthVh: 200,
    timeRate: 2_592_000,
  },
  {
    id: 'scene-10-return-to-now',
    label: '1 SECOND',
    lengthVh: 150,
    caption: 'The moment didn’t get longer.\nYou got closer.',
    timeRate: 1,
  },
];

export const totalLengthVh = scenes.reduce((sum, s) => sum + s.lengthVh, 0);

/** Locate the active scene and local progress (0–1) for a global progress. */
export function sceneAt(progress: number): { scene: Scene; local: number; index: number } {
  const target = Math.min(Math.max(progress, 0), 1) * totalLengthVh;
  let passed = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (target <= passed + s.lengthVh || i === scenes.length - 1) {
      return { scene: s, local: (target - passed) / s.lengthVh, index: i };
    }
    passed += s.lengthVh;
  }
  return { scene: scenes[0], local: 0, index: 0 };
}
