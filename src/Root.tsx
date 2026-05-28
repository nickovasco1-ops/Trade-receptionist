import React from "react";
import { Composition } from "remotion";
import { NeverMissACall, NeverMissACallProps } from "./compositions/NeverMissACall";
import "./styles/global.css";

// Default durations at 30fps
const FPS = 30;
const NEVER_MISS_DURATION = FPS * 9.5; // 3s + 3.5s + 3s = 9.5s

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/*
       * ── Social vertical (1080×1920) ──────────────────────────────────────
       * "Never Miss A Call" — hero social clip
       */}
      <Composition
        id="NeverMissACall"
        component={NeverMissACall}
        durationInFrames={NEVER_MISS_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          headline: "Never Miss\nA Call.",
          subline: "AI answers instantly. Jobs booked automatically.",
          cta: "Start Free Trial",
        } satisfies NeverMissACallProps}
      />

      {/*
       * ── Widescreen (1920×1080) ────────────────────────────────────────────
       * Same composition, landscape variant for website/demo embeds
       */}
      <Composition
        id="NeverMissACall_Wide"
        component={NeverMissACall}
        durationInFrames={NEVER_MISS_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          headline: "Never Miss A Call.",
          subline: "AI answers instantly. Jobs booked automatically.",
          cta: "Start Free Trial",
        } satisfies NeverMissACallProps}
      />
    </>
  );
};
