import { useState, useEffect } from 'react';

interface ParallaxOffset {
  x: number;
  y: number;
}

/**
 * Tracks mouse position and returns a translate offset for parallax effects.
 * Primary:   max ±20px on X, ±12px on Y  (for the phone mockup)
 * Secondary: 40% of primary offset (for floating cards, inverse direction)
 *
 * Returns { x: 0, y: 0 } on touch devices — no parallax on mobile.
 */
export function useParallax(): { primary: ParallaxOffset; secondary: ParallaxOffset } {
  const [offset, setOffset] = useState<{ primary: ParallaxOffset; secondary: ParallaxOffset }>({
    primary: { x: 0, y: 0 },
    secondary: { x: 0, y: 0 },
  });

  useEffect(() => {
    // Skip on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      const px = (e.clientX / window.innerWidth - 0.5) * 20;
      const py = (e.clientY / window.innerHeight - 0.5) * 12;

      setOffset({
        primary:   { x: px,        y: py        },
        secondary: { x: -px * 0.4, y: -py * 0.4 },
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return offset;
}
