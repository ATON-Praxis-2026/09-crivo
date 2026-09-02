# Autopilot de Eventos — User Stories e Regras de Negócio

**Produto (MVP ATON):** Ranking de Fornecedores Validados por Reputação — o autopilot pesquisa fontes públicas, valida cada candidato contra um checklist de reputação e devolve um ranking privado com nota, evidências clicáveis e red flags.
**Fonte de verdade:** `Gruponovoautopilot.html` (DOC.02, seções P0/P1/P2 + Anexo A) + briefing do time em 29/08/2026.
**Versão:** 0.1 — build da madrugada de 30/08/2026.

---

## 1 · Personas

### Persona primária — Ana, a "produtora de eventos à força" (ICP do MVP)
Coordenadora/analista de **RH, marketing, facilities ou office manager** em empresa de **50–1.000 funcionários**, em capital, **sem agência de eventos e sem área dedicada**. Herdou a confraternização (ex.: 120 pessoas, R$ 30 mil) e 2+ eventos/ano de **R$ 10–80 mil**. A política de compras exige **3 orçamentos com nota fiscal**; acima de R$ 5–10 mil aprova diretor/CFO. O evento é a 7ª prioridade da semana dela; cota fornecedor entre uma reunião e outra, muitas vezes **pelo celular, no corredor**. Pesadelo: pagar sinal e o fornecedor sumir (caso Ellys: R$ 400 mil, 7 B.O.).

### Persona secundária — Rodrigo, coordenador de eventos interno
Empresa de ~800 funcionários com calendário anual (CBO 1311-15). De setembro a dezembro o gargalo é braço: dezenas de cotações simultâneas. Usa o autopilot como "analista infinito" para o tail de eventos menores.

### Fora do MVP
- **Produtoras/agências (Márcia)** — segmento 2, entra como SaaS depois do motor provado (mês 3+).
- **B2C/casamentos** — expansão futura; nenhuma feature, texto ou fluxo do MVP deve assumir eventos sociais.

---

## 2 · User stories priorizadas

Formato: Como <persona>, quero <ação> para <valor>. Prioridades: **P0** = MVP desta madrugada · **P1** = polimento pré-pitch · **V2** = roadmap (NÃO construir).

### P0 — o MVP precisa ter

**US-01 · Checklist do evento (10 perguntas → categorias)**
Como Ana, quero responder um checklist rápido sobre meu evento (tipo, nº de pessoas, local, formato, alimentação, bar/música, palco, marca/registro, logística, o que o espaço já inclui) para receber a lista de categorias de fornecedor que preciso contratar — sem eu ter que saber o que um evento exige.
*Critérios de aceite:*
- [ ] As 10 perguntas da P2 aparecem, em linguagem simples, uma seção por pergunta.
- [ ] O mapeamento pergunta→categorias roda **em código determinístico** (template-base por tipo de evento + ajustes), sem LLM.
- [ ] Gatilho porte+local: área externa/não licenciada + 200 pessoas ou mais aciona o "pacote invisível" (gerador, banheiro químico, brigadista, ambulância, alvará/AVCB, seguro).
- [ ] A pergunta 10 **desliga** categorias que o espaço já inclui.
- [ ] Tipo "feira (expositor)" troca o fluxo e mostra o aviso do portal do organizador (RN-13).
- [ ] Antes de disparar a pesquisa, vejo o resumo "seu evento aciona estas categorias: […]" e posso ajustar (ligar/desligar categoria).
- [ ] Funciona em tela de celular (360 px) sem scroll horizontal.

**US-02 · Atalho "categoria direta"**
Como Ana (e como o time no palco), quero pular o checklist e digitar direto "buffet corporativo em Curitiba" para obter um ranking de uma única categoria em poucos cliques.
*Critérios de aceite:*
- [ ] Na tela inicial há atalho visível: categoria + cidade → dispara a pesquisa imediatamente.
- [ ] Cidade vem pré-preenchida com a default configurável (`NEXT_PUBLIC_DEFAULT_CITY`), editável.

**US-03 · Pesquisa ao vivo (o momento "uau")**
Como Ana, quero ver a verificação acontecendo em tempo real — cada fornecedor com seu checklist preenchendo critério a critério — para confiar no que o sistema está fazendo (e para a banca ver a autonomia).
*Critérios de aceite:*
- [ ] Após disparar, sou levada à tela de pesquisa, que atualiza sozinha (polling ~2 s em `GET /api/rankings/:id`).
- [ ] Vejo o status por etapa (descobrindo → verificando → refinando → rankeando) e por fornecedor (critérios do checklist mudando de "pendente" para verificado/não verificável).
- [ ] Falha em um fornecedor não trava a tela: ele aparece como "não verificado" e o resto continua (RN-16).
- [ ] Quando a pesquisa conclui, sou levada (ou convidada) ao ranking.

**US-04 · Ranking com tiers e evidências clicáveis**
Como Ana, quero um ranking por categoria com nota, tier (✓ Verificado / ⚠ Atenção / ✕ Evitar), justificativa de 2 linhas e evidências expandíveis com URL para auditar qualquer afirmação antes de decidir.
*Critérios de aceite:*
- [ ] Ordenado por score; tier e nota visíveis; eliminatórias explicam o "Evitar" com critério + evidência.
- [ ] Cada achado expandível mostra: critério, valor encontrado, URL clicável (abre em nova aba), confiança.
- [ ] **Nenhum achado sem URL de evidência** aparece como fato (RN-08).
- [ ] Justificativa factual, sem adjetivos (RN-11).
- [ ] Responsivo: no celular os cards empilham; no desktop, layout confortável de leitura.

**US-05 · O "não verificável" honesto**
Como Ana, quero ver, para cada fornecedor, a lista do que NÃO foi possível verificar para saber o que checar por conta própria antes de pagar sinal.
*Critérios de aceite:*
- [ ] Cada fornecedor exibe a lista dos critérios não verificáveis, com a mensagem-ação quando aplicável (ex.: CNPJ não localizado → "peça o CNPJ antes de pagar qualquer sinal").
- [ ] O pilar "verificabilidade" (10%) reflete essa lista no score.

**US-06 · Exportar para PDF**
Como Ana, quero exportar o ranking em PDF para anexar ao processo de compras como peça de aprovação (compliance de 3 cotações começa por saber QUEM cotar).
*Critérios de aceite:*
- [ ] Botão "Exportar PDF" usa impressão do navegador com CSS de impressão dedicado (sem serviço externo).
- [ ] O PDF traz: categorias, ranking com notas/tiers, justificativas, evidências (URLs impressas) e a lista de não verificáveis.
- [ ] Cabeçalho marca o relatório como **privado/uso interno** (RN-12).

**US-07 · Modo demo sem chave de API**
Como Camila (dona do produto), quero que o app funcione de ponta a ponta sem `ANTHROPIC_API_KEY` — com dados simulados realistas percorrendo a MESMA pipeline — para ensaiar a demo e desenvolver sem custo, e que a pipeline real ative sozinha quando a chave existir no `.env`.
*Critérios de aceite:*
- [ ] Sem chave: pipeline completa roda com seed local (fornecedores FICTÍCIOS, cidade configurável) e delays simulados visíveis na tela 2.
- [ ] Com chave: Descobridor/Verificador/Refinador/justificativas usam Claude (busca web nativa) + BrasilAPI, sem mudança de código.
- [ ] A UI exibe um selo discreto "modo demonstração — dados simulados" quando em mock (para nunca confundir a banca sobre o que é real).

**US-08 · Cache de 30 dias (a semente do moat)**
Como Rodrigo, quero que fornecedores já validados há menos de 30 dias sejam reaproveitados para que a segunda pesquisa na mesma cidade/categoria saia em segundos.
*Critérios de aceite:*
- [ ] Antes de verificar, a pipeline consulta o cache por (nome, cidade); hit com verificação < 30 dias pula a pesquisa.
- [ ] A UI indica quando um resultado veio do cache ("validado em DD/MM").
- [ ] Fecho de demo possível: rodar a mesma categoria 2× e mostrar a segunda saindo em segundos.

### P1 — polimento pré-pitch (fazer se der tempo, sem arriscar o P0)

**US-09 ·** Como Ana, quero colar minha própria lista de fornecedores (nome + cidade) para o autopilot validá-los (pula o Descobridor). *Aceite: campo de colagem no atalho direto; um por linha.*
**US-10 ·** Como time no palco, quero um botão "rodar demo" que dispara o caso canônico (confraternização, 120 pessoas, Curitiba) em 1 clique.
**US-11 ·** Como Ana, quero rankings anteriores listados (histórico) para reabrir sem refazer a pesquisa.
**US-12 ·** Como Camila, quero as justificativas com aviso de custo estimado por ranking (~US$ 1,50–2,50 real) visível em logs/console para controlar gasto no dia.

### V2 — roadmap declarado (NÃO construir agora)

- **US-V2-01 · Cotação automatizada** (Partes 06–10 do dossiê): outreach real, magic link `/f/{token}`, Negociador, Tradutor, comparativo de orçamentos. É a v2 — aparece só como narrativa no pitch.
- **US-V2-02 ·** Modo conversa do checklist (Concierge LLM emitindo o mesmo JSON do formulário).
- **US-V2-03 ·** Confirmações T-7/T-1, fornecedor-backup, pagamento intermediado, CNDs/protestos (item 14 do checklist — declarar como próximo passo).
- **US-V2-04 ·** Segmento produtoras (SaaS R$ 197–497/mês) e expansão B2C.

---

## 3 · Regras de negócio

| # | Regra |
|---|-------|
| **RN-01** | **O score é código, nunca LLM.** Função determinística com pesos declarados: Cadastral 30 · Reputação 40 · Presença 20 · Verificabilidade 10. A IA pesquisa e lê; a nota é auditável. |
| **RN-02** | **Eliminatórias zeram o score** e explicam o motivo com evidência: CNPJ inapto/suspenso/baixado · sanção CEIS/CNEP · notícia de golpe confirmada · Reclame Aqui "não recomendada". |
| **RN-03** | **Tiers:** ✓ Verificado (score ≥ 75, sem eliminatória) · ⚠ Atenção (50–74) · ✕ Evitar (eliminatória ou < 50). |
| **RN-04** | **Regra de justiça:** ausência de pegada digital NUNCA rebaixa para Evitar — vira Atenção com o motivo escrito. 87–94% dos fornecedores são micro; o bom invisível existe. |
| **RN-05** | **CNPJ não localizado não é eliminatória** — vira Atenção com mensagem-ação: "não conseguimos confirmar o CNPJ; peça antes de pagar qualquer sinal". |
| **RN-06** | Idade < 6 meses = atenção; ≥ 2 anos pontua. CNAE incompatível = atenção (empresa "de outra coisa"), não eliminatória. |
| **RN-07** | Avaliações negativas de "não entregou/sumiu" pesam 3× mais que "achei caro". |
| **RN-08** | **Nenhum achado entra no score sem URL de evidência.** Sem URL = `nao_verificavel` (conta no pilar verificabilidade, não vira fato). |
| **RN-09** | **Anti-homônimo:** página/perfil só é atribuído ao fornecedor com match de cidade + telefone; em dúvida → confiança baixa + flag `possivel_homonimo` visível. |
| **RN-10** | **LGPD/minimização:** o relatório mostra dados da EMPRESA. Quadro societário aparece só como "verificado: sim/não" — nunca nomes de pessoas físicas. |
| **RN-11** | **Linguagem do Evitar é factual:** critério + evidência ("CNPJ baixado desde 2023, fonte: Receita"), nunca opinião/adjetivo ("empresa péssima" é proibido). |
| **RN-12** | **O relatório é privado ao cliente** — nunca página pública listando empresas como "Evitar". O PDF marca "uso interno". |
| **RN-13** | **Feira (expositor) inverte o fluxo:** energia/internet/água/limpeza/mobiliário vêm do portal do organizador (não se busca fornecedor aberto); montadora credenciada, cenografia, ART/laudos, seguro e credenciamento viram obrigatórios. A UI avisa. |
| **RN-14** | **Música aciona lembrete ECAD** — é taxa, não fornecedor; aparece como aviso, não como categoria. |
| **RN-15** | **Cache:** unique(nome, cidade); verificação com menos de 30 dias é reaproveitada e marcada com a data. |
| **RN-16** | **Resiliência:** timeout 60 s + 1 retry por fornecedor; falha individual vira "não verificado" e nunca derruba o ranking. Limites de busca: 8 (Descobridor) · 6 (Verificador) · 4 (Refinador, só casos de borda). |
| **RN-17** | **O Refinador ajusta achados/flags/confiança, nunca a nota** — o re-score é sempre em código. Só promove a Verificado com evidência positiva nova; só rebaixa a Evitar com evidência confirmada; na dúvida → Atenção + flag `verificacao_inconclusiva`. |
| **RN-18** | **Modo demo usa fornecedores fictícios** claramente sinalizados — nunca dados de reputação inventados sobre empresas reais. |

---

## 4 · Escopo negativo (vetos invioláveis)

1. **Nenhuma API de WhatsApp** (nem oficial, nem Evolution, nem sandbox). WhatsApp existe só na narrativa de produção do pitch.
2. **Nada de no-code** (Lovable/Bolt/v0 vetados). 100% código próprio via Claude Code.
3. **Só eventos corporativos B2B.** Nenhum texto/fluxo de casamento ou evento social.
4. **Não reintroduzir as "2 perguntas para jurados"** em telas, textos ou materiais.
5. **Cotação automatizada NÃO será construída** (Partes 06–10 = v2). Nenhum outreach, magic link ou comparativo de orçamento no código.

**Posicionamento no pitch:** o ranking é a **camada 1** do autopilot completo — "primeiro dizemos QUEM contratar com segurança; a v2 consegue o QUANTO". O limite é declarado com honestidade (valida quem, não quanto), e o cache de validados por cidade/categoria é a semente do moat que a cotação v2 herda.

---

## 5 · Métricas de sucesso da demo

| Métrica | Alvo |
|---|---|
| Pesquisa ao vivo visível | Banca vê critérios preenchendo em tempo real, sem intervenção humana |
| Auditabilidade | Qualquer membro da banca clica numa evidência e chega à fonte |
| Autonomia (critério 20%) | Humano só responde o checklist e lê o ranking — zero operação manual |
| Robustez | 1 fornecedor falhando não trava a demo; app roda sem internet de API (mock) |
| Custo real declarado | ~US$ 1,50–2,50 por ranking (10 fornecedores, ~70–90 buscas) |
| Fecho de demo | Segunda rodada da mesma categoria sai do cache em segundos |

---

## 6 · Checklist de validação do product (para o QA)

- [ ] As 10 perguntas do checklist estão presentes e mapeiam para as categorias conforme a matriz P2 (testar: confraternização, treinamento, feira, híbrido).
- [ ] Gatilho porte+local aciona o pacote invisível (200+ pessoas e local não licenciado) e NÃO aciona com 50 pessoas em hotel.
- [ ] Pergunta 10 remove categorias inclusas no espaço.
- [ ] Feira mostra aviso de fluxo invertido; música mostra lembrete ECAD.
- [ ] Atalho categoria direta funciona com cidade editável.
- [ ] Tela 2 atualiza sozinha e mostra progresso por fornecedor; falha individual vira "não verificado".
- [ ] Ranking: ordenação por score, tiers corretos nas fronteiras (75/50), eliminatória vira Evitar com evidência.
- [ ] Regra de justiça: fornecedor sem pegada digital com score < 50 aparece como Atenção (não Evitar), com motivo.
- [ ] Toda evidência exibida tem URL clicável; achados sem URL aparecem como "não verificável".
- [ ] Nenhum nome de pessoa física (sócios) em tela ou PDF.
- [ ] Nenhuma menção a WhatsApp API, cotação de preços, casamentos ou "perguntas para jurados" na UI.
- [ ] PDF via impressão contém ranking + evidências + não verificáveis + marca "uso interno".
- [ ] Selo "modo demonstração" visível quando sem chave de API; some com chave configurada.
- [ ] Cache: segunda pesquisa igual reaproveita validações < 30 dias e indica a data.
- [ ] Responsividade: 360 px, 768 px e 1280 px sem scroll horizontal nem elemento cortado.
