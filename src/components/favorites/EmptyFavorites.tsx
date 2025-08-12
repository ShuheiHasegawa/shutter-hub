'use client';

import { Heart, Building2, Camera, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface EmptyFavoritesProps {
  type: 'studio' | 'photo_session';
  message: string;
  searchTerm?: string;
}

export function EmptyFavorites({
  type,
  message: _message,
  searchTerm,
}: EmptyFavoritesProps) {
  const t = useTranslations('favorites');
  const router = useRouter();

  // 検索結果が空の場合
  if (searchTerm) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Search className="h-16 w-16 text-theme-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-theme-text-primary mb-2">
            {t('search.noResults')}
          </h3>
          <p className="text-theme-text-secondary mb-4">
            {t('search.noResultsDescription', { term: searchTerm })}
          </p>
          <div className="space-y-2 text-sm text-theme-text-muted">
            <p>{t('search.suggestions.checkSpelling')}</p>
            <p>{t('search.suggestions.tryDifferentTerms')}</p>
            <p>{t('search.suggestions.browseAll')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // タイプ別のアイコンと行動を取得
  const getTypeInfo = () => {
    switch (type) {
      case 'studio':
        return {
          icon: Building2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          title: t('empty.studiosTitle'),
          description: t('empty.studiosDescription'),
          actionText: t('empty.browseStudios'),
          actionPath: '/studios',
        };
      case 'photo_session':
        return {
          icon: Camera,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          title: t('empty.photoSessionsTitle'),
          description: t('empty.photoSessionsDescription'),
          actionText: t('empty.browsePhotoSessions'),
          actionPath: '/photo-sessions',
        };
      default:
        return {
          icon: Heart,
          color: 'text-pink-600',
          bgColor: 'bg-pink-50',
          title: t('empty.allTitle'),
          description: t('empty.allDescription'),
          actionText: t('empty.browseAll'),
          actionPath: '/',
        };
    }
  };

  const typeInfo = getTypeInfo();
  const IconComponent = typeInfo.icon;

  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div
          className={`inline-flex p-4 rounded-full ${typeInfo.bgColor} mb-6`}
        >
          <IconComponent className={`h-12 w-12 ${typeInfo.color}`} />
        </div>

        <h3 className="text-2xl font-bold text-theme-text-primary mb-4">
          {typeInfo.title}
        </h3>

        <p className="text-theme-text-secondary mb-8 max-w-md mx-auto leading-relaxed">
          {typeInfo.description}
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => router.push(typeInfo.actionPath)}
            size="lg"
            className="bg-theme-primary text-theme-primary-foreground hover:bg-theme-primary/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            {typeInfo.actionText}
          </Button>

          {/* 追加のアクション */}
          <div className="flex justify-center gap-4 pt-4">
            {type === 'studio' ? (
              <Button
                variant="outline"
                onClick={() => router.push('/studios')}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                {t('actions.exploreStudios')}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push('/photo-sessions')}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                {t('actions.explorePhotoSessions')}
              </Button>
            )}
          </div>
        </div>

        {/* お気に入り機能の説明 */}
        <div className="mt-12 pt-8 border-t border-theme-neutral/20">
          <h4 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('howTo.title')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="inline-flex p-2 rounded-lg bg-theme-primary/10">
                <Heart className="h-5 w-5 text-theme-primary" />
              </div>
              <h5 className="font-semibold text-theme-text-primary">
                {t('howTo.step1.title')}
              </h5>
              <p className="text-theme-text-secondary">
                {t('howTo.step1.description')}
              </p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex p-2 rounded-lg bg-theme-accent/10">
                <Plus className="h-5 w-5 text-theme-accent" />
              </div>
              <h5 className="font-semibold text-theme-text-primary">
                {t('howTo.step2.title')}
              </h5>
              <p className="text-theme-text-secondary">
                {t('howTo.step2.description')}
              </p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex p-2 rounded-lg bg-theme-secondary/10">
                <Search className="h-5 w-5 text-theme-secondary" />
              </div>
              <h5 className="font-semibold text-theme-text-primary">
                {t('howTo.step3.title')}
              </h5>
              <p className="text-theme-text-secondary">
                {t('howTo.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
