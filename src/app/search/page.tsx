import { MainLayout } from '@/components/layout/main-layout';

export default function SearchPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">撮影会を検索</h1>
        <p className="text-muted-foreground">
          検索機能は後のフェーズで実装予定です。
        </p>
      </div>
    </MainLayout>
  );
}
