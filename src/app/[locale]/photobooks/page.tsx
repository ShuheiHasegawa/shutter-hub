import React, { Suspense } from 'react';
import { BookOpen } from 'lucide-react';
import { PageTitleHeader } from '@/components/ui/page-title-header';
import { BookIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getPhotobookList,
  getPhotobookPlanLimits,
} from '@/app/actions/quick-photobook';
import { getCurrentUser } from '@/lib/auth/server';
import { QuickPhotobookShelfClient } from '@/components/photobook/quick/QuickPhotobookShelfClient';
import { AdvancedPhotobookShelfClient } from '@/components/photobook/advanced/AdvancedPhotobookShelfClient';

/**
 * アドバンスドフォトブック本棚コンポーネント
 */
async function AdvancedPhotobookShelf() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // 未認証の場合は表示しない
  }

  const [photobooks, planLimits] = await Promise.all([
    getPhotobookList(user.id, 'advanced'), // アドバンスドフォトブックのみ取得
    getPhotobookPlanLimits(user.id),
  ]);

  return (
    <div className="mb-12">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 brand-primary" />
          <h2 className="text-2xl font-bold">アドバンスドフォトブック</h2>
        </div>
      </div>

      {/* 本棚セクション */}
      <div className="surface-neutral rounded-lg border overflow-hidden">
        <div className="relative">
          {/* 本棚の背景 */}
          <div className="bg-gradient-to-b from-amber-800 to-amber-900 dark:from-amber-900 dark:to-amber-950 rounded-lg p-8 shadow-xl">
            <AdvancedPhotobookShelfClient
              photobooks={photobooks}
              planLimits={planLimits}
              userId={user.id}
            />
          </div>

          {/* 本棚の装飾 */}
          <div className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-b from-amber-900 to-amber-950 dark:from-amber-950 dark:to-black rounded-b-lg shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * クイックフォトブック本棚コンポーネント
 */
async function QuickPhotobookShelf() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // 未認証の場合は表示しない
  }

  const [photobooks, planLimits] = await Promise.all([
    getPhotobookList(user.id, 'quick'), // クイックフォトブックのみ取得
    getPhotobookPlanLimits(user.id),
  ]);

  return (
    <div className="mb-12">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 brand-primary" />
          <h2 className="text-2xl font-bold">クイックフォトブック</h2>
        </div>
      </div>

      {/* 本棚セクション */}
      <div className="surface-neutral rounded-lg border overflow-hidden">
        <div className="relative">
          {/* 本棚の背景 */}
          <div className="bg-gradient-to-b from-amber-800 to-amber-900 dark:from-amber-900 dark:to-amber-950 rounded-lg p-8 shadow-xl">
            <QuickPhotobookShelfClient
              photobooks={photobooks}
              planLimits={planLimits}
              userId={user.id}
            />
          </div>

          {/* 本棚の装飾 */}
          <div className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-b from-amber-900 to-amber-950 dark:from-amber-950 dark:to-black rounded-b-lg shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * クイックフォトブック本棚のローディング表示
 */
function QuickPhotobookShelfSkeleton() {
  return (
    <div className="mb-12">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* 本棚セクション */}
      <div className="surface-neutral rounded-lg border overflow-hidden">
        <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 dark:from-emerald-900 dark:to-emerald-950 rounded-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg">
                <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PhotobooksPage() {
  return (
    <div>
      <PageTitleHeader
        title="フォトブック"
        icon={<BookIcon className="h-6 w-6" />}
      />
      {/* フォトブックについてのカード */}
      <div className="surface-neutral p-4 border rounded-lg mb-8">
        <h3 className="text-lg font-semibold mb-2">フォトブックについて</h3>
        <p className="leading-relaxed text-sm opacity-80">
          ShutterHubのフォトブック機能では、撮影した写真を美しいレイアウトで整理し、
          プロフェッショナルな写真集として作成することができます。
          様々なテンプレートとレイアウトオプションをご用意しており、
          あなたの作品を最高の形で表現できます。
        </p>
      </div>

      {/* クイックフォトブック本棚セクション */}
      <Suspense fallback={<QuickPhotobookShelfSkeleton />}>
        <QuickPhotobookShelf />
      </Suspense>

      {/* アドバンスドフォトブック本棚セクション */}
      <Suspense fallback={<AdvancedPhotobookShelfSkeleton />}>
        <AdvancedPhotobookShelf />
      </Suspense>
    </div>
  );
}

/**
 * アドバンスドフォトブック本棚スケルトン
 */
function AdvancedPhotobookShelfSkeleton() {
  return (
    <div className="mb-12">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 brand-primary" />
          <h2 className="text-2xl font-bold">アドバンスドフォトブック</h2>
        </div>
      </div>

      <div className="surface-neutral rounded-lg border overflow-hidden">
        <div className="relative">
          <div className="bg-gradient-to-b from-amber-800 to-amber-900 dark:from-amber-900 dark:to-amber-950 rounded-lg p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          </div>
          <div className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-b from-amber-900 to-amber-950 dark:from-amber-950 dark:to-black rounded-b-lg shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}
