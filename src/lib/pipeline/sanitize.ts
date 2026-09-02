// Sanitização defensiva do JSON vindo da LLM — nada entra na pipeline sem
// passar por aqui. Regras: URL só http(s); confiança clampada 0–1; critério
// desconhecido é descartado; critério ausente vira "não verificável";
// o CNPJ estrutural vem do que NÓS capturamos na BrasilAPI, nunca do relato
// da LLM.
import type { Achado, CriterioId, DadosVerificacao, ResultadoVerificacao } from '../types';
import { CRITERIO_LABELS } from '../types';
import type { CnpjInfo } from './brasilapi';

const CRITERIOS = Object.keys(CRITERIO_LABELS) as CriterioId[];

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.slice(0, max).trim() : '';
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function boolOuNull(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

function urlValida(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? v.slice(0, 500) : null;
  } catch {
    return null;
  }
}

function clamp01(n: number | null, padrao: number): number {
  if (n == null) return padrao;
  return Math.max(0, Math.min(1, n));
}

export interface CandidatoBruto {
  nome: string;
  cidade: string;
  telefone?: string;
  site?: string;
  instagram?: string;
  fonte?: string;
}

export function sanitizeCandidatos(raw: unknown, cidadePadrao: string, max: number): CandidatoBruto[] {
  const lista = (raw as { candidatos?: unknown[] })?.candidatos;
  if (!Array.isArray(lista)) return [];
  const vistos = new Set<string>();
  const out: CandidatoBruto[] = [];
  for (const item of lista) {
    const o = item as Record<string, unknown>;
    const nome = str(o.nome, 120);
    if (!nome) continue;
    const chave = nome.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push({
      nome,
      cidade: str(o.cidade, 60) || cidadePadrao,
      telefone: str(o.telefone, 30) || undefined,
      site: urlValida(o.site) ?? undefined,
      instagram: str(o.instagram, 60) || undefined,
      fonte: str(o.fonte, 200) || undefined,
    });
    if (out.length >= max) break;
  }
  return out;
}

interface AchadoBruto {
  criterio?: unknown;
  valor?: unknown;
  evidencia_url?: unknown;
  confianca?: unknown;
  inferencia?: unknown;
  extra?: Record<string, unknown>;
}

export function sanitizeAchados(raw: unknown, cnpjInfo: CnpjInfo | null): ResultadoVerificacao {
  const brutos = ((raw as { achados?: unknown[] })?.achados ?? []) as AchadoBruto[];
  const flagsBrutas = (raw as { flags?: unknown[] })?.flags;
  const flags = Array.isArray(flagsBrutas)
    ? flagsBrutas.filter((f): f is string => typeof f === 'string').map((f) => f.slice(0, 60))
    : [];

  const porCriterio = new Map<CriterioId, AchadoBruto>();
  for (const b of brutos) {
    const c = str(b.criterio, 40) as CriterioId;
    if (CRITERIOS.includes(c) && !porCriterio.has(c)) porCriterio.set(c, b);
  }

  const extra = (c: CriterioId): Record<string, unknown> => porCriterio.get(c)?.extra ?? {};

  // --- DadosVerificacao: estrutura do score, montada em código ---
  const cnaeCompativel = boolOuNull(extra('cnae_compativel').compativel);
  const dados: DadosVerificacao = {
    cnpj: cnpjInfo
      ? {
          numero: cnpjInfo.numero,
          situacao: cnpjInfo.situacao,
          aberturaISO: cnpjInfo.aberturaISO,
          idadeAnos: cnpjInfo.idadeAnos,
          cnae: cnpjInfo.cnae,
          cnaeCompativel: cnaeCompativel ?? true,
          evidenciaUrl: cnpjInfo.url,
        }
      : null,
    sancoes: {
      encontradas: boolOuNull(extra('sancoes_publicas').encontradas) ?? false,
      detalhe: str(extra('sancoes_publicas').detalhe) || undefined,
      evidenciaUrl: urlValida(porCriterio.get('sancoes_publicas')?.evidencia_url) ?? undefined,
    },
    google: {
      nota: num(extra('google_rating').nota),
      numAvaliacoes: num(extra('google_rating').num_avaliacoes),
      evidenciaUrl: urlValida(porCriterio.get('google_rating')?.evidencia_url) ?? undefined,
    },
    negativasGraves: clamp01(num(extra('teor_avaliacoes').negativas_graves), 0),
    reclameAqui: (() => {
      const s = str(extra('reclame_aqui').status_ra, 20);
      const status = s === 'nao_recomendada' ? 'nao_recomendada' : s === 'ok' ? 'ok' : 'sem_pagina';
      return {
        status: status as DadosVerificacao['reclameAqui']['status'],
        nota: num(extra('reclame_aqui').nota_ra) ?? undefined,
        evidenciaUrl: urlValida(porCriterio.get('reclame_aqui')?.evidencia_url) ?? undefined,
      };
    })(),
    noticiaGolpe: {
      confirmada: boolOuNull(extra('noticias_negativas').golpe_confirmado) ?? false,
      teor: str(extra('noticias_negativas').teor) || undefined,
      evidenciaUrl: urlValida(porCriterio.get('noticias_negativas')?.evidencia_url) ?? undefined,
    },
    processos: {
      volumeAlto: boolOuNull(extra('processos_judiciais').volume_alto) ?? false,
      evidenciaUrl: urlValida(porCriterio.get('processos_judiciais')?.evidencia_url) ?? undefined,
    },
    siteComCnpjBatendo: boolOuNull(extra('site_com_cnpj').bate),
    instagramAtivo60d: boolOuNull(extra('instagram_ativo').ativo),
    contatoConsistente: boolOuNull(extra('contato_consistente').consistente),
    emDiretoriosSetor: boolOuNull(extra('diretorios_setor').presente),
    flags,
  };

  // Guardrail: golpe "confirmado" sem URL de evidência NÃO é eliminatória.
  if (dados.noticiaGolpe.confirmada && !dados.noticiaGolpe.evidenciaUrl) {
    dados.noticiaGolpe.confirmada = false;
    if (!dados.flags.includes('verificacao_inconclusiva')) dados.flags.push('verificacao_inconclusiva');
  }
  if (dados.sancoes.encontradas && !dados.sancoes.evidenciaUrl) {
    dados.sancoes.encontradas = false;
    if (!dados.flags.includes('verificacao_inconclusiva')) dados.flags.push('verificacao_inconclusiva');
  }

  // --- Achados de apresentação: 13 critérios, sempre completos ---
  const achados: Achado[] = CRITERIOS.map((criterio) => {
    // CNPJ: a verdade vem da BrasilAPI capturada em código.
    if (criterio === 'cnpj_ativo') {
      return cnpjInfo
        ? {
            criterio,
            valor: `CNPJ ${cnpjInfo.numero} — situação ${cnpjInfo.situacao} na Receita Federal`,
            evidenciaUrl: cnpjInfo.url,
            confianca: 0.98,
            status: cnpjInfo.situacao === 'ATIVA' ? 'ok' : 'eliminatorio',
          }
        : { criterio, valor: 'CNPJ não localizado em fontes públicas', evidenciaUrl: null, confianca: 0, status: 'nao_verificavel' };
    }
    if (criterio === 'idade_empresa' && cnpjInfo) {
      return {
        criterio,
        valor: `Empresa aberta em ${cnpjInfo.aberturaISO.slice(0, 4) || '?'} (${cnpjInfo.idadeAnos} anos)`,
        evidenciaUrl: cnpjInfo.url,
        confianca: 0.98,
        status: cnpjInfo.idadeAnos >= 2 ? 'ok' : 'atencao',
      };
    }
    const b = porCriterio.get(criterio);
    const url = urlValida(b?.evidencia_url);
    if (!b || !url) {
      return { criterio, valor: str(b?.valor) || 'Não encontrado em fontes públicas', evidenciaUrl: null, confianca: 0, status: 'nao_verificavel' };
    }
    const status: Achado['status'] =
      (criterio === 'noticias_negativas' && dados.noticiaGolpe.confirmada) ||
      (criterio === 'sancoes_publicas' && dados.sancoes.encontradas) ||
      (criterio === 'reclame_aqui' && dados.reclameAqui.status === 'nao_recomendada')
        ? 'eliminatorio'
        : (criterio === 'cnae_compativel' && cnaeCompativel === false) ||
            (criterio === 'processos_judiciais' && dados.processos.volumeAlto) ||
            (criterio === 'teor_avaliacoes' && dados.negativasGraves > 0.1)
          ? 'atencao'
          : 'ok';
    return {
      criterio,
      valor: str(b.valor) || 'Verificado',
      evidenciaUrl: url,
      confianca: clamp01(num(b.confianca), 0.5),
      status,
      inferencia: boolOuNull(b.inferencia) ?? undefined,
    };
  });

  return { dados, achados };
}

export interface RefinoSanitizado {
  veredito: 'mantem' | 'ajusta' | 'reclassifica' | 'inconclusivo';
  achadosCorrigidos: AchadoBruto[];
  flags: string[];
  justificativa: string;
}

export function sanitizeRefino(raw: unknown): RefinoSanitizado {
  const o = (raw ?? {}) as Record<string, unknown>;
  const v = str(o.veredito, 20);
  const veredito = (['mantem', 'ajusta', 'reclassifica', 'inconclusivo'].includes(v) ? v : 'mantem') as RefinoSanitizado['veredito'];
  const flags = Array.isArray(o.flags)
    ? (o.flags as unknown[]).filter((f): f is string => typeof f === 'string').map((f) => f.slice(0, 60))
    : [];
  if (veredito === 'inconclusivo' && !flags.includes('verificacao_inconclusiva')) {
    flags.push('verificacao_inconclusiva');
  }
  return {
    veredito,
    achadosCorrigidos: Array.isArray(o.achados_corrigidos) ? (o.achados_corrigidos as AchadoBruto[]) : [],
    flags,
    justificativa: str(o.justificativa, 400),
  };
}

export function sanitizeJustificativas(raw: unknown): Map<number, string> {
  const out = new Map<number, string>();
  const itens = (raw as { itens?: unknown[] })?.itens;
  if (!Array.isArray(itens)) return out;
  for (const item of itens) {
    const o = item as Record<string, unknown>;
    const i = num(o.indice);
    const j = str(o.justificativa, 400);
    if (i != null && j) out.set(i, j);
  }
  return out;
}
