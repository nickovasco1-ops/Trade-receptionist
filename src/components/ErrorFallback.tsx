interface ErrorFallbackProps {
  /** Resets the Sentry error boundary so React attempts to re-render. */
  onReset: () => void;
}

/**
 * Branded full-screen fallback shown when a render error is caught by the
 * top-level Sentry error boundary. Keeps the user on-brand instead of a
 * blank white screen, and offers two recovery paths (retry / go home).
 */
export default function ErrorFallback({ onReset }: ErrorFallbackProps) {
  return (
    <main
      role="alert"
      className="relative flex min-h-screen flex-col items-center justify-center bg-void px-6 py-16 text-center font-body"
    >
      <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-orange-soft">
        Something interrupted
      </span>
      <h1 className="mt-4 max-w-[20ch] font-display text-4xl font-bold tracking-[-0.02em] text-offwhite md:text-5xl">
        Something went{' '}
        <span className="italic bg-gradient-to-br from-orange to-orange-glow bg-clip-text text-transparent">
          wrong
        </span>
        .
      </h1>
      <p className="mt-5 max-w-[48ch] text-[16px] leading-relaxed text-offwhite/58">
        Our team has been notified automatically. Try again — and if it keeps
        happening, your calls are still being answered while we look into it.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2.5 rounded-button bg-gradient-to-r from-orange to-orange-glow px-7 py-4 text-[15px] font-semibold tracking-[-0.01em] text-white shadow-orange-glow transition-all duration-300 ease-mechanical hover:-translate-y-0.5 hover:shadow-orange-glow-lg active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-[3px]"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2.5 rounded-button bg-accent/[0.08] px-7 py-4 text-[15px] font-semibold tracking-[-0.01em] text-accent ring-1 ring-accent/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/[0.14] hover:ring-accent/35"
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
