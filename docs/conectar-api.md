# Conectar a chave da Anthropic (modo REAL)

> Quem cola a chave e uma pessoa do time, na propria maquina e no painel da
> Vercel. A chave nunca entra no repositorio, nunca entra em mensagem de chat e
> nunca aparece em log. Este documento so descreve onde ela vai.

O app tem dois modos e ele decide sozinho qual usar (`src/lib/config.ts`):

| Situacao | Modo |
|---|---|
| `ANTHROPIC_API_KEY` vazia ou ausente | DEMONSTRACAO (dados simulados) |
| `ANTHROPIC_API_KEY` preenchida | REAL (Claude + BrasilAPI) |
| `MOCK_MODE=true` | DEMONSTRACAO, mesmo com chave (para ensaiar sem gastar) |

O risco que este documento existe para evitar: **a queda para o modo
demonstracao e silenciosa.** Chave errada, espaco sobrando no fim, variavel
criada no ambiente errado da Vercel, tudo isso da o mesmo resultado visivel:
o app funciona, com dado falso. Por isso o passo 3 nao e opcional.

## 1. Local

1. `cp .env.example .env`
2. Abra o `.env` e cole a chave em `ANTHROPIC_API_KEY=`. Sem aspas, sem espaco
   antes ou depois.
3. Reinicie o `npm run dev`. Variavel de ambiente so e lida no start.

O `.env` ja esta no `.gitignore`. Nunca use `git add -f` nele.

## 2. Vercel

Painel do projeto, `Settings` > `Environment Variables`:

- Nome: `ANTHROPIC_API_KEY`, valor: a chave. Marque os ambientes que vao usar
  (Production e Preview).
- Confira tambem `DATA_STORE`. Hoje o deploy demo roda com `memory`, que nao
  guarda estado entre invocacoes serverless. Para o modo REAL na Vercel, a
  camada de dados precisa de um banco de verdade (Postgres ou Turso em
  `src/lib/db`). Enquanto isso nao existir, **o modo REAL e local.**

Variavel nova so vale no proximo deploy. Salvar no painel nao republica
sozinho: rode um redeploy.

## 3. Conferir se a chave chegou (obrigatorio)

```bash
curl -s localhost:3000/api/status | python3 -m json.tool
```

Devolve o modo, se ha chave, e a chave **mascarada** (7 primeiros caracteres e
4 ultimos, nunca o valor). Isso separa "nao colei chave" de "colei a errada".

Para provar que a chave funciona de verdade, uma chamada minuscula (8 tokens,
custo desprezivel):

```bash
curl -s "localhost:3000/api/status?ping=1" | python3 -m json.tool
```

O que cada resposta significa:

| `ping` | Significado | O que fazer |
|---|---|---|
| `ok: true` | chave valida, modelo respondeu | nada, esta pronto |
| `401 authentication_error` | chave invalida, revogada ou de outra organizacao | conferir de qual conta a chave saiu |
| `403 permission_error` | chave existe, sem permissao no workspace | liberar o workspace no console |
| `404 not_found_error` | a conta nao enxerga o modelo configurado | trocar o modelo no `.env` (`MODEL_*`) |
| `429 rate_limit_error` | chave valida, sem cota ou sem credito | conferir credito no console |

### E workspace? (correcao — 30/08)

Uma versao anterior deste guia dizia que chave de conta com workspaces exige o
header `anthropic-workspace-id` em toda requisicao. **Isso nao procede**: chave
de API (`sk-ant-...`) ja nasce vinculada ao workspace onde foi criada — a
propria chave carrega essa identidade e nenhum header extra e necessario. Nao
existe esse header na API da Anthropic; a variavel `ANTHROPIC_WORKSPACE_ID` so
existe em configuracoes corporativas de federacao de identidade (WIF), que nao
e o nosso caso. **Deixe `ANTHROPIC_WORKSPACE_ID` em branco** — preenchida, ela
faria o app enviar um header nao reconhecido. Se um erro 403 mencionar
workspace, o problema e a chave ter saido do workspace errado no console: gere
outra no workspace certo.

Na Vercel, a mesma URL: `https://<dominio-do-deploy>/api/status?ping=1`.

## 4. Custo

Um ranking real com 10 fornecedores custa cerca de US$ 1,50 a 2,50, com a
maior parte na busca web dos agentes Verificador e Refinador. Para ensaiar o
pitch sem gastar, `MOCK_MODE=true` no `.env`, sem precisar remover a chave.

## 5. Se a chave vazar

Revogue no console da Anthropic e gere outra. Chave em repositorio publico e
lida por robo em minutos, e apagar o commit nao resolve: o valor ja esta no
historico. Revogar e a unica correcao.
