'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CRITERIO_LABELS,
  type Achado,
  type CandidatoResultado,
  type CriterioId,
  type RankingCategoria,
} from '@/lib/types';
import {
  CLASSE_ACHADO,
  Disclose,
  EmptyState,
  ICONE_ACHADO,
  SkeletonFornecedor,
  Spinner,
  TierBadge,
} from '@/components/ui';
import { useRanking } from '@/components/useRanking';

// Ordem real em que o Verificador fecha os critérios — é ela que a fileira de
// pontos acende, então a tela conta a verdade sobre o que já aconteceu.
const ORDEM_CRITERIOS = Object.keys(CRITERIO_LABELS) as CriterioId[];

function pronto(c: CandidatoResultado): boolean {
  return c.status === 'concluido' || c.status === 'nao_verificado';
}

export default function PesquisaViva({ id }: { id: string }) {
  const router = useRouter();
  const { data, notFound, erroRede } = useRanking(id);
  const jaFoi = useRef(false);

  useEffect(() => {
    if (data?.status === 'concluida' && !jaFoi.current) {
      jaFoi.current = true;
      const t = setTimeout(() => router.push(`/ranking/${id}`), 1200);
      return () => clearTimeout(t);
    }
  }, [data?.status, id, router]);

  if (notFound) {
    return (
      <div className="wrap">
        <h1 className="h1">Pesquisa não encontrada</h1>
        <p className="lede">O link expirou. Refaça a pesquisa.</p>
        <a className="btn btn-primary" href="/">Nova pesquisa</a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap wrap-wide">
        <h1 className="h1 reticencias">Abrindo a pesquisa</h1>
        <div className="track">
          <span className="track-fill is-indeterminate" />
        </div>
        <div className="livegrid">
          <SkeletonFornecedor />
          <SkeletonFornecedor />
          <SkeletonFornecedor />
          <SkeletonFornecedor />
        </div>
      </div>
    );
  }

  const todos = data.categorias.flatMap((c) => c.candidatos);
  const prontos = todos.filter(pronto).length;
  const total = todos.length;
  const algumaFechou = data.categorias.some((c) => c.status === 'concluida');
  const concluida = data.status === 'concluida';

  return (
    <div className="wrap wrap-wide">
      <header className="stepbar">
        {/* Enquanto o Descobridor não devolve nomes, o título também mostra
            movimento — sem isso a tela parece travada. */}
        <h1 className={total === 0 && !concluida ? 'h1 reticencias' : 'h1'}>
          {concluida
            ? 'Verificação concluída'
            : total > 0
              ? `Verificando ${total} ${total === 1 ? 'fornecedor' : 'fornecedores'}`
              : `Procurando fornecedores em ${data.cidade}`}
        </h1>
        <p className="lede">
          {data.cidade} · {data.categorias.length}{' '}
          {data.categorias.length === 1 ? 'categoria' : 'categorias'}
        </p>
        <div className="stepbar-row">
          <div
            className="track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total || undefined}
            aria-valuenow={total > 0 ? prontos : undefined}
            aria-valuetext={total === 0 ? 'procurando fornecedores' : undefined}
          >
            {/* Sem nenhum candidato ainda não há progresso a medir: a barra
                varre em vez de fingir uma fração. */}
            <span
              className={`track-fill${total === 0 ? ' is-indeterminate' : ''}`}
              style={{ '--fill': total > 0 ? prontos / total : 1 } as React.CSSProperties}
            />
          </div>
          <span className="mono" aria-live="polite">
            <span className="sr-only">
              {total > 0
                ? `${prontos} de ${total} fornecedores verificados`
                : 'procurando fornecedores'}
            </span>
            <span aria-hidden="true">{total > 0 ? `${prontos}/${total}` : ''}</span>
          </span>
        </div>
      </header>

      {erroRede && (
        <p className="note note-warn" role="alert">Sem resposta. Tentando de novo.</p>
      )}

      {data.status === 'erro' && (
        <div className="note note-danger" role="alert">
          <p>A pesquisa parou.</p>
          <a className="btn btn-secondary btn-sm" href="/">Tentar de novo</a>
        </div>
      )}

      {data.categorias.map((cat) => (
        <SecaoCategoria key={cat.categoriaId} cat={cat} cidade={data.cidade} />
      ))}

      <footer className="footer">
        <p className="caption subtle">1 a 3 minutos.</p>
        <Disclose rotulo="Fontes" rotuloAberto="ocultar fontes">
          <p className="caption">
            Receita Federal · Google · Reclame Aqui · notícias · redes sociais
          </p>
        </Disclose>
      </footer>

      <div className="btn-row no-print">
        {concluida ? (
          <a className="btn btn-primary btn-lg btn-block" href={`/ranking/${id}`}>Ver ranking →</a>
        ) : (
          algumaFechou && (
            <a className="btn btn-secondary" href={`/ranking/${id}?parcial=1`}>Ver ranking parcial →</a>
          )
        )}
      </div>
    </div>
  );
}

function SecaoCategoria({ cat, cidade }: { cat: RankingCategoria; cidade: string }) {
  const prontos = cat.candidatos.filter(pronto).length;

  // Os que fecharam sobem, ordenados por nota; quem ainda roda fica embaixo na
  // ordem de descoberta. É o ranking se montando na frente de quem olha.
  const ordenados = [...cat.candidatos].sort((a, b) => {
    const pa = pronto(a) ? 0 : 1;
    const pb = pronto(b) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (pa === 0) return (b.score ?? -1) - (a.score ?? -1);
    return 0;
  });

  return (
    <section className="chipgroup">
      <p className="eyebrow">
        {cat.categoriaLabel}
        {cat.status === 'aguardando' && ' · na fila'}
        {cat.status === 'descobrindo' && (
          <span className="reticencias"> · procurando empresas</span>
        )}
        {(cat.status === 'verificando' || cat.status === 'concluida') &&
          ` · ${prontos}/${cat.candidatos.length}`}
      </p>

      {/* Antes da primeira resposta do Descobridor, três cards fantasma mostram
          a forma do que vem. Uma palavra solta não conta que algo está rodando. */}
      {cat.status === 'descobrindo' && cat.candidatos.length === 0 && (
        <div className="livegrid">
          <SkeletonFornecedor />
          <SkeletonFornecedor />
          <SkeletonFornecedor />
        </div>
      )}

      {cat.status === 'concluida' && cat.candidatos.length === 0 && (
        <EmptyState
          titulo={`Nenhum fornecedor de ${cat.categoriaLabel} em ${cidade}.`}
          acao={<a className="link" href="/">Trocar cidade</a>}
        />
      )}

      <ListaViva candidatos={ordenados} />
    </section>
  );
}

/** FLIP: mede antes, aplica o deslocamento inverso e solta — anima transform,
 *  nunca layout. Sob reduced-motion o CSS zera a transição e o card só troca. */
function ListaViva({ candidatos }: { candidatos: CandidatoResultado[] }) {
  const box = useRef<HTMLDivElement>(null);
  const posicoes = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-id]'));
    for (const card of cards) {
      const id = card.dataset.id!;
      const topo = card.getBoundingClientRect().top;
      const antes = posicoes.current.get(id);
      if (antes != null && Math.abs(antes - topo) > 1) {
        card.classList.add('is-flipping');
        card.style.transition = 'none';
        card.style.transform = `translateY(${antes - topo}px)`;
        requestAnimationFrame(() => {
          card.style.transition = '';
          card.style.transform = '';
          setTimeout(() => card.classList.remove('is-flipping'), 340);
        });
      }
      posicoes.current.set(id, topo);
    }
  });

  return (
    <div className="livegrid" ref={box}>
      {candidatos.map((c) => (
        <CardVivo key={c.id} c={c} />
      ))}
    </div>
  );
}

function CardVivo({ c }: { c: CandidatoResultado }) {
  const achados = c.achados ?? [];
  const porCriterio = new Map(achados.map((a) => [a.criterio, a]));
  const ultimo = achados[achados.length - 1];
  const fechado = pronto(c);
  const proximo = ORDEM_CRITERIOS.find((cr) => !porCriterio.has(cr));

  return (
    <article className="livecard card" data-id={c.id} {...(fechado ? { role: 'status' } : {})}>
      <div className="supplier-head">
        <h2 className="h3">{c.nome}</h2>
        {c.status === 'aguardando' && <span className="badge badge-neutral">na fila</span>}
        {c.status === 'refinando' && <span className="badge badge-neutral">revisando</span>}
        {c.status === 'nao_verificado' && <span className="badge badge-neutral">não verificado</span>}
        {c.status === 'concluido' && c.tier && <TierBadge tier={c.tier} score={c.score} />}
      </div>

      {c.doCache && (
        <p className="caption">
          <span className="badge badge-info">reaproveitado · até 30 dias</span>
        </p>
      )}

      {/* 13 pontos na ordem real das checagens. Decorativo para leitor de tela:
          quem não enxerga recebe o contador geral, não 13 anúncios por card. */}
      {!fechado && (
        <div className="dots" aria-hidden="true">
          {ORDEM_CRITERIOS.map((cr) => {
            const a = porCriterio.get(cr);
            if (a) {
              return (
                <span key={cr} className={`dot ${CLASSE_ACHADO[a.status].replace('checks-row-', 'dot-')}`} />
              );
            }
            // O próximo da fila pulsa: a fileira passa a dizer que a verificação
            // está andando, em vez de parecer uma régua parada.
            const emAndamento = c.status === 'verificando' && cr === proximo;
            return <span key={cr} className={`dot ${emAndamento ? 'dot-next' : 'dot-idle'}`} />;
          })}
        </div>
      )}

      {!fechado && (
        <p className="lastcheck">
          {ultimo ? (
            <>
              <span aria-hidden="true">{ICONE_ACHADO[ultimo.status]}</span>
              <span className="lastcheck-text">{ultimo.valor || CRITERIO_LABELS[ultimo.criterio]}</span>
            </>
          ) : (
            <>
              <Spinner />
              <span className="lastcheck-text reticencias">
                {c.status === 'aguardando' ? 'na fila' : 'abrindo o cadastro'}
              </span>
            </>
          )}
        </p>
      )}

      {c.status === 'nao_verificado' && (
        <p className="caption subtle">{c.justificativa ?? 'Consulta sem resposta a tempo.'}</p>
      )}

      {c.status === 'concluido' && c.justificativa && <p>{c.justificativa}</p>}

      {achados.length > 0 && (
        <Disclose rotulo={`${achados.length} checagens`} rotuloAberto="ocultar checagens">
          <ul className="checks">
            {achados.map((a: Achado) => (
              <li key={a.criterio} className={`checks-row ${CLASSE_ACHADO[a.status]}`}>
                <span aria-hidden="true">{ICONE_ACHADO[a.status]}</span>
                <span>
                  {CRITERIO_LABELS[a.criterio]}
                  {a.valor && <>: {a.valor}</>}
                </span>
              </li>
            ))}
          </ul>
        </Disclose>
      )}
    </article>
  );
}
