import React from "react";
import { BRAND } from "../utils/animations";

interface LogoMarkProps {
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Text-based logo placeholder — replace with <Img> pointing to /public/logo/
 * once brand assets are available.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({ size = 48, style }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        ...style,
      }}
    >
      {/* Icon pill */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: `linear-gradient(135deg, ${BRAND.accent}, #1D4ED8)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: BRAND.white,
            fontSize: size * 0.5,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          TR
        </span>
      </div>

      {/* Wordmark */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <span
          style={{
            color: BRAND.white,
            fontSize: size * 0.44,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Trade
        </span>
        <span
          style={{
            color: BRAND.accentLight,
            fontSize: size * 0.44,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          Receptionist
        </span>
      </div>
    </div>
  );
};
