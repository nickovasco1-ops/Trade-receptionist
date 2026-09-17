import { AbsoluteFill, Sequence } from 'remotion';
import { AUDIO, placeScenes } from './timeline';
import { colour } from './theme';
import { EndCardScene } from './components/EndCardScene';
import { ScreenScene } from './components/ScreenScene';
import { Soundtrack } from './components/Soundtrack';

/**
 * The film. Scene order, hold lengths, dissolves and push-ins all come from
 * `timeline.ts`; this component only places them.
 *
 * Scenes are laid out back to back so the default transition is a clean cut. A
 * scene that declares a dissolve mounts a few frames early and fades up over the
 * outgoing one, which is why later sequences must paint on top — JSX order does
 * that, so the scene list must stay in timeline order.
 */
export function OnboardingFilm() {
  const placed = placeScenes();
  const liveCut = placed.find((p) => p.scene.id === 'receptionist-live')?.cutAt ?? 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colour.void }}>
      {placed.map(({ scene, from, durationInFrames, dissolveInFrames }) => (
        <Sequence
          key={scene.id}
          name={scene.id}
          from={from}
          durationInFrames={durationInFrames}
          layout="none"
        >
          {scene.kind === 'screen' ? (
            <ScreenScene
              scene={scene}
              dissolveInFrames={dissolveInFrames}
              durationInFrames={durationInFrames}
            />
          ) : (
            <EndCardScene scene={scene} dissolveInFrames={dissolveInFrames} />
          )}
        </Sequence>
      ))}

      <Soundtrack audio={AUDIO} liveCutFrame={liveCut} />
    </AbsoluteFill>
  );
}
