import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import { useReducedMotion } from '../lib/animation';

// Six rows of marquee text — varied size, direction and tempo so the
// composition reads as a "wall of typography", not a single scrolling line.
// Sizes scale with viewport width (vw clamps) so it lands well from a
// 360px phone up to the 480px container max.
const ROWS = [
  { dir: 'left',  speed: 5,  size: 'clamp(48px, 14vw, 72px)', opacity: 0.95, accent: false },
  { dir: 'right', speed: 7,  size: 'clamp(36px, 11vw, 56px)', opacity: 0.62, accent: false },
  { dir: 'left',  speed: 4,  size: 'clamp(64px, 18vw, 96px)', opacity: 1.00, accent: true  },
  { dir: 'right', speed: 6,  size: 'clamp(44px, 13vw, 64px)', opacity: 0.80, accent: false },
  { dir: 'left',  speed: 5,  size: 'clamp(72px, 22vw, 110px)', opacity: 0.92, accent: false },
  { dir: 'right', speed: 8,  size: 'clamp(32px, 10vw, 48px)', opacity: 0.55, accent: false },
];

// Non-breaking spaces around the dot keep word-break clean across rows.
const REP =
  'ЖОБА · ЗЕРТТЕУ · ТӘЖІРИБЕ · ЖОБА · ЗЕРТТЕУ · ТӘЖІРИБЕ';

function MarqueeRow({ dir, speed, size, opacity, accent }) {
  const animation = `curtain-${dir} ${speed}s linear infinite`;
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          'flex whitespace-nowrap font-display font-bold leading-[0.95] tracking-tightest',
          accent ? 'text-primary-soft' : 'text-ink',
        )}
        style={{ fontSize: size, opacity, animation, willChange: 'transform' }}
      >
        <span className="shrink-0 px-3">{REP}</span>
        <span className="shrink-0 px-3" aria-hidden="true">
          {REP}
        </span>
      </div>
    </div>
  );
}

/**
 * Full-viewport typographic curtain shown while Home loads.
 * Mounts visible; when `visible` flips false, plays the parallax exit
 * (each row slides up at slightly staggered timing) and unmounts itself.
 */
export function SplashCurtain({ visible }) {
  const [render, setRender] = useState(visible);
  const [exiting, setExiting] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (visible) {
      setRender(true);
      setExiting(false);
      return undefined;
    }
    if (!render) return undefined;
    setExiting(true);
    const ms = reduced ? 200 : 1000;
    const t = setTimeout(() => setRender(false), ms);
    return () => clearTimeout(t);
  }, [visible, render, reduced]);

  if (!render) return null;

  // Reduced-motion variant: a centred wordmark with a quick fade in/out.
  if (reduced) {
    return (
      <div
        aria-hidden
        className={cn(
          'fixed inset-0 z-[55] flex items-center justify-center bg-bg transition-opacity duration-200',
          exiting ? 'opacity-0' : 'opacity-100',
        )}
      >
        <span className="font-display text-[64px] font-bold tracking-tightest text-ink">
          ЖОБА
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[55] flex flex-col justify-center gap-2 overflow-hidden bg-bg"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 50% 0%, rgba(108,99,255,0.16), transparent 70%), radial-gradient(40% 40% at 90% 100%, rgba(79,209,197,0.12), transparent 70%)',
      }}
    >
      {ROWS.map((row, i) => (
        <div
          key={i}
          style={{
            transform: exiting
              ? `translate3d(0, -${110 + i * 18}vh, 0)`
              : 'translate3d(0, 0, 0)',
            transition: `transform 950ms cubic-bezier(0.7, 0, 0.2, 1) ${i * 45}ms`,
            willChange: 'transform',
          }}
        >
          <MarqueeRow {...row} />
        </div>
      ))}

      {/* A quiet bottom-left wordmark so the wall reads as branded, not random. */}
      <div
        className={cn(
          'pointer-events-none absolute bottom-6 left-6 transition-opacity duration-500',
          exiting ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <p className="label-eyebrow">жобалық оқыту</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-ticker text-ink-faint">
          жүктелуде
        </p>
      </div>
    </div>
  );
}
