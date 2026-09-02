'use client';

import { useEffect, useState } from 'react';

const CHAVE = 'ap-theme';

// DS §3.2. Dark é o principal (:root); light é opt-in via data-theme no <html>.
// O script anti-FOUC do layout já aplicou o tema salvo antes do paint — aqui só
// sincronizamos e alternamos.
export default function ThemeToggle() {
  const [tema, setTema] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (document.documentElement.dataset.theme === 'light') setTema('light');
  }, []);

  function alternar() {
    const novo = tema === 'dark' ? 'light' : 'dark';
    setTema(novo);
    if (novo === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // Sem storage (aba privada): o tema vale só nesta navegação.
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm iconbtn"
      onClick={alternar}
      aria-label="Alternar tema claro e escuro"
      aria-pressed={tema === 'light'}
    >
      {tema === 'dark' ? <IconeSol /> : <IconeLua />}
    </button>
  );
}

function IconeSol() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
