// Wrapper fino sobre o SDK da Anthropic: loop de agente com busca web nativa
// (server tool) + tools de cliente (consulta_cnpj executada por NÓS em código;
// submit_* captura o JSON estruturado e encerra o loop).
import Anthropic from '@anthropic-ai/sdk';

let cliente: Anthropic | null = null;

// ANTHROPIC_WORKSPACE_ID deve ficar VAZIO no uso normal: chave de API
// (sk-ant-...) ja e vinculada ao workspace na criacao e a API nao define um
// header anthropic-workspace-id. O passthrough abaixo existe so por
// compatibilidade com a config do time; preenchido, envia um header nao
// reconhecido — ver docs/conectar-api.md ("E workspace?").
export function getAnthropic(): Anthropic {
  if (!cliente) {
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    cliente = new Anthropic({
      timeout: 55_000,
      maxRetries: 1,
      ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}),
    });
  }
  return cliente;
}

export function webSearchTool(maxUses: number): Record<string, unknown> {
  return { type: 'web_search_20250305', name: 'web_search', max_uses: maxUses };
}

export interface ClientTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  // Retorna string para continuar a conversa (tool_result), ou {captura} para
  // guardar o payload final e encerrar o loop.
  handler: (input: unknown) => Promise<{ resultado: string } | { captura: unknown }>;
}

export interface AgentLoopParams {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  serverTools?: Array<Record<string, unknown>>;
  clientTools: ClientTool[];
  maxRodadas?: number;
}

// Roda o loop até uma tool de captura ser chamada (ou o modelo parar).
// Devolve o payload capturado, ou null se o modelo terminou sem submeter.
export async function runAgentLoop(params: AgentLoopParams): Promise<unknown | null> {
  const client = getAnthropic();
  const tools = [
    ...(params.serverTools ?? []),
    ...params.clientTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    })),
  ] as unknown as Anthropic.Messages.MessageCreateParams['tools'];

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: params.user },
  ];

  for (let rodada = 0; rodada < (params.maxRodadas ?? 8); rodada++) {
    const resposta = await client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages,
      tools,
    });

    const chamadas = resposta.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
    );

    if (chamadas.length === 0 || resposta.stop_reason !== 'tool_use') {
      return null; // modelo terminou sem submeter JSON estruturado
    }

    const resultados: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const chamada of chamadas) {
      const tool = params.clientTools.find((t) => t.name === chamada.name);
      if (!tool) continue; // server tools são executadas pela própria API
      const saida = await tool.handler(chamada.input);
      if ('captura' in saida) return saida.captura;
      resultados.push({
        type: 'tool_result',
        tool_use_id: chamada.id,
        content: saida.resultado,
      });
    }

    messages.push({ role: 'assistant', content: resposta.content });
    if (resultados.length === 0) {
      // Só server tools nesta rodada — segue o loop com a resposta como está.
      messages.push({ role: 'user', content: 'Continue e finalize com a tool de submissão.' });
    } else {
      messages.push({ role: 'user', content: resultados });
    }
  }
  return null;
}
