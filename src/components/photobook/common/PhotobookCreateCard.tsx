'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PhotobookCreateCardProps {
  canCreate: boolean;
  createUrl: string;
  typeLabel: string;
  currentCount: number;
  maxCount: number;
  borderColor?: string;
}

/**
 * フォトブック新規作成カードの共通コンポーネント
 */
export function PhotobookCreateCard({
  canCreate,
  createUrl,
  typeLabel,
  currentCount,
  maxCount,
  borderColor = 'border-emerald-300/50',
}: PhotobookCreateCardProps) {
  const t = useTranslations('photobooks');

  return (
    <div className="group transform transition-all duration-300 hover:-translate-y-2">
      {canCreate ? (
        <Link href={createUrl}>
          <div
            className={`surface-accent rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-dashed ${borderColor}`}
          >
            <div className="aspect-[3/4] flex items-center justify-center">
              <div className="text-center">
                <Plus className="h-12 w-12 mx-auto mb-3 opacity-80" />
                <p className="text-sm font-medium opacity-90">
                  {t('createNew')}
                </p>
                <p className="text-xs opacity-70 mt-1">{typeLabel}</p>
                <p className="text-xs opacity-60 mt-1">
                  {t('count', { currentCount, maxCount })}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="surface-neutral rounded-lg shadow-lg border-2 border-dashed border-gray-400/50 opacity-60">
          <div className="aspect-[3/4] flex items-center justify-center">
            <div className="text-center">
              <Plus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium opacity-70">
                {t('limitReached')}
              </p>
              <p className="text-xs opacity-60 mt-1">
                {t('count', { currentCount, maxCount })}
              </p>
              <p className="text-xs opacity-50 mt-1">
                {t('upgradeToIncreaseLimit')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
