// Camada de dados abstraída: SqliteStore (local, o cache é o moat) e
// MemoryStore (deploy demo/Vercel e fallback se o binário nativo falhar).
import type { CandidatoResultado, CategoriaStatus, RankingResponse } from '../types';

export interface NovaBusca {
  id: string;
  cidade: string;
  mock: boolean;
  avisos: string[];
  categorias: Array<{ id: string; label: string }>;
}

export interface DataStore {
  criarBusca(b: NovaBusca): void;
  setBuscaStatus(id: string, status: RankingResponse['status']): void;
  setCategoriaStatus(buscaId: string, categoriaId: string, status: CategoriaStatus): void;
  addCandidato(buscaId: string, categoriaId: string, c: CandidatoResultado): void;
  updateCandidato(
    buscaId: string,
    categoriaId: string,
    candidatoId: string,
    patch: Partial<CandidatoResultado>,
  ): void;
  getRanking(id: string): RankingResponse | null;

  // Cache do moat: verificação completa reaproveitada por 30 dias, unique(nome, cidade).
  getCache(nome: string, cidade: string, maxDias: number): CandidatoResultado | null;
  putCache(nome: string, cidade: string, c: CandidatoResultado): void;
}
