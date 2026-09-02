// Seleção do store: DATA_STORE=memory ou Vercel → MemoryStore; senão tenta
// SQLite e, se o binário nativo falhar, cai no MemoryStore sem derrubar o app.
import type { DataStore } from './store';
import { MemoryStore } from './memory';

export function getStore(): DataStore {
  const g = globalThis as typeof globalThis & { __autopilotStore?: DataStore };
  if (g.__autopilotStore) return g.__autopilotStore;

  let store: DataStore;
  if (process.env.DATA_STORE === 'memory' || process.env.VERCEL) {
    store = new MemoryStore();
  } else {
    try {
      // require dinâmico: o import estático avaliaria o binário nativo do
      // better-sqlite3 fora do try/catch.
      const { SqliteStore } = require('./sqlite') as typeof import('./sqlite');
      store = new SqliteStore();
    } catch (e) {
      console.warn('[db] better-sqlite3 indisponível — usando MemoryStore. Detalhe:', e);
      store = new MemoryStore();
    }
  }
  g.__autopilotStore = store;
  return store;
}
