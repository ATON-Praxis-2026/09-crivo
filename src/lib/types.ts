// Contratos compartilhados entre pipeline, API e UI.
// Regra de ouro do dossiê: o SCORE É CÓDIGO (score.ts) — a LLM produz
// achados com evidência; a nota nunca sai de um modelo.

export type Tier = 'VERIFICADO' | 'ATENCAO' | 'EVITAR';

// Critérios verificáveis do checklist P0 (o item 14 — protestos/CNDs — é roadmap).
export type CriterioId =
  | 'cnpj_ativo'
  | 'idade_empresa'
  | 'cnae_compativel'
  | 'sancoes_publicas'
  | 'google_rating'
  | 'teor_avaliacoes'
  | 'reclame_aqui'
  | 'noticias_negativas'
  | 'processos_judiciais'
  | 'site_com_cnpj'
  | 'instagram_ativo'
  | 'contato_consistente'
  | 'diretorios_setor';

export const CRITERIO_LABELS: Record<CriterioId, string> = {
  cnpj_ativo: 'CNPJ ativo na Receita Federal',
  idade_empresa: 'Idade da empresa',
  cnae_compativel: 'CNAE compatível',
  sancoes_publicas: 'Sanções públicas',
  google_rating: 'Nota no Google',
  teor_avaliacoes: 'Teor das avaliações',
  reclame_aqui: 'Reclame Aqui',
  noticias_negativas: 'Notícias de golpe ou calote',
  processos_judiciais: 'Processos judiciais',
  site_com_cnpj: 'CNPJ no rodapé do site',
  instagram_ativo: 'Redes ativas',
  contato_consistente: 'Contato bate entre canais',
  diretorios_setor: 'Diretórios do setor',
};

export const CRITERIOS_TOTais_MVP = 13;

// Um achado por critério: fato + evidência + confiança. Sem URL => não verificável.
export interface Achado {
  criterio: CriterioId;
  valor: string; // fato curto e factual ("CNPJ ativo desde 2017", "nota 4,6 · 213 avaliações")
  evidenciaUrl: string | null; // null = nao_verificavel
  confianca: number; // 0–1
  status: 'ok' | 'atencao' | 'eliminatorio' | 'nao_verificavel';
  inferencia?: boolean; // separar FATO de INFERÊNCIA (regra do dossiê)
}

// Dados estruturados que alimentam o motor de score (código, não LLM).
export interface DadosVerificacao {
  cnpj: {
    numero: string;
    situacao: string; // 'ATIVA' | 'BAIXADA' | 'INAPTA' | 'SUSPENSA' | ...
    aberturaISO: string;
    idadeAnos: number;
    cnae: string;
    cnaeCompativel: boolean;
    evidenciaUrl: string;
  } | null; // null = CNPJ não localizado (NÃO é eliminatória — vira Atenção)
  sancoes: { encontradas: boolean; detalhe?: string; evidenciaUrl?: string };
  google: { nota: number | null; numAvaliacoes: number | null; evidenciaUrl?: string };
  negativasGraves: number; // 0–1: proporção de negativas tipo "sumiu/não entregou" (pesam 3×)
  reclameAqui: {
    status: 'sem_pagina' | 'ok' | 'nao_recomendada';
    nota?: number; // 0–10
    evidenciaUrl?: string;
  };
  noticiaGolpe: { confirmada: boolean; teor?: string; evidenciaUrl?: string };
  processos: { volumeAlto: boolean; evidenciaUrl?: string };
  siteComCnpjBatendo: boolean | null; // null = não verificável
  instagramAtivo60d: boolean | null;
  contatoConsistente: boolean | null;
  emDiretoriosSetor: boolean | null;
  flags: string[]; // 'possivel_homonimo' | 'pegada_digital_baixa' | 'verificacao_inconclusiva' | ...
}

export interface ResultadoVerificacao {
  dados: DadosVerificacao;
  achados: Achado[];
}

export interface ScoreResultado {
  total: number; // 0–100
  tier: Tier;
  eliminatoria: { criterio: CriterioId; motivo: string; evidenciaUrl?: string } | null;
  pilares: { cadastral: number; reputacao: number; presenca: number; verificabilidade: number }; // 0–1
  flags: string[];
  mensagemAcao?: string; // ex.: CNPJ não localizado → "peça o CNPJ antes de pagar sinal"
}

export type CandidatoStatus =
  | 'aguardando'
  | 'verificando'
  | 'refinando'
  | 'concluido'
  | 'nao_verificado'; // falha individual nunca derruba o ranking

export interface CandidatoResultado {
  id: string;
  nome: string;
  cidade: string;
  telefone?: string;
  site?: string;
  instagram?: string;
  fonte?: string; // onde o Descobridor encontrou
  status: CandidatoStatus;
  achados?: Achado[];
  score?: number;
  tier?: Tier;
  pilares?: ScoreResultado['pilares'];
  eliminatoria?: ScoreResultado['eliminatoria'];
  justificativa?: string; // 2 linhas, factual, escrita pela LLM ao final
  naoVerificavel?: string[]; // lista honesta (labels) do que não foi checável
  flags?: string[];
  mensagemAcao?: string;
  refinado?: boolean; // passou pelo Refinador (caso de borda)
  doCache?: boolean; // reaproveitado do cache de 30 dias
}

export type CategoriaStatus = 'aguardando' | 'descobrindo' | 'verificando' | 'concluida' | 'erro';

export interface RankingCategoria {
  categoriaId: string;
  categoriaLabel: string;
  status: CategoriaStatus;
  candidatos: CandidatoResultado[];
}

export interface RankingResponse {
  id: string;
  cidade: string;
  criadoEm: string; // ISO
  mock: boolean; // true = modo demonstração (fornecedores fictícios)
  status: 'rodando' | 'concluida' | 'erro';
  categorias: RankingCategoria[];
  avisos: string[]; // ex.: lembrete ECAD, fluxo feira-expositor
}

// POST /api/rankings
export interface CriarRankingBody {
  cidade: string;
  categorias: string[]; // ids da taxonomia (checklist P2 já mapeado, ou categoria direta)
  avisos?: string[];
}

export interface CriarRankingResponse {
  id: string;
}
