// GET /api/status: diagnostico de configuracao.
//
// Por que existe: sem ANTHROPIC_API_KEY o app cai em modo demonstracao
// SILENCIOSAMENTE. Local isso e visivel; na Vercel, nao. Esta rota responde a
// unica pergunta que importa antes do pitch: a chave chegou e funciona?
//
// A chave NUNCA e devolvida — nem mascarada (endpoint publico). So booleanos
// distinguem "colei algo com formato errado" de "nao colei chave nenhuma";
// o ?ping=1 e quem prova que a credencial funciona de verdade.
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, isMockMode } from '@/lib/config';
import { getAnthropic } from '@/lib/pipeline/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Endpoint publico: NUNCA devolver material da chave (nem mascarado — sufixo e
// tamanho tambem sao vazamento). So booleanos: presente? formato plausivel?
function formatoPlausivel(chave: string | undefined): boolean | null {
  if (!chave) return null;
  return chave.startsWith('sk-ant-') && chave.length >= 12;
}

interface Ping {
  ok: boolean;
  detalhe: string;
  status?: number;
  tipo?: string;
}

// Uma chamada real minuscula (poucos tokens) so para provar a credencial.
async function pingar(): Promise<Ping> {
  try {
    // O mesmo cliente da pipeline: o ping so vale se provar a configuracao real.
    const r = await getAnthropic().messages.create({
      model: MODELS.descobridor,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'responda apenas: ok' }],
    });
    return { ok: true, detalhe: `chave valida, modelo ${r.model} respondeu` };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, status: 401, tipo: 'authentication_error', detalhe: 'chave rejeitada pela Anthropic (invalida, revogada ou de outra organizacao)' };
    }
    if (e instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, status: 403, tipo: 'permission_error', detalhe: 'a chave existe mas nao tem permissao neste workspace' };
    }
    if (e instanceof Anthropic.NotFoundError) {
      return { ok: false, status: 404, tipo: 'not_found_error', detalhe: `modelo "${MODELS.descobridor}" nao encontrado para esta conta` };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, tipo: 'rate_limit_error', detalhe: 'chave valida, mas sem cota agora (rate limit ou credito zerado)' };
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return { ok: false, tipo: 'connection_error', detalhe: 'nao consegui alcancar a API (rede ou timeout)' };
    }
    if (e instanceof Anthropic.APIError) {
      return { ok: false, status: e.status, tipo: 'api_error', detalhe: String(e.message).slice(0, 200) };
    }
    return { ok: false, tipo: 'erro_desconhecido', detalhe: String(e).slice(0, 200) };
  }
}

export async function GET(req: Request) {
  const chave = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  const querPing = new URL(req.url).searchParams.get('ping') === '1';

  const corpo: Record<string, unknown> = {
    modo: isMockMode() ? 'DEMONSTRACAO' : 'REAL',
    chavePresente: Boolean(chave),
    chaveFormatoPlausivel: formatoPlausivel(chave),
    mockForcado: process.env.MOCK_MODE === 'true',
    dataStore: process.env.DATA_STORE ?? 'sqlite',
    modelos: MODELS,
    // Ping so sob demanda: gasta (pouquissimo) credito de verdade.
    dica: querPing ? undefined : 'para testar a chave de verdade, chame /api/status?ping=1',
  };

  if (querPing) {
    corpo.ping = chave ? await pingar() : { ok: false, detalhe: 'nao ha chave configurada para testar' };
  }

  return NextResponse.json(corpo, { headers: { 'cache-control': 'no-store' } });
}
