'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

const STYLE_ID = 'hero3-animations';

const getRootTheme = () => {
  if (typeof document === 'undefined') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.getAttribute('data-theme') === 'dark' || root.dataset?.theme === 'dark') return 'dark';
  if (root.classList.contains('light')) return 'light';

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
};

const useThemeSync = () => {
  const [theme, setTheme] = useState(() => getRootTheme());

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const sync = () => {
      const next = getRootTheme();
      setTheme((prev) => (prev === next ? prev : next));
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const media =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const onMedia = () => sync();
    media?.addEventListener('change', onMedia);

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'hero-theme' || event.key === 'bento-theme') sync();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }

    return () => {
      observer.disconnect();
      media?.removeEventListener('change', onMedia);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    };
  }, []);

  return [theme, setTheme] as const;
};

const DeckGlyph = () => {
  const stroke = 'currentColor';
  const fill = 'rgba(255,255,255,0.08)';

  return (
    <svg viewBox='0 0 120 120' className='h-16 w-16' aria-hidden>
      <circle
        cx='60'
        cy='60'
        r='46'
        fill='none'
        stroke={stroke}
        strokeWidth='1.4'
        className='motion-safe:animate-[hero3-orbit_8.5s_linear_infinite] motion-reduce:animate-none'
        style={{ strokeDasharray: '18 14' }}
      />
      <rect
        x='34'
        y='34'
        width='52'
        height='52'
        rx='14'
        fill={fill}
        stroke={stroke}
        strokeWidth='1.2'
        className='motion-safe:animate-[hero3-grid_5.4s_ease-in-out_infinite] motion-reduce:animate-none'
      />
      <circle cx='60' cy='60' r='7' fill={stroke} />
      <path
        d='M60 30v10M60 80v10M30 60h10M80 60h10'
        stroke={stroke}
        strokeWidth='1.4'
        strokeLinecap='round'
        className='motion-safe:animate-[hero3-pulse_6s_ease-in-out_infinite] motion-reduce:animate-none'
      />
    </svg>
  );
};

function HeroOrbitDeck() {
  useThemeSync();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'strategy' | 'execution'>('strategy');
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = `
      @keyframes hero3-intro {
        0% { opacity: 0; transform: translate3d(0, 64px, 0) scale(0.98); filter: blur(12px); }
        60% { filter: blur(0); }
        100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
      }
      @keyframes hero3-card {
        0% { opacity: 0; transform: translate3d(0, 32px, 0) scale(0.95); }
        100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }
      @keyframes hero3-orbit {
        0% { stroke-dashoffset: 0; transform: rotate(0deg); }
        100% { stroke-dashoffset: -64; transform: rotate(360deg); }
      }
      @keyframes hero3-grid {
        0%, 100% { transform: rotate(-2deg); opacity: 0.7; }
        50% { transform: rotate(2deg); opacity: 1; }
      }
      @keyframes hero3-pulse {
        0%, 100% { stroke-dasharray: 0 200; opacity: 0.2; }
        45%, 60% { stroke-dasharray: 200 0; opacity: 1; }
      }
      @keyframes hero3-glow {
        0%, 100% { opacity: 0.45; transform: translate3d(0,0,0); }
        50% { opacity: 0.9; transform: translate3d(0,-8px,0); }
      }
      @keyframes hero3-drift {
        0%, 100% { transform: translate3d(0,0,0) rotate(-3deg); }
        50% { transform: translate3d(0,-12px,0) rotate(3deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof window === 'undefined') {
      setVisible(true);
      return;
    }

    const node = sectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);


  const palette = useMemo(
    () => ({
      subtle: 'text-[hsl(var(--gray-300)/0.8)]',
      border: 'border-2 border-[hsl(var(--gray-300)/0.3)]',
      card: 'bg-[hsl(var(--background))]',
      accent: 'bg-[hsl(var(--gray-300)/0.1)]',
      glow: 'rgba(255,255,255,0.14)',
    }),
    []
  );

  const metrics = [
    { label: 'Avg. DCA cycle', value: '24h' },
    { label: 'Strategies live', value: '∞' },
    { label: 'AI accuracy', value: '94%' },
  ];

  const modes = useMemo(
    () => ({
      strategy: {
        title: 'AI Strategy Engine',
        description:
          'DCAi analyzes on-chain volatility, liquidity patterns, and market sentiment to determine optimal entry points. Each DCA execution is timed by AI, not arbitrary schedules.',
        items: [
          'Real-time market analysis across MultiversX',
          'Volatility-based entry timing optimization',
          'Dynamic frequency adjustment per token',
        ],
      },
      execution: {
        title: 'Automated Execution',
        description:
          'Once a strategy is configured, DCAi handles all transactions autonomously. Monitor performance, adjust parameters, and let the AI execute your DCA plan 24/7.',
        items: [
          'Automated token purchases at AI-selected times',
          'Take-profit triggers based on your thresholds',
          'Multi-strategy portfolio management',
        ],
      },
    }),
    []
  );

  const activeMode = modes[mode];

  const protocols = [
    {
      name: 'Strategy Setup',
      detail: 'Select tokens, set DCA frequency, define USDC amounts, and configure optional take-profit percentages.',
      status: 'Ready',
    },
    {
      name: 'AI Analysis',
      detail: 'DCAi continuously monitors market conditions, liquidity depth, and volatility to identify optimal buy windows.',
      status: 'Armed',
    },
    {
      name: 'Auto Execution',
      detail: 'Transactions execute automatically when AI signals optimal entry. Track all activity in real-time on your DCA Board.',
      status: 'Live',
    },
  ];

  const setSpotlight = (event: React.MouseEvent<HTMLLIElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--hero3-x', `${event.clientX - rect.left}px`);
    target.style.setProperty('--hero3-y', `${event.clientY - rect.top}px`);
  };

  const clearSpotlight = (event: React.MouseEvent<HTMLLIElement>) => {
    const target = event.currentTarget;
    target.style.removeProperty('--hero3-x');
    target.style.removeProperty('--hero3-y');
  };

  const showcaseImage = {
    src: '/assets/img/slothengine.png',
    alt: 'DCAi sloth engine illustration',
  };

  return (
    <div className='relative w-full bg-background text-foreground overflow-hidden'>
      <div className='md:origin-top md:scale-75' style={{ transformOrigin: 'top center' }}>
        <section
          ref={sectionRef}
          className={`relative flex w-full flex-col gap-6 px-4 py-8 transition-opacity duration-700 md:gap-16 md:px-6 md:py-24 lg:gap-20 lg:px-10 xl:px-16 2xl:px-24 ${
            visible ? 'motion-safe:animate-[hero3-intro_1s_cubic-bezier(.22,.68,0,1)_forwards]' : 'opacity-0'
          }`}
        >
        <header className='grid gap-6 md:gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-end'>
          <div className='space-y-4 md:space-y-8'>
            <div className='flex flex-wrap items-center gap-2 md:gap-4'>
              <span
                className={`inline-flex items-center gap-2 rounded-none border px-3 py-1 text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.3em] md:tracking-[0.4em] ${palette.border} ${palette.accent}`}
              >
                DCAi Neuro-Engine
              </span>
            </div>
            <div className='space-y-3 md:space-y-6'>
              <h1 className='text-xl font-semibold leading-[1.1] tracking-tight sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl'>
                Dollar Cost Averaging, reimagined by AI for MultiversX.
              </h1>
              <p className={`text-xs md:text-base lg:text-lg leading-relaxed ${palette.subtle}`}>
                DCAi watches MultiversX markets 24/7, learns from on-chain volatility and liquidity patterns, and
                drip-feeds your capital into tokens at AI-optimized moments—then takes profit before the crowd even
                reacts. No emotion, no timing anxiety, just systematic accumulation powered by machine intelligence.
              </p>
            </div>
            <div className='flex flex-col gap-3'>
              <div
                className={`inline-flex flex-wrap gap-2 rounded-none border px-3 py-2 md:px-5 md:py-3 text-[10px] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] transition ${palette.border} ${palette.accent}`}
              >
                <span className='flex items-center gap-1.5 md:gap-2'>
                  <span className='h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-current animate-pulse' />
                  AI Active
                </span>
                <span className='opacity-60'>∙</span>
                <span>MultiversX Native</span>
              </div>
              <div
                className={`flex divide-x divide-[hsl(var(--gray-300)/0.2)] overflow-hidden rounded-none border text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em] ${palette.border}`}
              >
                {metrics.map((metric) => (
                  <div key={metric.label} className='flex flex-col px-3 py-2 md:px-5 md:py-3'>
                    <span className={`text-[9px] md:text-[11px] ${palette.subtle}`}>{metric.label}</span>
                    <span className='text-sm md:text-lg font-semibold tracking-tight'>{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`relative flex flex-col gap-4 md:gap-6 rounded-none border p-4 md:p-8 transition ${palette.border} ${palette.card}`}
          >
            <div className='flex items-start justify-between gap-3 md:gap-4'>
              <div className='space-y-2 md:space-y-3'>
                <p className='text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em]'>Mode</p>
                <h2 className='text-lg md:text-xl font-semibold tracking-tight'>{activeMode.title}</h2>
              </div>
              <div className='hidden md:block'>
                <DeckGlyph />
              </div>
            </div>
            <p className={`text-xs md:text-sm leading-relaxed ${palette.subtle}`}>{activeMode.description}</p>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => setMode('strategy')}
                className={`flex-1 rounded-none border px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] md:tracking-[0.35em] transition ${
                  mode === 'strategy'
                    ? 'bg-[hsl(var(--gray-300)/0.2)] text-foreground'
                    : `${palette.border} ${palette.accent}`
                }`}
              >
                Strategy
              </button>
              <button
                type='button'
                onClick={() => setMode('execution')}
                className={`flex-1 rounded-none border px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] md:tracking-[0.35em] transition ${
                  mode === 'execution'
                    ? 'bg-[hsl(var(--gray-300)/0.2)] text-foreground'
                    : `${palette.border} ${palette.accent}`
                }`}
              >
                Execution
              </button>
            </div>
            <ul className='space-y-1.5 md:space-y-2 text-xs md:text-sm'>
              {activeMode.items.map((item) => (
                <li key={item} className={`flex items-start gap-2 md:gap-3 ${palette.subtle}`}>
                  <span className='mt-0.5 md:mt-1 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-current flex-shrink-0' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <div className='grid gap-4 md:gap-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] xl:items-stretch'>
          <div
            className={`order-2 flex flex-col gap-4 md:gap-6 rounded-none border p-4 md:p-8 transition ${palette.border} ${palette.card} xl:order-1`}
          >
            <div className='flex items-center justify-between'>
              <h3 className='text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em]'>DCA Advantages</h3>
              <span className='text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em] opacity-60'>v3.0</span>
            </div>
            <p className={`text-xs md:text-sm leading-relaxed ${palette.subtle}`}>
              Dollar Cost Averaging reduces the impact of volatility by spreading purchases over time. DCAi enhances
              this with AI-driven timing, ensuring you buy when markets are most favorable, not just on arbitrary
              schedules.
            </p>
            <div className='grid gap-2 md:gap-3'>
              {[
                'Eliminate timing anxiety and emotion',
                'Reduce average entry price over time',
                'Automated execution 24/7 without intervention',
              ].map((item) => (
                <div
                  key={item}
                  className={`relative overflow-hidden rounded-none border px-3 py-2 md:px-4 md:py-3 text-[10px] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] transition duration-500 hover:-translate-y-0.5 ${palette.border}`}
                >
                  <span>{item}</span>
                  <span
                    className='pointer-events-none absolute inset-0 opacity-0 transition duration-500 hover:opacity-100'
                    style={{
                      background: `radial-gradient(180px circle at 50% 20%, ${palette.glow}, transparent 70%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <figure
            className={`order-1 overflow-hidden rounded-none border transition xl:order-2 ${palette.border}`}
            style={{ position: 'relative' }}
          >
            <div className='relative w-full pb-[120%] sm:pb-[90%] lg:pb-[72%]'>
              <Image
                src={showcaseImage.src}
                alt={showcaseImage.alt}
                fill
                className='object-cover grayscale transition duration-700 ease-out hover:scale-[1.03]'
              />
              <span className='pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 mix-blend-soft-light' />
              <div className='pointer-events-none absolute inset-0 border border-white/10 mix-blend-overlay' />
              <span className='pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full border border-white/15 opacity-70 motion-safe:animate-[hero3-glow_9s_ease-in-out_infinite]' />
              <span className='pointer-events-none absolute -right-12 bottom-16 h-48 w-48 rounded-full border border-white/10 opacity-40 motion-safe:animate-[hero3-drift_12s_ease-in-out_infinite]' />
            </div>
            <figcaption className={`flex items-center justify-between px-3 py-2 md:px-6 md:py-5 text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em] ${palette.subtle}`}>
              <span>Market Intelligence</span>
              <span className='flex items-center gap-1 md:gap-2'>
                <span className='h-0.5 w-4 md:h-1 md:w-8 bg-current' />
                <span className='hidden sm:inline'>AI-Powered Analysis</span>
              </span>
            </figcaption>
          </figure>

          <aside
            className={`order-3 flex flex-col gap-4 md:gap-6 rounded-none border p-4 md:p-8 transition ${palette.border} ${palette.card} xl:order-3`}
          >
            <div className='flex items-center justify-between'>
              <h3 className='text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em]'>DCA Workflow</h3>
              <span className='text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.35em] opacity-60'>Indexed</span>
            </div>
            <ul className='space-y-2 md:space-y-4'>
              {protocols.map((protocol, index) => (
                <li
                  key={protocol.name}
                  onMouseMove={setSpotlight}
                  onMouseLeave={clearSpotlight}
                  className='group relative overflow-hidden rounded-none border px-3 py-2.5 md:px-5 md:py-4 transition duration-500 hover:-translate-y-0.5'
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className='pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100'
                    style={{
                      background:
                        'radial-gradient(190px circle at var(--hero3-x, 50%) var(--hero3-y, 50%), rgba(255,255,255,0.18), transparent 72%)',
                    }}
                  />
                  <div className='flex items-center justify-between'>
                    <h4 className='text-xs md:text-sm font-semibold uppercase tracking-[0.2em] md:tracking-[0.25em]'>{protocol.name}</h4>
                    <span className='text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.35em] opacity-70'>{protocol.status}</span>
                  </div>
                  <p className={`mt-2 md:mt-3 text-xs md:text-sm leading-relaxed ${palette.subtle}`}>{protocol.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
      </div>
    </div>
  );
}

export default HeroOrbitDeck;
export { HeroOrbitDeck };

