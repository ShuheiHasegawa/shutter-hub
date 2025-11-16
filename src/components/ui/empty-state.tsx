'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Search, Inbox, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** アイコン（デフォルト: Inbox） */
  icon?: LucideIcon;
  /** タイトル（多言語化キーまたは直接テキスト） */
  title?: string;
  /** 説明文（多言語化キーまたは直接テキスト） */
  description?: string;
  /** アクションボタン */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** 検索キーワード（指定すると自動的にsearchバリアント） */
  searchTerm?: string;
  /** バリアント（デフォルト: 'default'） */
  variant?: 'default' | 'search';
  /** Cardでラップするか（デフォルト: true） */
  wrapped?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 統一的な空状態表示コンポーネント
 * データが存在しない場合や検索結果が空の場合に使用する
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  searchTerm,
  variant,
  wrapped = true,
  className,
}: EmptyStateProps) {
  const t = useTranslations('common.empty');

  // searchTermが指定されている場合は自動的にsearchバリアント
  const effectiveVariant = searchTerm ? 'search' : variant || 'default';

  // 検索結果が空の場合
  if (effectiveVariant === 'search') {
    const content = (
      <div className={cn('text-center py-12', className)}>
        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">
          {title ||
            (searchTerm
              ? t('search.noResultsWithTerm', { term: searchTerm })
              : t('search.noResults'))}
        </h3>
        {description && (
          <p className="text-muted-foreground mb-4">{description}</p>
        )}
        {!description && (
          <p className="text-muted-foreground mb-4">
            {t('search.description')}
          </p>
        )}
        <div className="space-y-2 text-sm text-muted-foreground mb-6">
          <p>{t('search.suggestions.checkSpelling')}</p>
          <p>{t('search.suggestions.tryDifferentTerms')}</p>
          <p>{t('search.suggestions.browseAll')}</p>
        </div>
        {action && (
          <div>
            {action.href ? (
              <Button asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )}
          </div>
        )}
      </div>
    );

    return wrapped ? (
      <Card>
        <CardContent>{content}</CardContent>
      </Card>
    ) : (
      content
    );
  }

  // デフォルト表示
  const content = (
    <div className={cn('text-center py-16', className)}>
      <div className="inline-flex p-4 rounded-full bg-primary/10 mb-6">
        <Icon className="h-16 w-16 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-4">
        {title || t('default.title')}
      </h3>
      {description && (
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div>
          {action.href ? (
            <Button asChild className="flex items-center gap-2 mx-auto">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              className="flex items-center gap-2 mx-auto"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return wrapped ? (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  ) : (
    content
  );
}
