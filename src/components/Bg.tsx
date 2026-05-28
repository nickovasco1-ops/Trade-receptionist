import React from "react";
import { AbsoluteFill } from "remotion";
import { BRAND } from "../utils/animations";

/**
 * Premium dark gradient background — use as base layer in every scene.
 */
export const Bg: React.FC<{ variant?: "dark" | "surface" }> = ({
  variant = "dark",
}) => {
  const base = variant === "dark" ? BRAND.dark : BRAND.surface;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 20%, #0F1E3A 0%, ${base} 70%)`,
      }}
    />
  );
};
