'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CommunityCategory } from './types';
import { cn } from '@/lib/utils';

interface CommunityBoardHeaderProps {
  selectedCategory: CommunityCategory | 'all';
  onCategoryChange: (category: CommunityCategory | 'all') => void;
}

export function CommunityBoardHeader({
  selectedCategory,
  onCategoryChange,
}: CommunityBoardHeaderProps) {
  const t = useTranslations('communityBoard');

  const categories: (CommunityCategory | 'all')[] = [
    'all',
    'announcement',
    'question',
    'introduction',
    'impression',
    'other',
  ];

  return (
    <div className="sticky top-0 border-b z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h1 className="font-semibold text-lg">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'accent' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category)}
              className={cn(
                'whitespace-nowrap rounded-full',
                selectedCategory === category &&
                  'bg-foreground text-background hover:bg-foreground/90'
              )}
            >
              {t(`categories.${category}`)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
