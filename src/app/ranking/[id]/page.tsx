import RankingView from '@/components/ranking/RankingView';

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parcial?: string }>;
}) {
  const { id } = await params;
  const { parcial } = await searchParams;
  return <RankingView id={id} parcial={parcial === '1'} />;
}
