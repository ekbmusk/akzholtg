import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Tween a numeric value from 0 → target across `durationMs`.
 * Uses requestAnimationFrame; honours prefers-reduced-motion (snaps instantly).
 */
export function useCountUp(target, durationMs = 1000) {
  const [value, setValue] = useState(0);
  const lastTarget = useRef(0);

  useEffect(() => {
    if (target == null || Number.isNaN(target)) {
      setValue(0);
      return undefined;
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      lastTarget.current = target;
      return undefined;
    }

    const start = performance.now();
    const from = lastTarget.current;
    const delta = target - from;
    let raf = 0;

    const tick = (now) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(from + delta * easeOutCubic(p));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        lastTarget.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

