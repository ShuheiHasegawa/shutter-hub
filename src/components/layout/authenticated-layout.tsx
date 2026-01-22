'use client';

import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './sidebar';
import { AppHeader } from './header';
import { BottomNavigation } from './bottom-navigation';
import { AuthenticatedFooter } from './authenticated-footer';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  /**
   * 未ログイン時でもレイアウトを表示するか（公開ページ用）
   * trueの場合、未ログイン時でもレイアウトを表示し、リダイレクトしない
   */
  allowPublic?: boolean;
}

/**
 * 認証済みユーザーのレイアウトコンポーネント
 * @param {AuthenticatedLayoutProps} param0 - 子コンポーネント
 * @returns {React.ReactNode} - 認証済みユーザーのレイアウトコンポーネント
 */
export function AuthenticatedLayout({
  children,
  allowPublic = false,
}: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // allowPublicがfalseの場合のみリダイレクト
    if (!allowPublic && !loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, allowPublic, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // allowPublicがtrueで未ログインの場合、レイアウトなしで表示
  if (!user && allowPublic) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 py-4 space-y-4">{children}</div>
      </div>
    );
  }

  // 未ログインでallowPublicがfalseの場合
  if (!user) {
    return null;
  }

  return (
    <div className="flex bg-background overflow-hidden h-screen">
      {/* 固定サイドバー */}
      <div className="flex-shrink-0 print:hidden">
        <Sidebar />
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* 固定ヘッダー */}
        <div className="flex-shrink-0 print:hidden">
          <AppHeader variant="authenticated" />
        </div>

        {/* スクロール可能なメインコンテンツ */}
        <main className="flex-1 overflow-y-auto min-h-0 flex flex-col print:overflow-visible">
          <div className="flex-1 px-4 pb-16 md:pb-16 space-y-4 print:px-0 print:py-0 print:pb-0">
            {children}
          </div>
          {/* フッター */}
          <div className="print:hidden">
            <AuthenticatedFooter />
          </div>
        </main>
      </div>

      {/* 固定ボトムナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 print:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
