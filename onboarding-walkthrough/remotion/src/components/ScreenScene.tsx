import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { ScreenSceneConfig } from '../timeline';
import { colour, easing } from '../theme';

export interface ScreenSceneProps {
  readonly scene: ScreenSceneConfig;
  /** Dissolve length in frames; 0 means this scene arrives on a clean cut. */
  readonly dissolveInFrames: number;
  /** Mounted length of the scene, used to pace the push-in across the hold. */
  readonly durationInFrames: number;
}

/**
 * One product screenshot, full frame.
 *
 * The screenshot is never stretched: it is placed with `object-fit`, so the
 * source aspect ratio is preserved whatever the asset. Captures are 3840x2160
 * (16:9 supersampled), so at 1920x1080 they land pixel-exact with no padding.
 */
export function ScreenScene({ scene, dissolveInFrames, durationInFrames }: ScreenSceneProps) {
  const frame = useCurrentFrame();

  // Clean cut by default: opacity is a constant 1 unless a dissolve is declared.
  const opacity =
    dissolveInFrames > 0
      ? interpolate(frame, [0, dissolveInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...easing.standard),
        })
      : 1;

  // A 1-2% push-in over the whole hold. Linear-in-easing would read as a start
  // and a stop; ease-precision keeps it imperceptibly continuous.
  const scale =
    scene.pushIn && scene.pushIn > 0
      ? interpolate(frame, [0, durationInFrames], [1, 1 + scene.pushIn], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...easing.precision),
        })
      : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: colour.void, opacity }}>
      <Img
        src={staticFile(scene.src)}
        // `Img` from Remotion blocks the render until the file has decoded, so a
        // frame can never be captured with a half-loaded screenshot.
        style={{
          width: '100%',
          height: '100%',
          objectFit: scene.fit ?? 'contain',
          objectPosition: 'center',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          // Chromium's default smoothing softens a 2:1 downscale; high quality
          // keeps 13px UI labels legible.
          imageRendering: 'auto',
        }}
      />
    </AbsoluteFill>
  );
}
