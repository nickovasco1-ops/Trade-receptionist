import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
} from "remotion";
import { Bg } from "../components/Bg";
import { LogoMark } from "../components/LogoMark";
import { BRAND, useFadeSlideIn, useScaleIn } from "../utils/animations";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NeverMissACallProps {
  headline?: string;
  subline?: string;
  cta?: string;
}

// ─── Scene: Headline reveal ───────────────────────────────────────────────────

const HeadlineScene: React.FC<Pick<NeverMissACallProps, "headline" | "subline">> = ({
  headline = "Never Miss\nA Call.",
  subline = "AI answers instantly. Jobs booked automatically.",
}) => {
  const logoStyle = useFadeSlideIn(0, 30);
  const headlineStyle = useFadeSlideIn(8, 50);
  const sublineStyle = useFadeSlideIn(18, 40);
  const accentStyle = useScaleIn(6, 0.6);

  return (
    <AbsoluteFill
      style={{
        paddingLeft: 64,
        paddingRight: 64,
        paddingTop: 120,
        paddingBottom: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 0,
      }}
    >
      {/* Logo */}
      <div style={{ ...logoStyle, marginBottom: 56 }}>
        <LogoMark size={40} />
      </div>

      {/* Accent line */}
      <div
        style={{
          ...accentStyle,
          width: 56,
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accentLight})`,
          marginBottom: 28,
        }}
      />

      {/* Headline */}
      <h1
        style={{
          ...headlineStyle,
          color: BRAND.white,
          fontSize: 72,
          fontWeight: 800,
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          whiteSpace: "pre-line",
          marginBottom: 28,
        }}
      >
        {headline}
      </h1>

      {/* Subline */}
      <p
        style={{
          ...sublineStyle,
          color: BRAND.offwhite,
          fontSize: 22,
          fontWeight: 400,
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1.55,
          opacity: (sublineStyle.opacity as number) * 0.75,
          maxWidth: 380,
        }}
      >
        {subline}
      </p>
    </AbsoluteFill>
  );
};

// ─── Scene: Feature pills ─────────────────────────────────────────────────────

const FEATURES = [
  { icon: "📞", label: "Answers every call" },
  { icon: "📅", label: "Books jobs instantly" },
  { icon: "🤖", label: "AI-powered 24/7" },
  { icon: "✅", label: "Qualifies leads" },
];

const FeaturesScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        paddingLeft: 64,
        paddingRight: 64,
        paddingTop: 120,
        paddingBottom: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <FeatureLabel delay={0} text="Built for trade businesses" />
      {FEATURES.map((f, i) => (
        <FeaturePill key={f.label} icon={f.icon} label={f.label} delay={i * 8 + 6} />
      ))}
    </AbsoluteFill>
  );
};

const FeatureLabel: React.FC<{ delay: number; text: string }> = ({ delay, text }) => {
  const style = useFadeSlideIn(delay, 20);
  return (
    <p
      style={{
        ...style,
        color: BRAND.accentLight,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {text}
    </p>
  );
};

const FeaturePill: React.FC<{ icon: string; label: string; delay: number }> = ({
  icon,
  label,
  delay,
}) => {
  const style = useFadeSlideIn(delay, 32);
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: BRAND.card,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 16,
        paddingLeft: 24,
        paddingRight: 28,
        paddingTop: 18,
        paddingBottom: 18,
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          color: BRAND.white,
          fontSize: 20,
          fontWeight: 500,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Scene: CTA ───────────────────────────────────────────────────────────────

const CTAScene: React.FC<{ cta: string }> = ({ cta }) => {
  const taglineStyle = useFadeSlideIn(0, 40);
  const ctaStyle = useScaleIn(10, 0.88);
  const urlStyle = useFadeSlideIn(20, 20);

  return (
    <AbsoluteFill
      style={{
        paddingLeft: 64,
        paddingRight: 64,
        display: "flex",
          flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        textAlign: "center",
      }}
    >
      <LogoMark size={44} style={{ ...useFadeSlideIn(0, 30) }} />

      <p
        style={{
          ...taglineStyle,
          color: BRAND.offwhite,
          fontSize: 22,
          fontWeight: 400,
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1.5,
          maxWidth: 400,
        }}
      >
        Professional AI receptionist for trade businesses
      </p>

      {/* CTA button */}
      <div
        style={{
          ...ctaStyle,
          background: `linear-gradient(135deg, ${BRAND.accent}, #1D4ED8)`,
          borderRadius: 14,
          paddingLeft: 36,
          paddingRight: 36,
          paddingTop: 20,
          paddingBottom: 20,
        }}
      >
        <span
          style={{
            color: BRAND.white,
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {cta}
        </span>
      </div>

      <p
        style={{
          ...urlStyle,
          color: BRAND.muted,
          fontSize: 15,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        tradereceptionist.com
      </p>
    </AbsoluteFill>
  );
};

// ─── Root composition ─────────────────────────────────────────────────────────

export const NeverMissACall: React.FC<NeverMissACallProps> = ({
  headline = "Never Miss\nA Call.",
  subline = "AI answers instantly. Jobs booked automatically.",
  cta = "Start Free Trial",
}) => {
  const { fps } = useVideoConfig();
  // scene durations in frames
  const scene1 = fps * 3;      // 3s headline
  const scene2 = fps * 3.5;   // 3.5s features
  const scene3 = fps * 3;      // 3s CTA

  return (
    <AbsoluteFill>
      <Bg />

      <Sequence durationInFrames={scene1}>
        <HeadlineScene headline={headline} subline={subline} />
      </Sequence>

      <Sequence from={scene1} durationInFrames={scene2}>
        <FeaturesScene />
      </Sequence>

      <Sequence from={scene1 + scene2} durationInFrames={scene3}>
        <CTAScene cta={cta} />
      </Sequence>
    </AbsoluteFill>
  );
};
