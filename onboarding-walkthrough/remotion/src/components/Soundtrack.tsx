import { Audio, interpolate, Sequence, staticFile, useVideoConfig } from 'remotion';
import type { AudioConfig } from '../timeline';
import { FPS } from '../theme';

export interface SoundtrackProps {
  readonly audio: AudioConfig;
  /** Frame the receptionist-goes-live cut lands on, for the optional tick. */
  readonly liveCutFrame: number;
}

const dbToGain = (db: number): number => 10 ** (db / 20);

/**
 * The audio mix.
 *
 * Every layer is optional and every one is currently absent: the repository
 * ships no narration recording and no music bed, and no tick was generated for
 * the go-live cut. With all three null this renders nothing and the film carries
 * only the end card's own sound. Drop files into `public/audio/`, point
 * `AUDIO` in `timeline.ts` at them, and the mix comes up at the right levels
 * with no other change.
 */
export function Soundtrack({ audio, liveCutFrame }: SoundtrackProps) {
  const { durationInFrames } = useVideoConfig();
  const { narrationSrc, narrationGainDb, musicSrc, musicGainDb, musicFadeSeconds, liveTickSrc } = audio;

  const fadeFrames = Math.round(musicFadeSeconds * FPS);
  // The bed sits below the voice, so its gain is relative to narration.
  const bedGain = dbToGain(narrationGainDb + musicGainDb);

  return (
    <>
      {narrationSrc ? (
        <Audio src={staticFile(narrationSrc)} volume={dbToGain(narrationGainDb)} />
      ) : null}

      {musicSrc ? (
        <Audio
          src={staticFile(musicSrc)}
          volume={(f) =>
            bedGain *
            interpolate(
              f,
              [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
              [0, 1, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            )
          }
        />
      ) : null}

      {liveTickSrc ? (
        <Sequence from={liveCutFrame} durationInFrames={Math.round(0.6 * FPS)}>
          <Audio src={staticFile(liveTickSrc)} volume={dbToGain(narrationGainDb - 22)} />
        </Sequence>
      ) : null}
    </>
  );
}
