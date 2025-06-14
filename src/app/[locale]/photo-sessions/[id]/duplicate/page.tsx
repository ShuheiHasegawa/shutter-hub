'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Lock, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PhotoSessionWithOrganizer } from '@/types/database';

export default function PhotoSessionDuplicatePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [photoSession, setPhotoSession] =
    useState<PhotoSessionWithOrganizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const t = useTranslations('photoSessions.form');
  const tCommon = useTranslations('common');

  const photoSessionId = params.id as string;

  useEffect(() => {
    if (!user || authLoading) return;

    const loadPhotoSession = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('photo_sessions')
          .select(
            `
            *,
            organizer:profiles!photo_sessions_organizer_id_fkey(
              id,
              display_name,
              avatar_url
            )
          `
          )
          .eq('id', photoSessionId)
          .single();

        if (fetchError) {
          console.error('撮影会取得エラー:', fetchError);
          setError(t('sessionNotFound'));
          setHasPermission(false);
          return;
        }

        if (!data) {
          setError(t('sessionNotFoundDescription'));
          setHasPermission(false);
          return;
        }

        // 権限チェック（作成者のみ複製可能）
        if (data.organizer_id !== user.id) {
          setError(t('duplicateNotAllowed'));
          setHasPermission(false);
          return;
        }

        setPhotoSession(data);
        setHasPermission(true);
      } catch (err) {
        console.error('撮影会読み込みエラー:', err);
        setError('撮影会の読み込み中にエラーが発生しました');
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    loadPhotoSession();
  }, [user, authLoading, photoSessionId, t]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loadingSession')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || hasPermission === false || !photoSession) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Lock className="h-5 w-5" />
                {hasPermission === false ? t('duplicateNotAllowed') : 'エラー'}
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
            <Copy className="h-4 w-4" />
            <span className="text-sm">{t('duplicateTitle')}</span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('duplicatePageTitle')}</h1>
          <p className="text-muted-foreground">
            「{photoSession.title}」{t('duplicatePageDescription')}
          </p>
        </div>

        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{t('duplicateWarning')}</AlertDescription>
        </Alert>

        <PhotoSessionForm
          initialData={photoSession}
          isDuplicating={true}
          onSuccess={() => {
            // 複製成功後はダッシュボードに戻る
            router.push('/dashboard/my-sessions');
          }}
        />
      </div>
    </DashboardLayout>
  );
}
