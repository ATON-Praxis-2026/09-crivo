# Autopilot de Eventos — MVP ATON (grupo09)

> Nome provisório. A marca/naming entra depois — o nome exibido vem de um único
> lugar (`src/lib/config.ts` → `APP_NAME`, ou env `NEXT_PUBLIC_APP_NAME`).

**O produto em uma frase:** diga o que precisa contratar para o seu evento
corporativo — o autopilot vasculha fontes públicas (Receita Federal, Google,
Reclame Aqui, notícias, redes), valida cada fornecedor contra um checklist de
reputação e devolve o ranking dos melhores, com nota, evidências clicáveis e
red flags. **Valida QUEM contratar** (a cotação automatizada é o roadmap v2).

## Rodando local

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Sem chave de API o app roda em **modo demonstração**: a mesma pipeline
(Descobridor → Verificador ×N → Refinador → Ranqueador) percorre dados
simulados de fornecedores **fictícios** — nomes inventados de propósito, para
nunca fabricar reputação de empresas reais. Um banner deixa o modo explícito.

## Conectando as APIs reais

1. Copie `.env.example` para `.env`.
2. Preencha `ANTHROPIC_API_KEY` (única chave necessária — a busca web é nativa
   do Claude; o CNPJ vem da BrasilAPI, grátis e sem chave).
3. Reinicie o `npm run dev`. A pipeline real ativa sozinha.

Custo estimado por ranking real (10 fornecedores): ~US$ 1,50–2,50.
Para ensaiar o pitch sem gastar, force `MOCK_MODE=true` no `.env`.

4. Confira se a chave chegou: `curl -s localhost:3000/api/status` mostra o modo
   e se a chave esta presente; `…/api/status?ping=1` faz uma chamada minuscula e prova
   que ela funciona. A queda para o modo demonstracao e silenciosa, entao esse
   passo evita descobrir no palco. Passo a passo (local e Vercel), custo e o que
   fazer se a chave vazar: `docs/conectar-api.md`.

## As 3 telas

1. **Checklist do evento** (`/`) — 10 perguntas em linguagem leiga que acionam
   as categorias de fornecedor via mapeamento em código (+ atalho "categoria
   direta" para a demo).
2. **Pesquisa ao vivo** (`/pesquisa/[id]`) — o checklist de verificação de cada
   fornecedor preenchendo em tempo real (polling 2s). O momento "uau".
3. **Ranking** (`/ranking/[id]`) — tiers ✓ Verificado / ⚠ Atenção / ✕ Evitar,
   evidências expandíveis com URL, lista honesta do "não verificável" e
   exportação para PDF (imprimir).

## Regra de ouro (defensável à banca)

**A IA pesquisa e lê; o score é código** (`src/lib/score.ts`): pesos declarados
30/40/20/10 (cadastral/reputação/presença/verificabilidade), eliminatórias que
zeram (CNPJ inapto/baixado, sanção CEIS/CNEP, golpe confirmado, RA "não
recomendada") e a regra de justiça — pouca pegada digital nunca vira "Evitar".

## Documentação do time

- `docs/arquitetura.md` — specs técnicas (arquiteto)
- `docs/user-stories.md` — user stories e regras de negócio (product)
- `docs/ux.md` — fluxo, wireframes e tokens (UX)
- `docs/qa-checklist.md` — validação executada (QA)

## Deploy demo (Vercel)

**Demo pública no ar: https://autopilot-eventos-demo.vercel.app** (projeto
`autopilot-eventos-demo`, publicado via Vercel CLI da máquina).

O deploy roda em modo demonstração com `DATA_STORE=memory`; no modo mock o
estado da pesquisa é derivado deterministicamente do próprio id (funciona em
serverless sem banco). O modo real com SQLite é local por enquanto — em
produção a camada de dados (`src/lib/db`) troca por Postgres/Turso sem tocar na
pipeline.

## Escopo (decisões do time, 29/08)

- Só eventos corporativos **B2B**; B2C é expansão futura.
- **Sem** API de WhatsApp no MVP (WhatsApp é narrativa de produção no pitch).
- Cotação automatizada (Partes 06–10 do dossiê) **não** está neste MVP — é v2.
- Relatório **privado** ao cliente; linguagem do "Evitar" sempre factual
  (critério + evidência, nunca adjetivo); LGPD: dados da empresa, sem nomes de
  pessoas.
