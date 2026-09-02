// GET /api/rankings/:id — status + resultados parciais (a tela 2 faz polling
// a cada 2s). Sem cache HTTP.
import { NextResponse } from 'next/server';
import { providerParaLer } from '@/lib/pipeline/provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ranking = providerParaLer(id).obter(id);
  if (!ranking) {
    return NextResponse.json(
      { erro: 'Pesquisa não encontrada.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(ranking, { headers: { 'Cache-Control': 'no-store' } });
}
