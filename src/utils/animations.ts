import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ─── Brand design tokens ──────────────────────────────────────────────────────

export const BRAND = {
  dark: "#0A0E1A",
  surface: "#111827",
  card: "#1A2235",
  accent: "#3B82F6",
  accentLight: "#60A5FA",
  muted: "#6B7280",
  border: "#1E2D45",
  white: "#FFFFFF",
  offwhite: "#E5E7EB",
} as const;

// ─── Spring presets ───────────────────────────────────────────────────────────

export const SPRING = {
  /** Snappy entrance — good for headlines */
  snappy: { damping: 14, stiffness: 180, mass: 1 },
  /** Smooth entrance — good for cards/containers */
  smooth: { damping: 18, stiffness: 120, mass: 1 },
  /** Gentle — good for subtle reveals */
  gentle: { damping: 22, stiffness: 80, mass: 1 },
} as const;

// ─── Helper hooks ─────────────────────────────────────────────────────────────

/**
 * Returns a spring value from 0 → 1 starting at `delay` frames.
 */
export function useEntrance(
  delay: number = 0,
  preset: keyof typeof SPRING = "smooth"
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ fps, frame: frame - delay, config: SPRING[preset] });
}

/**
 * Maps a spring entrance to a translate-Y + opacity reveal.
 * Returns inline style object.
 */
export function useFadeSlideIn(
  delay: number = 0,
  distance: number = 40,
  preset: keyof typeof SPRING = "smooth"
): React.CSSProperties {
  const progress = useEntrance(delay, preset);
  return {
    opacity: Math.min(progress * 2, 1),
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
}

/**
 * Maps a spring entrance to a scale + opacity pop.
 * Returns inline style object.
 */
export function useScaleIn(
  delay: number = 0,
  from: number = 0.85,
  preset: keyof typeof SPRING = "snappy"
): React.CSSProperties {
  const progress = useEntrance(delay, preset);
  return {
    opacity: Math.min(progress * 1.5, 1),
    transform: `scale(${interpolate(progress, [0, 1], [from, 1])})`,
  };
}

/**
 * Fades out starting at `startFrame`, finishing at `endFrame`.
 */
export function useExit(startFrame: number, endFrame: number): React.CSSProperties {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity };
}

// ─── Standalone helpers (non-hook) ───────────────────────────────────────────

/** Converts frames to seconds at a given fps */
export const framesToSeconds = (frames: number, fps: number) => frames / fps;

/** Converts seconds to frames at a given fps */
export const secondsToFrames = (seconds: number, fps: number) =>
  Math.round(seconds * fps);

// React import needed for CSSProperties return types
import type React from "react";
