'use client';

import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './sidebar';
import { AppHeader } from './header';
import { BottomNavigation } from './bottom-navigation';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

/**
 * 認証済みユーザーのレイアウトコンポーネント
 * @param {AuthenticatedLayoutProps} param0 - 子コンポーネント
 * @returns {React.ReactNode} - 認証済みユーザーのレイアウトコンポーネント
 */
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      redirect('/auth/signin');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 固定サイドバー */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* 固定ヘッダー */}
        <div className="flex-shrink-0">
          <AppHeader variant="authenticated" />
        </div>

        {/* スクロール可能なメインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-2 pb-16 md:pb-6">
          {children}
        </main>
      </div>

      {/* 固定ボトムナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50">
        <BottomNavigation />
      </div>
    </div>
  );
}
