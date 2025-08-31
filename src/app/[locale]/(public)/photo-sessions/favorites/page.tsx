'use client';

import { PhotoSessionFavoritesContent } from '@/components/favorites/PhotoSessionFavoritesContent';
import { AuthenticatedLayout } from '@/components/layout/dashboard-layout';
import { useTranslations } from 'next-intl';

export default function PhotoSessionFavoritesPage() {
  const _t = useTranslations('favorites');

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto">
        {/* ページヘッダー */}
        <div className="bg-theme-background border-b border-theme-neutral/20 px-6 py-8 mb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-theme-primary/10 rounded-lg">
                <svg
                  className="h-6 w-6 text-theme-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-theme-text-primary">
                お気に入り撮影会
              </h1>
            </div>
            <p className="text-theme-text-secondary">
              お気に入りに登録した撮影会を一覧で確認できます
            </p>
          </div>
        </div>

        <PhotoSessionFavoritesContent />
      </div>
    </AuthenticatedLayout>
  );
}
