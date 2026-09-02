'use client';

import { useEffect, useRef } from 'react';

// Fundo vivo (DS §2.12): três blobs desfocados derivando muito lentamente
// (CSS) + parallax leve no scroll (fator -0.05, rAF-throttled). Sob
// prefers-reduced-motion o CSS congela o drift e este efeito não anexa o
// listener — o fundo vira gradiente estático. No print, o CSS esconde tudo.
export default function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translateY(${window.scrollY * -0.05}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="ambient" aria-hidden="true">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
    </div>
  );
}
