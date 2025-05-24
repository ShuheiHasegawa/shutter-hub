import { MainLayout } from '@/components/layout/main-layout';

export default function InstantPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">即座撮影リクエスト</h1>
        <p className="text-muted-foreground">
          即座撮影機能は後のフェーズで実装予定です。
        </p>
      </div>
    </MainLayout>
  );
}
