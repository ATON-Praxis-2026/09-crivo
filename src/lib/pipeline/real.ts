// Pipeline REAL — ativada automaticamente quando ANTHROPIC_API_KEY existe.
// Descobridor (Haiku) → Verificador ×N com pLimit(3) (Sonnet + BrasilAPI) →
// Refinador só em casos de borda → re-score em CÓDIGO → justificativas em lote.
import { randomUUID } from 'crypto';
import { categoriaLabel } from '../categorias';
import { LIMITS, MODELS } from '../config';
import { pLimit, withTimeout } from '../concurrency';
import { getStore } from '../db';
import { precisaRefinar, scoreFornecedor } from '../score';
import { CRITERIO_LABELS, type Achado, type CandidatoResultado, type ScoreResultado } from '../types';
import { runAgentLoop, webSearchTool } from './anthropic';
import { consultaCnpj, type CnpjInfo } from './brasilapi';
import { PROMPT_DESCOBRIDOR, PROMPT_JUSTIFICATIVAS, PROMPT_REFINADOR, PROMPT_VERIFICADOR } from './prompts';
import {
  sanitizeAchados, sanitizeCandidatos, sanitizeJustificativas, sanitizeRefino,
  type CandidatoBruto,
} from './sanitize';

// ---------- Schemas das tools de submissão ----------
const SCHEMA_CANDIDATOS = {
  type: 'object',
  properties: {
    candidatos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' }, cidade: { type: 'string' },
          telefone: { type: 'string' }, site: { type: 'string' },
          instagram: { type: 'string' }, fonte: { type: 'string' },
        },
        required: ['nome'],
      },
    },
  },
  required: ['candidatos'],
};

const DESCRICAO_EXTRA = `Campos "extra" por critério: google_rating {nota, num_avaliacoes} · teor_avaliacoes {negativas_graves: 0-1} · reclame_aqui {status_ra: "ok"|"nao_recomendada"|"sem_pagina", nota_ra} · noticias_negativas {golpe_confirmado: bool, teor} · processos_judiciais {volume_alto: bool} · site_com_cnpj {bate: bool} · instagram_ativo {ativo: bool} · contato_consistente {consistente: bool} · diretorios_setor {presente: bool} · cnae_compativel {compativel: bool} · sancoes_publicas {encontradas: bool, detalhe}`;

const SCHEMA_ACHADOS = {
  type: 'object',
  properties: {
    achados: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterio: { type: 'string', enum: Object.keys(CRITERIO_LABELS) },
          valor: { type: 'string' },
          evidencia_url: { type: ['string', 'null'] },
          confianca: { type: 'number' },
          inferencia: { type: 'boolean' },
          extra: { type: 'object' },
        },
        required: ['criterio', 'valor'],
      },
    },
    flags: { type: 'array', items: { type: 'string' } },
  },
  required: ['achados'],
};

const SCHEMA_REFINO = {
  type: 'object',
  properties: {
    veredito: { type: 'string', enum: ['mantem', 'ajusta', 'reclassifica', 'inconclusivo'] },
    achados_corrigidos: (SCHEMA_ACHADOS.properties as Record<string, unknown>).achados,
    novas_evidencias: { type: 'array', items: { type: 'string' } },
    flags: { type: 'array', items: { type: 'string' } },
    justificativa: { type: 'string' },
  },
  required: ['veredito'],
};

const SCHEMA_JUSTIFICATIVAS = {
  type: 'object',
  properties: {
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: { indice: { type: 'number' }, justificativa: { type: 'string' } },
        required: ['indice', 'justificativa'],
      },
    },
  },
  required: ['itens'],
};

// ---------- Agentes ----------
async function descobridor(categoria: string, cidade: string): Promise<CandidatoBruto[]> {
  const captura = await runAgentLoop({
    model: MODELS.descobridor,
    system: PROMPT_DESCOBRIDOR,
    user: `Categoria: ${categoriaLabel(categoria)}. Cidade: ${cidade}. Encontre os candidatos e submeta.`,
    maxTokens: 2500,
    serverTools: [webSearchTool(LIMITS.buscasDescobridor)],
    clientTools: [
      {
        name: 'submit_candidatos',
        description: 'Submete a lista final de candidatos encontrados (encerra a tarefa).',
        input_schema: SCHEMA_CANDIDATOS,
        handler: async (input) => ({ captura: input }),
      },
    ],
  });
  return sanitizeCandidatos(captura, cidade, 15);
}

interface VerificacaoBruta {
  raw: { achados: unknown[]; flags?: unknown[] };
  cnpjInfo: CnpjInfo | null;
}

async function verificarUm(cand: CandidatoBruto): Promise<VerificacaoBruta> {
  let cnpjInfo: CnpjInfo | null = null;
  const captura = await runAgentLoop({
    model: MODELS.verificador,
    system: PROMPT_VERIFICADOR,
    user: `Fornecedor: ${cand.nome} — ${cand.cidade}.` +
      (cand.telefone ? ` Telefone conhecido: ${cand.telefone}.` : '') +
      (cand.site ? ` Site: ${cand.site}.` : '') +
      (cand.instagram ? ` Instagram: ${cand.instagram}.` : '') +
      ` Verifique o checklist e submeta os achados.`,
    maxTokens: 3500,
    serverTools: [webSearchTool(LIMITS.buscasVerificador)],
    clientTools: [
      {
        name: 'consulta_cnpj',
        description: 'Consulta um CNPJ na BrasilAPI (Receita Federal). Passe o CNPJ com ou sem pontuação.',
        input_schema: { type: 'object', properties: { cnpj: { type: 'string' } }, required: ['cnpj'] },
        handler: async (input) => {
          const info = await consultaCnpj(String((input as { cnpj?: unknown })?.cnpj ?? ''));
          if (info) cnpjInfo = info; // a verdade estrutural fica com o código
          return {
            resultado: info
              ? JSON.stringify({ situacao: info.situacao, abertura: info.aberturaISO, idade_anos: info.idadeAnos, cnae: info.cnae, cnae_descricao: info.cnaeDescricao, porte: info.porte })
              : JSON.stringify({ erro: 'CNPJ não encontrado ou inválido' }),
          };
        },
      },
      {
        name: 'submit_achados',
        description: `Submete os achados do checklist (encerra a tarefa). ${DESCRICAO_EXTRA}`,
        input_schema: SCHEMA_ACHADOS,
        handler: async (input) => ({ captura: input }),
      },
    ],
  });
  if (!captura) throw new Error('verificador não submeteu achados');
  return { raw: captura as VerificacaoBruta['raw'], cnpjInfo };
}

async function refinar(
  cand: CandidatoBruto,
  bruta: VerificacaoBruta,
  tierProvisorio: string,
  gatilhos: string[],
): Promise<VerificacaoBruta> {
  const captura = await runAgentLoop({
    model: MODELS.refinador,
    system: PROMPT_REFINADOR,
    user:
      `Fornecedor: ${cand.nome} — ${cand.cidade}. Tier provisório: ${tierProvisorio}. ` +
      `Gatilhos de borda: ${gatilhos.join(', ')}.\n\nAchados atuais (JSON):\n` +
      JSON.stringify(bruta.raw).slice(0, 6000) +
      `\n\nAudite e submeta via submit_refino.`,
    maxTokens: 2500,
    serverTools: [webSearchTool(LIMITS.buscasRefinador)],
    clientTools: [
      {
        name: 'submit_refino',
        description: `Submete o resultado da auditoria (encerra a tarefa). ${DESCRICAO_EXTRA}`,
        input_schema: SCHEMA_REFINO,
        handler: async (input) => ({ captura: input }),
      },
    ],
  });
  const refino = sanitizeRefino(captura);
  if (refino.veredito === 'mantem' || refino.achadosCorrigidos.length === 0) {
    const flags = [...(Array.isArray(bruta.raw.flags) ? bruta.raw.flags : []), ...refino.flags];
    return { raw: { ...bruta.raw, flags }, cnpjInfo: bruta.cnpjInfo };
  }
  // Sobrepõe os critérios corrigidos aos achados originais.
  const porCriterio = new Map<string, unknown>();
  for (const a of bruta.raw.achados) {
    const c = (a as { criterio?: unknown })?.criterio;
    if (typeof c === 'string') porCriterio.set(c, a);
  }
  for (const a of refino.achadosCorrigidos) {
    const c = (a as { criterio?: unknown })?.criterio;
    if (typeof c === 'string') porCriterio.set(c, a);
  }
  const flags = [...(Array.isArray(bruta.raw.flags) ? bruta.raw.flags : []), ...refino.flags];
  return { raw: { achados: [...porCriterio.values()], flags }, cnpjInfo: bruta.cnpjInfo };
}

async function justificativasEmLote(
  concluidos: CandidatoResultado[],
): Promise<Map<number, string>> {
  const itens = concluidos.map((c, indice) => ({
    indice,
    nome: c.nome,
    tier: c.tier,
    score: c.score,
    achados: (c.achados ?? [])
      .filter((a) => a.evidenciaUrl)
      .slice(0, 6)
      .map((a) => ({ criterio: a.criterio, valor: a.valor, url: a.evidenciaUrl })),
    nao_verificavel: c.naoVerificavel,
  }));
  const captura = await runAgentLoop({
    model: MODELS.justificativas,
    system: PROMPT_JUSTIFICATIVAS,
    user: `Fornecedores (JSON):\n${JSON.stringify(itens).slice(0, 12000)}\n\nEscreva as justificativas e submeta.`,
    maxTokens: 2000,
    clientTools: [
      {
        name: 'submit_justificativas',
        description: 'Submete as justificativas finais (encerra a tarefa).',
        input_schema: SCHEMA_JUSTIFICATIVAS,
        handler: async (input) => ({ captura: input }),
      },
    ],
  });
  return sanitizeJustificativas(captura);
}

// ---------- Montagem do resultado final de um candidato ----------
function montarFinal(
  base: CandidatoResultado,
  bruta: VerificacaoBruta,
  refinado: boolean,
): CandidatoResultado {
  const { dados, achados } = sanitizeAchados(bruta.raw, bruta.cnpjInfo);
  const score: ScoreResultado = scoreFornecedor(dados, achados);
  return {
    ...base,
    status: 'concluido',
    achados,
    score: score.total,
    tier: score.tier,
    pilares: score.pilares,
    eliminatoria: score.eliminatoria,
    flags: score.flags,
    mensagemAcao: score.mensagemAcao,
    naoVerificavel: achados
      .filter((a) => a.status === 'nao_verificavel')
      .map((a) => CRITERIO_LABELS[a.criterio]),
    refinado,
  };
}

// ---------- Orquestrador ----------
export async function runPipeline(id: string, cidade: string, categorias: string[]): Promise<void> {
  const store = getStore();
  try {
    for (const catId of categorias) {
      try {
        store.setCategoriaStatus(id, catId, 'descobrindo');
        const cands = (await withTimeout(descobridor(catId, cidade), 120_000, 'descobridor'))
          .slice(0, LIMITS.candidatosPorCategoria);

        const bases: CandidatoResultado[] = cands.map((c) => ({
          id: randomUUID(),
          nome: c.nome,
          cidade: c.cidade,
          telefone: c.telefone,
          site: c.site,
          instagram: c.instagram,
          fonte: c.fonte,
          status: 'aguardando',
        }));
        for (const b of bases) store.addCandidato(id, catId, b);
        store.setCategoriaStatus(id, catId, 'verificando');

        const limit = pLimit(LIMITS.verificadoresParalelos);
        const finais = await Promise.all(
          bases.map((base, i) =>
            limit(() => processarCandidato(id, catId, base, cands[i])),
          ),
        );

        const concluidos = finais.filter(
          (f): f is CandidatoResultado => f != null && f.status === 'concluido' && !f.justificativa,
        );
        if (concluidos.length > 0) {
          try {
            const js = await withTimeout(justificativasEmLote(concluidos), 90_000, 'justificativas');
            concluidos.forEach((c, i) => {
              const j = js.get(i);
              if (j) store.updateCandidato(id, catId, c.id, { justificativa: j });
            });
          } catch (e) {
            console.warn('[pipeline] justificativas falharam (seguindo sem):', e);
          }
        }
        store.setCategoriaStatus(id, catId, 'concluida');
      } catch (e) {
        console.error(`[pipeline] categoria ${catId} falhou:`, e);
        store.setCategoriaStatus(id, catId, 'erro');
      }
    }
    store.setBuscaStatus(id, 'concluida');
  } catch (e) {
    console.error('[pipeline] falha geral:', e);
    store.setBuscaStatus(id, 'erro');
  }
}

async function processarCandidato(
  buscaId: string,
  catId: string,
  base: CandidatoResultado,
  cand: CandidatoBruto,
): Promise<CandidatoResultado | null> {
  const store = getStore();

  // Cache do moat: verificado há <30 dias sai na hora.
  const emCache = store.getCache(cand.nome, cand.cidade, LIMITS.cacheDias);
  if (emCache) {
    const final: CandidatoResultado = {
      ...emCache,
      id: base.id,
      status: 'concluido',
      doCache: true,
    };
    store.updateCandidato(buscaId, catId, base.id, final);
    return final;
  }

  store.updateCandidato(buscaId, catId, base.id, { status: 'verificando' });

  let bruta: VerificacaoBruta | null = null;
  for (let tentativa = 0; tentativa <= LIMITS.retriesPorFornecedor; tentativa++) {
    try {
      bruta = await withTimeout(verificarUm(cand), LIMITS.timeoutMs, `verificador ${cand.nome}`);
      break;
    } catch (e) {
      if (tentativa === LIMITS.retriesPorFornecedor) {
        console.warn(`[pipeline] ${cand.nome}: verificação falhou definitivamente`, e);
        store.updateCandidato(buscaId, catId, base.id, {
          status: 'nao_verificado',
          mensagemAcao: 'A verificação automática falhou após nova tentativa. Este fornecedor não entra no ranking.',
        });
        return null;
      }
    }
  }
  if (!bruta) return null;

  let final = montarFinal(base, bruta, false);
  const gatilhos = precisaRefinar(
    { total: final.score ?? 0, tier: final.tier ?? 'ATENCAO', eliminatoria: final.eliminatoria ?? null, pilares: final.pilares ?? { cadastral: 0, reputacao: 0, presenca: 0, verificabilidade: 0 }, flags: final.flags ?? [] },
    final.achados ?? [],
  );

  if (gatilhos.length > 0) {
    store.updateCandidato(buscaId, catId, base.id, { ...final, status: 'refinando' });
    try {
      const refinada = await withTimeout(
        refinar(cand, bruta, final.tier ?? 'ATENCAO', gatilhos),
        LIMITS.timeoutMs,
        `refinador ${cand.nome}`,
      );
      final = montarFinal(base, refinada, true);
    } catch (e) {
      console.warn(`[pipeline] refino de ${cand.nome} falhou (mantendo verificação original):`, e);
      final = { ...final, flags: [...(final.flags ?? []), 'refino_indisponivel'], refinado: false };
    }
  }

  store.updateCandidato(buscaId, catId, base.id, final);
  store.putCache(cand.nome, cand.cidade, final);
  return final;
}
