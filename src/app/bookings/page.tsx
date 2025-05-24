import { MainLayout } from '@/components/layout/main-layout';

export default function BookingsPage() {
  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">予約管理</h1>
        <p className="text-muted-foreground">
          予約管理機能は後のフェーズで実装予定です。
        </p>
      </div>
    </MainLayout>
  );
}
