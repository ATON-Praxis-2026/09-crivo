// MODO DEMONSTRAÇÃO — Fortaleza/CE.
//
// O que é real e o que não é, sem meio-termo (a banca vai perguntar):
//
// • Os fornecedores dos desfechos POSITIVOS são empresas que EXISTEM. CNPJ,
//   situação cadastral, data de abertura, CNAE, telefone, site, Instagram,
//   nota do Google e Reclame Aqui foram colhidos em fontes públicas e estão
//   em `seed/fortaleza.json`, cada um com a URL de onde saiu. A nota que a
//   tela mostra NÃO está no arquivo: ela é calculada aqui pelo `score.ts` —
//   o mesmo motor da pipeline real — em cima desses números reais.
//
// • Os fornecedores de "Atenção" e "Evitar" são FICTÍCIOS (RN-18). O produto
//   não fabrica reputação negativa de empresa que existe. O CNPJ deles fica na
//   faixa 99.9xx, fora dos intervalos que a Receita atribui.
//
// O snapshot é função PURA de (id, agora): funciona igual em dev local e em
// serverless frio, e é idêntico a cada execução — a demo é ensaiável.
import { categoriaLabel } from '../categorias';
import { scoreFornecedor } from '../score';
import type {
  Achado,
  CandidatoResultado,
  CriterioId,
  DadosVerificacao,
  RankingCategoria,
  RankingResponse,
  ScoreResultado,
} from '../types';
import { CRITERIO_LABELS } from '../types';
import { decodeMockId } from './mockId';
import { cnaeDaCategoria, registrosDaCategoria, type RegistroFornecedor } from './seed';
import { entre, pick, rngFor, type Rng } from './rng';

// ---------- Cronograma simulado (ms desde a criação da busca) ----------
const STAGGER_CATEGORIA = 500; // categorias começam escalonadas
const DESCOBERTA_MS = 900;
const ONDA_MS = 900; // simula pLimit(3): 3 verificadores por onda
const REFINO_MS = 700;
const N_CANDIDATOS = 10;

const DDD: Record<string, string> = {
  fortaleza: '85', curitiba: '41', 'sao paulo': '11', 'são paulo': '11',
  'rio de janeiro': '21', 'belo horizonte': '31', 'porto alegre': '51',
  recife: '81', natal: '84', 'joao pessoa': '83', 'joão pessoa': '83',
  teresina: '86', 'sao luis': '98', 'são luís': '98', maceio: '82',
  'maceió': '82', salvador: '71', aracaju: '79', brasilia: '61',
  'brasília': '61', florianopolis: '48', 'florianópolis': '48',
};

// Nomes dos fornecedores fictícios de categorias fora da base pesquisada.
// A pesquisa de campo mostrou algo contraintuitivo: o léxico cearense
// (jangada, Mucuripe, carnaúba) está PRATICAMENTE AUSENTE dos nomes reais do
// setor em Fortaleza. Quem nomeia assim é forasteiro — e o dado sintético se
// denuncia. O padrão real é sigla de iniciais dos sócios + sufixo de
// categoria, então é esse que o gerador imita.
const SIGLAS = ['KRT', 'NBX', 'TRV', 'GVR', 'ZTM', 'PRQ', 'KVN', 'VZL', 'NRK', 'TQB'];
const SUFIXOS = ['Eventos', 'Produções', 'Locações', 'Serviços & Locações', 'Eventos & Produções'];
const BAIRROS_CE = [
  'Aldeota', 'Meireles', 'Praia de Iracema', 'Dionísio Torres', 'Varjota',
  'Papicu', 'Cocó', 'Fátima', 'Joaquim Távora', 'Benfica', 'Montese',
  'Parangaba', 'Edson Queiroz', 'Messejana', 'Centro',
];

// ---------- Montadores de URL de fonte (formatos confirmados) ----------
function soDigitos(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function gs(q: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function urlMaps(q: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function urlSancoes(cnpj?: string): string {
  // Portal da Transparência aceita o CNPJ (14 dígitos) na querystring do CEIS.
  return cnpj
    ? `https://portaldatransparencia.gov.br/sancoes/ceis?cpfCnpj=${soDigitos(cnpj)}`
    : 'https://portaldatransparencia.gov.br/sancoes/consulta?cadastro=1';
}

function urlJusbrasil(nome: string): string {
  return `https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(nome)}`;
}

function urlReclameAqui(nome: string): string {
  return `https://www.reclameaqui.com.br/busca/?q=${encodeURIComponent(nome)}&state=CE`;
}

function urlInstagram(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
}

// Link de conferência manual: a consulta oficial da Receita é SPA com captcha,
// não aceita CNPJ na querystring. Serve como evidência para quem confere à mão.
const RECEITA_CONSULTA =
  'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp';

// Evidência clicável do CNPJ: é o mesmo endpoint que a pipeline real consulta,
// e abre já com o registro da empresa — diferente da página da Receita, que
// exige digitar o número e passar por captcha.
function urlCnpj(cnpj: string): string {
  return `https://brasilapi.com.br/api/cnpj/v1/${soDigitos(cnpj)}`;
}

function slug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------- Perfis de desfecho (mix da demo) ----------
type Perfil =
  | 'cache_verificado' | 'cache_atencao' | 'verificado_forte' | 'verificado'
  | 'atencao_pegada_baixa' | 'atencao_cnae' | 'sem_cnpj' | 'borda_refino'
  | 'evitar_eliminatoria' | 'falha';

const PERFIS: Perfil[] = [
  'cache_verificado', 'cache_atencao', 'verificado_forte', 'verificado',
  'atencao_pegada_baixa', 'atencao_cnae', 'sem_cnpj', 'borda_refino',
  'evitar_eliminatoria', 'falha',
];

// Só desfecho positivo recebe empresa real. Todo juízo negativo — "Atenção",
// "Evitar", falha de verificação — fica com os fictícios. É a RN-18 virando
// código: a posição no array já garante a regra.
const SLOTS_REAIS: Perfil[] = [
  'cache_verificado', 'verificado_forte', 'verificado', 'borda_refino',
];

function ehSlotReal(p: Perfil): boolean {
  return SLOTS_REAIS.includes(p);
}

// ---------- Registros por categoria ----------

/** Gerador determinístico para categoria fora da base pesquisada. */
function registroGerado(categoriaId: string, rng: Rng): RegistroFornecedor {
  const chave = categoriaLabel(categoriaId).split(/[\s/(]+/)[0];
  return {
    nome: `${pick(rng, SIGLAS)} ${chave} ${pick(rng, SUFIXOS)}`,
    bairro: pick(rng, BAIRROS_CE),
    real: false,
  };
}

interface SlotCandidato {
  reg: RegistroFornecedor;
  perfil: Perfil;
  i: number;
}

/**
 * Os candidatos da categoria, cada um com seu perfil de desfecho.
 * Determinístico por (categoria, índice) — sem o id da busca —, então a demo
 * sai idêntica em toda execução: dá para ensaiar a gravação.
 *
 * Regra que não pode quebrar: um slot de desfecho POSITIVO sem empresa real
 * disponível é DESCARTADO, nunca preenchido com fictícia. A categoria mostra
 * um fornecedor a menos e a promessa da tela continua verdadeira.
 */
function registrosPara(categoriaId: string): SlotCandidato[] {
  const { reais, ficticios } = registrosDaCategoria(categoriaId);
  const filaReais = [...reais];
  const filaFicticios = [...ficticios];
  const out: SlotCandidato[] = [];

  PERFIS.slice(0, N_CANDIDATOS).forEach((perfil, i) => {
    if (ehSlotReal(perfil)) {
      const r = filaReais.shift();
      if (r) out.push({ reg: r, perfil, i });
      return; // sem empresa real: o slot some
    }
    const f = filaFicticios.shift() ?? registroGerado(categoriaId, rngFor(categoriaId, i));
    out.push({ reg: f, perfil, i });
  });

  return out;
}

// ---------- Construção dos dados de verificação ----------

interface PerfilMontado {
  dados: DadosVerificacao;
  achados: Achado[];
  /** Estado após a auditoria adversarial do Refinador (só no caso de borda). */
  refino?: { dados: DadosVerificacao; achados: Achado[]; flagsExtra: string[] };
}

function cnpjFicticio(rng: Rng): string {
  const d = () => Math.floor(rng() * 10);
  // Faixa 99.9xx — fora dos intervalos atribuídos; reforça que é fictício.
  return `99.9${d()}${d()}.${d()}${d()}${d()}/0001-${d()}${d()}`;
}

function idadeEmAnos(aberturaISO: string): number {
  const ano = Number(aberturaISO.slice(0, 4));
  return Number.isFinite(ano) ? Math.max(0, 2026 - ano) : 0;
}

function mk(
  criterio: CriterioId, valor: string, url: string | null, conf: number,
  status: Achado['status'] = 'ok', inferencia = false,
): Achado {
  return { criterio, valor, evidenciaUrl: url, confianca: conf, status, inferencia };
}

function naoVerif(criterio: CriterioId): Achado {
  return mk(criterio, 'Não encontrado em fontes públicas', null, 0, 'nao_verificavel');
}

/** Rótulo do Reclame Aqui na escala real do site (0–10, status no feminino). */
function rotuloRA(nota: number): string {
  if (nota >= 8) return 'reputação Ótima';
  if (nota >= 7) return 'reputação Boa';
  if (nota >= 6) return 'reputação Regular';
  return 'reputação Ruim';
}

/** Dados de verificação a partir de uma empresa REAL — nada é inventado. */
function dadosDeRegistro(reg: RegistroFornecedor): DadosVerificacao {
  const cnpj = reg.cnpj
    ? {
        numero: reg.cnpj,
        situacao: reg.situacao ?? 'ATIVA',
        aberturaISO: reg.abertura ?? '',
        idadeAnos: reg.abertura ? idadeEmAnos(reg.abertura) : 0,
        cnae: reg.cnae ?? '',
        cnaeCompativel: reg.cnaeCompativel !== false,
        evidenciaUrl: reg.fonteCnpj ?? urlCnpj(reg.cnpj),
      }
    : null;

  return {
    cnpj,
    sancoes: { encontradas: false, evidenciaUrl: urlSancoes(reg.cnpj) },
    google: reg.google
      ? { nota: reg.google.nota, numAvaliacoes: reg.google.avaliacoes, evidenciaUrl: reg.google.url }
      : { nota: null, numAvaliacoes: null },
    negativasGraves: 0,
    reclameAqui: reg.reclameAqui
      ? {
          status: reg.reclameAqui.status,
          nota: reg.reclameAqui.nota,
          evidenciaUrl: reg.reclameAqui.url ?? urlReclameAqui(reg.nome),
        }
      : { status: 'sem_pagina', evidenciaUrl: urlReclameAqui(reg.nome) },
    noticiaGolpe: { confirmada: false },
    processos: { volumeAlto: false, evidenciaUrl: urlJusbrasil(reg.nome) },
    siteComCnpjBatendo: reg.siteComCnpj ?? (reg.site ? true : null),
    instagramAtivo60d: reg.instagramAtivo ?? (reg.instagram ? true : null),
    contatoConsistente: reg.contatoConsistente ?? (reg.telefone ? true : null),
    emDiretoriosSetor: reg.emDiretorios ?? null,
    flags: [],
  };
}

function achadosBase(
  d: DadosVerificacao, reg: RegistroFornecedor, cidade: string, categoriaId: string,
): Achado[] {
  const q = `"${reg.nome}" ${cidade}`;
  const urlCnpj = d.cnpj?.evidenciaUrl ?? RECEITA_CONSULTA;
  const urlGoogle = d.google.evidenciaUrl ?? urlMaps(`${reg.nome}, ${cidade}, CE`);

  return [
    d.cnpj
      ? mk(
          'cnpj_ativo',
          `CNPJ ${d.cnpj.numero} — situação ${d.cnpj.situacao} na Receita Federal`,
          urlCnpj, 0.95,
          d.cnpj.situacao.toUpperCase() === 'ATIVA' ? 'ok' : 'eliminatorio',
        )
      : naoVerif('cnpj_ativo'),
    d.cnpj && d.cnpj.aberturaISO
      ? mk(
          'idade_empresa',
          `Aberta em ${d.cnpj.aberturaISO.slice(0, 4)} — ${d.cnpj.idadeAnos} anos de atividade`,
          urlCnpj, 0.95, d.cnpj.idadeAnos >= 2 ? 'ok' : 'atencao',
        )
      : naoVerif('idade_empresa'),
    d.cnpj && d.cnpj.cnae
      ? mk(
          'cnae_compativel',
          d.cnpj.cnaeCompativel
            ? `CNAE ${d.cnpj.cnae}${reg.cnaeDescricao ? ` (${reg.cnaeDescricao})` : ''} — compatível com o serviço`
            : `CNAE ${d.cnpj.cnae}${reg.cnaeDescricao ? ` (${reg.cnaeDescricao})` : ''} — atividade diferente da contratada`,
          urlCnpj, 0.9, d.cnpj.cnaeCompativel ? 'ok' : 'atencao',
        )
      : naoVerif('cnae_compativel'),
    mk(
      'sancoes_publicas',
      d.sancoes.encontradas
        ? (d.sancoes.detalhe ?? 'Sanção pública registrada')
        : 'Nenhum registro no CEIS/CNEP do Portal da Transparência',
      d.sancoes.evidenciaUrl ?? urlSancoes(d.cnpj?.numero), 0.85,
      d.sancoes.encontradas ? 'eliminatorio' : 'ok',
    ),
    d.reclameAqui.status === 'sem_pagina'
      ? mk('reclame_aqui', 'Sem página no Reclame Aqui — tratado como neutro', d.reclameAqui.evidenciaUrl ?? urlReclameAqui(reg.nome), 0.7)
      : mk(
          'reclame_aqui',
          d.reclameAqui.status === 'nao_recomendada'
            ? 'Status "Não recomendada" no Reclame Aqui'
            : `Nota ${d.reclameAqui.nota?.toFixed(1)}/10 no Reclame Aqui — ${rotuloRA(d.reclameAqui.nota ?? 0)}`,
          d.reclameAqui.evidenciaUrl ?? urlReclameAqui(reg.nome), 0.85,
          d.reclameAqui.status === 'nao_recomendada' ? 'eliminatorio' : 'ok',
        ),
    mk(
      'noticias_negativas',
      d.noticiaGolpe.confirmada
        ? (d.noticiaGolpe.teor ?? 'Notícia de golpe com evidência')
        : 'Nenhuma notícia de golpe, calote ou não entrega encontrada',
      d.noticiaGolpe.evidenciaUrl ?? gs(`${q} golpe OR calote OR "não entregou"`), 0.8,
      d.noticiaGolpe.confirmada ? 'eliminatorio' : 'ok',
    ),
    d.google.nota != null
      ? mk('google_rating', `Nota ${d.google.nota.toFixed(1)} · ${d.google.numAvaliacoes} avaliações no Google`, urlGoogle, 0.9)
      : naoVerif('google_rating'),
    d.google.nota != null
      ? mk(
          'teor_avaliacoes',
          d.negativasGraves > 0.1
            ? 'Negativas recentes citam atraso na entrega'
            : 'Negativas raras, sem padrão de "não entregou" ou "sumiu"',
          urlGoogle, 0.7, d.negativasGraves > 0.1 ? 'atencao' : 'ok', true,
        )
      : naoVerif('teor_avaliacoes'),
    mk(
      'processos_judiciais',
      d.processos.volumeAlto
        ? 'Volume alto de processos visíveis (dado parcial)'
        : 'Sem volume relevante de processos visíveis',
      d.processos.evidenciaUrl ?? urlJusbrasil(reg.nome), 0.6,
      d.processos.volumeAlto ? 'atencao' : 'ok',
    ),
    d.siteComCnpjBatendo == null
      ? naoVerif('site_com_cnpj')
      : mk(
          'site_com_cnpj',
          d.siteComCnpjBatendo
            ? 'Site próprio no ar, com CNPJ publicado batendo com a Receita'
            : 'Site sem CNPJ divulgado',
          reg.site ?? gs(q), 0.85, d.siteComCnpjBatendo ? 'ok' : 'atencao',
        ),
    d.instagramAtivo60d == null
      ? naoVerif('instagram_ativo')
      : mk(
          'instagram_ativo',
          d.instagramAtivo60d
            ? `Instagram ${reg.instagram ?? ''} com publicações recentes`.trim()
            : 'Instagram sem publicação nos últimos 60 dias',
          reg.instagram ? urlInstagram(reg.instagram) : gs(`instagram ${q}`), 0.75,
          d.instagramAtivo60d ? 'ok' : 'atencao', true,
        ),
    d.contatoConsistente == null
      ? naoVerif('contato_consistente')
      : mk(
          'contato_consistente',
          d.contatoConsistente
            ? 'Mesmo telefone no site, no Google e nas redes'
            : 'Telefones divergentes entre canais',
          urlGoogle, 0.8, d.contatoConsistente ? 'ok' : 'atencao',
        ),
    d.emDiretoriosSetor == null
      ? naoVerif('diretorios_setor')
      : mk(
          'diretorios_setor',
          d.emDiretoriosSetor
            ? 'Listada em diretório do setor de eventos com avaliações'
            : 'Não encontrada em diretórios do setor',
          // O diretório se procura pelo SERVIÇO, não pelo nome da empresa —
          // é assim que o Verificador busca de fato.
          urlMaps(`${categoriaLabel(categoriaId)} ${cidade} CE`), 0.7,
        ),
  ];
}

function montarPerfil(
  perfil: Perfil, reg: RegistroFornecedor, cidade: string,
  categoriaId: string, rng: Rng,
): PerfilMontado {
  // Empresa real: os dados saem inteiros do registro pesquisado.
  if (reg.real) {
    const d = dadosDeRegistro(reg);
    if (perfil === 'borda_refino') {
      // A primeira passada não achou o telefone nos três canais; o Refinador
      // volta com evidência e confirma. A correção é para cima, nunca para baixo.
      const dPre: DadosVerificacao = { ...d, contatoConsistente: null };
      return {
        dados: dPre,
        achados: achadosBase(dPre, reg, cidade, categoriaId),
        refino: {
          dados: d,
          achados: achadosBase(d, reg, cidade, categoriaId),
          flagsExtra: ['refino_confirmou_contato'],
        },
      };
    }
    return { dados: d, achados: achadosBase(d, reg, cidade, categoriaId) };
  }

  // Empresa fictícia: o perfil desenha o desfecho. O CNAE, mesmo aqui, é o
  // código oficial do ramo — a tela nunca mostra um CNAE que não existe.
  const cnaeCat = cnaeDaCategoria(categoriaId);
  if (cnaeCat && !reg.cnaeDescricao) reg = { ...reg, cnaeDescricao: cnaeCat.descricao };
  const anoAbertura = 2026 - Math.round(entre(rng, 3, 9));
  const d: DadosVerificacao = {
    cnpj: {
      numero: cnpjFicticio(rng),
      situacao: 'ATIVA',
      aberturaISO: `${anoAbertura}-0${1 + Math.floor(rng() * 8)}-15`,
      idadeAnos: 2026 - anoAbertura,
      cnae: reg.cnae ?? cnaeCat?.codigo ?? '8230-0/01',
      cnaeCompativel: true,
      evidenciaUrl: RECEITA_CONSULTA,
    },
    sancoes: { encontradas: false, evidenciaUrl: urlSancoes() },
    google: { nota: null, numAvaliacoes: null },
    negativasGraves: 0,
    reclameAqui: { status: 'sem_pagina', evidenciaUrl: urlReclameAqui(reg.nome) },
    noticiaGolpe: { confirmada: false },
    processos: { volumeAlto: false, evidenciaUrl: urlJusbrasil(reg.nome) },
    siteComCnpjBatendo: null,
    instagramAtivo60d: null,
    contatoConsistente: null,
    emDiretoriosSetor: null,
    flags: [],
  };

  switch (perfil) {
    case 'cache_atencao':
    case 'atencao_cnae':
      // CNAE de outra atividade: não elimina, mas pede pergunta antes de fechar.
      // 4712-1/00 é minimercado — código real, e visivelmente de outro ramo.
      if (d.cnpj) {
        d.cnpj.cnaeCompativel = false;
        d.cnpj.cnae = '4712-1/00';
        reg = { ...reg, cnaeDescricao: 'Comércio varejista de mercadorias em geral — minimercados' };
      }
      d.google = { nota: 3.9, numAvaliacoes: 25, evidenciaUrl: urlMaps(`${reg.nome}, ${cidade}, CE`) };
      d.negativasGraves = 0.15;
      d.instagramAtivo60d = true;
      d.contatoConsistente = true;
      d.emDiretoriosSetor = false;
      break;
    case 'atencao_pegada_baixa':
      // O bom fornecedor invisível: a regra de justiça em ação.
      break;
    case 'sem_cnpj':
      d.cnpj = null;
      d.google = { nota: 4.7, numAvaliacoes: 150, evidenciaUrl: urlMaps(`${reg.nome}, ${cidade}, CE`) };
      d.reclameAqui = { status: 'ok', nota: 7.8, evidenciaUrl: urlReclameAqui(reg.nome) };
      d.instagramAtivo60d = true;
      d.contatoConsistente = true;
      d.emDiretoriosSetor = true;
      break;
    case 'evitar_eliminatoria':
      if (d.cnpj) {
        d.cnpj.situacao = 'BAIXADA';
        d.cnpj.idadeAnos = 1;
        d.cnpj.aberturaISO = '2025-03-10';
      }
      d.google = { nota: 4.0, numAvaliacoes: 12, evidenciaUrl: urlMaps(`${reg.nome}, ${cidade}, CE`) };
      break;
    default:
      // 'falha' e os slots positivos que caíram para fictício por falta de
      // empresa real pesquisada nesta categoria.
      d.google = { nota: 4.5, numAvaliacoes: 60, evidenciaUrl: urlMaps(`${reg.nome}, ${cidade}, CE`) };
      d.siteComCnpjBatendo = true;
      d.instagramAtivo60d = true;
      d.contatoConsistente = true;
      d.emDiretoriosSetor = true;
      break;
  }

  return { dados: d, achados: achadosBase(d, reg, cidade, categoriaId) };
}

function justificativaPara(
  reg: RegistroFornecedor, dados: DadosVerificacao, score: ScoreResultado,
): string {
  if (score.eliminatoria) {
    return `Critério eliminatório não atendido: ${score.eliminatoria.motivo}. Evidência na fonte citada.`;
  }
  const partes: string[] = [];
  if (dados.cnpj && dados.cnpj.aberturaISO) {
    partes.push(`CNPJ ativo desde ${dados.cnpj.aberturaISO.slice(0, 4)}`);
  }
  if (dados.google.nota != null) {
    partes.push(`nota ${dados.google.nota.toFixed(1)} em ${dados.google.numAvaliacoes} avaliações no Google`);
  }
  if (dados.reclameAqui.status === 'ok' && dados.reclameAqui.nota != null) {
    partes.push(`Reclame Aqui ${dados.reclameAqui.nota.toFixed(1)} com reclamações respondidas`);
  }
  if (dados.contatoConsistente) partes.push('contato consistente entre canais');
  if (reg.bairro) partes.push(`sede no ${reg.bairro}`);
  if (partes.length === 0) {
    partes.push('poucos dados públicos verificáveis — a reputação não pôde ser medida em volume');
  }
  return partes.join('; ') + '.';
}

// ---------- Montagem do snapshot ----------
interface CandidatoTimeline {
  final: CandidatoResultado;
  preRefino?: CandidatoResultado;
  apareceEm: number;
  verInicio: number;
  verFim: number;
  fimTotal: number; // inclui refino, quando houver
}

function telefoneDe(reg: RegistroFornecedor, cidade: string, rng: Rng): string {
  if (reg.telefone) return reg.telefone;
  const ddd = DDD[cidade.trim().toLowerCase()] ?? '85';
  // Fictício: prefixo 3555 não é usado por operadora em Fortaleza.
  return `(${ddd}) 3555-0${100 + Math.floor(rng() * 900)}`;
}

function montarCandidato(
  categoriaId: string, cidade: string, slot: SlotCandidato, discFim: number,
): CandidatoTimeline {
  const { reg, perfil, i } = slot;
  const rng = rngFor(categoriaId, i, reg.nome);
  const m = montarPerfil(perfil, reg, cidade, categoriaId, rng);

  const doCache = perfil === 'cache_verificado' || perfil === 'cache_atencao';
  const idxOnda = Math.max(0, i - 2); // i 0–1 são cache (instantâneos)
  const onda = Math.floor(idxOnda / 3);
  const verInicio = doCache ? discFim : discFim + onda * ONDA_MS + (idxOnda % 3) * 600;
  const verDur = entre(rng, 5200, 6800);
  const verFim = doCache ? discFim : verInicio + verDur;
  const temRefino = !!m.refino;
  const fimTotal = temRefino ? verFim + REFINO_MS : verFim;

  const base: CandidatoResultado = {
    id: `${categoriaId}-${i}`,
    nome: reg.nome,
    cidade,
    telefone: telefoneDe(reg, cidade, rng),
    site: reg.site,
    instagram: reg.instagram,
    fonte: reg.real ? 'busca web + base pública de CNPJ' : 'busca web (exemplo)',
    status: 'concluido',
  };

  const concluir = (
    dados: DadosVerificacao, achados: Achado[], flagsExtra: string[] = [],
  ): CandidatoResultado => {
    const score = scoreFornecedor({ ...dados, flags: [...dados.flags, ...flagsExtra] }, achados);
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
      justificativa: justificativaPara(reg, dados, score),
      doCache,
      refinado: temRefino,
    };
  };

  if (perfil === 'falha') {
    const reveladas = m.achados.slice(0, 5);
    return {
      final: {
        ...base,
        status: 'nao_verificado',
        achados: reveladas,
        naoVerificavel: m.achados.slice(5).map((a) => CRITERIO_LABELS[a.criterio]),
        justificativa:
          'A consulta não respondeu a tempo, nem na nova tentativa. Não entra no ranking — refaça a pesquisa para tentar de novo.',
      },
      apareceEm: discFim, verInicio, verFim, fimTotal,
    };
  }

  const final = m.refino
    ? concluir(m.refino.dados, m.refino.achados, m.refino.flagsExtra)
    : concluir(m.dados, m.achados);
  const preRefino = m.refino
    ? { ...base, status: 'refinando' as const, achados: m.achados }
    : undefined;

  return { final, preRefino, apareceEm: discFim, verInicio, verFim, fimTotal };
}

function fatiar(t: CandidatoTimeline, decorrido: number): CandidatoResultado | null {
  if (decorrido < t.apareceEm) return null;
  const { final } = t;
  if (final.doCache) return final; // cache: resultado instantâneo (o moat)

  const esqueleto: CandidatoResultado = {
    id: final.id, nome: final.nome, cidade: final.cidade, telefone: final.telefone,
    site: final.site, instagram: final.instagram, fonte: final.fonte, status: 'aguardando',
  };

  if (decorrido < t.verInicio) return esqueleto;

  if (decorrido < t.verFim) {
    const achadosCompletos = t.preRefino?.achados ?? final.achados ?? [];
    const total = achadosCompletos.length || 13;
    const passo = (t.verFim - t.verInicio) / (total + 1);
    const n = Math.min(total, Math.floor((decorrido - t.verInicio) / passo));
    return { ...esqueleto, status: 'verificando', achados: achadosCompletos.slice(0, n) };
  }

  if (t.preRefino && decorrido < t.fimTotal) return t.preRefino;
  return final;
}

export function mockSnapshot(id: string, agoraMs: number): RankingResponse | null {
  const payload = decodeMockId(id);
  if (!payload) return null;
  const decorrido = Math.max(0, agoraMs - payload.t);

  const categorias: RankingCategoria[] = payload.cats.map((categoriaId, j) => {
    const catInicio = j * STAGGER_CATEGORIA;
    const discFim = catInicio + DESCOBERTA_MS;
    const label = categoriaLabel(categoriaId);

    if (decorrido < catInicio) {
      return { categoriaId, categoriaLabel: label, status: 'aguardando', candidatos: [] };
    }
    if (decorrido < discFim) {
      return { categoriaId, categoriaLabel: label, status: 'descobrindo', candidatos: [] };
    }

    const timelines = registrosPara(categoriaId).map((slot) =>
      montarCandidato(categoriaId, payload.cidade, slot, discFim),
    );
    const candidatos = timelines
      .map((t) => fatiar(t, decorrido))
      .filter((c): c is CandidatoResultado => c !== null);
    const terminou = timelines.every((t) => decorrido >= t.fimTotal);

    return {
      categoriaId,
      categoriaLabel: label,
      status: terminou ? 'concluida' : 'verificando',
      candidatos,
    };
  });

  return {
    id,
    cidade: payload.cidade,
    criadoEm: new Date(payload.t).toISOString(),
    mock: true,
    status: categorias.every((c) => c.status === 'concluida') ? 'concluida' : 'rodando',
    categorias,
    avisos: payload.avisos,
  };
}
