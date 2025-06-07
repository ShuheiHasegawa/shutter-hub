export default async function AdminDisputesPage({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}) {
  // paramsを使用しない場合でも、Next.js 15では必要
  await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">争議管理</h1>
      <p className="text-gray-600 mt-2">一時的に簡略化されたページです。</p>
    </div>
  );
}
