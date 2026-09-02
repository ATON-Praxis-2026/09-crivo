# Arquitetura Técnica — Autopilot de Eventos (MVP ATON)

**Documento do arquiteto · 30/08/2026 · consumido por: dev back, dev front, QA**

MVP: **Ranking de Fornecedores Validados por Reputação** (P0 do dossiê). O sistema pesquisa fontes públicas, valida cada candidato contra o checklist de reputação e devolve ranking com tiers e evidências clicáveis. A cotação automatizada (Partes 06–10) é v2 — **não construir**.

---

## 1. Stack decidida

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Next.js 15** (App Router, pasta `src/`, TypeScript estrito) | Front + API no mesmo processo; `npm run dev` e pronto; deploy Vercel trivial |
| Estilo | **CSS puro** (globals + CSS vars, mobile-first) | Zero config extra; design provisório trocável quando a marca chegar |
| Banco | **better-sqlite3** (arquivo `data/autopilot.db`) | Síncrono, sem servidor, o cache de validados É o moat |
| IA | **Claude API com busca web nativa** — a ÚNICA chave | Descobridor/Verificador/Refinador/justificativas com 1 credencial |
| CNPJ | **BrasilAPI** (`GET /api/cnpj/v1/{cnpj}`) | Grátis, sem chave |

**Descartadas (e por quê):** Supabase/Docker/n8n/Evolution → stack de produção pós-ATON, complexidade não paga no MVP de 6h. No-code (Lovable/Bolt/v0) → **vetado pela Camila**. Qualquer API de WhatsApp → **vetada**; WhatsApp existe só na narrativa de produção. Tailwind → dispensado; CSS puro basta para 3 telas.

## 2. Camada de dados — interface `DataStore`

Toda persistência passa pela interface `DataStore` (`src/lib/db/store.ts`). Duas implementações, selecionadas por env `DATA_STORE`:

- **`SqliteStore`** (`DATA_STORE=sqlite`, padrão local) — better-sqlite3 sobre `data/autopilot.db`.
- **`MemoryStore`** (`DATA_STORE=memory`) — Map em memória; usado no deploy demo (Vercel) e como **fallback automático** se o binário nativo do better-sqlite3 falhar no ambiente.

DDL (P1 do dossiê, aplicada no boot do SqliteStore):

```sql
create table if not exists searches (
  id integer primary key, categoria text, cidade text,
  status text default 'rodando',        -- rodando|concluida|erro
  criado_em text default current_timestamp
);
create table if not exists candidates (
  id integer primary key, search_id integer references searches,
  nome text, telefone text, site text, instagram text, fonte text
);
create table if not exists verifications (
  id integer primary key, candidate_id integer references candidates,
  cnpj text, achados_json text,
  score integer, tier text,             -- VERIFICADO|ATENCAO|EVITAR
  confianca real, verificado_em text default current_timestamp
);
create table if not exists evidences (
  id integer primary key, verification_id integer references verifications,
  criterio text, url text, resumo text, confianca real
);
-- cache: unique(nome, cidade) em candidates+verifications;
-- reaproveita verificação se verificado_em < 30 dias
```

Regra de cache: antes de verificar um candidato, consultar por `(nome, cidade)`; se houver verificação com `verificado_em` < 30 dias, **pular a pesquisa** e reutilizar achados/score (marcando `origem: 'cache'` na resposta da API).

## 3. Pipeline (roda 1× por categoria acionada)

```
Checklist P2 (mapeamento EM CÓDIGO → categorias_acionadas[])
  └─ por categoria:
     1. Descobridor      Haiku  · máx 8 buscas web · 10–15 candidatos · dedupe nome+telefone
     2. Verificador ×N   Sonnet · paralelo com LIMITE 3 · máx 6 buscas + 1 fetch BrasilAPI
     3. score provisório EM CÓDIGO
     4. Refinador        Sonnet · SÓ casos de borda · máx 4 buscas · ajusta ACHADOS, nunca nota
     5. re-score EM CÓDIGO
     6. Justificativas   Sonnet · 1 chamada em lote · 2 linhas factuais + "não verificável"
```

**Gatilhos do Refinador (qualquer um):** score a ±8 pts das fronteiras (50/75) · flag `possivel_homonimo` · eliminatória sustentada por evidência única com confiança < 0,7 · confiança média < 0,6 · pegada digital baixa.

**Resiliência:** timeout 60 s + 1 retry por fornecedor; falha individual → candidato entra como `nao_verificado` e o ranking **nunca** é derrubado por um fornecedor.

### Score é CÓDIGO (inegociável — defendido à banca)

`src/lib/score.ts`, função pura e auditável. Pesos declarados: **Cadastral 30 · Reputação 40 · Presença 20 · Verificabilidade 10**. Eliminatórias (zeram e explicam): CNPJ inapto/suspenso/baixado · sanção CEIS/CNEP · notícia de golpe confirmada · Reclame Aqui "não recomendada". Tiers: `≥75 VERIFICADO` · `50–74 ATENCAO` · `<50 EVITAR` — **com a regra de justiça: pouca pegada digital nunca vira EVITAR** (vira ATENCAO com motivo). LLM não emite nota em hipótese alguma; o Refinador só corrige achados/flags/confiança e o score é recalculado.

## 4. Providers — mesma interface, dois mundos

`src/lib/pipeline/provider.ts` define a interface (`descobrir`, `verificar`, `refinar`, `justificar`). Seleção automática em runtime:

- **`RealProvider`** — ativado quando `ANTHROPIC_API_KEY` existe (e `MOCK_MODE` não força demo). Claude com web search nativa (limites 8/6/4 por agente) + tool de fetch da BrasilAPI. Modelos por env: `MODEL_DESCOBRIDOR=claude-haiku-4-5`, demais `claude-sonnet-5`.
- **`MockProvider`** — sem chave → modo demo. Percorre a MESMA pipeline com delays simulados (400–1200 ms por passo) para a tela ao vivo funcionar igual. Seed em `seed/fornecedores-curitiba.json`; cidade default configurável via `NEXT_PUBLIC_DEFAULT_CITY`. **Decisão do lead: fornecedores do mock são FICTÍCIOS** — não fabricamos reputação de empresas reais; a UI exibe selo "modo demonstração".

## 5. API

### `POST /api/rankings`
Body: `{ cidade: string, categorias: string[] }` — categorias vêm do checklist P2 (mapeamento determinístico) ou do atalho "categoria direta".
Cria a search, responde **imediatamente** `{ id }` e dispara a pipeline com `after()` do `next/server` (funciona no `next dev`, no `next start` e na Vercel serverless).

### `GET /api/rankings/[id]` (polling de 2 s no front)
Resposta campo a campo:

```jsonc
{
  "id": 12,
  "status": "rodando",              // rodando | concluida | erro
  "cidade": "Curitiba",
  "mock": true,                     // selo de modo demonstração
  "criado_em": "2026-08-30T03:12:00Z",
  "categorias": [
    {
      "slug": "buffet",
      "label": "Buffet completo",
      "fase": "verificando",        // descobrindo | verificando | refinando | concluida
      "candidatos": [
        {
          "id": 34,
          "nome": "…", "telefone": "…", "site": "…", "instagram": "…",
          "fonte": "busca: buffet corporativo curitiba",
          "status": "verificando",  // descobrindo | verificando | refinando | concluido | nao_verificado
          "origem": "pesquisa",     // pesquisa | cache
          "cnpj": "…",
          "achados": {              // um objeto por critério do checklist (14 itens)
            "cnpj_ativo":   { "valor": "ATIVA", "evidencia_url": "https://…", "confianca": 0.95 },
            "google_rating":{ "valor": "4,7 (132 avaliações)", "evidencia_url": "https://…", "confianca": 0.8 },
            "reclame_aqui": { "valor": "nao_verificavel", "evidencia_url": null, "confianca": 0 }
            // …demais critérios
          },
          "score": 82,              // null enquanto não concluído
          "tier": "VERIFICADO",     // VERIFICADO | ATENCAO | EVITAR | null
          "flags": ["possivel_homonimo"],
          "justificativa": "…",     // 2 linhas factuais, toda afirmação com URL
          "nao_verificavel": ["reclame_aqui", "jusbrasil"]
        }
      ]
    }
  ]
}
```

Regra transversal: **nenhum achado entra sem `evidencia_url`** — sem URL, o valor é `nao_verificavel`. LGPD: quadro societário aparece só como verificado sim/não, nunca nomes de pessoas. Linguagem do EVITAR: critério + evidência, jamais adjetivo. Relatório é privado ao cliente.

## 6. Estrutura de pastas

```
autopilot/
├─ docs/                      arquitetura.md · user-stories.md · ux.md · qa-checklist.md
├─ seed/fornecedores-curitiba.json
├─ data/                      autopilot.db (gitignored)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx · globals.css
│  │  ├─ page.tsx                       Tela 1 — checklist P2 + atalho categoria direta
│  │  ├─ pesquisa/[id]/page.tsx         Tela 2 — verificação ao vivo (polling 2 s)
│  │  ├─ ranking/[id]/page.tsx          Tela 3 — ranking + evidências + CSS print
│  │  └─ api/rankings/route.ts · api/rankings/[id]/route.ts
│  ├─ lib/
│  │  ├─ config.ts                      nome provisório do app, cidade, modelos, limites
│  │  ├─ types.ts · score.ts · categorias.ts (TEMPLATE_BASE + AJUSTES + mapear())
│  │  ├─ concurrency.ts                 pLimit(3) próprio
│  │  ├─ db/  store.ts · sqlite.ts · memory.ts · index.ts
│  │  └─ pipeline/  index.ts · provider.ts · real.ts · mock.ts · brasilapi.ts · prompts.ts
│  └─ components/                       componentes das 3 telas
└─ package.json · tsconfig.json · next.config.mjs · .env.example
```

## 7. NFRs mensuráveis

- **Custo por ranking real:** ~US$ 1,50–2,50 (10 fornecedores, ~70–90 buscas; limites 8/6/4 garantem o teto).
- **Mock 100% offline:** zero chamadas de rede em modo demo (QA valida desligando a rede).
- **Polling:** GET /api/rankings/[id] responde em p95 < 150 ms local (leitura pura do store).
- **Responsivo ≥ 320 px:** sem scroll horizontal em nenhuma tela; alvo de toque ≥ 44 px.
- **Acessibilidade básica:** foco visível em todo interativo; contraste AA; tabelas/status com texto, não só cor.

## 8. Plano de build em fases

| Fase | Entrega | Dono |
|---|---|---|
| F0 ✅ | Scaffold (package.json, tsconfig, next.config, .env.example) | lead |
| F1 | `lib/` núcleo: types, config, score, categorias, db, concurrency | dev back |
| F2 | Pipeline mock + real, prompts da P1, API routes com after() | dev back |
| F3 | 3 telas responsivas + componentes + CSS print | dev front |
| F4 | QA: build, typecheck, fluxo mock ponta a ponta, guardrails, responsividade | QA |
| F5 | git, README, deploy demo Vercel (DATA_STORE=memory) | lead |

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| better-sqlite3 sem prebuild p/ Node 24 win32 | Fallback automático para MemoryStore no boot (try/catch no require) |
| Rate limit BrasilAPI | Backoff simples + cache de CNPJ consultado |
| Vercel serverless mata trabalho pós-resposta | `after()` do next/server + `DATA_STORE=memory` no deploy demo |
| Homônimos sujando achados | Match cidade+telefone antes de atribuir página; flag `possivel_homonimo` → Refinador |
| Alucinação de nota | Impossível por construção: score só em código; prompts proíbem inventar valor/URL |

## 10. Checklist de validação do arquiteto (para o QA)

- [ ] `npm run build` e `npm run typecheck` passam sem erro.
- [ ] POST /api/rankings responde `{id}` < 500 ms e dispara pipeline (não bloqueia).
- [ ] GET /api/rankings/[id] devolve resultados parciais durante a execução (tela 2 anda).
- [ ] Sem `ANTHROPIC_API_KEY`: fluxo completo funciona offline (MockProvider) e UI mostra selo demo.
- [ ] Score confere com os pesos 30/40/20/10; eliminatória zera; pegada digital baixa nunca vira EVITAR.
- [ ] Refinador só roda quando um gatilho dispara; nunca altera nota diretamente.
- [ ] Nenhum achado sem `evidencia_url` entra no score; "não verificável" listado por fornecedor.
- [ ] LGPD: nenhum nome de sócio na resposta da API nem na UI.
- [ ] Cache: segunda search igual (nome+cidade < 30 dias) reutiliza verificações (`origem: 'cache'`).
- [ ] 3 telas sem scroll horizontal a 320 px; foco visível; impressão da tela 3 gera PDF legível.
- [ ] Nome do app aparece SÓ via `src/lib/config.ts` (`APP_NAME`) — zero marca hardcoded.
