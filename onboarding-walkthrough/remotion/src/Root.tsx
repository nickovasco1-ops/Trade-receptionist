import { Composition } from 'remotion';
import { OnboardingFilm } from './OnboardingFilm';
import { FPS, HEIGHT, WIDTH } from './theme';
import { TOTAL_FRAMES } from './timeline';

export function RemotionRoot() {
  return (
    <Composition
      id="TradeReceptionistOnboarding"
      component={OnboardingFilm}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
