# Autopilot de Eventos — Design System v1.2 (final)

> Sistema de design completo para o **Autopilot de Eventos** (autopilot-eventos-demo.vercel.app).
> Direção visual baseada nas referências aprovadas: dark premium com glassmorphism, degradês vivos,
> botões pill e tipografia de hierarquia forte.
>
> **Decisões fechadas (v1.2):**
> - **Cor de marca: Azul Elétrico** (`brand-600 #2563EB`) — decisão final.
> - **Tipografia: Sora (display) + Inter (corpo)** + JetBrains Mono (dados) — decisão final.
> - **Temas: Dark é o principal** (`:root`); Light é opcional via toggle (`[data-theme="light"]`).
> - **Glassmorphism** é o tratamento padrão dos painéis (§2.7).
> - **Fundo vivo:** degradê animado em movimento bem lento + parallax leve (§2.12) em todas as telas.
> - **Background Gradients** (§2.11) com FeaturedCard, header wash e botão gradient (§4.31–4.33).
>
> Preview interativo: `design-system/preview.html`.

---

## Índice

1. [Princípios](#1-princípios)
2. [Fundamentos (Design Tokens)](#2-fundamentos-design-tokens)
3. [Temas Light & Dark](#3-temas-light--dark)
4. [Componentes](#4-componentes)
5. [Padrões de página](#5-padrões-de-página)
6. [Acessibilidade](#6-acessibilidade)
7. [Checklist de implementação](#7-checklist-de-implementação)

---

## 1. Princípios

| Princípio | O que significa na prática |
|---|---|
| **Confiança primeiro** | O produto vende *verificação*. Verde/âmbar/vermelho de status nunca são decorativos — cada cor semântica carrega significado auditável (Verificado / Atenção / Evitar). |
| **Uma ação por tela** | O wizard tem sempre 1 CTA primário. Nunca dois botões primários competindo. |
| **Profundidade com leveza** | Glassmorphism e gradientes mesh criam atmosfera premium (referências Zentra/Creative.style), mas o conteúdo fica sempre sobre superfície sólida e legível. |
| **Evidência visível** | Todo dado aponta para a fonte. Links `fonte ↗` e marcadores `(inferência)` / `(perfil simulado)` são componentes de primeira classe. |
| **Temas gêmeos** | Nenhum componente existe só em um tema. Todo token tem par light/dark com o mesmo contraste mínimo (WCAG AA). |

---

## 2. Fundamentos (Design Tokens)

### 2.1 Cor — Paleta base

#### Brand · Azul Elétrico (oficial — decisão final)

| Token | Hex | Uso |
|---|---|---|
| `brand-300` | `#93C5FD` | links (dark) |
| `brand-400` | `#60A5FA` | barras de score (dark) |
| `brand-500` | `#3B82F6` | hover do primário (dark), `--accent-glow` dos degradês |
| `brand-600` | `#2563EB` | **botão primário (dark E light)**, links (light) |
| `brand-700` | `#1D4ED8` | hover do primário (light) |

#### Accent · Cyan (segundo glow dos degradês)

`cyan-400 #22D3EE` — usado apenas como `--accent-glow-2` (blob secundário do fundo vivo e mesh).

#### Accent · Ember (laranja — exclusivo de conversão/paywall)

`ember-400 #FB923C` · `ember-500 #F97316` · `ember-600 #EA580C`

> **Regra:** Ember aparece só no gradiente do paywall, no `--grad-ember` e no blob terciário do
> fundo vivo (opacidade mínima). Ações e navegação são sempre o Elétrico.

#### Neutros

| Token | Light | Dark |
|---|---|---|
| `neutral-0`   | `#FFFFFF` | `#0C0E12` |
| `neutral-50`  | `#F7F8FA` | `#101318` |
| `neutral-100` | `#F1F3F6` | `#161A21` |
| `neutral-200` | `#E4E8EE` | `#1C212A` |
| `neutral-300` | `#D2D8E0` | `#262C37` |
| `neutral-400` | `#A9B2BF` | `#39414F` |
| `neutral-500` | `#7C8696` | `#5B6472` |
| `neutral-600` | `#5B6572` | `#8B94A3` |
| `neutral-700` | `#3F4854` | `#B7BFCC` |
| `neutral-800` | `#252C35` | `#DBE0E8` |
| `neutral-900` | `#14181D` | `#F3F5F8` |

#### Semânticas (status de verificação — coração do produto)

| Papel | Light | Dark | Tinta de fundo (light) | Tinta de fundo (dark) |
|---|---|---|---|---|
| `success` (✓ Verificado) | `#15803D` | `#4ADE80` | `#EAF7EF` | `rgba(74,222,128,.12)` |
| `warning` (⚠ Atenção)    | `#A16207` | `#FACC15` | `#FBF3E0` | `rgba(250,204,21,.12)` |
| `danger` (✕ Evitar)      | `#B91C1C` | `#F87171` | `#FBEAEA` | `rgba(248,113,113,.12)` |
| `info`                   | `#3B8494` | `#8FD0DB` | `#EFF9FA` | `rgba(143,208,219,.12)` |

### 2.2 Cor — Tokens semânticos de superfície

```css
/* ============ DARK — tema principal (:root) ============ */
:root {
  /* Superfícies */
  --bg:            #0D1017;   /* fundo da página (o fundo vivo pinta por cima) */
  --surface:       #141922;   /* superfícies sólidas (wizard, inputs) */
  --surface-2:     #1A202C;   /* inputs, painéis internos sólidos */
  --surface-3:     #242C3A;   /* hover de superfícies */
  --border:        #242C3A;
  --border-strong: #364154;

  /* Texto */
  --text:          #F3F5F8;
  --text-muted:    #B7BFCC;
  --text-subtle:   #8B94A3;
  --text-invert:   #14181D;

  /* Ação — Azul Elétrico (oficial) */
  --primary:          #2563EB;
  --primary-hover:    #3B82F6;
  --primary-contrast: #FFFFFF;
  --primary-tint:     color-mix(in srgb, #3B82F6 16%, transparent);
  --link:             #93C5FD;
  --focus-ring:       color-mix(in srgb, #3B82F6 45%, transparent);
  --accent-glow:      #3B82F6;   /* alimenta fundo vivo, mesh e gradientes */
  --accent-glow-2:    #22D3EE;

  /* Status */
  --success: #4ADE80;  --success-bg: rgba(74,222,128,.10);  --success-border: rgba(74,222,128,.35);
  --warning: #FACC15;  --warning-bg: rgba(250,204,21,.10);  --warning-border: rgba(250,204,21,.35);
  --danger:  #F87171;  --danger-bg:  rgba(248,113,113,.10); --danger-border:  rgba(248,113,113,.35);
  --info:    #93C5FD;  --info-bg:    rgba(147,197,253,.12); --info-border:    rgba(147,197,253,.35);

  /* Glass (padrão dos painéis) */
  --glass-bg:           rgba(255,255,255,.055);
  --glass-border:       rgba(255,255,255,.12);
  --glass-panel-border: rgba(255,255,255,.14);
  --glass-inner:        rgba(255,255,255,.05);
  --glass-blur:         20px;

  /* Fundo vivo — opacidade dos blobs (§2.12) */
  --blob-a-o: .26;   /* Elétrico */
  --blob-b-o: .16;   /* Cyan */
  --blob-c-o: .09;   /* Ember */

  /* Mesh estático (paywall) */
  --mesh-paywall: radial-gradient(110% 90% at 82% 0%, rgba(249,115,22,.16) 0%, transparent 55%),
                  radial-gradient(100% 80% at 10% 32%, color-mix(in srgb, var(--accent-glow) 18%, transparent) 0%, transparent 50%),
                  var(--bg);

  /* Background gradients (§2.11) — derivados do Elétrico, iguais nos 2 temas */
  --grad-brand:  linear-gradient(135deg, color-mix(in srgb, var(--accent-glow) 60%, #FFFFFF) 0%, var(--accent-glow) 50%, color-mix(in srgb, var(--accent-glow) 55%, #000000) 100%);
  --grad-card:   radial-gradient(130% 130% at 15% 0%, color-mix(in srgb, var(--accent-glow) 52%, #FFFFFF) 0%, var(--accent-glow) 48%, color-mix(in srgb, var(--accent-glow) 55%, #000000) 112%);
  --grad-header: linear-gradient(to bottom, color-mix(in srgb, var(--accent-glow) 45%, transparent) 0%, color-mix(in srgb, var(--accent-glow) 12%, transparent) 55%, transparent 100%);
  --grad-btn:    linear-gradient(180deg, color-mix(in srgb, var(--accent-glow) 80%, #FFFFFF) 0%, var(--accent-glow) 100%);
  --grad-ember:  linear-gradient(135deg, #FB923C 0%, #F97316 45%, #EA580C 100%);

  --shadow-1: 0 1px 2px rgba(0,0,0,.40);
  --shadow-2: 0 4px 16px rgba(0,0,0,.45);
  --shadow-3: 0 12px 40px rgba(0,0,0,.55);

  color-scheme: dark;
}

/* ============ LIGHT — opcional, via toggle ============ */
[data-theme="light"] {
  --bg:            #F6F8FB;
  --surface:       #FFFFFF;
  --surface-2:     #F0F3F8;
  --surface-3:     #E3E8F0;
  --border:        #E3E8F0;
  --border-strong: #CFD7E3;

  --text:          #131822;
  --text-muted:    #5A6474;
  --text-subtle:   #7B8698;
  --text-invert:   #F3F5F8;

  --primary:          #2563EB;
  --primary-hover:    #1D4ED8;
  --primary-contrast: #FFFFFF;
  --primary-tint:     color-mix(in srgb, #2563EB 9%, transparent);
  --link:             #2563EB;
  --focus-ring:       color-mix(in srgb, #2563EB 40%, transparent);

  --success: #15803D;  --success-bg: #EAF7EF;  --success-border: #BBE5CB;
  --warning: #A16207;  --warning-bg: #FBF3E0;  --warning-border: #EAD9A8;
  --danger:  #B91C1C;  --danger-bg:  #FBEAEA;  --danger-border:  #F1C2C2;
  --info:    #2563EB;  --info-bg:    #EBF2FE;  --info-border:    #C6DAFB;

  --glass-bg:           rgba(255,255,255,.58);
  --glass-border:       rgba(255,255,255,.65);
  --glass-panel-border: rgba(19,24,34,.10);
  --glass-inner:        rgba(255,255,255,.45);

  --blob-a-o: .15;
  --blob-b-o: .11;
  --blob-c-o: .06;

  --shadow-1: 0 1px 2px rgba(19,24,34,.06);
  --shadow-2: 0 4px 16px rgba(19,24,34,.08);
  --shadow-3: 0 12px 40px rgba(19,24,34,.14);
  /* mesh e gradientes herdam do :root (usam var(--bg) e var(--accent-glow)) */

  color-scheme: light;
}
```

### 2.3 Tipografia

| Papel | Fonte | Fallback |
|---|---|---|
| Display (h1, h2, preço, marca) | **Sora** (600/700) | `'Inter', -apple-system, sans-serif` |
| UI & corpo | **Inter** (400–700) | `-apple-system, "Segoe UI", Roboto, sans-serif` |
| Números/score | **JetBrains Mono** (500/600) | `ui-monospace, "SF Mono", Consolas, monospace` |

> **Par oficial (decidido): Sora + Inter.** Sora entra só nos papéis de display — `display`, `h1`,
> `h2` e a marca — com `letter-spacing: -0.025em` e peso 700 (display usa 700, não 800).
> Corpo, labels e componentes ficam em Inter. O mono entra **apenas** em scores (`93/100`),
> pesos (`30%`) e valores monetários do paywall quando tabulares.

**Escala (rem base 16px):**

| Token | Tamanho / Altura | Peso | Uso |
|---|---|---|---|
| `display`   | 40–48px / 1.1 | 700 (Sora) | Preço do paywall ("R$ 20,00"), números hero |
| `h1`        | 30–34px / 1.2 | 700 | Título de página ("Ranking de fornecedores"), pergunta do wizard |
| `h2`        | 22–24px / 1.25 | 700 | Título de card grande ("Desbloqueie a busca") |
| `h3`        | 17–18px / 1.35 | 600 | Nome do fornecedor, título de seção de card |
| `body`      | 16px / 1.55 | 400 | Texto padrão |
| `body-sm`   | 14px / 1.5 | 400 | Meta-informações, texto de callout |
| `caption`   | 12.5px / 1.4 | 400 | Disclaimers, "(perfil simulado)" |
| `eyebrow`   | 12px / 1.3 | 600 | **CAPS + letter-spacing .08em** — "PESQUISA COMPLETA", "CADASTRAL (PESO 30%)", grupos de categorias |
| `score`     | 13px mono / 1 | 600 | `52/100`, valores das barras |

Regras:
- Máx. 68ch de largura para blocos de texto corrido.
- `h1` da pergunta do wizard nunca quebra hierarquia: 1 por tela.
- Eyebrows sempre em `--text-subtle`; nunca na cor primária.

### 2.4 Espaçamento (grid de 4px)

`space-1: 4px` · `space-2: 8px` · `space-3: 12px` · `space-4: 16px` · `space-5: 20px` · `space-6: 24px` · `space-8: 32px` · `space-10: 40px` · `space-12: 48px` · `space-16: 64px` · `space-20: 80px`

- Padding interno de cards: `space-6` (24px); cards densos (fornecedor): `space-5`.
- Gap entre cards de opção do wizard: `space-3` (12px).
- Gap entre seções de página: `space-10` a `space-12`.

### 2.5 Layout & Container

| Token | Valor | Uso |
|---|---|---|
| `container-wizard` | `max-width: 680px` | Todo o fluxo de perguntas |
| `container-paywall` | `max-width: 440px` | Card de pagamento centralizado |
| `container-report` | `max-width: 880px` | Página de ranking/resultado |
| `page-padding` | `24px` mobile / `32px` desktop | Respiro lateral |

Breakpoints: `sm 640px` · `md 768px` · `lg 1024px` · `xl 1280px`. Mobile-first.

### 2.6 Raio de borda

| Token | Valor | Uso |
|---|---|---|
| `radius-sm`   | `8px`  | Inputs pequenos, badges retangulares, painéis internos |
| `radius-md`   | `12px` | Cards de opção, inputs, callouts |
| `radius-lg`   | `16px` | Cards principais (fornecedor, paywall) |
| `radius-xl`   | `24px` | Card glass hero, modais |
| `radius-pill` | `999px` | **Botões, chips, badges de status, barra de progresso** |

> Upgrade em relação ao app atual: botões e chips migram para **pill** (referências Zentra/
> Creative.style). Cards permanecem retos com `radius-lg`.

### 2.7 Elevação & Glass

| Nível | Sombra | Uso |
|---|---|---|
| 0 | nenhuma | Conteúdo no fluxo |
| 1 | `--shadow-1` | Cards em repouso |
| 2 | `--shadow-2` | Cards em hover, dropdowns |
| 3 | `--shadow-3` | Modais, paywall, toasts |

**Receita glass** (tratamento padrão dos painéis, v1.1):

```css
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-panel-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}
```

**Como aplicar (v1.1 — glass promovido a padrão):**
- A página inteira ganha um **mesh ambiente fixo** (`position: fixed; inset: 0; z-index: -1;
  background: var(--mesh-hero)`) — é ele que o glass desfoca.
- **São glass:** cards de conteúdo (stage, SupplierCard), painel de metodologia, top bar,
  modal, toast e o PricingCard (blur 14–24px conforme o tamanho).
- **Painéis internos** ("o que não conseguimos verificar", escopo do paywall) usam
  `--glass-inner` + borda `--glass-panel-border`, sem blur próprio.
- **Ficam sólidos:** OptionCards do wizard, inputs e dropdowns (`--surface`/`--surface-2`) —
  conteúdo interativo denso pede fundo estável e legível.
- Performance: máx. ~8 superfícies com `backdrop-filter` visíveis por viewport; em listas
  longas de SupplierCards, aplicar blur só nos primeiros cards visíveis ou usar
  `--glass-bg` sem blur (fallback aceitável).

### 2.8 Iconografia

- Biblioteca: **Lucide** (stroke 1.75px, tamanho padrão 18px; 16px em badges/inline).
- Ícones de status são fixos e nunca trocam: `check` (✓ verificado), `alert-triangle` (⚠ atenção), `x` (✕ evitar), `lock` (privacidade), `external-link` (fonte ↗), `file-down` (PDF), `search`, `arrow-left`, `arrow-right`, `chevron-right` (disclosure), `sparkles` (demo), `moon`/`sun` (tema).
- Cor do ícone herda do texto (`currentColor`).

### 2.9 Motion

| Token | Valor | Uso |
|---|---|---|
| `ease-out-soft` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entradas, expansões |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Transições de tema, hovers |
| `duration-fast` | `120ms` | Hover, focus, press |
| `duration-base` | `200ms` | Seleção de card, chips |
| `duration-slow` | `320ms` | Passo do wizard (slide+fade), accordion, modal |

Receitas:
- **Troca de pergunta do wizard:** saída `fade` 120ms → entrada `translateY(8px) + fade` 320ms `ease-out-soft`.
- **Barra de progresso:** `width` anima 320ms a cada passo.
- **Barras de score:** animam de 0 → valor no mount (600ms, stagger 60ms entre as 4).
- **Accordion "ver verificação completa":** `grid-template-rows` 0fr→1fr, 320ms.
- Respeitar `prefers-reduced-motion: reduce` — zerar todas as animações não essenciais.

### 2.10 Z-index

`ambient -1` · `base 0` · `dropdown 40` · `sticky-header 50` · `modal-backdrop 90` · `modal 100` · `toast 110`

### 2.11 Background Gradients

Família de degradês de fundo (ref. app de futsal laranja). Todos derivam de `--accent-glow` via
`color-mix`, então **seguem automaticamente a cor de marca** e valem para os dois temas.

| Token | Forma | Uso |
|---|---|---|
| `--grad-brand` | linear 135°, claro → saturado → profundo | avatares, ilustrações, tile de marca |
| `--grad-card` | radial a partir do canto sup. esquerdo (ponto de luz) → profundo | **FeaturedCard** (§4.31) |
| `--grad-header` | linear vertical, glow do accent → transparente | **header wash** (§4.32), topo de telas logadas |
| `--grad-btn` | linear vertical sutil, claro → saturado | **botão gradient** (§4.33) |
| `--grad-ember` | linear 135° laranja fixo | exclusivo do paywall/conversão |

**Regras de uso:**
1. No máximo **1 FeaturedCard por lista** — o degradê é o destaque, e destaque repetido não é destaque.
2. Degradê **nunca comunica status**: Verificado/Atenção/Evitar permanecem nas cores semânticas chapadas.
3. Texto sobre `--grad-card`/`--grad-brand` é sempre branco; elementos internos usam os chips
   translúcidos e o botão escuro `on-grad` (§4.31), nunca o botão primário normal.
4. `--grad-header` fica **atrás** de conteúdo com texto em `--text` normal (é um glow, não uma superfície).

### 2.12 Fundo vivo — degradê em movimento lento + parallax

Fundo padrão de **todas as telas do app**: uma camada fixa atrás do conteúdo com três blobs
desfocados derivando muito lentamente, mais um parallax sutil no scroll. É o que o glass (§2.7)
desfoca.

```css
.ambient {
  position: fixed; inset: -20% 0; z-index: -1;
  overflow: hidden; pointer-events: none;
  background: var(--bg);
  will-change: transform;               /* recebe o parallax */
}
.ambient .blob { position: absolute; border-radius: 50%; filter: blur(90px); will-change: transform; }
.blob-a { width: 58vmax; height: 58vmax; top: -18vmax; left: -14vmax;
          background: var(--accent-glow);   opacity: var(--blob-a-o);
          animation: drift-a 70s ease-in-out infinite alternate; }
.blob-b { width: 44vmax; height: 44vmax; top: 6vmax; right: -16vmax;
          background: var(--accent-glow-2); opacity: var(--blob-b-o);
          animation: drift-b 95s ease-in-out infinite alternate; }
.blob-c { width: 34vmax; height: 34vmax; bottom: -16vmax; left: 32vw;
          background: #F97316;              opacity: var(--blob-c-o);
          animation: drift-c 115s ease-in-out infinite alternate; }
@keyframes drift-a { to { transform: translate(9vmax, 7vmax) scale(1.12); } }
@keyframes drift-b { to { transform: translate(-8vmax, 10vmax) scale(0.94); } }
@keyframes drift-c { to { transform: translate(6vmax, -9vmax) scale(1.08); } }
```

```js
// Parallax leve (fator -0.05), rAF-throttled; pular se prefers-reduced-motion
window.addEventListener('scroll', () => {
  requestAnimationFrame(() => {
    ambient.style.transform = `translateY(${window.scrollY * -0.05}px)`;
  });
}, { passive: true });
```

**Regras:**
- Movimento **bem lento** (loops de 70–115s) e transform-only (GPU) — nunca animar
  `background-position` ou `filter`.
- Opacidades por tema via tokens `--blob-*-o` (dark ~2× light); Ember é o blob mais fraco.
- `prefers-reduced-motion: reduce` congela drift e parallax (o fundo vira estático).
- O conteúdo nunca depende do fundo para contraste — todo texto está sobre glass ou superfície.

---

## 3. Temas Light & Dark

### 3.1 Estratégia — Dark é o principal

1. **`:root` = dark.** O app abre em dark para todo mundo, independente do sistema — é o tema
   principal do produto. Light é opt-in: o toggle estampa `data-theme="light"` no `<html>`.
2. Escolha manual persiste em `localStorage("ap-theme")` e é reaplicada antes do primeiro paint
   (script inline no `<head>`, anti-FOUC).
3. **Nenhum componente usa hex direto** — só tokens. O bloco light sobrescreve apenas tokens;
   mesh e gradientes herdam do `:root` porque referenciam `var(--bg)` e `var(--accent-glow)`.
4. `color-scheme` acompanha cada bloco (scrollbars e controles nativos corretos).

### 3.2 Theme Toggle (componente)

- Botão de ícone pill (40×40px), no header, à direita: ícone `sun` (no dark) / `moon` (no light).
- Fundo `--surface-2`, borda `--border`; hover `--surface-3`.
- Transição de tema: `background-color, color, border-color 200ms ease-in-out` no `body` e superfícies (evitar `transition: all`).
- `aria-label="Alternar tema claro/escuro"` + `aria-pressed`.

### 3.3 Diferenças intencionais entre temas

| Elemento | Dark (principal) | Light (opcional) |
|---|---|---|
| Botão primário | `brand-600 #2563EB`, texto branco, hover clareia (`brand-500`) | `brand-600 #2563EB`, texto branco, hover escurece (`brand-700`) |
| Links | `brand-300 #93C5FD` (legibilidade sobre escuro) | `brand-600 #2563EB` |
| Card glass | `rgba(255,255,255,.055)` + blur sobre fundo vivo profundo | `rgba(255,255,255,.58)` + blur sobre fundo vivo pastel |
| Fundo vivo | blobs a ~26/16/9% de opacidade | blobs a ~15/11/6% (pastéis) |
| Banner demo | `--warning-bg` translúcido sobre `--bg` | `--warning-bg` sólido |

---

## 4. Componentes

Inventário completo derivado das telas do app + estados necessários.

### 4.1 Button

**Variantes:**

| Variante | Aparência | Uso no app |
|---|---|---|
| `primary` | pill, fundo `--primary`, texto `--primary-contrast`, peso 600 | "Começar pelo meu evento", "Continuar →", "Ir para pagamento →", "Pesquisar fornecedores" |
| `secondary` | pill, fundo `--surface-2`, borda `--border-strong`, texto `--text` | "← Voltar", "Nova pesquisa" |
| `outline` | pill, transparente, borda `--primary`, texto `--primary` | Ações alternativas em cards |
| `ghost` | pill, transparente, texto `--text-muted`; hover `--surface-2` | Ações terciárias, ícones |
| `link` | inline, sublinhado, cor `--link` | "Já sei a categoria que preciso →", "‹ Voltar e revisar" |
| `danger` | pill, fundo `--danger`, texto branco | Exclusões (futuro) |
| `gradient` | pill, `--grad-btn`, texto branco (§4.33) | somente CTA hero da landing e CTA do paywall |
| `on-grad` | pill, fundo escuro `rgba(10,10,14,.82)`, texto branco | único botão permitido dentro do FeaturedCard (§4.31) |

**Tamanhos:** `sm 36px` / `md 44px` (padrão) / `lg 52px` (CTAs de wizard e paywall, full-width no container). Padding horizontal: `20 / 24 / 32px`. Ícone à esquerda ou direita com gap `8px`.

**Estados:**
- *Hover:* `--primary-hover`; secundário: `--surface-3`. Elevação sutil `translateY(-1px)` + `--shadow-2` (apenas primário).
- *Active/press:* `scale(0.98)`, 120ms.
- *Focus-visible:* `box-shadow: 0 0 0 3px var(--focus-ring)`.
- *Disabled:* opacidade `.45`, `cursor: not-allowed`, sem hover (padrão atual do "Continuar" antes de selecionar).
- *Loading:* spinner 16px substitui o ícone; texto vira "Pesquisando…"; `aria-busy="true"`.

### 4.2 IconButton

40×40px (`sm 32`), pill, mesmas variantes de Button. Sempre com `aria-label`. Usos: toggle de tema, fechar modal, copiar link.

### 4.3 TextLink

Cor `--link`, sublinhado persistente (padrão do app), hover: `--primary-hover` + sublinhado 2px. Com seta direcional quando navegacional ("→" / "‹").

### 4.4 Input (text / número / cidade)

- Altura `48px`, `radius-md`, fundo `--surface-2`, borda `1px --border`, padding `0 16px`, texto `--text`, placeholder `--text-subtle`.
- *Focus:* borda `--primary` + ring `0 0 0 3px var(--focus-ring)`.
- *Erro:* borda `--danger` + mensagem `body-sm` em `--danger` com ícone `alert-circle` abaixo.
- *Disabled:* opacidade `.5`.
- **Label:** `body-sm` 600, `--text`, margem inferior `8px` (ex.: "Em que cidade?" — pode usar `h3` quando é a pergunta da tela).
- **Helper text:** `caption`, `--text-muted`.
- Variante com ícone à esquerda (ex.: `search` / `map-pin`): padding-left `44px`.

### 4.5 Select / Dropdown

Mesma pele do Input + chevron `--text-subtle`. Menu: `--surface`, `radius-md`, `--shadow-2`, item 40px com hover `--surface-2`, item selecionado com check `--primary`.

### 4.6 OptionCard (Radio) — escolha única do wizard

Anatomia: `[radio 20px] [label 600] (texto auxiliar --text-muted)` em card full-width.

| Estado | Spec |
|---|---|
| Repouso | fundo `--surface`, borda `1px --border`, `radius-md`, padding `18px 20px`, cursor pointer |
| Hover | borda `--border-strong`, fundo `--surface-2` |
| **Selecionado** | borda `1.5px --primary`, fundo `--primary-tint`, radio preenchido `--primary` |
| Focus-visible | ring `--focus-ring` |
| Disabled | opacidade `.5` |

- Radio custom: círculo 20px, borda 2px `--border-strong`; selecionado: anel `--primary` + dot 10px.
- Card inteiro é clicável (input real oculto, `role="radio"` via input nativo dentro de `<label>`).
- Auto-avanço opcional após 250ms da seleção (manter "Continuar" para acessibilidade).

### 4.7 OptionCard (Checkbox) — escolha múltipla do wizard

Igual ao 4.6, com checkbox quadrado `radius: 6px` 20px; marcado: fundo `--primary` + check branco (dark: check `--primary-contrast`). Texto auxiliar entre parênteses em `--text-muted` `body-sm` (ex.: "(som, telão, iluminação, palestrante)").

### 4.8 Chip / Tag selecionável — categorias

Pill, altura `40px`, padding `0 18px`, `body-sm` 500.

| Estado | Spec |
|---|---|
| **Ativa (na pesquisa)** | borda `1.5px --primary`, texto `--primary` (light: `mare-700`), fundo `--primary-tint`, prefixo `✓` |
| Inativa (removida) | borda `1px --border`, texto `--text-subtle`, fundo transparente, sem `✓`, opacidade `.7` |
| Hover | eleva contraste da borda |

Interação toggle com microanimação `scale .96 → 1` (120ms). Abaixo do grupo, instrução em `caption`: "Toque numa categoria para tirar ou devolver à pesquisa."

**ChipGroup:** eyebrow do grupo ("ESPAÇO & INFRAESTRUTURA") + chips com wrap, gap `10px`, margem entre grupos `space-6`.

### 4.9 Badge de status (Verificado / Atenção / Evitar)

Pill, altura `26px`, padding `0 12px`, `caption` 600 + score mono.

| Tipo | Conteúdo | Cores |
|---|---|---|
| `verified` | `✓ Verificado · 93/100` | texto `--success`, fundo `--success-bg`, borda `--success-border` |
| `caution` | `⚠ Atenção · 52/100` | texto `--warning`, fundo `--warning-bg`, borda `--warning-border` |
| `avoid` | `✕ Evitar · 0/100` | texto `--danger`, fundo `--danger-bg`, borda `--danger-border` |

Posição: canto superior direito do card do fornecedor. Nunca clicável.

### 4.10 Badge informativo / meta

- **Cache badge:** `📋 validado há menos de 30 dias — reaproveitado` — pill `radius-sm`, fundo `--info-bg`, texto `--info`, borda `--info-border`, `caption`.
- **Marcador de inferência:** `(inferência)` / `(perfil simulado)` — apenas texto `caption` em `--text-subtle`, itálico. Nunca em cor de status.
- **Rank:** `1º ·` prefixo do nome em `--text-muted`, peso 600.

### 4.11 Alert / Banner

**a) Banner global (demo mode)** — full-width no topo, fixo:
fundo `--warning-bg`, texto `--warning`, borda inferior `--warning-border`, `body-sm`, ícone `sparkles`, centralizado. Código inline (`.env`) em `--surface-2` mono.

**b) Callout de aviso (ECAD)** — no fluxo:
fundo `--warning-bg`, borda `1px --warning-border`, `radius-md`, padding `12px 16px`, ícone `⚠`, `body-sm`.

**c) Callout de bloqueio (dentro do card)** — "Não conseguimos confirmar o CNPJ…":
fundo `--warning-bg`, **borda esquerda `3px --warning`**, `radius-sm`, texto `--text` com prefixo `→`.

**d) Callout eliminatório** — "Critério eliminatório: CNPJ BAIXADO…":
fundo `--danger-bg`, **borda esquerda `3px --danger`**, texto `--text`, termo "Critério eliminatório:" em peso 700, link `fonte ↗` embutido.

**e) Nota de privacidade:** linha simples `🔒 Relatório privado — só você vê.` em `body-sm --text-muted`.

### 4.12 Card (superfícies)

| Variante | Spec | Uso |
|---|---|---|
| `card` | fundo `--surface`, borda `1px --border`, `radius-lg`, padding `24px`, elevação 1 | padrão |
| `card-glass` | receita `.glass` + `radius-xl`, sobre mesh | hero da landing, paywall |
| `panel` (interno) | fundo `--surface-2`, `radius-sm`, padding `16px`, sem sombra | "O que vamos pesquisar", "O que não conseguimos verificar" |
| `panel-dashed` | fundo `--surface`, **borda `1px dashed --border-strong`**, `radius-md` | painel de metodologia "Como pontuamos" |

### 4.13 SupplierCard (card de fornecedor no ranking)

Anatomia (de cima para baixo):
1. **Header:** `{rank}º · {Nome}` (`h3`) + Badge de status à direita.
2. **Linha de contato:** telefone · URL · @handle `(perfil simulado)` — `body-sm --text-muted`, links em `--link`.
3. **Cache badge** (opcional).
4. **Resumo** (`body`, `--text`): 1–2 linhas de evidências principais.
5. **Callout** (opcional: aviso ou eliminatório).
6. **ScoreBars** (4 barras — ver 4.14).
7. **Disclosure** "ver verificação completa" (ver 4.15).
8. **Panel** "O que não conseguimos verificar" (lista bullet `--text-muted`).

Card: `card` base; hover: borda `--border-strong` (não eleva — página densa). Cards da seção "não recomendamos" ganham borda `--danger-border` sutil.

### 4.14 ScoreBar (barra de pontuação com rótulo)

Linha: `[label 130px] [track flex-1] [valor mono 32px, alinhado à direita]`

- Label: `body-sm --text-muted` — "Cadastral (30%)".
- Track: altura `8px`, `radius-pill`, fundo `--surface-3` (light: `neutral-200`).
- Fill: `radius-pill`, cor por contexto: padrão `mare-300` (dark) / `mare-500` (light); pode assumir `--warning`/`--danger` quando o card é Atenção/Evitar (opcional v2).
- Valor: `score` mono, `--text`.
- Gap vertical entre barras: `10px`. Animação de preenchimento no mount (ver Motion).

### 4.15 Disclosure / Accordion ("ver verificação completa")

- Trigger: `▸ ver verificação completa` → aberto: `▾ ocultar verificação completa`. Cor `--link`, `body-sm` 600, chevron rotaciona 90°, 200ms.
- Conteúdo aberto: separador `--border` acima; grupos por eyebrow ("CADASTRAL (PESO 30%)") com ChecklistItems.
- `aria-expanded` + `aria-controls`; animação `grid-rows` 320ms.

### 4.16 ChecklistItem (linha de evidência)

`[ícone status 16px] [texto] [fonte ↗] [(inferência)?]`

- Ícone: `✓ --success` / `⚠ --warning` / `✕ --danger`.
- Texto: `body-sm`, critério em peso 500 + detalhe após ":" em regular ("CNPJ ativo na Receita Federal: situação ATIVA…").
- **SourceLink `fonte ↗`:** `--link`, sublinhado, ícone `external-link` 12px, `target="_blank" rel="noopener"`.
- Espaçamento vertical: `12px` entre itens.

### 4.17 ProgressBar (wizard)

- Linha acima da pergunta: `Pergunta 3 de 10` (`body-sm --text-muted`) + track full-width.
- Track: `6px`, `radius-pill`, fundo `--surface-3`; fill `--primary`, anima 320ms.
- `role="progressbar"` com `aria-valuenow/min/max`.

### 4.18 PageHeader (relatório)

1. `h1` "Ranking de fornecedores"
2. Meta-linha: `Buffet completo (almoço/jantar) · **Curitiba** · 30/08/2026` — `body`, `--text-muted`, cidade em 600 `--text`.
3. Nota de privacidade (4.11e).
4. **ActionRow:** Button primary sm `📄 Baixar PDF` + Button secondary sm `Nova pesquisa`, gap `12px`.

### 4.19 SectionHeader (dentro do relatório)

- Padrão: `h3` + contagem `(9 verificados)` em `body-sm --text-muted`.
- **Variante rejeitados:** régua superior `2px --danger` (60% opacidade) + título `✕ Encontramos, mas não recomendamos — veja por quê` com ícone `--danger`, peso 700.

### 4.20 PricingCard (paywall)

Sobre `--mesh-paywall`, container 440px, variante `card-glass` (dark) / `card` + `--shadow-3` (light):

1. Eyebrow "PESQUISA COMPLETA" (`--text-subtle`).
2. `h2` "Desbloqueie a busca".
3. **Preço `display`**: "R$ 20,00" + sub `caption` "pagamento único por pesquisa".
4. Separador `--border`.
5. Lista de benefícios: `✓ --success` + `body-sm`, gap `12px`.
6. `panel` interno "O que vamos pesquisar:" (peso 600 no prefixo, resto `--text-muted`).
7. Button primary lg full-width "Ir para pagamento →".
8. TextLink "‹ Voltar e revisar".
9. Disclaimer `caption --text-subtle`.

### 4.21 Modal / Dialog

Backdrop `rgba(0,0,0,.5)` (light) / `rgba(0,0,0,.65)` (dark) + blur 4px. Painel: `--surface`, `radius-xl`, `--shadow-3`, max-width `480px`, padding `32px`; título `h2`, corpo `body --text-muted`, ações à direita (secondary + primary). Entrada: `scale .96→1 + fade` 200ms. Focus trap, `Esc` fecha, `aria-modal`.

### 4.22 Toast

Canto inferior direito (mobile: base full-width), `--surface`, borda esquerda `3px` na cor do status, `radius-md`, `--shadow-3`, ícone + `body-sm` + botão fechar. Auto-dismiss 5s, animação slide-up. Ex.: "PDF gerado com sucesso."

### 4.23 Tooltip

Fundo `neutral-800` (light) / `neutral-300` (dark) com texto invertido, `caption`, `radius-sm`, padding `6px 10px`, seta 6px, delay 300ms. Uso: explicar pesos ("Reputação 40%").

### 4.24 Spinner & Loading da pesquisa

- **Spinner:** anel 20px, `--primary`, 0.8s linear.
- **SearchProgress (tela de espera pós-pagamento):** card central com spinner 32px, `h3` "Pesquisando fornecedores…", sublinha `body-sm --text-muted` que troca a cada etapa ("Consultando Receita Federal…", "Verificando Reclame Aqui…"), + ProgressBar indeterminada (fill 30% animando `translateX`).

### 4.25 Skeleton

Blocos `--surface-3` com shimmer (gradiente translúcido animando 1.4s). Prover skeleton do SupplierCard (header + 2 linhas + 4 barras). Respeitar reduced-motion (fica estático).

### 4.26 EmptyState

Ícone 40px `--text-subtle` em círculo `--surface-2`, `h3`, texto `body-sm --text-muted`, CTA opcional. Ex.: "Nenhum fornecedor verificável encontrado nesta cidade."

### 4.27 Header do app (top bar)

Altura `64px`, fundo `--bg` (com `backdrop-filter: blur(12px)` + fundo translúcido quando sticky), logo "Autopilot de Eventos" (`body` 700, `--text`), ThemeToggle à direita. Borda inferior `--border` apenas ao rolar.

### 4.28 Footer (mínimo)

`caption --text-subtle`, links `--text-muted`: termos, privacidade, contato. Padding `space-10` vertical.

### 4.29 Divider

`1px --border` sólido. Variante `dashed` para blocos de metodologia. Margem vertical `space-6`.

### 4.30 KBD / código inline

Para o banner demo (".env"): mono `caption`, fundo `--surface-2`, borda `--border`, `radius: 4px`, padding `1px 6px`.

### 4.31 FeaturedCard (card em destaque com degradê)

Tradução da referência (card "Friday Night League") para o produto: destacar o **melhor colocado
de cada categoria** no ranking, ou uma pesquisa ativa na home logada.

Anatomia sobre `background: var(--grad-card)`, `radius-lg`, padding `22px 24px`, texto branco:
1. **Linha de chips:** `chip-onGrad` escuro (`rgba(10,10,14,.55)`, pill, caps 11.5px) — ex.
   "MELHOR DA CATEGORIA" — + variante clara (`rgba(255,255,255,.22)`) para o status "✓ Verificado".
2. **Linha principal:** nome em Sora 21px à esquerda + score mono 19px à direita
   (como título × preço na referência).
3. **Meta:** `13px` em `rgba(255,255,255,.85)` — categoria · cidade · distância.
4. **Botão `on-grad`:** pill full-width **escuro** (`rgba(10,10,14,.82)`, texto branco, hover `.95`)
   — o "Join Game" da referência. Nunca usar o botão primário normal dentro do degradê.

Elevação `--shadow-2`, sem borda. Máximo 1 por lista (regra §2.11).

### 4.32 Header wash (topo com glow da marca)

Topo de telas logadas (home, relatórios): `background: var(--grad-header)` no bloco do cabeçalho,
desvanecendo para transparente antes do primeiro conteúdo (~40% da altura da tela na referência;
no web app, ~180–240px). Conteúdo sobre o wash usa texto normal (`--text` / `--text-muted`) —
o wash é atmosfera, não superfície. Combina com avatar em `--grad-brand` e busca em Input padrão.

### 4.33 Botão gradient

Variante do Button (§4.1): `background: var(--grad-btn)`, texto branco, sem borda; hover
`brightness(1.08)` + `--shadow-2` + `translateY(-1px)`. **Uso restrito a 2 lugares:** o CTA hero
da landing e o CTA do paywall. Em todo o resto vale o `primary` chapado — se tudo brilha, nada
brilha.

---

## 5. Padrões de página

### 5.1 Landing (hero)

- Fundo `--mesh-hero` (ref. Zentra: aurora azul→teal no dark, pastéis no light).
- Conteúdo em `container-wizard`, alinhado à esquerda (desktop) / centro (mobile): logo → `h1` → parágrafo `--text-muted` (máx. 52ch) → Button primary lg full-width → TextLink.
- Opcional v2: hero dentro de `card-glass` (ref. Cannabis Lab) com o mesh vazando por trás.

### 5.2 Wizard (10 perguntas)

Estrutura fixa: Header → ProgressBar → `h1` pergunta → stack de OptionCards → ButtonRow (`← Voltar` secondary + `Continuar →` primary, grid 1fr/1.4fr, gap `12px`).
- "Continuar" desabilitado até haver seleção (single) — multi permite 0 seleções.
- Transição entre passos: ver Motion 2.9.
- Estado é preservado ao voltar.

### 5.3 Resumo de categorias

`h1` com contagem dinâmica → meta-linha → Callout ECAD (condicional) → ChipGroups por eyebrow → instrução → Input cidade → ButtonRow com CTA de label dinâmico ("Pesquisar fornecedores (12 categorias · Curitiba)").

### 5.4 Paywall

Fundo `--mesh-paywall` (toque de Ember = momento de conversão), PricingCard centralizado vertical.

### 5.5 Relatório / Ranking

PageHeader → `panel-dashed` metodologia → por categoria: SectionHeader + SupplierCards ordenados → SectionHeader variante rejeitados + cards Evitar. Âncoras por categoria para navegação futura (TOC sticky em `xl`, v2).

### 5.6 Hierarquia de feedback

| Severidade | Componente |
|---|---|
| Informação de sistema | Banner global (demo) |
| Aviso contextual | Callout warning (ECAD, CNPJ não confirmado) |
| Bloqueio/eliminação | Callout danger com borda esquerda |
| Confirmação de ação | Toast success |
| Erro de formulário | Mensagem inline no Input |

---

## 6. Acessibilidade

- **Contraste:** todos os pares texto/fundo dos tokens ≥ 4.5:1 (texto) e 3:1 (UI). Atenção especial: `--warning` sobre `--warning-bg` é usado só em texto ≥ 600 de peso; nunca amarelo puro sobre branco no light (por isso `#A16207`).
- **Status nunca só por cor:** ícones ✓/⚠/✕ + rótulo textual sempre acompanham (já é padrão do produto — manter).
- **Foco visível** em tudo que é interativo (ring `--focus-ring`, 3px).
- **Wizard:** OptionCards são inputs nativos (`radio`/`checkbox`) dentro de `<label>`; navegação por setas entre radios; `fieldset/legend` por pergunta.
- **Progresso** anunciado: `aria-live="polite"` no "Pergunta X de 10".
- **Links externos** (`fonte ↗`): `aria-label="fonte: {critério} (abre em nova aba)"`.
- **Reduced motion** respeitado em barras, wizard e shimmer.
- Alvos de toque ≥ 44×44px (chips têm 40px de altura + padding de área clicável).

---

## 7. Checklist de implementação

- [ ] Colar bloco de tokens (2.2) num `tokens.css`; zero hex fora dele. Cor fechada: **Elétrico**.
- [ ] Carregar Sora (600/700) + Inter (400/500/600/700) + JetBrains Mono (500/600) com `font-display: swap`.
- [ ] Dark como default (`:root`); toggle estampa `data-theme="light"`; script anti-FOUC no `<head>`.
- [ ] Montar o fundo vivo (§2.12: blobs + parallax + reduced-motion) em todas as telas.
- [ ] Migrar painéis para glass (§2.7); manter wizard/inputs sólidos.
- [ ] Implementar os Background Gradients (§2.11) e o FeaturedCard no topo de cada categoria do ranking.
- [ ] `<html data-theme>` + script anti-FOUC lendo `localStorage("ap-theme")` antes do paint.
- [ ] ThemeToggle no header (4.27 / 3.2).
- [ ] Migrar botões e chips para `radius-pill`.
- [ ] Aplicar `--mesh-hero` na landing e `--mesh-paywall` no paywall (par light/dark automático).
- [ ] Substituir cores de status hardcoded pelos pares semânticos (light precisa dos tons escuros!).
- [ ] Adicionar estados que faltam no app: loading do CTA, SearchProgress, skeleton, toast, empty state, erro de input.
- [ ] Testar as 8 telas nos dois temas + `prefers-reduced-motion`.

---

*Autopilot de Eventos DS v1.2 (final) · 30/08/2026 · Azul Elétrico · Sora + Inter · Dark main · Base visual: referências Zentra / Creative.style / Cannabis Lab / app de futsal (gradients) + telas atuais do app.*
