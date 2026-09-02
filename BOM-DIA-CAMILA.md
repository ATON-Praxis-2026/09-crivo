# Bom dia! ☀️ O esqueleto do projeto está pronto e FUNCIONANDO

Build feito na madrugada de 30/08 pela equipe de agentes, conforme combinado.

## Veja agora, em 2 minutos

1. **Demo pública (abra no celular):** https://autopilot-eventos-demo.vercel.app
2. **Local:** `cd autopilot` → `npm run dev` → http://localhost:3000
3. Fluxo da demo: responda o checklist (ou use o atalho **categoria direta** →
   "Buffet completo" em Curitiba) → veja a pesquisa ao vivo preenchendo → ranking
   com evidências → botão **Exportar PDF**.

## O que foi construído

- **3 telas responsivas** (mobile-first, claro/escuro): checklist de 10 perguntas
  do evento (mapeamento em código → categorias), pesquisa ao vivo (polling 2s,
  checklist de verificação enchendo em tempo real), ranking com tiers
  ✓ Verificado / ⚠ Atenção / ✕ Evitar, evidências clicáveis, lista honesta do
  "não verificável" e PDF via impressão.
- **Pipeline completa** Descobridor → Verificador ×N (3 em paralelo) → Refinador
  (só casos de borda, auditoria adversarial) → Ranqueador. **Score 100% em
  código** (`src/lib/score.ts`): pesos 30/40/20/10, eliminatórias, regra de
  justiça (pouca pegada digital nunca vira Evitar).
- **APIs prontas para conectar:** copie `.env.example` → `.env`, cole a
  `ANTHROPIC_API_KEY` e reinicie — a pipeline real (busca web nativa do Claude +
  BrasilAPI para CNPJ) ativa sozinha. Sem chave, roda o **modo demonstração**
  (mesma pipeline, fornecedores fictícios — decisão da equipe: nunca fabricar
  reputação de empresa real).
- **Docs do time** em `docs/`: `arquitetura.md`, `user-stories.md`, `ux.md`,
  `qa-checklist.md` (QA executou build + E2E de verdade: 16/16 validações).
- **Git** inicializado com commits por etapa; vetos respeitados (sem WhatsApp
  API, sem no-code, só B2B, cotação automatizada fica na v2).

## O que falta (decisões suas / do time)

1. **Naming/marca** (chega hoje): trocar em UM lugar — `src/lib/config.ts`
   (`APP_NAME`) ou env `NEXT_PUBLIC_APP_NAME`. O design é neutro de propósito;
   o design system entra por cima dos tokens em `src/app/globals.css`.
2. **Testar a pipeline real com a chave** antes do pitch (custo ~US$ 1,50–2,50
   por ranking; `MOCK_MODE=true` força o demo para ensaiar sem gastar).
3. **Olho humano:** conferir no seu celular (320px), testar o PDF no navegador.
4. O deploy ficou no escopo `minas-solar-s-projects` da sua conta Vercel (era o
   login ativo no CLI); se quiser mover de time, é rápido no painel da Vercel.
