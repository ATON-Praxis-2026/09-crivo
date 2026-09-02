'use client';

import { useEffect, useRef } from 'react';
import { LIMITS, PRECO_BUSCA } from '@/lib/config';

const BENEFICIOS = [
  `Até ${LIMITS.candidatosPorCategoria} fornecedores por categoria`,
  'Fonte clicável em cada checagem',
  'PDF para anexar no processo de compra',
  `Reaproveitável por ${LIMITS.cacheDias} dias`,
];

/**
 * Desbloqueio da verificação. Não troca de rota: a lista continua atrás, então
 * some o resumo "o que vamos pesquisar" (era a mesma informação duas vezes).
 * Não existe checkout nesta versão — o toque libera a pesquisa.
 */
export default function Paywall({
  enviando,
  onPagar,
  onFechar,
}: {
  enviando: boolean;
  onPagar: () => void;
  onFechar: () => void;
}) {
  const cta = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cta.current?.focus();
  }, []);

  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && !enviando) onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [enviando, onFechar]);

  return (
    <div className="backdrop" onClick={() => !enviando && onFechar()}>
      <section
        className="sheet glass"
        role="dialog"
        aria-modal="true"
        aria-label="Pagamento"
        aria-busy={enviando}
        onClick={(ev) => ev.stopPropagation()}
      >
        <span className="sheet-handle" aria-hidden="true" />

        <p className="eyebrow">Verificação completa</p>
        <p className="display">{PRECO_BUSCA}</p>
        <p className="caption subtle">por pesquisa</p>

        <ul className="checks">
          {BENEFICIOS.map((b) => (
            <li key={b} className="checks-row checks-row-ok">
              <span aria-hidden="true">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          ref={cta}
          type="button"
          className="btn btn-gradient btn-lg btn-block"
          onClick={onPagar}
          disabled={enviando}
        >
          {enviando ? (
            <>
              <span className="spinner" aria-hidden="true" /> Processando
            </>
          ) : (
            `Pagar ${PRECO_BUSCA}`
          )}
        </button>

      </section>
    </div>
  );
}
