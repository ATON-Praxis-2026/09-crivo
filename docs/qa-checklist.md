# QA — Checklist de validação executada

**Data:** 30/08/2026 00:28 · **Ambiente:** Windows 11, Node v24.15.0, npm 11.12.1, Next.js 15.5.24, modo produção (`npm run build` + `npm run start`), MOCK MODE (sem `ANTHROPIC_API_KEY`).
**Método:** testes executados de verdade contra o servidor (API + páginas), mais verificação estática de CSS/A11y e greps de veto. Scripts reproduzíveis em `scripts/qa-validate.mjs` e `scripts/qa-extra.mjs`.

## 1. Build e tipos

| Item | Resultado |
|---|---|
| `npm run build` (produção) | ✅ compilou em 5s, 6 rotas geradas, zero erros |
| `npm run typecheck` | ✅ limpo (rodado pelos devs e reconferido no build, que também checa tipos) |

## 2. E2E — fluxo mock completo (buffet · Curitiba)

| Item | Resultado | Evidência |
|---|---|---|
| POST `/api/rankings` → 201 `{id}` com prefixo `d_` | ✅ | id `d_eyJ0IjoxNzg4MDYw...` |
| Polling 2s mostra estados parciais | ✅ | t+0s: 2 concluídos/3 verificando/5 aguardando, 63 achados → t+8s: badge **refinando** visível → t+16s: concluída (achados crescendo a cada poll: 63→71→85→98→106→112→118→122) |
| Conclusão dentro da janela (~25–40s da criação) | ✅ | concluída; 10 candidatos |
| Todo achado tem `evidenciaUrl` OU `nao_verificavel` | ✅ | 0 violações em 122 achados |
| Scores 0–100 coerentes com tiers (≥75/50–74) + regra de justiça | ✅ | 0 incoerências |
| 1+ EVITAR com eliminatória completa e texto factual | ✅ | "Buffet Recanto das Figueiras: CNPJ com situação BAIXADA na Receita Federal" — critério + evidência, zero adjetivo |
| 1+ `doCache` (narrativa do moat) | ✅ | 2 candidatos |
| 1+ `refinado` (auditoria adversarial) | ✅ | 1 candidato |
| 1+ `nao_verificado` (falha não derruba ranking) | ✅ | 1 candidato |
| `cnpj_nao_localizado` → ATENCAO + mensagem-ação | ✅ | "Cozinha do Vale Buffet" |
| `naoVerificavel[]` (lista honesta) | ✅ | presente em todos; 6 candidatos com itens (ex.: "Site próprio com CNPJ no rodapé") |
| Justificativa ~2 linhas factual | ✅ | ex.: "CNPJ ativo desde 2017; nota 4.8 em 320 avaliações no Google; Reclame Aqui 8.4..." |
| LGPD: nenhum nome de sócio/CPF/pessoa física | ✅ | grep no JSON completo: 0 ocorrências |
| Fornecedores 100% fictícios (RN-18) | ✅ | 10/10 nomes batem com `seed/fornecedores.json` |
| Determinismo serverless (2 GETs idênticos) | ✅ | respostas byte a byte iguais |
| UTF-8 correto na API | ✅ | "Buffet Flor de Ipê", "Buffet Araucária Recepções" via fetch/Node (mojibake anterior era artefato do console PS 5.1, não do app) |
| `Cache-Control: no-store` no GET | ✅ | |

## 3. E2E — variações

| Item | Resultado |
|---|---|
| Multi-categoria (`coffee` + `dj_atracoes`) | ✅ ambas progridem e concluem (10 cand. cada); `avisos[]` preservado na resposta |
| Categoria fora do seed (`gerador`, Florianópolis) | ✅ gerador determinístico produz 10 fictícios plausíveis com a cidade certa |
| Fase inicial (`descobrindo`, 0 candidatos) | ✅ estado transitório correto nos primeiros ~3,5s |
| POST cidade vazia → 400 PT-BR | ✅ `{"erro":"Informe a cidade do evento."}` |
| POST categoria inexistente → 400 | ✅ |
| POST body não-JSON → 400 | ✅ |
| GET id inexistente → 404 PT-BR | ✅ `{"erro":"Pesquisa não encontrada."}` |

## 4. Páginas

| Item | Resultado |
|---|---|
| `/` (checklist) | ✅ 200 · APP_NAME do config, viewport, banner demo, `lang="pt-BR"` |
| `/pesquisa/[id]` | ✅ 200 · mesmos marcadores |
| `/ranking/[id]` | ✅ 200 · mesmos marcadores |
| `/ranking/[id inválido]` | ✅ 200 sem quebrar (estado amigável no cliente) |

## 5. Responsividade e acessibilidade (verificação estática)

| Item | Resultado |
|---|---|
| Mobile-first (base mobile + `@media (min-width: 720px)`) | ✅ |
| Alvos de toque ≥44px (`--touch: 44px` aplicado a botões/opções) | ✅ |
| `:focus-visible` estilizado | ✅ |
| Tema claro/escuro (`prefers-color-scheme`) + `prefers-reduced-motion` | ✅ |
| `aria-live`/`role=status` na pesquisa ao vivo; `role=alert` em erros; `role=progressbar` no stepper | ✅ |
| Tiers com ícone+palavra+cor (nunca só cor) | ✅ `✓ Verificado / ⚠ Atenção / ✕ Evitar` em `ui.tsx` |
| `@media print` na tela 3 (export PDF) | ✅ presente no CSS |
| Renderização real em 320px, print visual no navegador, navegação por teclado ponta a ponta | ⚠️ **verificação manual pendente** (exige navegador/olho humano — roteiro no fim de `docs/ux.md`) |

## 6. Vetos do time

| Item | Resultado |
|---|---|
| Nenhuma integração WhatsApp (whatsapp/evolution/wa.me) | ✅ 0 ocorrências em `src/` |
| "2 perguntas para jurados" não reintroduzidas | ✅ 0 ocorrências |
| Sem código de cotação v2 (magic link `/f/{token}`, comparativo de orçamento) | ✅ 0 ocorrências |
| Score jamais sai de LLM | ✅ mock e real usam `src/lib/score.ts` (código determinístico) |

## 7. Correções feitas pelo QA

Nenhuma — nenhum teste foi bloqueado por bug. Foram adicionados apenas os scripts de teste `scripts/qa-validate.mjs` e `scripts/qa-extra.mjs` (reutilizáveis para regressão).

## 8. Bugs abertos

| Severidade | Item |
|---|---|
| — | Nenhum bug funcional encontrado nos fluxos testados |
| Baixa (dívida) | Pipeline REAL (Claude API + BrasilAPI) não foi executada de ponta a ponta — não há chave no ambiente. Código pronto e typado; ativa sozinho via `.env`. Testar com chave antes do pitch. |
| Baixa (dívida) | SQLite (modo real local) carrega no Node 24/Windows, mas o fluxo real com persistência não foi exercitado pelo mesmo motivo acima. |
| Info | Console PS 5.1 exibe acentos errados em respostas da API (artefato do terminal; navegador e Node decodificam UTF-8 corretamente). |

## Veredito

**Pronto para a Camila acordar? SIM.** Build de produção limpo, fluxo demo completo funcionando de ponta a ponta (checklist → pesquisa ao vivo → ranking auditável), guardrails do dossiê verificados com evidência, vetos respeitados. Ressalvas: (1) validação visual em navegador real (320px, print, teclado) pendente; (2) pipeline real precisa de um teste com a `ANTHROPIC_API_KEY` antes do palco.
