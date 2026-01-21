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
    <div className={cn('min-h-[60px] flex items-center', className)}>
      {/* グリッドレイアウト: 3列で中央にタイトルを配置 */}
      <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-2 min-w-0 w-full">
        {/* 左側: 戻るボタン */}
        <div className="flex items-center justify-start">
          {backButton && <BackButton {...backButton} />}
        </div>

        {/* 中央: タイトル */}
        <div className="flex flex-col items-center justify-center min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1 text-center">
              {description}
            </p>
          )}
        </div>

        {/* 右側: アクションボタン */}
        <div className="flex items-center justify-end flex-shrink-0">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export default PageTitleHeader;
