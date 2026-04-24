import { useEffect, useRef } from 'react';

/**
 * Attaches an IntersectionObserver to the returned ref.
 * When the element enters the viewport it receives the `is-visible` class,
 * triggering the [data-animate] CSS transition defined in index.css.
 * Children with a `data-delay="N"` attribute get staggered transition-delays
 * of N × 80 ms.
 * The observer fires once then unobserves (entrance animations don't repeat).
 */
export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-visible');

          // Stagger children that carry data-delay="N"
          const children = (entry.target as HTMLElement).querySelectorAll<HTMLElement>('[data-delay]');
          children.forEach((child) => {
            const delay = Number(child.dataset.delay ?? 0) * 80;
            child.style.transitionDelay = `${delay}ms`;
            // If a child is itself animatable, trigger its entrance too
            if (child.hasAttribute('data-animate')) {
              child.classList.add('is-visible');
            }
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
