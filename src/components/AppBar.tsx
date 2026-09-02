'use client';

import { useEffect, useState } from 'react';
import Wordmark from './Wordmark';
import ThemeToggle from './ThemeToggle';
import { APP_NAME } from '@/lib/config';

// DS §4.27: 64px. A barra é transparente parada no topo e vira glass ao rolar
// (o CSS lê .is-stuck) — assim o fundo vivo aparece inteiro na abertura.
export default function AppBar() {
  const [preso, setPreso] = useState(false);

  useEffect(() => {
    const aoRolar = () => setPreso(window.scrollY > 4);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  return (
    <header className={`appbar${preso ? ' is-stuck' : ''}`}>
      <div className="appbar-inner">
        <a className="wordmark" href="/" aria-label={`${APP_NAME}, início`}>
          <Wordmark height={20} />
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
