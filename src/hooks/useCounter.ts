import { useState, useEffect, useRef } from 'react';

interface UseCounterOptions {
  target: number;
  duration?: number;   // ms, default 1200
  prefix?: string;
  suffix?: string;
  decimals?: number;
  shouldStart?: boolean;  // set to true when the counter should begin
}

/**
 * Animates a number from 0 → target using easeOutExpo.
 * Returns the current display string (formatted with en-GB locale).
 * When shouldStart is false the counter sits at "0" and waits.
 */
export function useCounter({
  target,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  shouldStart = true,
}: UseCounterOptions): string {
  const [display, setDisplay] = useState(`${prefix}0${suffix}`);
  const startedRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!shouldStart || startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();

    const easeOutExpo = (t: number) =>
      t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = eased * target;

      const formatted =
        decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString('en-GB');

      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [shouldStart, target, duration, prefix, suffix, decimals]);

  return display;
}
