# UX — Autopilot de Eventos (MVP Ranking de Fornecedores)

> **Documento de UX do MVP** · hackathon ATON · Desafio 39 · 30/08/2026
> Público-alvo: o comprador "produtora à força" (Anexo A do dossiê). Escopo: as 3 telas do MVP de ranking (P0/P1/P2). Cotação automatizada é v2 e **não** aparece na UI.
> **Marca/naming chegam depois** — todo o design abaixo é provisório, neutro e trocável. O nome exibido ("Autopilot de Eventos") vem de um config central, nunca hardcoded em tela.

---

## 1 · Para quem estamos desenhando

**Persona primária — Ana, Coordenadora de People (a "produtora à força").**
Empresa de tecnologia, 300 funcionários. Herdou a confraternização (120 pessoas, R$ 30 mil) e dois treinamentos por ano. O evento é a **7ª prioridade da semana** dela: ela cota fornecedor **no celular, no corredor, entre uma 1:1 e outra**. O CFO exige 3 orçamentos com NF. O pesadelo dela: pagar sinal e o fornecedor sumir (caso Ellys: R$ 400 mil, 7 B.O.).

O que isso implica para o design:

| Fato sobre a Ana | Decisão de UX |
|---|---|
| Não é do ramo de eventos; não conhece jargão | Toda pergunta em linguagem leiga, com exemplos entre parênteses ("Bombeiro civil (brigadista)") |
| Usa no celular, em pé, com o polegar | Mobile-first ≥320px; alvos de toque ≥44×44px; uma pergunta visível por vez no checklist; CTA fixo no rodapé |
| Tem 10–15 minutos, não uma tarde | Checklist completável em <3 min; atalho "categoria direta" em 10 segundos; progresso sempre visível |
| Precisa defender a escolha para o chefe/CFO | Confiança = evidência clicável; pesos do score declarados; PDF exportável como peça de aprovação |
| Medo de golpe é a dor nº 1 | Tiers com ícone+palavra (nunca só cor); red flags explicadas em linguagem factual; "o que não conseguimos verificar" sempre à vista |
| Vai errar e voltar | Toda etapa permite voltar sem perder respostas; categorias acionadas são revisáveis antes de rodar |

**Persona secundária — Rodrigo, Coordenador de Eventos interno** (empresa de 800 func., dezenas de cotações set–dez): usa o mesmo fluxo, mais rápido, via atalho "categoria direta". Nada na UI é exclusivo dele; o atalho já o atende.

---

## 2 · Princípios de UX deste produto

1. **Zero jargão, sempre com exemplo.** "Vai precisar de estrutura de palco?" e não "Cenotécnica". Termos do setor aparecem entre parênteses como apoio, nunca como pergunta.
2. **Uma decisão por vez.** O checklist mostra uma pergunta por tela no mobile (stepper); a carga cognitiva de 10 perguntas de uma vez assusta quem não é do ramo.
3. **Progresso sempre visível.** Stepper "3 de 10" no checklist; barra e contadores na pesquisa ao vivo; nada de spinner mudo — cada segundo de espera mostra **o que** está sendo verificado.
4. **Confiança por evidência, não por adjetivo.** Toda afirmação sobre um fornecedor aponta para uma URL clicável. O produto nunca diz "empresa ruim"; diz "CNPJ baixado desde 2023 — fonte: Receita Federal".
5. **Honestidade como feature.** "Não encontrado" e "não foi possível verificar" são respostas de primeira classe, com visual próprio (neutro, não de erro). É o pilar "verificabilidade" do score aparecendo na UI.
6. **Mobile-first de verdade.** Layout base desenhado para 320px; desktop é o enhancement (2 colunas, tabelas). Toque ≥44px, fonte base 16px (evita zoom do iOS), inputs com `inputmode` correto.
7. **Neutro e trocável.** Tokens semânticos, tipografia system-ui, nenhuma cor "de marca" com significado próprio. Quando o naming chegar, troca-se 1 arquivo de config + valores de token.
8. **O relatório é privado.** Nenhuma tela pública de fornecedor; linguagem e microcopy reforçam "seu relatório", "sua pesquisa".

---

## 3 · Fluxo completo do usuário

```
[Início / Tela 1 — Briefing do evento]
   │
   ├─ Caminho A (padrão): Checklist de 10 perguntas (P2, uma por vez)
   │     P1 tipo → P2 pessoas → P3 local → P4 formato → P5 comida
   │     → P6 bebida/música → P7 palco/apresentações → P8 marca/registro
   │     → P9 logística de pessoas → P10 o que o espaço já inclui
   │     │
   │     ├─ tipo = "feira (expositor)" → aviso do fluxo invertido
   │     │   (infra vem do portal do organizador; montadora/ART/seguro obrigatórios)
   │     └─ música = sim → lembrete ECAD (taxa, não fornecedor)
   │
   ├─ Caminho B (atalho, secundário): "Já sei o que preciso — categoria direta"
   │     seleciona 1 categoria + cidade → pula direto ao passo de revisão
   │
   ▼
[Revisão — "Seu evento aciona estas categorias"]
   │  chips ligáveis/desligáveis por categoria, agrupados por família (A–F)
   │  mostra o porquê de cada uma ("acionada por: área externa + 200 pessoas")
   │  categorias desligadas pela P10 aparecem riscadas ("o espaço já inclui")
   │  CTA: "Pesquisar fornecedores" (mostra nº de categorias e cidade)
   ▼
[Tela 2 — Pesquisa ao vivo]                       ← o momento "uau" da demo
   │  polling GET /api/rankings/:id a cada 2s
   │  por categoria: cards de fornecedor com o checklist de verificação
   │  preenchendo em tempo real (descoberto → verificando → verificado)
   │  barra de progresso geral + contadores; aria-live para leitores de tela
   │  falha individual → card "não verificado" (pesquisa nunca trava por 1 fornecedor)
   ▼
[Tela 3 — Ranking]
   │  por categoria: lista ordenada por score
   │  tier com ícone+texto: ✓ Verificado · ⚠ Atenção · ✕ Evitar
   │  card expandível: critérios do checklist, evidências com URL clicável,
   │  red flags factuais, "o que não conseguimos verificar"
   │  ações: [Baixar PDF] (CSS print) · [Nova pesquisa]
   ▼
[Fim — Ana anexa o PDF à política de compras e decide quem chamar]
```

**Estados excepcionais (todos desenhados, não improvisados):**

| Estado | Onde | Comportamento |
|---|---|---|
| Pesquisa parcial | Tela 2→3 | Ranking abre com os concluídos; os pendentes aparecem como "ainda verificando…" e entram via polling |
| Nenhum candidato encontrado | Tela 2 | Empty state com ação: "Não encontramos fornecedores de {categoria} em {cidade}. Tente outra cidade ou cole sua própria lista." |
| Falha de 1 fornecedor | Tela 2/3 | Card tier neutro "Não verificado", motivo em 1 linha, nunca derruba o restante |
| Erro geral da pesquisa | Tela 2 | Mensagem honesta + botão "Tentar de novo" (mantém as respostas do checklist) |
| Modo demonstração (sem chave de API) | Todas | Banner fixo discreto no topo: "🧪 Modo demonstração — dados simulados. Conecte a chave de API para pesquisar fornecedores reais." |
| Cache (fornecedor já validado <30 dias) | Tela 2 | Card preenche instantaneamente com selo "validado em {data} — reaproveitado" (é o fecho de demo do moat) |

---

## 4 · Wireframes textuais

### 4.1 · Tela 1 — Briefing do evento (`/`)

**Mobile (320–719px):**

```
┌─────────────────────────────────┐
│ [Autopilot de Eventos]     (☾)  │ ← nome vem do config; toggle de tema opcional
│ 🧪 Modo demonstração — dados    │ ← banner só sem chave de API
│    simulados. [saiba mais]      │
├─────────────────────────────────┤
│ Monte a lista certa de          │ ← h1
│ fornecedores para seu evento    │
│ Responda 10 perguntas rápidas.  │
│ Nós pesquisamos, verificamos a  │
│ reputação e entregamos um       │
│ ranking com evidências.         │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ● Começar pelo meu evento   │ │ ← CTA primário (checklist)
│ └─────────────────────────────┘ │
│ Já sei a categoria que preciso →│ ← atalho "categoria direta" (link secundário)
├─────────────────────────────────┤
│ Pergunta 3 de 10   [▓▓▓░░░░░░░] │ ← stepper após iniciar
│                                 │
│ Onde vai ser o evento?          │ ← 1 pergunta por tela
│                                 │
│ ( ) No nosso escritório ou      │ ← radio cards, alvo ≥44px,
│     espaço da empresa           │    card inteiro clicável
│ ( ) Num espaço alugado que já   │
│     funciona para eventos       │
│     (hotel, casa de eventos)    │
│ ( ) Ao ar livre ou num lugar    │
│     que não é de eventos        │
│     (galpão, sítio, praça)      │
│                                 │
│ [← Voltar]        [Continuar →] │ ← rodapé fixo (sticky)
└─────────────────────────────────┘
```

**Desktop (≥720px):** mesma coluna central (max-width ~640px); perguntas continuam uma por vez (consistência e foco valem mais que densidade aqui). O atalho vira um card lateral "Pesquisa rápida por categoria".

**Microcopy das 10 perguntas (ordem do dossiê P2, linguagem leiga):**

1. **Que tipo de evento é?** — cards: Confraternização · Convenção ou kickoff · Treinamento ou workshop · Lançamento de produto · Feira (vamos expor) · Evento híbrido/online · Happy hour · Offsite/team building
2. **Quantas pessoas mais ou menos?** — Até 50 · De 50 a 200 · Mais de 200
3. **Onde vai ser?** — (acima)
4. **Presencial, online ou os dois?** — Presencial · Online · Híbrido (presencial + transmissão)
5. **Vai ter comida? De que tipo?** — Coffee break · Almoço ou jantar completo · Coquetel/finger food · Churrasco ou food truck · Sem comida — checkbox extra: "Precisamos de opção vegetariana/vegana" (marcado por padrão)
6. **Bebida alcoólica? Música?** — checkboxes: Open bar/bartender · DJ, banda ou atração — *se música: nota* "💡 Música em evento corporativo gera taxa do ECAD (direitos autorais). Não é um fornecedor — é uma guia a pagar. Vamos lembrar você no relatório."
7. **Vai ter palco ou apresentações?** — checkboxes: Palestras/apresentações · Público estrangeiro (tradução) · Participantes PCD (Libras/acessibilidade)
8. **Marca e registro do evento?** — checkboxes: Decoração/cenografia · Brindes para os participantes · Fotografia/vídeo
9. **Logística de pessoas?** — checkboxes: Recepção/check-in · Transporte dos participantes · Evento de mais de 1 dia (hospedagem) · Estacionamento/valet
10. **O que o espaço escolhido já inclui?** — checkboxes: Limpeza · Segurança · Som e projetor · Mobiliário · O espaço exige o buffet da casa — microcopy: "Marcamos como 'já incluso' para você não cotar em dobro."

+ campo final: **Em que cidade?** (input com default do config, ex.: Curitiba)

**Aviso feira-expositor** (aparece na hora, ao selecionar "Feira" na P1):
> ⚠ **Feira funciona diferente.** Energia, internet, limpeza e mobiliário você contrata do **próprio organizador da feira**, pelo portal do expositor — não de fornecedor aberto. E a montadora do estande, ART/laudos de engenharia e seguro passam a ser **obrigatórios**. Ajustamos sua lista por isso.

**Tela de revisão (entre o checklist e a pesquisa):**

```
│ Seu evento aciona 6 categorias  │
│ Confraternização · 120 pessoas  │
│ · Curitiba                      │
│                                 │
│ ESPAÇO & INFRAESTRUTURA         │
│ [✔ Espaço para eventos      ⓘ] │ ← chip ligado; ⓘ = "acionada por..."
│ ALIMENTAÇÃO & BEBIDAS           │
│ [✔ Buffet completo] [✔ Open bar]│
│ EXPERIÊNCIA & REGISTRO          │
│ [✔ DJ e atrações] [✔ Decoração] │
│ [✔ Fotografia e vídeo]          │
│ ~~Limpeza — o espaço já inclui~~│ ← desligada pela P10, riscada
│                                 │
│ Toque numa categoria para       │
│ tirar ou devolver à pesquisa.   │
│ ┌─────────────────────────────┐ │
│ │ 🔎 Pesquisar fornecedores   │ │
│ │    (6 categorias·Curitiba)  │ │
│ └─────────────────────────────┘ │
```

### 4.2 · Tela 2 — Pesquisa ao vivo (`/pesquisa/[id]`)

```
┌─────────────────────────────────┐
│ Pesquisando fornecedores…       │
│ Buffet completo em Curitiba     │
│ [▓▓▓▓▓▓░░░░] 6 de 12 verificados│ ← progresso geral + aria-live
│                                 │
│ ▼ BUFFET COMPLETO (4/8)         │ ← seção por categoria (accordion)
│ ┌─────────────────────────────┐ │
│ │ Buffet Araucária    ⏳ 7/11 │ │ ← card de fornecedor
│ │ ✔ CNPJ ativo (Receita)      │ │ ← critérios preenchendo um a um,
│ │ ✔ 9 anos de mercado         │ │    com micro-animação de entrada
│ │ ✔ Nota 4,7 no Google (312)  │ │
│ │ ✔ Sem sanções públicas      │ │
│ │ ⏳ Verificando Reclame Aqui… │ │ ← item atual com spinner
│ │ ○ Notícias  ○ Processos …   │ │ ← ainda na fila
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Festa & Cia Buffet   ✓ pronto│ │
│ │ score 82 · ✓ Verificado     │ │ ← concluído: resumo compacto
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Sabor Real Eventos  🔁 cache│ │
│ │ Validado em 12/08 —         │ │ ← reaproveitado do cache 30 dias
│ │ reaproveitado ✓ Verificado  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Isso leva de 1 a 3 minutos.     │
│ Cada verificação consulta       │
│ Receita, Google, Reclame Aqui,  │
│ notícias e redes sociais.       │
│ [Ver ranking parcial →]         │ ← habilita quando ≥1 categoria concluir
└─────────────────────────────────┘
```

- Ordem de preenchimento dos critérios espelha a sequência real do Verificador (CNPJ → RA → golpe/notícias → Google → Instagram → consistência) — a tela é um espelho do agente, não teatro.
- Fornecedor que falhar: card muda para "Não verificado — tempo esgotado na consulta" (tom neutro), e a contagem segue.
- Redireciona automaticamente para o ranking quando tudo concluir (com botão manual antes disso).
- **Desktop:** grid de 2 colunas de cards por categoria; progresso geral vira coluna fixa à direita.

### 4.3 · Tela 3 — Ranking (`/ranking/[id]`)

```
┌─────────────────────────────────┐
│ Ranking de fornecedores         │
│ Confraternização · 120 pessoas  │
│ · Curitiba · 30/08/2026         │
│ Relatório privado — só você vê. │
│ [🖨 Baixar PDF] [Nova pesquisa]  │
│                                 │
│ Como pontuamos: Cadastral 30% · │ ← pesos declarados, sempre visíveis
│ Reputação 40% · Presença 20% ·  │
│ Verificabilidade 10%. Nota de   │
│ corte: ✓ ≥75 · ⚠ 50–74 · ✕ <50 │
│ ou critério eliminatório.       │
│                                 │
│ ▼ BUFFET COMPLETO (8)           │
│ ┌─────────────────────────────┐ │
│ │ 1º · Festa & Cia Buffet     │ │
│ │ ✓ Verificado · 82/100       │ │ ← ícone + palavra + número (nunca só cor)
│ │ CNPJ ativo há 9 anos; nota  │ │ ← justificativa de 2 linhas (factual)
│ │ 4,7 no Google (312 aval.);  │ │
│ │ sem sanções ou reclamações  │ │
│ │ graves.                     │ │
│ │ [ver verificação completa ▾]│ │ ← expande accordion:
│ │   ── Cadastral ──────────── │ │
│ │   ✔ CNPJ ativo — Receita ↗  │ │ ← toda evidência com URL clicável ↗
│ │   ✔ 9 anos (abertura 2017)↗ │ │
│ │   ✔ CNAE compatível: buffet↗│ │
│ │   ── Reputação ──────────── │ │
│ │   ✔ Google 4,7 (312) ↗      │ │
│ │   ─ Reclame Aqui: sem       │ │ ← "não encontrado" com visual neutro
│ │     página — neutro         │ │
│ │   ── O que NÃO conseguimos  │ │
│ │      verificar ──────────── │ │
│ │   · Protestos em cartório   │ │ ← a lista honesta, sempre presente
│ │   · CNDs (roadmap)          │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 5º · Buffet Estrela do Sul  │ │
│ │ ⚠ Atenção · 58/100          │ │
│ │ Empresa aberta há 5 meses;  │ │
│ │ pouca presença digital —    │ │
│ │ peça CNPJ e contrato antes  │ │ ← "Atenção" sempre com ação prática
│ │ de pagar qualquer sinal.    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ✕ Evitar · Buffet X — 0/100 │ │
│ │ CNPJ baixado desde 2023     │ │ ← factual: critério + evidência + fonte
│ │ (fonte: Receita Federal ↗). │ │
│ │ Critério eliminatório.      │ │
│ └─────────────────────────────┘ │
│                                 │
│ 💡 Lembrete: seu evento tem     │
│ música — verifique a taxa ECAD. │ ← se acionado na P6
└─────────────────────────────────┘
```

- **Ordenação:** dentro da categoria, por score desc; "Evitar" sempre ao final, em bloco separado com heading próprio ("Encontramos, mas não recomendamos — veja por quê").
- **PDF (CSS print):** cabeçalho com nome do app (config) + data + cidade + resumo do evento; accordions impressos abertos; URLs impressas por extenso ao lado de cada evidência; paleta em preto sobre branco; quebras de página por categoria. É a peça que a Ana anexa para o CFO.
- **Desktop:** cards em coluna única larga (leitura), com sumário lateral fixo (categorias + contagem por tier).

---

## 5 · Design provisório neutro (tokens)

A identidade visual definitiva chega com o naming. Até lá: **tipografia system-ui, paleta sóbria de um acento só, tokens semânticos**. Trocar a marca = trocar valores de token + o nome no config. Nenhum componente referencia cor crua.

```css
:root {
  /* superfícies e texto — claro */
  --bg: #f7f7f5;          /* fundo da página */
  --surface: #ffffff;     /* cards, inputs */
  --ink: #1f2428;         /* texto principal (AA sobre --bg e --surface) */
  --muted: #5b6570;       /* texto secundário (AA sobre --surface) */
  --line: #d9dde2;        /* bordas */

  /* acento único provisório (azul-petróleo neutro, sem "cara de marca") */
  --accent: #22636f;      /* CTAs, links, foco (AA sobre branco) */
  --accent-ink: #ffffff;  /* texto sobre o acento */
  --accent-soft: #e3eef0;

  /* semânticas de tier/estado — sempre acompanhadas de ícone+texto */
  --ok: #256d3b;      --ok-soft: #e4f0e7;    /* ✓ Verificado */
  --warn: #8a5a00;    --warn-soft: #f6ecd9;  /* ⚠ Atenção */
  --danger: #a13232;  --danger-soft: #f7e4e4;/* ✕ Evitar */
  --neutral-soft: #eceef0;                   /* "não verificado/encontrado" */

  /* forma e ritmo */
  --radius: 10px; --radius-sm: 6px;
  --space-1: 4px; --space-2: 8px; --space-3: 16px; --space-4: 24px; --space-5: 40px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", Consolas, monospace; /* scores, CNPJ */
  --text-base: 16px;  /* nunca menor em input (evita zoom iOS) */
  --touch: 44px;      /* alvo mínimo de toque */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #16191c; --surface: #1f2429; --ink: #e8eaec; --muted: #9aa4ad;
    --line: #333a41;
    --accent: #6fb3c0; --accent-ink: #10262b; --accent-soft: #1d3237;
    --ok: #7dbb90; --ok-soft: #1c2f22; --warn: #d8ab5a; --warn-soft: #33270f;
    --danger: #d98080; --danger-soft: #372020; --neutral-soft: #262b30;
  }
}
```

Regras de uso:
- **Cor de tier nunca sozinha:** sempre ícone (✓ ⚠ ✕) + palavra (Verificado/Atenção/Evitar) + cor. Daltônicos e impressão P&B continuam lendo tudo.
- **Um acento só.** Tudo que é interativo usa `--accent`; tiers usam as semânticas; o resto é neutro. Isso mantém a hierarquia óbvia e a troca de marca barata.
- **Nome do produto**: componente `<AppName/>` lê de `src/lib/config.ts` (`APP_NAME`). Título da página, header, PDF e README usam a mesma fonte de verdade.

---

## 6 · Acessibilidade (WCAG 2.2 AA no que o MVP toca)

- **Foco visível** em todo interativo: `outline: 2px solid var(--accent); outline-offset: 2px`.
- **Tela 2 com `aria-live="polite"`** na região de progresso geral (anuncia "6 de 12 fornecedores verificados"), e `role="status"` nos cards que concluem. Não anunciar cada critério (ruído); anunciar conclusões.
- **Headings semânticos:** h1 único por tela; categorias são h2; fornecedores h3.
- **Radios/checkboxes reais** (estilizados via CSS) — nunca divs clicáveis sem semântica; labels associados; card inteiro clicável via `<label>`.
- **Contraste AA** nos dois temas (tokens acima já calculados para isso); estados desabilitados nunca abaixo de 3:1.
- **Stepper navegável por teclado**; Enter avança; botão Voltar real (e histórico do navegador funciona).
- **`prefers-reduced-motion`:** micro-animações da tela 2 viram trocas de estado sem movimento.

---

## 7 · Linguagem do produto (regras vindas do dossiê — invioláveis)

1. **"Evitar" é sempre factual:** critério + evidência + fonte. Modelo: "CNPJ baixado desde 2023 (fonte: Receita Federal). Critério eliminatório." Proibido: adjetivos ("péssima", "golpista"), ironia, julgamento.
2. **"Não encontrado" é resposta válida** — visual neutro (cinza, não vermelho), microcopy natural: "Sem página no Reclame Aqui — tratado como neutro."
3. **"Atenção" sempre vem com uma ação prática** para a Ana: "peça o CNPJ e contrato antes de pagar qualquer sinal."
4. **A lista do "não conseguimos verificar" aparece em todo fornecedor** — nunca escondida. Honestidade é parte do produto (pilar verificabilidade).
5. **LGPD/minimização:** dados são da empresa; quadro societário aparece só como "verificado: sim/não", sem nomes de pessoas.
6. **Privacidade:** "Relatório privado — só você vê" no topo do ranking e no PDF.
7. **Sem promessas de v2:** nenhuma menção a cotação automática, WhatsApp, negociação. O CTA final é a Ana decidir quem contatar.

---

## 8 · Checklist de validação de UX (para o QA executar)

**Mobile/responsivo**
- [ ] Todas as 3 telas legíveis e operáveis a 320px de largura, sem scroll horizontal.
- [ ] Checklist completável só com o polegar (CTAs no rodapé sticky; alvos ≥44px).
- [ ] Fonte de inputs ≥16px (sem zoom automático no iOS).
- [ ] Desktop ≥720px usa a largura sem esticar linhas além de ~70ch.

**Fluxo**
- [ ] Dá para completar as 10 perguntas em menos de 3 minutos.
- [ ] Atalho "categoria direta" leva à pesquisa em ≤3 interações.
- [ ] Voltar (botão e navegador) preserva as respostas.
- [ ] Revisão permite desligar/religar categorias; P10 risca as inclusas do espaço.
- [ ] Selecionar "Feira" mostra o aviso do fluxo invertido; música mostra o lembrete ECAD (e ele reaparece no ranking).

**Tela 2 (ao vivo)**
- [ ] Critérios preenchem visivelmente um a um; nunca há spinner sem texto do que está acontecendo.
- [ ] Falha de 1 fornecedor vira card "Não verificado" e a pesquisa continua.
- [ ] Fornecedor de cache aparece instantâneo com selo de reaproveitamento.
- [ ] `aria-live` anuncia o progresso geral.

**Tela 3 (ranking)**
- [ ] Todo achado exibido tem URL clicável (ou está na lista "não verificável") — **zero afirmações órfãs**.
- [ ] Tier legível sem cor (ícone+palavra) — testar em escala de cinza.
- [ ] Pesos do score visíveis sem interação extra.
- [ ] Bloco "Evitar" separado, com linguagem 100% factual (auditar cada frase).
- [ ] Lista "o que não conseguimos verificar" presente em todos os cards.
- [ ] PDF via imprimir: accordions abertos, URLs por extenso, P&B legível, quebra por categoria, nome do app vindo do config.

**Neutralidade de marca**
- [ ] Nenhuma ocorrência de nome de marca hardcoded em componente (buscar por "Autopilot" fora do config deve retornar zero em src/, exceto o próprio config).
- [ ] Tema escuro e claro com contraste AA nos textos principais.
- [ ] Banner de modo demonstração aparece sem chave e some com chave.
