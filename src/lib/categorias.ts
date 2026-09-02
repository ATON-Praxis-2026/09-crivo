// Taxonomia de categorias (6 famílias, nomes de mercado — P2 do dossiê)
// e mapeamento DETERMINÍSTICO checklist → categorias acionadas.
// Regra do dossiê: quem decide categoria é código, nunca LLM.

export interface Categoria {
  id: string;
  label: string;
  familia: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export const FAMILIAS: Record<Categoria['familia'], string> = {
  A: 'Espaço & infraestrutura',
  B: 'Alimentação & bebidas',
  C: 'Técnica & conteúdo',
  D: 'Experiência & registro',
  E: 'Marca & materiais',
  F: 'Pessoas & logística',
};

// Teto de categorias por pesquisa: a pipeline roda cada categoria em série
// (descobridor + verificadores), então custo e tempo crescem linearmente.
// A rota e a UI compartilham esta constante para nunca divergirem.
export const MAX_CATEGORIAS_POR_PESQUISA = 6;

export const CATEGORIAS: Categoria[] = [
  // A · Espaço & infraestrutura
  { id: 'espaco', label: 'Espaço de eventos', familia: 'A' },
  { id: 'espaco_hotel', label: 'Hotel ou resort', familia: 'A' },
  { id: 'mobiliario', label: 'Mobiliário e equipamentos', familia: 'A' },
  { id: 'gerador', label: 'Gerador de energia', familia: 'A' },
  { id: 'banheiro_quimico', label: 'Banheiro químico', familia: 'A' },
  { id: 'limpeza', label: 'Limpeza', familia: 'A' },
  { id: 'seguranca', label: 'Segurança', familia: 'A' },
  { id: 'brigadista', label: 'Bombeiro civil (brigadista)', familia: 'A' },
  { id: 'ambulancia', label: 'Ambulância e posto médico', familia: 'A' },
  { id: 'alvara_avcb', label: 'Alvará e licenciamento', familia: 'A' },
  { id: 'seguro_evento', label: 'Seguro de evento', familia: 'A' },
  // B · Alimentação & bebidas
  { id: 'buffet', label: 'Buffet completo', familia: 'B' },
  { id: 'coffee', label: 'Coffee break', familia: 'B' },
  { id: 'coquetel', label: 'Coquetel', familia: 'B' },
  { id: 'open_bar', label: 'Open bar', familia: 'B' },
  { id: 'churrasqueiro_foodtruck', label: 'Churrasco e food truck', familia: 'B' },
  // C · Técnica & conteúdo
  { id: 'audio_video', label: 'Áudio e vídeo', familia: 'C' },
  { id: 'iluminacao_palco', label: 'Iluminação e palco', familia: 'C' },
  { id: 'streaming_captacao', label: 'Streaming e captação', familia: 'C' },
  { id: 'internet_dedicada', label: 'Internet dedicada', familia: 'C' },
  { id: 'traducao_simultanea', label: 'Tradução simultânea', familia: 'C' },
  { id: 'interprete_libras', label: 'Libras e acessibilidade', familia: 'C' },
  { id: 'palestrante', label: 'Palestrante ou MC', familia: 'C' },
  // D · Experiência & registro
  { id: 'dj_atracoes', label: 'DJ e atrações', familia: 'D' },
  { id: 'decoracao_cenografia', label: 'Decoração e cenografia', familia: 'D' },
  { id: 'foto_video', label: 'Fotografia e vídeo', familia: 'D' },
  { id: 'team_building', label: 'Team building', familia: 'D' },
  // E · Marca & materiais
  { id: 'comunicacao_visual', label: 'Comunicação visual', familia: 'E' },
  { id: 'brindes', label: 'Brindes', familia: 'E' },
  { id: 'montadora', label: 'Montadora de estande', familia: 'E' },
  { id: 'art_laudos', label: 'ART e laudos de engenharia', familia: 'E' },
  // F · Pessoas & logística
  { id: 'recepcionistas', label: 'Recepcionistas', familia: 'F' },
  { id: 'credenciamento', label: 'Credenciamento e check-in', familia: 'F' },
  { id: 'garcons', label: 'Garçons', familia: 'F' },
  { id: 'translado', label: 'Transporte executivo', familia: 'F' },
  { id: 'hospedagem', label: 'Hospedagem', familia: 'F' },
  { id: 'manobrista', label: 'Manobrista', familia: 'F' },
];

export const CATEGORIA_BY_ID = new Map(CATEGORIAS.map((c) => [c.id, c]));

export function categoriaLabel(id: string): string {
  return CATEGORIA_BY_ID.get(id)?.label ?? id;
}

// ---------- Checklist P2: as 10 perguntas ----------

export type TipoEvento =
  | 'confraternizacao'
  | 'convencao'
  | 'treinamento'
  | 'lancamento'
  | 'feira_expositor'
  | 'hibrido'
  | 'happy_hour'
  | 'offsite';

export const TIPOS_EVENTO: { id: TipoEvento; label: string }[] = [
  { id: 'confraternizacao', label: 'Confraternização' },
  { id: 'convencao', label: 'Convenção / kickoff' },
  { id: 'treinamento', label: 'Treinamento / workshop' },
  { id: 'lancamento', label: 'Lançamento de produto' },
  { id: 'feira_expositor', label: 'Feira (vamos expor)' },
  { id: 'hibrido', label: 'Evento híbrido / online' },
  { id: 'happy_hour', label: 'Happy hour' },
  { id: 'offsite', label: 'Offsite / team building' },
];

export interface ChecklistRespostas {
  tipo: TipoEvento;
  pessoas: 'ate50' | '50a200' | '200mais';
  local: 'proprio' | 'alugado_licenciado' | 'externo_nao_licenciado';
  formato: 'presencial' | 'online' | 'hibrido';
  comida: Array<'coffee' | 'almoco_jantar' | 'coquetel' | 'churrasco'>;
  bebidaMusica: Array<'open_bar' | 'musica'>;
  palco: boolean;
  publicoEstrangeiro: boolean;
  acessibilidade: boolean;
  marcaRegistro: Array<'cenografia' | 'brindes' | 'foto_video'>;
  logistica: Array<'recepcao' | 'transporte' | 'mais_de_um_dia' | 'estacionamento'>;
  inclusosNoEspaco: string[]; // ids de categoria que o espaço já cobre (pergunta 10 DESLIGA)
}

// Template-base por tipo de evento (matriz do dossiê).
const TEMPLATE_BASE: Record<TipoEvento, string[]> = {
  confraternizacao: ['espaco', 'buffet', 'open_bar', 'dj_atracoes', 'decoracao_cenografia', 'foto_video'],
  convencao: ['espaco', 'buffet', 'coffee', 'audio_video', 'iluminacao_palco', 'credenciamento', 'translado', 'hospedagem', 'palestrante'],
  treinamento: ['coffee', 'audio_video', 'palestrante'],
  lancamento: ['espaco', 'coquetel', 'audio_video', 'iluminacao_palco', 'decoracao_cenografia', 'foto_video', 'credenciamento', 'brindes'],
  feira_expositor: ['montadora', 'decoracao_cenografia', 'art_laudos', 'seguro_evento', 'credenciamento', 'brindes', 'mobiliario'],
  hibrido: ['streaming_captacao', 'audio_video', 'internet_dedicada'],
  happy_hour: ['open_bar', 'coffee'],
  offsite: ['espaco_hotel', 'buffet', 'coffee', 'translado', 'hospedagem', 'team_building'],
};

export interface MapeamentoResultado {
  categorias: string[]; // ids acionados, deduplicados, já sem os inclusos no espaço
  avisos: string[]; // avisos de UI (ECAD, feira-expositor)
}

export function mapearCategorias(r: ChecklistRespostas): MapeamentoResultado {
  const set = new Set<string>(TEMPLATE_BASE[r.tipo] ?? []);
  const avisos: string[] = [];

  // P3 — o "pacote invisível" dispara por PORTE + LOCAL NÃO LICENCIADO, não por tipo.
  if (r.local === 'externo_nao_licenciado' && r.pessoas === '200mais') {
    ['gerador', 'banheiro_quimico', 'brigadista', 'ambulancia', 'alvara_avcb', 'seguro_evento'].forEach((c) => set.add(c));
  }
  if (r.local === 'alugado_licenciado') set.add('espaco');
  if (r.local === 'proprio') set.add('mobiliario');
  if (r.pessoas === '200mais') set.add('seguranca');

  // P4 — formato
  if (r.formato !== 'presencial') {
    set.add('streaming_captacao');
    set.add('internet_dedicada');
  }

  // P5 — comida (vegetariano/vegano é nota de briefing, não categoria)
  if (r.comida.includes('coffee')) set.add('coffee');
  if (r.comida.includes('almoco_jantar')) set.add('buffet');
  if (r.comida.includes('coquetel')) set.add('coquetel');
  if (r.comida.includes('churrasco')) set.add('churrasqueiro_foodtruck');
  if (r.comida.length > 0) {
    set.add('garcons');
    // Antes era um checkbox na P5 que a Ana marcava em praticamente 100% dos casos.
    // Vira consequência automática: o efeito é uma linha no relatório, não uma decisão.
    avisos.push('Inclua opção vegetariana e vegana no pedido de orçamento.');
  }

  // P6 — bebida e música
  if (r.bebidaMusica.includes('open_bar')) set.add('open_bar');
  if (r.bebidaMusica.includes('musica')) {
    set.add('dj_atracoes');
    avisos.push(
      'Música gera taxa de ECAD (direitos autorais). Fica no relatório.',
    );
  }

  // P7 — palco/apresentações + acessibilidade/idioma
  if (r.palco) {
    set.add('audio_video');
    set.add('iluminacao_palco');
    set.add('palestrante');
  }
  if (r.publicoEstrangeiro) set.add('traducao_simultanea');
  if (r.acessibilidade) set.add('interprete_libras');

  // P8 — marca e registro
  if (r.marcaRegistro.includes('cenografia')) {
    set.add('decoracao_cenografia');
    set.add('comunicacao_visual');
  }
  if (r.marcaRegistro.includes('brindes')) set.add('brindes');
  if (r.marcaRegistro.includes('foto_video')) set.add('foto_video');

  // P9 — logística de pessoas
  if (r.logistica.includes('recepcao')) {
    set.add('recepcionistas');
    set.add('credenciamento');
  }
  if (r.logistica.includes('transporte')) set.add('translado');
  if (r.logistica.includes('mais_de_um_dia')) set.add('hospedagem');
  if (r.logistica.includes('estacionamento')) set.add('manobrista');

  // Regra especial — feira (expositor): o fluxo INVERTE.
  if (r.tipo === 'feira_expositor') {
    ['espaco', 'gerador', 'internet_dedicada', 'limpeza', 'seguranca'].forEach((c) => set.delete(c));
    avisos.push(
      'No estande, energia, internet, água, limpeza e mobiliário básico saem do portal do organizador da feira. Não entram como fornecedor de mercado. Montadora credenciada, cenografia do estande, ART com laudo de engenharia e seguro passam a ser obrigatórios.',
    );
  }

  // P10 — DESLIGA o que o espaço já inclui (evita cotar o que o venue fornece).
  for (const inc of r.inclusosNoEspaco) set.delete(inc);

  return { categorias: [...set], avisos };
}
