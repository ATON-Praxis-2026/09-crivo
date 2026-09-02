'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIAS,
  FAMILIAS,
  MAX_CATEGORIAS_POR_PESQUISA,
  categoriaLabel,
} from '@/lib/categorias';

// Substitui o <select> nativo de 37 opções do atalho. Overlay sobre a abertura,
// sem troca de rota: quem já sabe o que quer chega na lista em três toques.
function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Atalhos do estado vazio. São as categorias com base de fornecedores mais
// completa em Fortaleza — quem cai aqui sem achar o que buscava encontra
// resultado de verdade no primeiro toque.
const SUGESTOES = ['buffet', 'audio_video', 'seguranca', 'espaco'];

export default function BuscaCategoria({
  onFechar,
  onUsar,
}: {
  onFechar: () => void;
  onUsar: (ids: string[]) => void;
}) {
  const [busca, setBusca] = useState('');
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // O fundo não rola enquanto o overlay está aberto.
    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, []);

  useEffect(() => {
    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onFechar();
        return;
      }
      if (ev.key !== 'Tab' || !painel.current) return;
      const focaveis = painel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (ev.shiftKey && document.activeElement === primeiro) {
        ev.preventDefault();
        ultimo.focus();
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  const termo = semAcento(busca.trim());
  const achadas = useMemo(
    () => (termo ? CATEGORIAS.filter((c) => semAcento(c.label).includes(termo)) : CATEGORIAS),
    [termo],
  );

  const cheio = escolhidas.length >= MAX_CATEGORIAS_POR_PESQUISA;

  function alternar(id: string) {
    setEscolhidas((a) => (a.includes(id) ? a.filter((x) => x !== id) : cheio ? a : [...a, id]));
  }

  const familias = Object.entries(FAMILIAS).filter(([fam]) =>
    achadas.some((c) => c.familia === fam),
  );

  return (
    <div className="overlay" ref={painel} role="dialog" aria-modal="true" aria-label="Buscar categoria">
      <div className="overlay-head">
        <div className="overlay-inner overlay-busca">
          <span className="busca-campo">
            <IconeBusca />
            <input
              className="input"
              autoFocus
              value={busca}
              onChange={(ev) => setBusca(ev.target.value)}
              placeholder="buffet, DJ, segurança"
              aria-label="Buscar categoria"
              type="text"
              enterKeyHint="search"
            />
          </span>
          <button type="button" className="btn btn-ghost iconbtn" onClick={onFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </div>
      </div>

      <div className="overlay-body">
        <div className="overlay-inner">
          {achadas.length === 0 ? (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true">
                <IconeBusca />
              </span>
              <p className="h3">Nada com esse nome.</p>
              <div className="chips">
                {SUGESTOES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip chip-pick"
                    aria-pressed={false}
                    onClick={() => setBusca(categoriaLabel(id))}
                  >
                    {categoriaLabel(id)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            familias.map(([fam, famLabel]) => (
              <section key={fam} className="pickgroup">
                <p className="eyebrow">{famLabel}</p>
                {achadas
                  .filter((c) => c.familia === fam)
                  .map((c) => {
                    const marcada = escolhidas.includes(c.id);
                    const bloqueada = !marcada && cheio;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="pick"
                        aria-pressed={marcada}
                        aria-disabled={bloqueada}
                        onClick={() => !bloqueada && alternar(c.id)}
                      >
                        <span>{c.label}</span>
                        <span className="pick-mark" aria-hidden="true">
                          {marcada ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
              </section>
            ))
          )}
        </div>
      </div>

      {/* O rodapé só existe quando há escolha: sem seleção, nada a confirmar. */}
      {escolhidas.length > 0 && (
        <div className="overlay-foot">
          <div className="overlay-inner">
            <div className="chips">
              {escolhidas.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  aria-pressed={true}
                  aria-label={`${categoriaLabel(id)}, tirar da seleção`}
                  onClick={() => alternar(id)}
                >
                  {categoriaLabel(id)} <span aria-hidden="true">✕</span>
                </button>
              ))}
            </div>
            {cheio && (
              <p className="caption subtle">Máximo {MAX_CATEGORIAS_POR_PESQUISA} por pesquisa.</p>
            )}
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={() => onUsar(escolhidas)}
            >
              Usar {escolhidas.length} {escolhidas.length === 1 ? 'categoria' : 'categorias'} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconeBusca() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

function IconeFechar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
