/**
 * 📚 PageTitleHeader Component - 統一されたページタイトル表示システム
 *
 * 🎯 用途:
 * - 戻るボタン + ページタイトル + 説明 + アクションボタンの統一表示
 * - DashboardLayout内での一貫したページヘッダー体験
 *
 * ✅ 使用例:
 *   <PageTitleHeader
 *     title="分析・統計"
 *     description="撮影会の詳細分析データ"
 *     icon={<BarChart3Icon className="h-6 w-6" />}
 *     backButton={{ href: "/photo-sessions", variant: "outline" }}
 *     actions={<Button variant="action">レポート出力</Button>}
 *   />
 *
 * 🎨 レスポンシブ対応:
 * - モバイル: アクションボタンは下段配置
 * - デスクトップ: 右側配置
 */

import React from 'react';
import { BackButton, BackButtonProps } from './back-button';
import { cn } from '@/lib/utils';

interface PageTitleHeaderProps {
  /** ページタイトル（必須） */
  title: string;
  /** ページの説明（オプション） */
  description?: string;
  /** タイトル左側のアイコン（オプション） */
  icon?: React.ReactNode;
  /** 戻るボタンの設定（オプション） */
  backButton?: BackButtonProps;
  /** 右側のアクションボタン（オプション） */
  actions?: React.ReactNode;
  /** 追加のCSSクラス */
  className?: string;
}

export function PageTitleHeader({
  title,
  description,
  icon,
  backButton,
  actions,
  className,
}: PageTitleHeaderProps) {
  return (
    <div className={cn('pt-4 pb-2', className)}>
      {/* メインヘッダー行 */}
      <div className="flex items-center">
        {/* 戻るボタン */}
        {backButton && <BackButton {...backButton} />}

        {/* タイトル部分 */}
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center">
            {icon}
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* デスクトップ用アクションボタン */}
        {actions && (
          <div className="hidden md:flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* モバイル用アクションボタン（下段） */}
      {actions && (
        <div className="flex md:hidden items-center gap-2 mt-4">{actions}</div>
      )}
    </div>
  );
}

export default PageTitleHeader;
