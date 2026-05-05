import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Logo } from '../../components/Logo';

function ActivationDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-orange animate-pulse"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </span>
  );
}

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden px-4 py-6 font-body sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      style={{
        background:
          'radial-gradient(circle at 16% 18%, rgba(255,107,43,0.12) 0%, transparent 32%),' +
          'radial-gradient(circle at 84% 24%, rgba(153,203,255,0.10) 0%, transparent 34%),' +
          '#051426',
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-32"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(153,203,255,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(153,203,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className="pointer-events-none absolute left-[-10%] top-[8%] h-[320px] w-[320px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.22) 0%, transparent 72%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-8%] right-[-4%] h-[320px] w-[320px] rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 72%)' }}
      />

      <div
        className="relative mx-auto w-full max-w-[1180px]"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="mb-8 flex items-center justify-between gap-4">
          <div
            className="rounded-[16px] px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 10px 24px rgba(2,13,24,0.22)',
            }}
          >
            <Logo height={24} />
          </div>
          <div
            className="rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
            style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
          >
            Provisioning in progress
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-10">
          <section className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">
                Activation underway
              </p>
              <h1 className="mt-3 max-w-[10ch] font-display text-[clamp(2.6rem,4vw,4.8rem)] font-bold leading-[0.94] tracking-[-0.05em] text-offwhite">
                Your receptionist is being brought online.
              </h1>
              <p className="mt-5 max-w-[48ch] text-[16px] leading-relaxed text-offwhite/58 sm:text-[17px]">
                Your number, login link, and first-call workflow are being assembled now. This is the final hand-off before you start receiving enquiries through Trade Receptionist.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  'Dedicated UK number',
                  'One-click login link',
                  'Summaries ready after launch',
                ].map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-offwhite/72"
                    style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                  >
                    <ShieldCheck size={13} className="text-orange-soft" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              <div
                className="mt-6 overflow-hidden rounded-[28px] p-5 sm:p-6"
                style={{
                  background: 'linear-gradient(180deg, rgba(16,29,50,0.90) 0%, rgba(9,22,38,0.94) 100%)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 56px rgba(2,13,24,0.34)',
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent/72">
                      What happens next
                    </p>
                    <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-offwhite/56">
                      You’ll receive the access details shortly, then you can go straight into the product and finish personalising how calls are handled.
                    </p>
                  </div>
                  <div
                    className="hidden h-10 w-10 items-center justify-center rounded-full sm:flex"
                    style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                  >
                    <Sparkles size={16} className="text-orange-soft" aria-hidden="true" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {[
                    'Provision your business number',
                    'Deliver your login link',
                    'Move you into setup and live usage',
                  ].map(item => (
                    <div
                      key={item}
                      className="rounded-[16px] px-4 py-3 text-[13px] font-semibold text-offwhite/72"
                      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <div
              className="overflow-hidden rounded-[30px] p-5 sm:p-6 lg:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(17,31,53,0.92) 0%, rgba(10,23,39,0.96) 100%)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.08),' +
                  '0 28px 70px rgba(2,13,24,0.46),' +
                  'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-[16%] top-[-12%] h-40 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(255,107,43,0.14) 0%, transparent 72%)' }}
              />

              <div className="relative z-10">
                <div
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(255,107,43,0.12)',
                    boxShadow: '0 0 0 1px rgba(255,107,43,0.20), 0 0 36px rgba(255,107,43,0.18)',
                  }}
                >
                  <CheckCircle2 className="h-8 w-8 text-orange" strokeWidth={1.8} />
                </div>

                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-soft">
                    Payment confirmed
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(2.2rem,3vw,3.8rem)] font-bold leading-[0.98] tracking-[-0.04em] text-offwhite">
                    You’re in.
                  </h2>
                  <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-relaxed text-offwhite/56">
                    Your receptionist is being set up right now. We’ll send the number and login link to your inbox within about two minutes.
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      icon: Phone,
                      title: 'Dedicated UK number',
                      text: 'Being provisioned for your business now.',
                    },
                    {
                      icon: Mail,
                      title: 'Welcome email',
                      text: 'Arriving shortly with your secure login link.',
                    },
                    {
                      icon: MessageSquareText,
                      title: 'Personalisation next',
                      text: 'Log in and tailor how Sarah answers your calls.',
                    },
                  ].map(({ icon: Icon, title, text }, index) => (
                    <div
                      key={title}
                      className="grid gap-3 rounded-[20px] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                      }}
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full"
                        style={{ background: 'rgba(255,107,43,0.10)', boxShadow: '0 0 0 1px rgba(255,107,43,0.18)' }}
                      >
                        <Icon className="h-5 w-5 text-orange-soft" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-offwhite/80">{title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-offwhite/46">{text}</p>
                      </div>
                      <div
                        className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-soft"
                        style={{ background: index === 0 ? 'rgba(255,107,43,0.10)' : 'rgba(255,255,255,0.04)' }}
                      >
                        {index === 0 ? 'Now' : index === 1 ? 'Soon' : 'Next'}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  role="status"
                  aria-live="polite"
                  aria-label="Setting up your account"
                  className="mt-6 rounded-[18px] px-4 py-4"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,107,43,0.08) 0%, rgba(255,107,43,0.04) 100%)',
                    boxShadow: '0 0 0 1px rgba(255,107,43,0.14)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ActivationDots />
                      <span className="text-[14px] font-semibold tracking-[-0.01em] text-orange-soft">
                        Setting up your account…
                      </span>
                    </div>
                    <span className="text-[12px] text-offwhite/40">Usually under 2 minutes</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[13px] text-offwhite/28">
              Questions? Email us at{' '}
              <a
                href="mailto:hello@tradereceptionist.co.uk"
                className="text-offwhite/42 transition-colors duration-200 hover:text-orange-soft"
              >
                hello@tradereceptionist.co.uk
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
