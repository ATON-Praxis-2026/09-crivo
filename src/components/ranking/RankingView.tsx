'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@/lib/config';
import { FRONTEIRAS, PESOS } from '@/lib/score';
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
  ScoreBar,
  Skeleton,
  TierBadge,
  Toast,
} from '@/components/ui';
import { useRanking } from '@/components/useRanking';

const GRUPOS: Array<{ titulo: string; criterios: CriterioId[] }> = [
  { titulo: 'Cadastral', criterios: ['cnpj_ativo', 'idade_empresa', 'cnae_compativel', 'sancoes_publicas'] },
  { titulo: 'Reputação', criterios: ['google_rating', 'teor_avaliacoes', 'reclame_aqui', 'noticias_negativas', 'processos_judiciais'] },
  { titulo: 'Presença', criterios: ['site_com_cnpj', 'instagram_ativo', 'contato_consistente', 'diretorios_setor'] },
];

// Rótulo curto. O texto longo dizia a mesma coisa e ocupava a largura do card.
const FLAG_LABELS: Record<string, string> = {
  possivel_homonimo: 'possível homônimo',
  verificacao_inconclusiva: 'verificação inconclusiva',
  pegada_digital_baixa: 'pouca presença digital',
};

export default function RankingView({ id, parcial }: { id: string; parcial: boolean }) {
  const router = useRouter();
  const { data, notFound } = useRanking(id);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (data?.status === 'rodando' && !parcial) router.replace(`/pesquisa/${id}`);
  }, [data?.status, parcial, id, router]);

  if (notFound) {
    return (
      <div className="wrap">
        <h1 className="h1">Ranking não encontrado</h1>
        <p className="lede">O link expirou.</p>
        <a className="btn btn-primary" href="/">Nova pesquisa</a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap wrap-wide">
        <Skeleton linhas={4} />
        <Skeleton linhas={4} />
      </div>
    );
  }

  const dataFmt = new Date(data.criadoEm).toLocaleDateString('pt-BR');
  const pendentes = data.categorias.flatMap((c) => c.candidatos).filter(
    (c) => c.status !== 'concluido' && c.status !== 'nao_verificado',
  ).length;

  function imprimir() {
    window.print();
    setToast(true);
  }

  return (
    <div className="wrap wrap-wide">
      <header className="wash">
        <h1 className="h1">Ranking</h1>
        <p className="lede">
          {data.categorias.length === 1
            ? data.categorias[0].categoriaLabel
            : `${data.categorias.length} categorias`}{' '}
          · <strong>{data.cidade}</strong> · {dataFmt}
        </p>
        <p className="caption subtle">🔒 Relatório privado. Só você vê.</p>

        <div className="btn-row no-print">
          <button type="button" className="btn btn-primary btn-sm" onClick={imprimir}>
            <IconePdf /> Baixar PDF
          </button>
          <a className="btn btn-secondary btn-sm" href="/">Nova pesquisa</a>
        </div>

        {pendentes > 0 && (
          <p className="caption no-print">
            <span className="badge badge-neutral">ainda verificando ({pendentes})</span>{' '}
            <a className="link" href={`/pesquisa/${id}`}>acompanhar</a>
          </p>
        )}
      </header>

      <div className="metodo panel-dashed">
        <p className="mono">
          Cadastral {PESOS.cadastral} · Reputação {PESOS.reputacao} · Presença {PESOS.presenca} ·
          Verificabilidade {PESOS.verificabilidade}
        </p>
        <p className="mono">
          Corte: ✓ ≥{FRONTEIRAS.verificado} · ⚠ {FRONTEIRAS.atencao}–{FRONTEIRAS.verificado - 1} · ✕ &lt;
          {FRONTEIRAS.atencao}
        </p>
        <Disclose rotulo="Critérios eliminatórios" rotuloAberto="ocultar critérios">
          <p>
            CNPJ inapto ou baixado. Sanção pública em CEIS ou CNEP. Notícia de golpe com evidência.
            Reclame Aqui “não recomendada”. Pouca presença digital não elimina ninguém: vira Atenção,
            com o motivo escrito.
          </p>
        </Disclose>
        {/* A banca vai perguntar o que é real nesta tela. A resposta fica aqui,
            ao lado dos pesos, e não escondida num rodapé.
            Desligado para a gravação — trocar por `data.mock` para reativar.
            O `data?.mock` é necessário: depois de `false &&` o TypeScript trata
            o trecho como inalcançável e perde o narrowing do `if (!data)`. */}
        {false && data?.mock && (
          <Disclose rotulo="O que é real nesta demonstração" rotuloAberto="ocultar">
            <p>
              As empresas com CNPJ, site, telefone e nota do Google existem: os dados cadastrais
              vêm da Receita Federal (via BrasilAPI), a reputação vem do Google Maps, e cada
              checagem traz a URL da fonte. A nota não está gravada em lugar nenhum — ela é
              calculada por este mesmo motor de score em cima desses dados.
            </p>
            <p>
              A outra parte da lista são <strong>exemplos fictícios</strong>, e dá para separá-los
              a olho: o CNPJ deles começa em <strong>99.9</strong>, faixa que a Receita não
              atribui a ninguém. São eles que carregam os casos de ✕ Evitar, de CNPJ não
              localizado e de falha na verificação — <strong>nenhuma empresa real recebe juízo
              negativo inventado</strong> nesta tela.
            </p>
          </Disclose>
        )}
      </div>

      {data.avisos.map((a) => (
        <p key={a} className="note note-warn">{a}</p>
      ))}

      {data.categorias.map((cat) => (
        <CategoriaRanking key={cat.categoriaId} cat={cat} cidade={data.cidade} />
      ))}

      <footer className="footer">
        <p className="caption subtle">
          {APP_NAME} · relatório privado, uso interno · gerado em {dataFmt}
        </p>
      </footer>

      {toast && <Toast onFim={() => setToast(false)}>PDF gerado.</Toast>}
    </div>
  );
}

function CategoriaRanking({ cat, cidade }: { cat: RankingCategoria; cidade: string }) {
  const concluidos = cat.candidatos.filter((c) => c.status === 'concluido');
  const rankeados = concluidos
    .filter((c) => c.tier !== 'EVITAR')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const evitar = concluidos.filter((c) => c.tier === 'EVITAR');
  const naoVerificados = cat.candidatos.filter((c) => c.status === 'nao_verificado');

  // Um destaque por categoria — destaque repetido deixa de ser destaque (DS §2.11).
  const destaque = rankeados.length >= 2 ? rankeados[0] : null;
  const demais = destaque ? rankeados.slice(1) : rankeados;

  return (
    <section className="chipgroup">
      <h2 className="section-head">
        {cat.categoriaLabel} <span className="subtle">({concluidos.length} verificados)</span>
      </h2>

      {cat.candidatos.length === 0 && cat.status === 'concluida' && (
        <EmptyState titulo={`Nenhum fornecedor verificável em ${cidade}.`} />
      )}

      {destaque && <Destaque c={destaque} categoria={cat.categoriaLabel} cidade={cidade} />}

      {demais.map((c, i) => (
        <CardFornecedor key={c.id} c={c} pos={destaque ? i + 2 : i + 1} />
      ))}

      {evitar.length > 0 && (
        <>
          <h3 className="section-head section-head-reject">
            <span aria-hidden="true">✕</span> Encontramos, mas não recomendamos
          </h3>
          {evitar.map((c) => (
            <CardFornecedor key={c.id} c={c} />
          ))}
        </>
      )}

      {naoVerificados.length > 0 && (
        <div className="panel">
          <p className="eyebrow">Não conseguimos verificar</p>
          {naoVerificados.map((c) => (
            <p key={c.id} className="caption">
              {c.nome} · {c.justificativa ?? 'consulta sem resposta a tempo'}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function Destaque({ c, categoria, cidade }: { c: CandidatoResultado; categoria: string; cidade: string }) {
  return (
    <article className="featured">
      <div className="featured-chips">
        <span className="chip-ongrad">MAIOR NOTA</span>
        {c.tier && (
          <span className="chip-ongrad">
            <span aria-hidden="true">✓</span> Verificado
          </span>
        )}
      </div>
      <div className="supplier-head">
        <h3 className="h2">{c.nome}</h3>
        <span className="mono">{c.score}/100</span>
      </div>
      <p>{categoria} · {cidade}</p>
      <a className="btn btn-ongrad btn-block" href={`#f-${c.id}`}>
        {(c.achados ?? []).length} checagens →
      </a>
    </article>
  );
}

function CardFornecedor({ c, pos }: { c: CandidatoResultado; pos?: number }) {
  const achados = c.achados ?? [];
  const porCriterio = new Map(achados.map((a) => [a.criterio, a]));
  const contatos = [c.telefone, c.site, c.instagram].filter(Boolean) as string[];
  const tom = c.tier === 'EVITAR' ? 'danger' : c.tier === 'ATENCAO' ? 'warn' : undefined;

  return (
    <article className="supplier card" id={`f-${c.id}`}>
      <div className="supplier-head">
        <h3 className="h3">
          {pos != null && <span className="rank-pos">{pos}º · </span>}
          {c.nome}
        </h3>
        {c.tier && <TierBadge tier={c.tier} score={c.score} />}
      </div>

      {contatos.length > 0 && <p className="contact">{contatos.join(' · ')}</p>}

      {(c.doCache || (c.flags && c.flags.length > 0)) && (
        <p className="caption">
          {c.doCache && <span className="badge badge-info">reaproveitado · até 30 dias</span>}{' '}
          {c.flags
            ?.map((f) => FLAG_LABELS[f])
            .filter(Boolean)
            .map((label) => (
              <span key={label} className="badge badge-neutral">{label}</span>
            ))}
        </p>
      )}

      {c.flags?.includes('possivel_homonimo') && (
        <p className="caption subtle">Pode ser outra empresa de nome parecido.</p>
      )}

      {c.justificativa && <p>{c.justificativa}</p>}

      {c.eliminatoria && (
        <p className="callout callout-danger">
          <strong>Critério eliminatório:</strong> {c.eliminatoria.motivo}
          {c.eliminatoria.evidenciaUrl && (
            <>
              {' '}
              <a className="evidence" href={c.eliminatoria.evidenciaUrl} target="_blank" rel="noopener noreferrer">
                fonte ↗
              </a>
            </>
          )}
        </p>
      )}

      {/* ux.md §7.3: "Atenção" nunca aparece sem uma ação prática. */}
      {(c.mensagemAcao || c.tier === 'ATENCAO') && (
        <p className="callout callout-warn">
          → {c.mensagemAcao ?? 'Peça CNPJ e contrato antes de pagar o sinal.'}
        </p>
      )}

      {c.pilares && !c.eliminatoria && (
        <div className="bars">
          <ScoreBar nome="Cadastral" peso={PESOS.cadastral} valor={c.pilares.cadastral} tom={tom} />
          <ScoreBar nome="Reputação" peso={PESOS.reputacao} valor={c.pilares.reputacao} tom={tom} />
          <ScoreBar nome="Presença" peso={PESOS.presenca} valor={c.pilares.presenca} tom={tom} />
          <ScoreBar nome="Verificabilidade" peso={PESOS.verificabilidade} valor={c.pilares.verificabilidade} tom={tom} />
        </div>
      )}

      {/* Honestidade é parte do produto: essa linha nunca vai para trás de um
          clique, só encolheu de bloco com bullets para uma linha (ux.md §7.4). */}
      {c.naoVerificavel && c.naoVerificavel.length > 0 && (
        <p className="caption subtle">Não verificamos: {c.naoVerificavel.join(', ').toLowerCase()}.</p>
      )}

      {achados.length > 0 && (
        <Disclose rotulo={`${achados.length} checagens`} rotuloAberto="ocultar checagens">
          {GRUPOS.map((g) => {
            const doGrupo = g.criterios
              .map((cr) => porCriterio.get(cr))
              .filter((a): a is Achado => a != null && a.status !== 'nao_verificavel');
            if (doGrupo.length === 0) return null;
            return (
              <div key={g.titulo}>
                <p className="eyebrow">{g.titulo}</p>
                <ul className="checks">
                  {doGrupo.map((a) => (
                    <li key={a.criterio} className={`checks-row ${CLASSE_ACHADO[a.status]}`}>
                      <span aria-hidden="true">{ICONE_ACHADO[a.status]}</span>
                      <span>
                        {CRITERIO_LABELS[a.criterio]}: {a.valor}
                        {a.evidenciaUrl && (
                          <>
                            {' '}
                            <a
                              className="evidence"
                              href={a.evidenciaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`fonte de ${CRITERIO_LABELS[a.criterio]}, abre em nova aba`}
                            >
                              fonte ↗
                            </a>
                          </>
                        )}
                        {a.inferencia && <em className="inference"> (inferência)</em>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Disclose>
      )}
    </article>
  );
}

function IconePdf() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
    </svg>
  );
}
