// Store em memória — usado no deploy demo (Vercel) e como fallback local.
// Vive em globalThis para sobreviver ao hot reload do dev server.
import type { CandidatoResultado, RankingResponse } from '../types';
import type { DataStore, NovaBusca } from './store';

interface MemoryState {
  buscas: Map<string, RankingResponse>;
  cache: Map<string, { c: CandidatoResultado; em: number }>;
}

function state(): MemoryState {
  const g = globalThis as typeof globalThis & { __autopilotMem?: MemoryState };
  if (!g.__autopilotMem) {
    g.__autopilotMem = { buscas: new Map(), cache: new Map() };
  }
  return g.__autopilotMem;
}

const cacheKey = (nome: string, cidade: string) =>
  `${nome.trim().toLowerCase()}|${cidade.trim().toLowerCase()}`;

export class MemoryStore implements DataStore {
  criarBusca(b: NovaBusca): void {
    state().buscas.set(b.id, {
      id: b.id,
      cidade: b.cidade,
      criadoEm: new Date().toISOString(),
      mock: b.mock,
      status: 'rodando',
      avisos: b.avisos,
      categorias: b.categorias.map((c) => ({
        categoriaId: c.id,
        categoriaLabel: c.label,
        status: 'aguardando',
        candidatos: [],
      })),
    });
  }

  setBuscaStatus(id: string, status: RankingResponse['status']): void {
    const busca = state().buscas.get(id);
    if (busca) busca.status = status;
  }

  setCategoriaStatus(buscaId: string, categoriaId: string, status: import('../types').CategoriaStatus): void {
    const cat = state().buscas.get(buscaId)?.categorias.find((c) => c.categoriaId === categoriaId);
    if (cat) cat.status = status;
  }

  addCandidato(buscaId: string, categoriaId: string, c: CandidatoResultado): void {
    const cat = state().buscas.get(buscaId)?.categorias.find((x) => x.categoriaId === categoriaId);
    if (cat) cat.candidatos.push(c);
  }

  updateCandidato(
    buscaId: string,
    categoriaId: string,
    candidatoId: string,
    patch: Partial<CandidatoResultado>,
  ): void {
    const cat = state().buscas.get(buscaId)?.categorias.find((x) => x.categoriaId === categoriaId);
    const cand = cat?.candidatos.find((x) => x.id === candidatoId);
    if (cand) Object.assign(cand, patch);
  }

  getRanking(id: string): RankingResponse | null {
    const busca = state().buscas.get(id);
    // Cópia defensiva: o objeto vivo continua sendo mutado pela pipeline.
    return busca ? (JSON.parse(JSON.stringify(busca)) as RankingResponse) : null;
  }

  getCache(nome: string, cidade: string, maxDias: number): CandidatoResultado | null {
    const hit = state().cache.get(cacheKey(nome, cidade));
    if (!hit) return null;
    const idadeDias = (Date.now() - hit.em) / 86_400_000;
    if (idadeDias > maxDias) return null;
    return JSON.parse(JSON.stringify(hit.c)) as CandidatoResultado;
  }

  putCache(nome: string, cidade: string, c: CandidatoResultado): void {
    state().cache.set(cacheKey(nome, cidade), {
      c: JSON.parse(JSON.stringify(c)) as CandidatoResultado,
      em: Date.now(),
    });
  }
}
