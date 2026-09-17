/**
 * Tokens for the onboarding film. Colours come from the repository design system
 * (`index.css` @theme, mirrored in CLAUDE.md §3.1); easings come from §4.1.
 * Nothing here invents a new token.
 */

export const colour = {
  /** --color-void: deepest background, used behind every screenshot. */
  void: '#020D18',
  /** --color-navy: primary section background. */
  navy: '#051426',
  /**
   * Sampled from the supplied end card's own corner pixels (rgb 0,0,10) so the
   * pad around a 9:16 asset in a 16:9 frame is not visible as a bar. It is
   * deliberately *not* a design-system token: matching the asset beats matching
   * the palette here, because a lighter pad would read as letterboxing.
   */
  endCardField: '#00000A',
} as const;

/** CLAUDE.md §4.1 — the only easings permitted. No springs, no overshoot. */
export const easing = {
  /** cubic-bezier(0.25, 0.46, 0.45, 0.94) — ease-precision */
  precision: [0.25, 0.46, 0.45, 0.94] as const,
  /** cubic-bezier(0.16, 1, 0.3, 1) — ease-smooth */
  smooth: [0.16, 1, 0.3, 1] as const,
  /** cubic-bezier(0.4, 0, 0.2, 1) — ease-standard */
  standard: [0.4, 0, 0.2, 1] as const,
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Seconds -> whole frames, so every timing in the config stays deterministic. */
export const sec = (seconds: number): number => Math.round(seconds * FPS);
