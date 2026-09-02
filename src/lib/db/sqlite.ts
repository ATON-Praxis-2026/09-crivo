// SqliteStore — better-sqlite3, arquivo data/autopilot.db, WAL.
// DDL fiel à P1 do dossiê (searches/candidates/verifications/evidences) +
// search_categorias (uma busca aciona várias categorias) + cache (o moat:
// unique nome+cidade, reaproveitado por 30 dias).
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';
import type { CandidatoResultado, CategoriaStatus, RankingResponse } from '../types';
import type { DataStore, NovaBusca } from './store';

const DDL = `
create table if not exists searches (
  id text primary key,
  cidade text not null,
  mock integer not null default 0,
  status text not null default 'rodando',
  avisos_json text not null default '[]',
  criado_em text not null default (datetime('now'))
);
create table if not exists search_categorias (
  search_id text not null references searches(id),
  categoria_id text not null,
  label text not null,
  status text not null default 'aguardando',
  primary key (search_id, categoria_id)
);
create table if not exists candidates (
  id text primary key,
  search_id text not null references searches(id),
  categoria_id text not null,
  json text not null,
  criado_em text not null default (datetime('now'))
);
create table if not exists verifications (
  id integer primary key autoincrement,
  candidate_id text not null references candidates(id),
  cnpj text,
  achados_json text not null,
  score integer,
  tier text,
  confianca real,
  verificado_em text not null default (datetime('now'))
);
create table if not exists evidences (
  id integer primary key autoincrement,
  verification_id integer not null references verifications(id),
  criterio text not null,
  url text,
  resumo text,
  confianca real
);
create table if not exists cache (
  chave text primary key,
  nome text not null,
  cidade text not null,
  json text not null,
  verificado_em integer not null
);
`;

const cacheKey = (nome: string, cidade: string) =>
  `${nome.trim().toLowerCase()}|${cidade.trim().toLowerCase()}`;

export class SqliteStore implements DataStore {
  private db: Database.Database;

  constructor() {
    const dir = path.join(process.cwd(), 'data');
    mkdirSync(dir, { recursive: true });
    this.db = new Database(path.join(dir, 'autopilot.db'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(DDL);
  }

  criarBusca(b: NovaBusca): void {
    const tx = this.db.transaction(() => {
      this.db
        .prepare('insert into searches (id, cidade, mock, status, avisos_json) values (?, ?, ?, ?, ?)')
        .run(b.id, b.cidade, b.mock ? 1 : 0, 'rodando', JSON.stringify(b.avisos));
      const ins = this.db.prepare(
        'insert into search_categorias (search_id, categoria_id, label, status) values (?, ?, ?, ?)',
      );
      for (const c of b.categorias) ins.run(b.id, c.id, c.label, 'aguardando');
    });
    tx();
  }

  setBuscaStatus(id: string, status: RankingResponse['status']): void {
    this.db.prepare('update searches set status = ? where id = ?').run(status, id);
  }

  setCategoriaStatus(buscaId: string, categoriaId: string, status: CategoriaStatus): void {
    this.db
      .prepare('update search_categorias set status = ? where search_id = ? and categoria_id = ?')
      .run(status, buscaId, categoriaId);
  }

  addCandidato(buscaId: string, categoriaId: string, c: CandidatoResultado): void {
    this.db
      .prepare('insert into candidates (id, search_id, categoria_id, json) values (?, ?, ?, ?)')
      .run(c.id, buscaId, categoriaId, JSON.stringify(c));
  }

  updateCandidato(
    buscaId: string,
    categoriaId: string,
    candidatoId: string,
    patch: Partial<CandidatoResultado>,
  ): void {
    const row = this.db
      .prepare('select json from candidates where id = ? and search_id = ? and categoria_id = ?')
      .get(candidatoId, buscaId, categoriaId) as { json: string } | undefined;
    if (!row) return;
    const atual = JSON.parse(row.json) as CandidatoResultado;
    const novo = { ...atual, ...patch };
    this.db.prepare('update candidates set json = ? where id = ?').run(JSON.stringify(novo), candidatoId);

    // Auditoria via SQL (P1): verificação + uma evidência por achado com URL.
    if (novo.status === 'concluido' && novo.achados && novo.achados.length > 0) {
      const ja = this.db
        .prepare('select id from verifications where candidate_id = ?')
        .get(candidatoId) as { id: number } | undefined;
      if (!ja) {
        const comDado = novo.achados.filter((a) => a.status !== 'nao_verificavel');
        const confMedia = comDado.length
          ? comDado.reduce((s, a) => s + a.confianca, 0) / comDado.length
          : 0;
        const cnpj = novo.achados.find((a) => a.criterio === 'cnpj_ativo')?.valor ?? null;
        const tx = this.db.transaction(() => {
          const info = this.db
            .prepare(
              'insert into verifications (candidate_id, cnpj, achados_json, score, tier, confianca) values (?, ?, ?, ?, ?, ?)',
            )
            .run(candidatoId, cnpj, JSON.stringify(novo.achados), novo.score ?? null, novo.tier ?? null, confMedia);
          const ins = this.db.prepare(
            'insert into evidences (verification_id, criterio, url, resumo, confianca) values (?, ?, ?, ?, ?)',
          );
          for (const a of novo.achados ?? []) {
            ins.run(info.lastInsertRowid, a.criterio, a.evidenciaUrl, a.valor, a.confianca);
          }
        });
        tx();
      }
    }
  }

  getRanking(id: string): RankingResponse | null {
    const s = this.db.prepare('select * from searches where id = ?').get(id) as
      | { id: string; cidade: string; mock: number; status: string; avisos_json: string; criado_em: string }
      | undefined;
    if (!s) return null;
    const cats = this.db
      .prepare('select * from search_categorias where search_id = ? order by rowid')
      .all(id) as Array<{ categoria_id: string; label: string; status: string }>;
    const candStmt = this.db.prepare(
      'select json from candidates where search_id = ? and categoria_id = ? order by rowid',
    );
    return {
      id: s.id,
      cidade: s.cidade,
      criadoEm: s.criado_em,
      mock: s.mock === 1,
      status: s.status as RankingResponse['status'],
      avisos: JSON.parse(s.avisos_json) as string[],
      categorias: cats.map((c) => ({
        categoriaId: c.categoria_id,
        categoriaLabel: c.label,
        status: c.status as CategoriaStatus,
        candidatos: (candStmt.all(id, c.categoria_id) as Array<{ json: string }>).map(
          (r) => JSON.parse(r.json) as CandidatoResultado,
        ),
      })),
    };
  }

  getCache(nome: string, cidade: string, maxDias: number): CandidatoResultado | null {
    const row = this.db.prepare('select json, verificado_em from cache where chave = ?').get(cacheKey(nome, cidade)) as
      | { json: string; verificado_em: number }
      | undefined;
    if (!row) return null;
    if ((Date.now() - row.verificado_em) / 86_400_000 > maxDias) return null;
    return JSON.parse(row.json) as CandidatoResultado;
  }

  putCache(nome: string, cidade: string, c: CandidatoResultado): void {
    this.db
      .prepare(
        'insert into cache (chave, nome, cidade, json, verificado_em) values (?, ?, ?, ?, ?) ' +
          'on conflict(chave) do update set json = excluded.json, verificado_em = excluded.verificado_em',
      )
      .run(cacheKey(nome, cidade), nome, cidade, JSON.stringify(c), Date.now());
  }
}
