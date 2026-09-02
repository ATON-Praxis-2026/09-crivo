// Interface única da pipeline com dois providers: MOCK (demo, snapshot
// determinístico e sem estado) e REAL (Claude + BrasilAPI, com store).
import { randomUUID } from 'crypto';
import { categoriaLabel } from '../categorias';
import { isMockMode } from '../config';
import { getStore } from '../db';
import type { RankingResponse } from '../types';
import { mockSnapshot } from './mock';
import { encodeMockId, isMockId } from './mockId';
import { runPipeline } from './real';

export interface CriacaoBusca {
  id: string;
  // Trabalho de fundo a agendar (rota usa after() do next/server); null no mock.
  executar: (() => Promise<void>) | null;
}

export interface PipelineProvider {
  criar(cidade: string, categorias: string[], avisos: string[]): CriacaoBusca;
  obter(id: string): RankingResponse | null;
}

const mockProvider: PipelineProvider = {
  criar(cidade, categorias, avisos) {
    return { id: encodeMockId({ t: Date.now(), cidade, cats: categorias, avisos }), executar: null };
  },
  obter(id) {
    return mockSnapshot(id, Date.now());
  },
};

const realProvider: PipelineProvider = {
  criar(cidade, categorias, avisos) {
    const id = randomUUID();
    getStore().criarBusca({
      id,
      cidade,
      mock: false,
      avisos,
      categorias: categorias.map((c) => ({ id: c, label: categoriaLabel(c) })),
    });
    return { id, executar: () => runPipeline(id, cidade, categorias) };
  },
  obter(id) {
    return getStore().getRanking(id);
  },
};

export function providerParaCriar(): PipelineProvider {
  return isMockMode() ? mockProvider : realProvider;
}

// No GET, o próprio id diz de onde veio — robusto a troca de modo no meio.
export function providerParaLer(id: string): PipelineProvider {
  return isMockId(id) ? mockProvider : realProvider;
}
