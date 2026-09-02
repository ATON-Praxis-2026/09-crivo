// Motor de score — REGRA DE OURO do dossiê: a IA pesquisa e lê; a NOTA é
// código determinístico, auditável, com pesos declarados. Nenhuma LLM decide nota.
import type { Achado, CriterioId, DadosVerificacao, ScoreResultado, Tier } from './types';

// Pesos declarados (a banca pode auditar) — P0 do dossiê.
export const PESOS = { cadastral: 30, reputacao: 40, presenca: 20, verificabilidade: 10 } as const;

export const FRONTEIRAS = { verificado: 75, atencao: 50 } as const;
const MARGEM_BORDA = 8; // gatilho do Refinador: score a ±8 das fronteiras

function media(valores: Array<boolean | null>): number {
  if (valores.length === 0) return 0;
  return valores.filter((v) => v === true).length / valores.length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// rating × log10(nAval+1), normalizado (5 estrelas × log10(1001) ≈ 15 = teto).
function notaGoogle(d: DadosVerificacao): number {
  if (d.google.nota == null) return 0.5; // sem dado = neutro, não punitivo
  const n = d.google.numAvaliacoes ?? 0;
  return clamp01((d.google.nota * Math.log10(n + 1)) / 15);
}

function notaRA(d: DadosVerificacao): number {
  if (d.reclameAqui.status === 'sem_pagina') return 0.5; // neutro (dossiê)
  if (d.reclameAqui.nota == null) return 0.5;
  return clamp01(d.reclameAqui.nota / 10);
}

export function pegadaDigitalBaixa(d: DadosVerificacao): boolean {
  const sinais = [
    d.siteComCnpjBatendo,
    d.instagramAtivo60d,
    d.emDiretoriosSetor,
    d.google.nota != null,
    d.reclameAqui.status !== 'sem_pagina',
  ];
  return sinais.filter((s) => s === true).length <= 1;
}

export function scoreFornecedor(
  d: DadosVerificacao,
  achados: Achado[],
): ScoreResultado {
  const flags = [...d.flags];

  // ---- Eliminatórias: zeram o score e explicam (sempre critério + evidência) ----
  if (d.cnpj && d.cnpj.situacao.toUpperCase() !== 'ATIVA') {
    return zerado('cnpj_ativo', `CNPJ com situação ${d.cnpj.situacao} na Receita Federal`, d.cnpj.evidenciaUrl, flags);
  }
  if (d.sancoes.encontradas) {
    return zerado('sancoes_publicas', d.sancoes.detalhe ?? 'Sanção pública registrada (CEIS/CNEP)', d.sancoes.evidenciaUrl, flags);
  }
  if (d.noticiaGolpe.confirmada) {
    return zerado('noticias_negativas', d.noticiaGolpe.teor ?? 'Notícia de golpe/fraude confirmada com evidência', d.noticiaGolpe.evidenciaUrl, flags);
  }
  if (d.reclameAqui.status === 'nao_recomendada') {
    return zerado('reclame_aqui', 'Status "Não recomendada" no Reclame Aqui', d.reclameAqui.evidenciaUrl, flags);
  }

  // ---- Pilares (0–1) ----
  const cadastral = media([
    d.cnpj != null && d.cnpj.idadeAnos >= 2,
    d.cnpj != null && d.cnpj.cnaeCompativel,
    d.cnpj != null,
  ]);
  const reputacao = clamp01(
    0.6 * notaGoogle(d) + 0.25 * notaRA(d) + 0.15 * (1 - clamp01(d.negativasGraves)),
  );
  const presenca = media([
    d.siteComCnpjBatendo,
    d.instagramAtivo60d,
    d.contatoConsistente,
    d.emDiretoriosSetor,
  ]);
  const verificaveis = achados.filter((a) => a.status !== 'nao_verificavel').length;
  const verificabilidade = achados.length > 0 ? verificaveis / achados.length : 0;

  const total = Math.round(
    PESOS.cadastral * cadastral +
      PESOS.reputacao * reputacao +
      PESOS.presenca * presenca +
      PESOS.verificabilidade * verificabilidade,
  );

  // ---- Tiers + regra de justiça: pouca pegada digital NUNCA vira Evitar ----
  const baixa = pegadaDigitalBaixa(d);
  if (baixa && !flags.includes('pegada_digital_baixa')) flags.push('pegada_digital_baixa');

  let tier: Tier =
    total >= FRONTEIRAS.verificado ? 'VERIFICADO'
    : total >= FRONTEIRAS.atencao ? 'ATENCAO'
    : baixa ? 'ATENCAO'
    : 'EVITAR';

  let mensagemAcao: string | undefined;

  // CNPJ não localizado não é eliminatória — impede o selo Verificado, mas
  // AUSÊNCIA de dado também nunca rebaixa a Evitar (regra de justiça do dossiê):
  // sem CNPJ o pilar cadastral zera e o score cai por ausência, não por demérito.
  if (d.cnpj == null) {
    if (!flags.includes('cnpj_nao_localizado')) flags.push('cnpj_nao_localizado');
    if (tier === 'VERIFICADO' || tier === 'EVITAR') tier = 'ATENCAO';
    mensagemAcao =
      'Não conseguimos confirmar o CNPJ desta empresa. Peça o CNPJ e a nota fiscal antes de pagar qualquer sinal.';
  }
  if (tier === 'ATENCAO' && baixa && !mensagemAcao) {
    mensagemAcao =
      'Empresa com pouca presença digital verificável — pode ser um bom fornecedor pouco visível. Confirme referências diretas antes de fechar.';
  }

  return {
    total,
    tier,
    eliminatoria: null,
    pilares: { cadastral, reputacao, presenca, verificabilidade },
    flags,
    mensagemAcao,
  };
}

function zerado(
  criterio: CriterioId,
  motivo: string,
  evidenciaUrl: string | undefined,
  flags: string[],
): ScoreResultado {
  return {
    total: 0,
    tier: 'EVITAR',
    eliminatoria: { criterio, motivo, evidenciaUrl },
    pilares: { cadastral: 0, reputacao: 0, presenca: 0, verificabilidade: 0 },
    flags,
  };
}

// Gatilhos do Refinador (P1): só casos de borda passam pela auditoria adversarial.
export function precisaRefinar(score: ScoreResultado, achados: Achado[]): string[] {
  const gatilhos: string[] = [];
  const { total } = score;

  if (
    Math.abs(total - FRONTEIRAS.atencao) <= MARGEM_BORDA ||
    Math.abs(total - FRONTEIRAS.verificado) <= MARGEM_BORDA
  ) {
    gatilhos.push('score_na_fronteira');
  }
  if (score.flags.includes('possivel_homonimo')) gatilhos.push('possivel_homonimo');
  if (
    score.eliminatoria &&
    achados.filter((a) => a.status === 'eliminatorio').length === 1 &&
    (achados.find((a) => a.status === 'eliminatorio')?.confianca ?? 1) < 0.7
  ) {
    gatilhos.push('eliminatoria_evidencia_fraca');
  }
  const comDado = achados.filter((a) => a.status !== 'nao_verificavel');
  const confMedia = comDado.length
    ? comDado.reduce((s, a) => s + a.confianca, 0) / comDado.length
    : 0;
  if (confMedia < 0.6) gatilhos.push('confianca_media_baixa');
  if (score.flags.includes('pegada_digital_baixa')) gatilhos.push('pegada_digital_baixa');

  return gatilhos;
}
