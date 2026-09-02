import PesquisaViva from '@/components/pesquisa/PesquisaViva';

export default async function PesquisaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PesquisaViva id={id} />;
}
