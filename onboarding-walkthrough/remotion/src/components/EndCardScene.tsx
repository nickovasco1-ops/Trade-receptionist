import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import type { EndCardSceneConfig } from '../timeline';
import { colour, easing, FPS } from '../theme';

export interface EndCardSceneProps {
  readonly scene: EndCardSceneConfig;
  readonly dissolveInFrames: number;
}

const dbToGain = (db: number): number => 10 ** (db / 20);

/**
 * The supplied brand end card, presented exactly as delivered.
 *
 * The asset is 1080x1920 (portrait) and this film is 1920x1080, so it cannot
 * fill the frame without being cropped. `fit: 'contain'` keeps every pixel of
 * the card and pads the sides with the colour sampled from the card's own
 * corners (rgb 0,0,10), so the pad is not visible as a letterbox bar. `'cover'`
 * is available in the config and fills the frame, but a centre crop to 16:9
 * keeps only a 608px band of the card's 1920px height, which cuts the wordmark
 * and the URL — see ASSET-MANIFEST.md for the measurement.
 */
export function EndCardScene({ scene, dissolveInFrames }: EndCardSceneProps) {
  const frame = useCurrentFrame();

  const opacity =
    dissolveInFrames > 0
      ? interpolate(frame, [0, dissolveInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(...easing.standard),
        })
      : 1;

  const gain = dbToGain(scene.audioGainDb);
  const totalFrames = Math.round(scene.holdSeconds * FPS);
  const fadeFrames = Math.round(0.35 * FPS);

  return (
    <AbsoluteFill style={{ backgroundColor: colour.endCardField, opacity }}>
      <OffthreadVideo
        src={staticFile(scene.src)}
        // Constant gain across the card, then a short tail fade so the film ends
        // on silence rather than a clipped decay.
        volume={(f) =>
          gain *
          interpolate(f, [totalFrames - fadeFrames, totalFrames], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
        style={{
          width: '100%',
          height: '100%',
          objectFit: scene.fit,
          objectPosition: 'center',
        }}
      />
    </AbsoluteFill>
  );
}
