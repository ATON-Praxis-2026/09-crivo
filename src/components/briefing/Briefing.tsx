'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORIAS,
  FAMILIAS,
  MAX_CATEGORIAS_POR_PESQUISA,
  TIPOS_EVENTO,
  categoriaLabel,
  mapearCategorias,
  type ChecklistRespostas,
  type TipoEvento,
} from '@/lib/categorias';
import { DEFAULT_CITY, PRECO_BUSCA } from '@/lib/config';
import type { CriarRankingBody, CriarRankingResponse } from '@/lib/types';
import { Disclose } from '@/components/ui';
import Paywall from './Paywall';
import BuscaCategoria from './BuscaCategoria';

const FALHA_GENERICA = 'Sem resposta do servidor. Tente de novo.';

// A rota devolve o motivo em `erro`. Sem ler isso, toda falha de regra virava
// "erro de conexão" e a Ana não sabia o que fazer.
async function lerErroDaApi(res: Response): Promise<string | null> {
  try {
    const j = (await res.json()) as { erro?: unknown };
    return typeof j.erro === 'string' && j.erro.trim() ? j.erro : null;
  } catch {
    return null;
  }
}

const TOTAL_PASSOS = 5;

const PESSOAS_LABEL: Record<NonNullable<Estado['pessoas']>, string> = {
  ate50: 'até 50 pessoas',
  '50a200': '50 a 200 pessoas',
  '200mais': 'mais de 200 pessoas',
};

// Os 12 chips do passo 5. Cada um carrega para onde vai no modelo de respostas,
// para o mapeamento determinístico continuar recebendo as 10 respostas inteiras.
type ChipExtra =
  | 'musica'
  | 'palco'
  | 'decoracao'
  | 'foto'
  | 'brindes'
  | 'recepcao'
  | 'transporte'
  | 'maisDeUmDia'
  | 'estacionamento'
  | 'transmissao'
  | 'estrangeiro'
  | 'pcd';

const EXTRAS: Array<{ id: ChipExtra; label: string }> = [
  { id: 'musica', label: 'DJ, banda ou atração' },
  { id: 'palco', label: 'Palestras ou palco' },
  { id: 'decoracao', label: 'Decoração' },
  { id: 'foto', label: 'Fotografia e vídeo' },
  { id: 'brindes', label: 'Brindes' },
  { id: 'recepcao', label: 'Recepção e check-in' },
  { id: 'transporte', label: 'Transporte dos convidados' },
  { id: 'maisDeUmDia', label: 'Mais de um dia' },
  { id: 'estacionamento', label: 'Estacionamento' },
  { id: 'transmissao', label: 'Transmissão online' },
  { id: 'estrangeiro', label: 'Público estrangeiro' },
  { id: 'pcd', label: 'Participantes PCD' },
];

type Comida = 'coffee' | 'almoco_jantar' | 'coquetel' | 'churrasco';

const COMIDAS: Array<{ id: Comida; label: string }> = [
  { id: 'coffee', label: 'Coffee break' },
  { id: 'almoco_jantar', label: 'Almoço ou jantar' },
  { id: 'coquetel', label: 'Coquetel' },
  { id: 'churrasco', label: 'Churrasco ou food truck' },
];

interface Estado {
  tipo: TipoEvento | null;
  pessoas: 'ate50' | '50a200' | '200mais' | null;
  local: 'proprio' | 'alugado_licenciado' | 'externo_nao_licenciado' | null;
  comida: Comida[];
  openBar: boolean;
  semComida: boolean;
  extras: ChipExtra[];
}

const ESTADO_INICIAL: Estado = {
  tipo: null,
  pessoas: null,
  local: null,
  comida: [],
  openBar: false,
  semComida: false,
  extras: [],
};

function alterna<T extends string>(lista: T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
}

export default function Briefing() {
  const router = useRouter();
  // A abertura é uma escolha de caminho, não a primeira pergunta: quem já sabe
  // a categoria não deve ter que atravessar o briefing para chegar nela.
  const [naAbertura, setNaAbertura] = useState(true);
  const [passo, setPasso] = useState(1);
  const [e, setE] = useState<Estado>(ESTADO_INICIAL);
  const [cidade, setCidade] = useState(DEFAULT_CITY);
  const [naLista, setNaLista] = useState(false);
  // A lista chega para CONFIRMAR. Só quem pede é que volta a mexer nela.
  const [modoLista, setModoLista] = useState<'confirmar' | 'editar'>('confirmar');
  const [antesDeEditar, setAntesDeEditar] = useState<string[] | null>(null);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [atalho, setAtalho] = useState<string[] | null>(null);
  const [ligadas, setLigadas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);

  // Auto-avanço só vale para toque/clique. No teclado, as setas trocam o rádio
  // sem sair da pergunta — quem navega por teclado avança no Enter.
  const entrada = useRef<'ponteiro' | 'teclado'>('ponteiro');
  useEffect(() => {
    const porPonteiro = () => (entrada.current = 'ponteiro');
    const porTeclado = () => (entrada.current = 'teclado');
    window.addEventListener('pointerdown', porPonteiro, true);
    window.addEventListener('keydown', porTeclado, true);
    return () => {
      window.removeEventListener('pointerdown', porPonteiro, true);
      window.removeEventListener('keydown', porTeclado, true);
    };
  }, []);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function avancar(de: number) {
    if (de >= TOTAL_PASSOS) setNaLista(true);
    else setPasso(de + 1);
  }

  // 250ms para a seleção ser vista antes da tela trocar (DS §4.6).
  function autoAvancar(de: number) {
    if (entrada.current !== 'ponteiro') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => avancar(de), 250);
  }

  const respostas: ChecklistRespostas | null = useMemo(() => {
    if (!e.tipo || !e.pessoas || !e.local) return null;
    const bebidaMusica: ChecklistRespostas['bebidaMusica'] = [];
    if (e.openBar) bebidaMusica.push('open_bar');
    if (e.extras.includes('musica')) bebidaMusica.push('musica');
    const marcaRegistro: ChecklistRespostas['marcaRegistro'] = [];
    if (e.extras.includes('decoracao')) marcaRegistro.push('cenografia');
    if (e.extras.includes('brindes')) marcaRegistro.push('brindes');
    if (e.extras.includes('foto')) marcaRegistro.push('foto_video');
    const logistica: ChecklistRespostas['logistica'] = [];
    if (e.extras.includes('recepcao')) logistica.push('recepcao');
    if (e.extras.includes('transporte')) logistica.push('transporte');
    if (e.extras.includes('maisDeUmDia')) logistica.push('mais_de_um_dia');
    if (e.extras.includes('estacionamento')) logistica.push('estacionamento');
    return {
      tipo: e.tipo,
      pessoas: e.pessoas,
      local: e.local,
      // A pergunta "presencial, online ou os dois?" saiu da tela: o tipo de
      // evento e o chip de transmissão já respondem por ela.
      formato: e.tipo === 'hibrido' || e.extras.includes('transmissao') ? 'hibrido' : 'presencial',
      comida: e.semComida ? [] : e.comida,
      bebidaMusica,
      palco: e.extras.includes('palco'),
      publicoEstrangeiro: e.extras.includes('estrangeiro'),
      acessibilidade: e.extras.includes('pcd'),
      marcaRegistro,
      logistica,
      // Quem tira categoria da pesquisa é o chip da lista, não uma pergunta.
      inclusosNoEspaco: [],
    };
  }, [e]);

  const mapeamento = useMemo(() => (respostas ? mapearCategorias(respostas) : null), [respostas]);
  const base = useMemo(() => atalho ?? mapeamento?.categorias ?? [], [atalho, mapeamento]);
  const avisos = atalho ? [] : (mapeamento?.avisos ?? []);
  const excedentes = base.filter((c) => !ligadas.includes(c));
  const chave = base.join(',');

  // A ordem de mapearCategorias já é determinística (começa pelo template do
  // tipo de evento), então as primeiras são as mais previsíveis para a Ana.
  useEffect(() => {
    setLigadas(base.slice(0, MAX_CATEGORIAS_POR_PESQUISA));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  function alternarCategoria(id: string) {
    setErro(null);
    setLigadas((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id);
      if (atual.length >= MAX_CATEGORIAS_POR_PESQUISA) {
        setErro('Tire uma para colocar esta.');
        return atual;
      }
      return [...atual, id];
    });
  }

  async function pesquisar() {
    setEnviando(true);
    setErro(null);
    try {
      const body: CriarRankingBody = {
        cidade: cidade.trim(),
        categorias: ligadas,
        avisos,
      };
      const res = await fetch('/api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setErro((await lerErroDaApi(res)) ?? FALHA_GENERICA);
        setEnviando(false);
        setPagando(false);
        return;
      }
      const json = (await res.json()) as CriarRankingResponse;
      router.push(`/pesquisa/${json.id}`);
    } catch {
      setErro(FALHA_GENERICA);
      setEnviando(false);
      setPagando(false);
    }
  }

  /* ---------------- tela: sua lista ---------------- */

  if (naLista) {
    const podeIr = ligadas.length > 0 && cidade.trim().length > 1 && !enviando;
    const editando = modoLista === 'editar';

    function sair() {
      setErro(null);
      setModoLista('confirmar');
      setNaLista(false);
      setAtalho(null);
      setLigadas([]);
      setE(ESTADO_INICIAL);
      setPasso(1);
      setNaAbertura(true);
    }

    return (
      <>
        <div className="wrap">
          <h1 className="h1">
            {editando
              ? 'O que tirar da busca?'
              : `Seu evento precisa ${ligadas.length === 1 ? 'deste fornecedor' : `destes ${ligadas.length} fornecedores`}`}
          </h1>
          <MetaLinha
            tipo={atalho ? null : e.tipo}
            pessoas={atalho ? null : e.pessoas}
            cidade={cidade}
            setCidade={setCidade}
            categorias={atalho ? ligadas.length : null}
          />

          {avisos.map((a) => (
            <AvisoCurto key={a} texto={a} />
          ))}

          {/* Confirmar é leitura: as categorias viram etiquetas, não controles.
              Só no modo de edição elas voltam a ser tocáveis. */}
          <ListaDeCategorias
            ligadas={ligadas}
            excedentes={excedentes}
            editando={editando}
            onAlternar={alternarCategoria}
          />

          {erro && (
            <p className="note note-warn" role="alert">
              {erro}
            </p>
          )}

          <div className="dock">
            <div className="dock-inner">
              {!editando && <p className="caption">Prosseguir com a busca?</p>}
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setErro(null);
                    if (editando) {
                      // Cancelar devolve a lista como estava ao entrar na edição.
                      if (antesDeEditar) setLigadas(antesDeEditar);
                      setAntesDeEditar(null);
                      setModoLista('confirmar');
                    } else {
                      setAntesDeEditar(ligadas);
                      setModoLista('editar');
                    }
                  }}
                >
                  {editando ? 'Cancelar' : 'Remover algum'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  disabled={!podeIr}
                  onClick={() => {
                    setAntesDeEditar(null);
                    setModoLista('confirmar');
                    setPagando(true);
                  }}
                >
                  {editando ? 'Prosseguir' : 'Prosseguir com a busca'} · {PRECO_BUSCA}
                </button>
              </div>
              <div className="dock-saida">
                <button type="button" className="btn btn-ghost btn-sm" onClick={sair}>
                  Sair
                </button>
                <span className="caption subtle">🔒 Relatório privado. Só você vê.</span>
              </div>
            </div>
          </div>
        </div>

        {pagando && (
          <Paywall
            enviando={enviando}
            onPagar={() => void pesquisar()}
            onFechar={() => setPagando(false)}
          />
        )}
      </>
    );
  }

  /* ---------------- abertura ---------------- */

  if (naAbertura) {
    return (
      <>
        <div className="wrap hero">
          <h1 className="h1">Confira o fornecedor antes de pagar o sinal.</h1>
          <p className="lede">13 checagens em fontes públicas. Fonte clicável em cada uma.</p>

          <div className="hero-acoes">
            <button
              type="button"
              className="btn btn-gradient btn-lg btn-block"
              onClick={() => {
                setNaAbertura(false);
                setPasso(1);
              }}
            >
              Começar pelo meu evento
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg btn-block"
              onClick={() => setBuscaAberta(true)}
            >
              <IconeBusca /> Já sei a categoria
            </button>
          </div>

          <p className="caption subtle">Cinco perguntas. Menos de dois minutos.</p>
        </div>

        {buscaAberta && (
          <BuscaCategoria
            onFechar={() => setBuscaAberta(false)}
            onUsar={(ids) => {
              setBuscaAberta(false);
              setAtalho(ids);
              setLigadas(ids);
              setNaAbertura(false);
              setNaLista(true);
            }}
          />
        )}
      </>
    );
  }

  /* ---------------- wizard ---------------- */

  const feira = e.tipo === 'feira_expositor';
  const comDock = passo >= 4;

  return (
    <>
      <div className="wrap">
        {/* nos passos com dock, o Voltar já está no rodapé fixo */}
        {passo < 4 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => (passo === 1 ? setNaAbertura(true) : setPasso(passo - 1))}
          >
            ← Voltar
          </button>
        )}

        <Passos atual={passo} />

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (podeAvancar(passo, e)) avancar(passo);
          }}
        >
          {passo === 1 && (
            <fieldset className="opt-grid">
              <legend className="h1">Que tipo de evento é?</legend>
              {TIPOS_EVENTO.map((t) => (
                <Radio
                  key={t.id}
                  name="tipo"
                  checked={e.tipo === t.id}
                  label={t.label}
                  onChange={() => {
                    setE({ ...e, tipo: t.id });
                    // Feira inverte o fluxo inteiro: a Ana precisa ler o aviso
                    // antes de seguir, então aqui o avanço nunca é automático.
                    if (t.id !== 'feira_expositor') autoAvancar(1);
                  }}
                />
              ))}
            </fieldset>
          )}

          {passo === 2 && (
            <fieldset className="opt-grid">
              <legend className="h1">Quantas pessoas?</legend>
              {(['ate50', '50a200', '200mais'] as const).map((id) => (
                <Radio
                  key={id}
                  name="pessoas"
                  checked={e.pessoas === id}
                  label={
                    id === 'ate50' ? 'Até 50' : id === '50a200' ? 'De 50 a 200' : 'Mais de 200'
                  }
                  onChange={() => {
                    setE({ ...e, pessoas: id });
                    autoAvancar(2);
                  }}
                />
              ))}
            </fieldset>
          )}

          {passo === 3 && (
            <fieldset className="opt-grid">
              <legend className="h1">Onde vai ser?</legend>
              <Radio
                name="local"
                checked={e.local === 'proprio'}
                label="No escritório"
                hint="espaço da empresa"
                onChange={() => {
                  setE({ ...e, local: 'proprio' });
                  autoAvancar(3);
                }}
              />
              <Radio
                name="local"
                checked={e.local === 'alugado_licenciado'}
                label="Espaço de eventos"
                hint="hotel, casa de eventos, auditório"
                onChange={() => {
                  setE({ ...e, local: 'alugado_licenciado' });
                  autoAvancar(3);
                }}
              />
              <Radio
                name="local"
                checked={e.local === 'externo_nao_licenciado'}
                label="Ao ar livre ou espaço improvisado"
                hint="galpão, sítio, praça"
                onChange={() => {
                  setE({ ...e, local: 'externo_nao_licenciado' });
                  autoAvancar(3);
                }}
              />
            </fieldset>
          )}

          {passo === 4 && (
            <fieldset className="opt-grid">
              <legend className="h1">Comida e bebida?</legend>
              <p className="caption subtle">Pode marcar mais de um.</p>
              {COMIDAS.map((c) => (
                <Check
                  key={c.id}
                  checked={e.comida.includes(c.id)}
                  disabled={e.semComida}
                  label={c.label}
                  onChange={() =>
                    setE({
                      ...e,
                      comida: alterna(e.comida, c.id),
                      semComida: false,
                    })
                  }
                />
              ))}
              <Check
                checked={e.openBar}
                disabled={e.semComida}
                label="Open bar"
                onChange={() => setE({ ...e, openBar: !e.openBar, semComida: false })}
              />
              <span className="divider" />
              <Check
                checked={e.semComida}
                label="Nada disso"
                onChange={() =>
                  setE({
                    ...e,
                    semComida: !e.semComida,
                    comida: [],
                    openBar: false,
                  })
                }
              />
            </fieldset>
          )}

          {passo === 5 && (
            <fieldset>
              <legend className="h1">O que mais o evento tem?</legend>
              <p className="caption subtle">Pode pular.</p>
              <div className="chips">
                {EXTRAS.map((x) => {
                  const ligado = e.extras.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      type="button"
                      className="chip chip-pick"
                      aria-pressed={ligado}
                      aria-label={`${x.label}, ${ligado ? 'na lista' : 'fora da lista'}`}
                      onClick={() => setE({ ...e, extras: alterna(e.extras, x.id) })}
                    >
                      {ligado && <span aria-hidden="true">✓</span>}
                      {x.label}
                    </button>
                  );
                })}
              </div>
              {e.extras.includes('musica') && (
                <p className="caption subtle">
                  Música gera taxa de ECAD (direitos autorais). Fica no relatório.
                </p>
              )}
            </fieldset>
          )}

          {passo === 1 && feira && (
            <div className="note note-warn">
              <p>Feira muda a lista. Energia, internet e limpeza vêm do organizador.</p>
              <Disclose rotulo="ver o que muda" rotuloAberto="ocultar">
                <p>
                  No estande, energia, internet, água, limpeza e mobiliário básico saem do portal do
                  organizador da feira. Não entram como fornecedor de mercado. Montadora
                  credenciada, cenografia do estande, ART com laudo de engenharia e seguro passam a
                  ser obrigatórios.
                </p>
              </Disclose>
            </div>
          )}

          {/* Caminho de teclado: quem navega por setas confirma no Enter. */}
          {!comDock && (
            <button type="submit" className="sr-only" disabled={!podeAvancar(passo, e)}>
              Continuar
            </button>
          )}

          {(comDock || (passo === 1 && feira)) && (
            <div className="dock">
              <div className="dock-inner">
                <div className="btn-row">
                  {passo > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPasso(passo - 1)}
                    >
                      ← Voltar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={!podeAvancar(passo, e)}
                  >
                    {passo === TOTAL_PASSOS ? 'Ver minha lista →' : 'Continuar →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
}

function IconeBusca() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

function podeAvancar(passo: number, e: Estado): boolean {
  if (passo === 1) return e.tipo != null;
  if (passo === 2) return e.pessoas != null;
  if (passo === 3) return e.local != null;
  if (passo === 4) return e.semComida || e.comida.length > 0 || e.openBar;
  return true; // o passo 5 é pulável
}

/* ---------------- blocos ---------------- */

function Passos({ atual }: { atual: number }) {
  return (
    <div className="stepbar">
      <div className="stepbar-row">
        <span className="eyebrow">
          {atual} de {TOTAL_PASSOS}
        </span>
      </div>
      <div
        className="track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_PASSOS}
        aria-valuenow={atual}
        aria-label={`Passo ${atual} de ${TOTAL_PASSOS}`}
      >
        <span
          className="track-fill"
          style={{ '--fill': atual / TOTAL_PASSOS } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function Radio({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="opt">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="opt-box" aria-hidden="true" />
      <span className="opt-label">{label}</span>
      {hint && <span className="opt-hint">{hint}</span>}
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="opt">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span className="opt-box" aria-hidden="true" />
      <span className="opt-label">{label}</span>
    </label>
  );
}

function MetaLinha({
  tipo,
  pessoas,
  cidade,
  setCidade,
  categorias,
}: {
  tipo: TipoEvento | null;
  pessoas: Estado['pessoas'];
  cidade: string;
  setCidade: (c: string) => void;
  categorias: number | null;
}) {
  const [editando, setEditando] = useState(false);
  const partes: string[] = [];
  if (tipo) partes.push(TIPOS_EVENTO.find((t) => t.id === tipo)?.label ?? '');
  if (pessoas) partes.push(PESSOAS_LABEL[pessoas]);
  if (categorias != null)
    partes.push(`${categorias} ${categorias === 1 ? 'categoria' : 'categorias'}`);

  return (
    <p className="lede">
      {partes.filter(Boolean).map((p) => (
        <span key={p}>{p} · </span>
      ))}
      {editando ? (
        <input
          className="input"
          autoFocus
          value={cidade}
          aria-label="Cidade"
          placeholder="Curitiba"
          autoComplete="address-level2"
          onChange={(ev) => setCidade(ev.target.value)}
          onBlur={() => setEditando(false)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              setEditando(false);
            }
          }}
          aria-invalid={cidade.trim().length < 2}
        />
      ) : (
        <button
          type="button"
          className="token-city"
          onClick={() => setEditando(true)}
          aria-label={`Trocar cidade. Agora: ${cidade || 'nenhuma'}`}
        >
          {cidade.trim() || 'escolher cidade'} ✎
        </button>
      )}
    </p>
  );
}

function AvisoCurto({ texto }: { texto: string }) {
  // O aviso longo viaja inteiro até o ranking e o PDF; na tela só entra a
  // primeira frase, e o resto fica a um toque.
  const corte = texto.indexOf('. ');
  const curto = corte > 0 ? texto.slice(0, corte + 1) : texto;
  const resto = corte > 0 ? texto.slice(corte + 2) : '';
  return (
    <div className="note note-warn">
      <p>{curto}</p>
      {resto && (
        <Disclose rotulo="ver o que muda" rotuloAberto="ocultar">
          <p>{resto}</p>
        </Disclose>
      )}
    </div>
  );
}

function ListaDeCategorias({
  ligadas,
  excedentes,
  editando,
  onAlternar,
}: {
  ligadas: string[];
  excedentes: string[];
  editando: boolean;
  onAlternar: (id: string) => void;
}) {
  const familias = Object.entries(FAMILIAS).filter(([fam]) =>
    ligadas.some((c) => CATEGORIAS.find((x) => x.id === c)?.familia === fam),
  );

  return (
    <>
      {familias.map(([fam, famLabel]) => (
        <section key={fam} className="chipgroup">
          <p className="eyebrow">{famLabel}</p>
          <div className="chips">
            {ligadas
              .filter((c) => CATEGORIAS.find((x) => x.id === c)?.familia === fam)
              .map((c) =>
                editando ? (
                  <button
                    key={c}
                    type="button"
                    className="chip"
                    aria-pressed={true}
                    aria-label={`${categoriaLabel(c)}, na pesquisa. Tocar remove.`}
                    onClick={() => onAlternar(c)}
                  >
                    {categoriaLabel(c)}
                    <span aria-hidden="true">✕</span>
                  </button>
                ) : (
                  <span key={c} className="chip-static">
                    <span aria-hidden="true">✓</span>
                    {categoriaLabel(c)}
                  </span>
                ),
              )}
          </div>
        </section>
      ))}

      {editando && <p className="caption subtle">Toque para tirar ou devolver.</p>}

      {editando && excedentes.length > 0 && (
        <Disclose
          rotulo={`Fora desta pesquisa: ${excedentes.slice(0, 2).map(categoriaLabel).join(', ')}${
            excedentes.length > 2 ? ` +${excedentes.length - 2}` : ''
          }`}
          rotuloAberto="ocultar as de fora"
        >
          <div className="chips">
            {excedentes.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={false}
                aria-label={`${categoriaLabel(c)}, fora da pesquisa`}
                onClick={() => onAlternar(c)}
              >
                {categoriaLabel(c)}
              </button>
            ))}
          </div>
        </Disclose>
      )}
    </>
  );
}
