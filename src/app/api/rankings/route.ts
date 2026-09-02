// POST /api/rankings — cria a busca e agenda a pipeline (after() mantém o
// trabalho vivo depois da resposta, local e na Vercel).
import { NextResponse, after } from 'next/server';
import { CATEGORIA_BY_ID, MAX_CATEGORIAS_POR_PESQUISA } from '@/lib/categorias';
import { providerParaCriar } from '@/lib/pipeline/provider';
import type { CriarRankingBody } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: Partial<CriarRankingBody>;
  try {
    body = (await req.json()) as Partial<CriarRankingBody>;
  } catch {
    return NextResponse.json({ erro: 'Corpo da requisição inválido (JSON esperado).' }, { status: 400 });
  }

  const cidade = typeof body.cidade === 'string' ? body.cidade.trim() : '';
  if (cidade.length < 2 || cidade.length > 80) {
    return NextResponse.json({ erro: 'Informe a cidade do evento.' }, { status: 400 });
  }

  const categorias = Array.isArray(body.categorias)
    ? body.categorias.filter((c): c is string => typeof c === 'string')
    : [];
  if (categorias.length < 1 || categorias.length > MAX_CATEGORIAS_POR_PESQUISA) {
    return NextResponse.json(
      { erro: `Selecione de 1 a ${MAX_CATEGORIAS_POR_PESQUISA} categorias de fornecedor por pesquisa.` },
      { status: 400 },
    );
  }
  const desconhecidas = categorias.filter((c) => !CATEGORIA_BY_ID.has(c));
  if (desconhecidas.length > 0) {
    return NextResponse.json(
      { erro: `Categoria desconhecida: ${desconhecidas.join(', ')}.` },
      { status: 400 },
    );
  }

  const avisos = Array.isArray(body.avisos)
    ? body.avisos.filter((a): a is string => typeof a === 'string').slice(0, 5).map((a) => a.slice(0, 500))
    : [];

  const { id, executar } = providerParaCriar().criar(cidade, categorias, avisos);
  if (executar) {
    after(async () => {
      try {
        await executar();
      } catch (e) {
        console.error('[api] pipeline falhou:', e);
      }
    });
  }
  return NextResponse.json({ id }, { status: 201 });
}
