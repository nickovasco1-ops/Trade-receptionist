/**
 * The whole film, as data.
 *
 * Everything the edit does — order, hold lengths, which two cuts dissolve, which
 * three scenes get a push-in, the audio mix — is declared here. Components read
 * this and render it; they hold no timing of their own. To retime the film, edit
 * `holdSeconds` below and nothing else.
 */

import { FPS, sec } from './theme';

/** A scene that shows one product screenshot full-frame. */
export interface ScreenSceneConfig {
  readonly kind: 'screen';
  /** Stable id, also used in verification output. */
  readonly id: string;
  /** What the viewer is meant to understand from this beat. */
  readonly beat: string;
  /** Path under `public/`, resolved with `staticFile()`. */
  readonly src: string;
  /** How long the screenshot is held, in seconds, before the next cut. */
  readonly holdSeconds: number;
  /**
   * Optional push-in, as a fraction of scale over the whole hold (0.01 = 1%).
   * Capped at 2% by `MAX_PUSH_IN`; at most three scenes may set it.
   */
  readonly pushIn?: number;
  /**
   * Dissolve *into* this scene, in milliseconds. Omitted means a clean cut,
   * which is the default for every scene. At most two may set it.
   */
  readonly dissolveInMs?: number;
  /**
   * How a source that is not exactly 16:9 is placed. 'contain' preserves the
   * whole frame and pads with navy; 'cover' fills and crops. Screenshots are
   * captured at 16:9 so neither applies to them, but the prop keeps the
   * component honest if an asset is ever replaced.
   */
  readonly fit?: 'contain' | 'cover';
}

/** The supplied brand end card, used exactly as delivered. */
export interface EndCardSceneConfig {
  readonly kind: 'end-card';
  readonly id: string;
  readonly beat: string;
  readonly src: string;
  readonly holdSeconds: number;
  readonly dissolveInMs?: number;
  /**
   * 'contain' (default) shows the entire supplied card — it is a 1080x1920
   * portrait asset, so in a 1920x1080 frame it occupies a centred 608x1080
   * column, padded with the card's own field colour so the pad is invisible.
   * 'cover' would fill the frame but centre-crops roughly 68% of the card's
   * height, which cuts the wordmark and the URL. See ASSET-MANIFEST.md.
   */
  readonly fit: 'contain' | 'cover';
  /** Gain applied to the card's own audio, in dB. */
  readonly audioGainDb: number;
}

export type SceneConfig = ScreenSceneConfig | EndCardSceneConfig;

/** A scene placed on the timeline: absolute frames, resolved from the config. */
export interface PlacedScene {
  readonly scene: SceneConfig;
  /** Frame the scene mounts on (earlier than `cutAt` when it dissolves in). */
  readonly from: number;
  /** Frame the previous scene's hold ends and this one is fully opaque. */
  readonly cutAt: number;
  /** Mounted length, including any dissolve overlap. */
  readonly durationInFrames: number;
  /** Dissolve length in frames; 0 for a clean cut. */
  readonly dissolveInFrames: number;
}

export const MAX_PUSH_IN = 0.02;
export const MAX_PUSH_IN_SCENES = 3;
export const MAX_DISSOLVES = 2;

/**
 * Scene order follows the brief. The "receptionist live" confirmation is the
 * longest product hold (3.2s) because it is the moment the product starts
 * working; the two information-dense dashboard screens get 2.9s each; the five
 * wizard steps get 2.0s each, which is enough to read one form at a glance.
 */
export const SCENES: readonly SceneConfig[] = [
  {
    kind: 'screen',
    id: 'free-trial',
    beat: 'Start your free trial',
    src: 'screens/01-free-trial.png',
    holdSeconds: 3.0,
    pushIn: 0.010,
  },
  {
    kind: 'screen',
    id: 'passwordless-signin',
    beat: 'Sign in securely — magic link, no password',
    src: 'screens/02-passwordless-signin.png',
    holdSeconds: 2.0,
  },
  {
    kind: 'screen',
    id: 'receptionist-tone',
    beat: 'Choose how your receptionist should sound',
    src: 'screens/03-receptionist-tone.png',
    holdSeconds: 2.0,
  },
  {
    kind: 'screen',
    id: 'business-details',
    beat: 'Add your business',
    src: 'screens/04-business-details.png',
    holdSeconds: 2.0,
  },
  {
    kind: 'screen',
    id: 'services',
    beat: 'Add your services',
    src: 'screens/05-services.png',
    holdSeconds: 2.0,
  },
  {
    kind: 'screen',
    id: 'working-hours',
    beat: 'Add your working hours',
    src: 'screens/06-working-hours.png',
    holdSeconds: 2.0,
  },
  {
    kind: 'screen',
    id: 'setup-review',
    beat: 'Review the setup',
    src: 'screens/07-setup-review.png',
    holdSeconds: 2.0,
  },
  {
    kind: 'screen',
    id: 'receptionist-live',
    beat: 'Go live — the longest product hold in the film',
    src: 'screens/08-receptionist-live.png',
    holdSeconds: 3.2,
    pushIn: 0.015,
    dissolveInMs: 200,
  },
  {
    kind: 'screen',
    id: 'dashboard',
    beat: 'One dashboard: every call, lead, booking and urgent job',
    src: 'screens/09-dashboard.png',
    holdSeconds: 2.9,
    pushIn: 0.012,
  },
  {
    kind: 'screen',
    id: 'recent-calls',
    beat: 'Every conversation, organised',
    src: 'screens/10-recent-calls.png',
    holdSeconds: 2.9,
  },
  {
    kind: 'screen',
    id: 'settings-diversion',
    beat: 'Update your details; divert your existing number',
    src: 'screens/11-settings-diversion.png',
    holdSeconds: 2.2,
  },
  {
    kind: 'screen',
    id: 'connected-calendar',
    beat: 'Keep your calendar connected',
    src: 'screens/12-connected-calendar.png',
    holdSeconds: 2.8,
  },
  {
    kind: 'end-card',
    id: 'end-card',
    beat: 'Trade Receptionist. Never miss another job.',
    src: 'end-card/TR_Brand_SignatureEndCard_Website_9x16_2026-09-12_v02.mp4',
    // The supplied card is 4.6s long; it is played in full and never truncated.
    holdSeconds: 4.6,
    dissolveInMs: 200,
    fit: 'contain',
    // Its own audio is a soft riser plus a logo accent peaking at -10.1 dBFS.
    // -18 dB brings that to about -28 dBFS, which reads as a cue rather than the
    // cinematic hit the brief rules out.
    audioGainDb: -18,
  },
];

/** Audio mix. The repository ships no narration and no music bed — see NARRATION.md. */
export interface AudioConfig {
  /** Narration file under `public/`, once recorded. `null` renders silent. */
  readonly narrationSrc: string | null;
  /** Narration gain in dB. 0 = as recorded. */
  readonly narrationGainDb: number;
  /** Music bed under `public/`, once chosen. `null` renders without a bed. */
  readonly musicSrc: string | null;
  /**
   * Bed gain in dB *relative to narration*. The brief asks for at least 16 dB
   * below the voice; -20 dB leaves headroom.
   */
  readonly musicGainDb: number;
  /** Seconds of fade at the head and tail of the bed. */
  readonly musicFadeSeconds: number;
  /**
   * A single interface tick as the receptionist goes live. No such asset exists
   * in the repository and none was generated, so this stays null.
   */
  readonly liveTickSrc: string | null;
}

export const AUDIO: AudioConfig = {
  narrationSrc: null,
  narrationGainDb: 0,
  musicSrc: null,
  musicGainDb: -20,
  musicFadeSeconds: 1.2,
  liveTickSrc: null,
};

/** Resolve the declarative scene list into absolute frame positions. */
export function placeScenes(scenes: readonly SceneConfig[] = SCENES): readonly PlacedScene[] {
  const placed: PlacedScene[] = [];
  let cursor = 0;

  for (const scene of scenes) {
    const dissolveInFrames = scene.dissolveInMs ? Math.round((scene.dissolveInMs / 1000) * FPS) : 0;
    const hold = sec(scene.holdSeconds);
    // A dissolving scene mounts early and overlaps the outgoing one; the cut
    // point — and therefore the total running time — does not move.
    const from = Math.max(0, cursor - dissolveInFrames);
    placed.push({
      scene,
      from,
      cutAt: cursor,
      durationInFrames: hold + (cursor - from),
      dissolveInFrames: cursor - from,
    });
    cursor += hold;
  }

  return placed;
}

export const TOTAL_FRAMES = SCENES.reduce((total, scene) => total + sec(scene.holdSeconds), 0);

/**
 * Guards for the restraint rules in the brief. Called at module load so a retime
 * that breaks one fails loudly in the Studio and in the render, not silently on
 * screen.
 */
export function assertRestraint(scenes: readonly SceneConfig[] = SCENES): void {
  const pushIns = scenes.filter((s) => s.kind === 'screen' && s.pushIn);
  if (pushIns.length > MAX_PUSH_IN_SCENES) {
    throw new Error(
      `At most ${MAX_PUSH_IN_SCENES} scenes may push in; ${pushIns.length} do: ` +
        pushIns.map((s) => s.id).join(', '),
    );
  }
  for (const scene of pushIns) {
    const amount = scene.kind === 'screen' ? (scene.pushIn ?? 0) : 0;
    if (amount > MAX_PUSH_IN) {
      throw new Error(`Scene "${scene.id}" pushes in ${(amount * 100).toFixed(1)}%, over the 2% ceiling.`);
    }
  }

  const dissolves = scenes.filter((s) => s.dissolveInMs);
  if (dissolves.length > MAX_DISSOLVES) {
    throw new Error(
      `At most ${MAX_DISSOLVES} dissolves are allowed; ${dissolves.length} are set: ` +
        dissolves.map((s) => s.id).join(', '),
    );
  }
  for (const scene of dissolves) {
    const ms = scene.dissolveInMs ?? 0;
    if (ms < 150 || ms > 200) {
      throw new Error(`Scene "${scene.id}" dissolves for ${ms}ms, outside the 150-200ms window.`);
    }
  }

  const seconds = TOTAL_FRAMES / FPS;
  if (seconds > 34) {
    throw new Error(`The film runs ${seconds.toFixed(2)}s, over the 34s ceiling.`);
  }
}

assertRestraint();
