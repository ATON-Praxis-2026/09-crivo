'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import type { Achado, Tier } from '@/lib/types';

// Tier sempre com ícone + palavra + número, nunca só cor (docs/ux.md §7).
export const TIER_INFO: Record<Tier, { icone: string; palavra: string; badge: string }> = {
  VERIFICADO: { icone: '✓', palavra: 'Verificado', badge: 'badge-ok' },
  ATENCAO: { icone: '⚠', palavra: 'Atenção', badge: 'badge-warn' },
  EVITAR: { icone: '✕', palavra: 'Evitar', badge: 'badge-danger' },
};

export function TierBadge({ tier, score }: { tier: Tier; score?: number }) {
  const t = TIER_INFO[tier];
  return (
    <span className={`badge ${t.badge}`}>
      <span aria-hidden="true">{t.icone}</span>
      {t.palavra}
      {typeof score === 'number' && <span className="mono">· {score}/100</span>}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <span className="spinner" role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export const ICONE_ACHADO: Record<Achado['status'], string> = {
  ok: '✔',
  atencao: '⚠',
  eliminatorio: '✕',
  nao_verificavel: '─',
};

export const CLASSE_ACHADO: Record<Achado['status'], string> = {
  ok: 'checks-row-ok',
  atencao: 'checks-row-warn',
  eliminatorio: 'checks-row-danger',
  nao_verificavel: 'checks-row-idle',
};

/**
 * Disclosure: o que não muda a decisão da Ana sai da tela e fica a um toque.
 * Fechado continua no DOM — é assim que o @media print imprime tudo aberto.
 */
export function Disclose({
  rotulo,
  rotuloAberto,
  children,
}: {
  rotulo: string;
  rotuloAberto?: string;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <div className="disclose">
      <button
        type="button"
        className="btn-ghost disclose-btn no-print"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? (rotuloAberto ?? rotulo) : rotulo}
      </button>
      <div className="disclose-body" id={id} data-open={aberto}>
        <div>
          <div className="disclose-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Barra de pilar do score. O CSS anima scaleX via --fill (0–1), não width. */
export function ScoreBar({
  nome,
  peso,
  valor,
  tom,
}: {
  nome: string;
  peso: number;
  valor: number;
  tom?: 'warn' | 'danger';
}) {
  const fill = Math.max(0, Math.min(1, valor));
  return (
    <div className="bar-row">
      <span>
        {nome} {peso}%
      </span>
      <span className="bar-track">
        <span
          className={`bar-fill${tom ? ` bar-fill-${tom}` : ''}`}
          style={{ '--fill': fill } as React.CSSProperties}
        />
      </span>
      <span className="mono">{Math.round(fill * peso)}</span>
    </div>
  );
}

export function Nota({ tom = 'info', children }: { tom?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  const classe = tom === 'warn' ? 'note note-warn' : tom === 'danger' ? 'note note-danger' : 'note';
  return <p className={classe}>{children}</p>;
}

export function Skeleton({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="card" aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <span
          key={i}
          className="skeleton skeleton-line shimmer"
          style={{ width: i === 0 ? '60%' : i === linhas - 1 ? '40%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * Card fantasma da tela ao vivo: tem a mesma anatomia do card real (nome,
 * fileira de checagens, linha de resultado), então a espera já mostra a forma
 * do que vem — em vez da palavra "procurando" sozinha.
 */
export function SkeletonFornecedor() {
  return (
    <article className="livecard card livecard-ghost" aria-hidden="true">
      <span className="skeleton skeleton-title shimmer" />
      <span className="dots">
        {Array.from({ length: 13 }, (_, i) => (
          <span key={i} className="dot" />
        ))}
      </span>
      <span className="skeleton skeleton-line shimmer" style={{ width: '70%' }} />
    </article>
  );
}

export function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function EmptyState({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      </span>
      <p className="h3">{titulo}</p>
      {acao}
    </div>
  );
}

/** Confirmação de ação (DS §4.22). Some sozinho; nunca carrega informação única. */
export function Toast({ children, onFim }: { children: ReactNode; onFim: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFim, 5000);
    return () => clearTimeout(t);
  }, [onFim]);
  return (
    <p className="toast no-print" role="status">
      <span aria-hidden="true">✓</span>
      {children}
    </p>
  );
}
