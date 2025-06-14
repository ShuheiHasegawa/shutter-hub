'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Lock } from 'lucide-react';
// import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PhotoSessionWithOrganizer } from '@/types/database';

export default function PhotoSessionEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const t = useTranslations('photoSessions.form');
  const tCommon = useTranslations('common');

  const [photoSession, setPhotoSession] =
    useState<PhotoSessionWithOrganizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const photoSessionId = params.id as string;

  useEffect(() => {
    if (!user || !photoSessionId) return;

    const loadPhotoSession = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // 撮影会データを取得（主催者情報も含む）
        const { data: sessionData, error: sessionError } = await supabase
          .from('photo_sessions')
          .select(
            `
            *,
            organizer:profiles!organizer_id(*)
          `
          )
          .eq('id', photoSessionId)
          .single();

        if (sessionError) {
          console.error('撮影会取得エラー:', sessionError);
          if (sessionError.code === 'PGRST116') {
            setError('撮影会が見つかりません');
          } else {
            setError('撮影会の取得に失敗しました');
          }
          return;
        }

        if (!sessionData) {
          setError('撮影会が見つかりません');
          return;
        }

        // 権限チェック：作成者のみ編集可能
        if (sessionData.organizer_id !== user.id) {
          setHasPermission(false);
          setError('この撮影会を編集する権限がありません');
          return;
        }

        setHasPermission(true);
        setPhotoSession(sessionData as PhotoSessionWithOrganizer);
      } catch (error) {
        console.error('撮影会データ取得エラー:', error);
        setError('撮影会の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    loadPhotoSession();
  }, [user, photoSessionId]);

  const handleEditSuccess = () => {
    // 編集成功後は撮影会詳細ページにリダイレクト
    router.push(`/photo-sessions/${photoSessionId}`);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{tCommon('loading')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !photoSession) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/my-sessions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon('back')}
            </Button>
          </div>

          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Lock className="h-5 w-5" />
                {hasPermission === false
                  ? t('editNotAllowed')
                  : tCommon('error')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {error || t('sessionNotFoundDescription')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/my-sessions')}
                >
                  {t('backToSessions')}
                </Button>
                <Button
                  onClick={() =>
                    router.push(`/photo-sessions/${photoSessionId}`)
                  }
                >
                  {t('viewSession')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/photo-sessions/${photoSessionId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon('back')}
          </Button>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Edit className="h-4 w-4" />
            <span className="text-sm">{t('editTitle')}</span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('editPageTitle')}</h1>
          <p className="text-muted-foreground">
            「{photoSession.title}」{t('editPageDescription')}
          </p>
        </div>

        <PhotoSessionForm
          initialData={photoSession}
          isEditing={true}
          onSuccess={handleEditSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
