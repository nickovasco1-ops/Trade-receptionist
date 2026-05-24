import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
} from 'lucide-react';

import { Button } from './UI';
import {
  CALL_FLOW_FEATURE_CARDS,
  CALL_FLOW_PROOF_PANEL,
  CALL_FLOW_TIMELINE_STEPS,
  type CallFlowAsset,
} from './featuresGrid.data';

interface FeaturesGridProps {
  onWaitlist?: () => void;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener('change', syncPreference);

    return () => mediaQuery.removeEventListener('change', syncPreference);
  }, []);

  return prefersReducedMotion;
}

function AssetTile({
  asset,
  frameSize,
  imageSize,
  panel = false,
}: {
  asset: CallFlowAsset;
  frameSize: string;
  imageSize?: string;
  panel?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] ${frameSize} ${panel ? 'w-full' : 'flex items-center justify-center'}`}
      style={{
        background: panel
          ? 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
        boxShadow: panel
          ? 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 20px 48px rgba(2,13,24,0.28)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 12px 30px rgba(2,13,24,0.2)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
        style={{
          background: panel
            ? 'radial-gradient(circle at 18% 18%, rgba(255,107,43,0.18) 0%, transparent 34%), radial-gradient(circle at 82% 12%, rgba(96,165,250,0.16) 0%, transparent 30%)'
            : 'radial-gradient(circle at 18% 18%, rgba(255,107,43,0.22) 0%, transparent 38%), radial-gradient(circle at 82% 12%, rgba(96,165,250,0.12) 0%, transparent 30%)',
        }}
      />
      <img
        src={asset.src}
        alt={asset.alt}
        loading="lazy"
        decoding="async"
        width={asset.width}
        height={asset.height}
        className={`relative z-10 ${panel ? 'h-full w-full object-cover' : `${imageSize ?? 'h-12 w-12'} object-contain`}`}
      />
    </div>
  );
}

function ProofMediaPanel() {
  const media = CALL_FLOW_PROOF_PANEL.media;
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div
      className="relative aspect-[16/9] overflow-hidden rounded-[22px]"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 20px 48px rgba(2,13,24,0.28)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-80"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 18% 18%, rgba(255,107,43,0.16) 0%, transparent 34%), radial-gradient(circle at 82% 12%, rgba(96,165,250,0.16) 0%, transparent 30%)',
        }}
      />
      <div
        className="pointer-events-none absolute left-4 top-4 z-30 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/82"
        aria-hidden="true"
        style={{
          background: 'rgba(5,20,38,0.72)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 24px rgba(2,13,24,0.28)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {CALL_FLOW_PROOF_PANEL.badge}
      </div>
      {prefersReducedMotion ? (
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={media.posterSrc}
          alt={media.alt}
          loading="lazy"
          decoding="async"
          width={media.width}
          height={media.height}
        />
      ) : (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          poster={media.posterSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={media.alt}
        >
          <source src={media.videoSrc} type="video/mp4" />
        </video>
      )}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, rgba(2,13,24,0.06) 0%, rgba(2,13,24,0.18) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, rgba(2,13,24,0) 0%, rgba(2,13,24,0.34) 100%)',
        }}
      />
    </div>
  );
}

function TimelineStep({
  index,
  title,
  description,
  asset,
}: {
  index: number;
  title: string;
  description: string;
  asset: CallFlowAsset;
}) {
  return (
    <article
      className="public-surface-soft relative rounded-[24px] px-5 py-5 md:px-5 md:py-6"
      style={{
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 18px 38px rgba(2,13,24,0.22)',
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <AssetTile asset={asset} frameSize="h-[72px] w-[72px]" imageSize="h-14 w-14" />
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-offwhite/52"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          Step {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <h3
        className="font-display text-offwhite"
        style={{ fontSize: 'clamp(1.08rem, 1.6vw, 1.25rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' }}
      >
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.65] text-offwhite/60">{description}</p>
    </article>
  );
}

export default function FeaturesGrid({ onWaitlist }: FeaturesGridProps) {
  return (
    <section id="features" className="relative overflow-hidden py-14 md:py-18">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60"
        style={{ background: 'radial-gradient(circle at 78% 12%, rgba(96,165,250,0.14) 0%, transparent 38%)' }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-soft">
                What happens when a customer calls?
              </p>
              <h2
                className="font-display font-bold text-offwhite"
                style={{ fontSize: 'clamp(2.15rem, 4.6vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.045em' }}
              >
                We answer, qualify, summarise, and help you book the job before they ring someone else.
              </h2>
            </div>

            <p className="max-w-md text-[15px] leading-[1.75] text-offwhite/52">
              Built to make missed calls feel manageable again, without adding more admin to your day.
            </p>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute left-0 right-0 top-[2.25rem] hidden h-px md:block"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,107,43,0.22) 16%, rgba(96,165,250,0.18) 50%, rgba(255,107,43,0.22) 84%, rgba(255,255,255,0.02) 100%)',
              }}
            />

            <div className="grid gap-4 md:grid-cols-5">
              {CALL_FLOW_TIMELINE_STEPS.map((step, index) => (
                <TimelineStep key={step.title} index={index} {...step} />
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-[24px] px-5 py-5 public-surface-soft md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <p className="text-[15px] font-semibold text-offwhite">That’s the whole job path, compressed into one clean handover.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-offwhite/48">You stay focused on the work. The enquiry still gets answered properly.</p>
            </div>

            {onWaitlist && (
              <Button variant="primary" onClick={onWaitlist}>
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <div
            className="mt-8 rounded-[24px] p-5 md:p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.018) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 18px 40px rgba(2,13,24,0.22)',
            }}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-center">
              <div>
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-offwhite/28">
                  What happens on every answered call
                </p>
                <ProofMediaPanel />
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-soft/80">
                    {CALL_FLOW_PROOF_PANEL.eyebrow}
                  </p>
                  <h4
                    className="mt-2 font-display font-bold text-offwhite"
                    style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)', lineHeight: 0.98, letterSpacing: '-0.035em' }}
                  >
                    {CALL_FLOW_PROOF_PANEL.title}
                  </h4>
                  <p className="mt-3 text-[14px] leading-[1.7] text-offwhite/52">
                    {CALL_FLOW_PROOF_PANEL.description}
                  </p>
                </div>

                <div className="grid gap-2">
                  {CALL_FLOW_PROOF_PANEL.supportingPoints.map((point) => (
                    <div
                      key={point}
                      className="rounded-[16px] px-4 py-3 text-[13px] font-medium text-offwhite/68"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.052) 0%, rgba(255,255,255,0.028) 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 10px 22px rgba(2,13,24,0.12)',
                      }}
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-offwhite/34">
                  Everything you need to stop missing work
                </p>
                <h3
                  className="font-display font-bold text-offwhite"
                  style={{ fontSize: 'clamp(1.8rem, 3.6vw, 2.9rem)', lineHeight: 0.98, letterSpacing: '-0.04em' }}
                >
                  Practical tools, not bloated features.
                </h3>
              </div>

              <p className="max-w-md text-[14px] leading-[1.7] text-offwhite/48">
                The essentials for answering faster, qualifying better, and getting real jobs back into your diary.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {CALL_FLOW_FEATURE_CARDS.map(({ title, description, asset }) => (
                <article
                  key={title}
                  className="public-surface rounded-[20px] px-5 py-5"
                  style={{
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 14px 30px rgba(2,13,24,0.18)',
                  }}
                >
                  <div className="mb-4">
                    <AssetTile asset={asset} frameSize="h-16 w-16" imageSize="h-12 w-12" />
                  </div>
                  <h4 className="font-display text-[1.05rem] font-bold leading-tight text-offwhite">{title}</h4>
                  <p className="mt-2 text-[14px] leading-[1.65] text-offwhite/55">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
