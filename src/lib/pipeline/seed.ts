// Base da DEMONSTRAÇÃO — Fortaleza/CE.
//
// Dois tipos de registro convivem aqui, e a separação é a regra, não um detalhe:
//
// • `reais`     — empresas que EXISTEM, com dados colhidos em fontes públicas
//                 (base pública de CNPJ da Receita, site oficial, Google,
//                 Reclame Aqui). Só ocupam desfechos POSITIVOS. Nenhum número
//                 de reputação é inventado: a nota que a tela mostra sai do
//                 mesmo `score.ts` da pipeline real, aplicado a estes dados.
//
// • `ficticios` — empresas INVENTADAS. São as ÚNICAS que podem receber
//                 "Atenção" ou "Evitar". Regra RN-18 do dossiê: o produto nunca
//                 fabrica reputação negativa de empresa que existe de verdade.
//
// Quem faz esse casamento (perfil de desfecho → bucket) é `mock.ts`.
import bruto from '../../../seed/fortaleza.json';

export interface RegistroGoogle {
  nota: number;
  avaliacoes: number;
  url: string;
}

export interface RegistroReclameAqui {
  status: 'sem_pagina' | 'ok' | 'nao_recomendada';
  nota?: number;
  url?: string;
}

/** Um fornecedor da base de demonstração, real ou fictício. */
export interface RegistroFornecedor {
  nome: string;
  razaoSocial?: string;
  cnpj?: string;
  situacao?: string; // ATIVA | BAIXADA | INAPTA | SUSPENSA
  abertura?: string; // AAAA-MM-DD
  cnae?: string; // 0000-0/00
  cnaeDescricao?: string;
  /** false = CNAE de outra atividade (vira "Atenção", nunca eliminatória). */
  cnaeCompativel?: boolean;
  bairro?: string;
  telefone?: string;
  site?: string;
  instagram?: string; // com @
  google?: RegistroGoogle;
  reclameAqui?: RegistroReclameAqui;
  /** URL pública onde o CNPJ pode ser conferido (evidência do critério 1). */
  fonteCnpj?: string;
  /** O rodapé do site exibe o CNPJ e ele bate com a Receita? */
  siteComCnpj?: boolean;
  /** Perfil com publicação nos últimos 60 dias? */
  instagramAtivo?: boolean;
  /** Mesmo telefone no site, no Google e nas redes? */
  contatoConsistente?: boolean;
  /** Aparece em diretório do setor (Fortaleza CVB, ABEOC-CE, marketplaces)? */
  emDiretorios?: boolean;
  /** Preenchido pelo loader a partir do bucket — não vem do JSON. */
  real: boolean;
}

interface CategoriaSeed {
  /** CNAE oficial da atividade (tabela CNAE 2.3 do IBGE). */
  cnae?: string;
  cnaeDescricao?: string;
  reais?: Omit<RegistroFornecedor, 'real'>[];
  ficticios?: Omit<RegistroFornecedor, 'real'>[];
}

interface SeedArquivo {
  cidade: string;
  uf: string;
  categorias: Record<string, CategoriaSeed>;
}

const seed = bruto as unknown as SeedArquivo;

export const SEED_CIDADE = seed.cidade;
export const SEED_UF = seed.uf;

function marcar(
  lista: Omit<RegistroFornecedor, 'real'>[] | undefined,
  real: boolean,
): RegistroFornecedor[] {
  return (lista ?? []).map((r) => ({ ...r, real }));
}

/**
 * Registros reais e fictícios de uma categoria, já marcados. Categoria fora da
 * base devolve as duas listas vazias — quem chama gera nomes determinísticos.
 */
export function registrosDaCategoria(categoriaId: string): {
  reais: RegistroFornecedor[];
  ficticios: RegistroFornecedor[];
} {
  const c = seed.categorias[categoriaId];
  return { reais: marcar(c?.reais, true), ficticios: marcar(c?.ficticios, false) };
}

/**
 * CNAE oficial da categoria (CNAE 2.3, tabela do IBGE). Serve tanto para
 * descrever a empresa real quanto para dar à fictícia o código certo do ramo —
 * a demo não pode exibir um CNAE que não existe.
 */
export function cnaeDaCategoria(
  categoriaId: string,
): { codigo: string; descricao: string } | null {
  const c = seed.categorias[categoriaId];
  if (!c?.cnae) return null;
  return { codigo: c.cnae, descricao: c.cnaeDescricao ?? '' };
}

/** Categorias com empresas reais pesquisadas — as prontas para a gravação. */
export function categoriasComDadosReais(): string[] {
  return Object.entries(seed.categorias)
    .filter(([, c]) => (c.reais?.length ?? 0) > 0)
    .map(([id]) => id);
}
