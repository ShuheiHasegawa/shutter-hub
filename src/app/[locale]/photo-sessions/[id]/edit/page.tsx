'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import { getPhotoSessionModelsAction } from '@/app/actions/photo-session-models';
import { getPhotoSessionStudioAction } from '@/app/actions/photo-session-studio';
import type { SelectedModel, PhotoSessionSlot } from '@/types/photo-session';

export default function EditPhotoSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<PhotoSessionWithOrganizer | null>(
    null
  );
  const [sessionModels, setSessionModels] = useState<SelectedModel[]>([]);
  const [sessionSlots, setSessionSlots] = useState<PhotoSessionSlot[]>([]);
  const [sessionStudioId, setSessionStudioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const t = useTranslations('photoSessions.form');
  const tCommon = useTranslations('common');
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ja/auth/signin');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadSessionData = async () => {
      // 既に実行中の場合は重複実行を防ぐ
      if (isLoadingRef.current || !user || !sessionId || authLoading) {
        return;
      }

      logger.debug('[EditPhotoSessionPage] loadSession開始', {
        sessionId,
        userId: user?.id,
      });

      try {
        isLoadingRef.current = true;
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('photo_sessions')
          .select(
            `
            *,
            organizer:profiles!organizer_id(*)
          `
          )
          .eq('id', sessionId)
          .single();

        logger.debug('[EditPhotoSessionPage] Supabaseクエリ完了', {
          hasData: !!data,
          hasError: !!error,
        });

        if (error) {
          logger.error(
            '[EditPhotoSessionPage] セッション読み込みエラー:',
            error
          );
          setError('撮影会の読み込みに失敗しました');
          return;
        }

        if (!data) {
          logger.warn('[EditPhotoSessionPage] セッションデータなし');
          setError('撮影会が見つかりません');
          return;
        }

        // Check if user is the organizer
        if (data.organizer_id !== user?.id) {
          logger.warn('[EditPhotoSessionPage] 権限なし', {
            dataOrganizerId: data.organizer_id,
            userId: user?.id,
          });
          setError('この撮影会を編集する権限がありません');
          return;
        }

        logger.debug('[EditPhotoSessionPage] セッション設定完了');
        setSession(data as PhotoSessionWithOrganizer);
        setError(null);

        // スロット情報を取得
        const { data: slots, error: slotsError } = await supabase
          .from('photo_session_slots')
          .select('*')
          .eq('photo_session_id', sessionId)
          .order('slot_number', { ascending: true });

        if (slotsError) {
          logger.error(
            '[EditPhotoSessionPage] スロット取得エラー:',
            slotsError
          );
        } else if (slots) {
          setSessionSlots(slots as PhotoSessionSlot[]);
        }

        // スタジオ情報を取得
        const studioResult = await getPhotoSessionStudioAction(sessionId);
        if (studioResult.success && studioResult.studio) {
          setSessionStudioId(studioResult.studio.id);
        }

        // 運営アカウントの場合、モデル情報を取得
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (userProfile?.user_type === 'organizer') {
          const modelsResult = await getPhotoSessionModelsAction(sessionId);
          if (modelsResult.success && modelsResult.models) {
            setSessionModels(modelsResult.models);
          } else {
            // モデル情報が取得できない場合、空配列を設定
            setSessionModels([]);
          }
        }
      } catch (error) {
        logger.error('[EditPhotoSessionPage] 予期しないエラー:', error);
        setError('撮影会の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sessionId, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !session) {
    return (
      <AuthenticatedLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || '撮影会が見つかりません'}
          </AlertDescription>
        </Alert>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/my-sessions')}
          >
            <ArrowLeft className="h-4 w-4" />
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
            「{session.title}」{t('editPageDescription')}
          </p>
        </div>

        <PhotoSessionForm
          initialData={session}
          initialModels={sessionModels}
          initialSlots={sessionSlots}
          initialStudioId={sessionStudioId}
          isEditing={true}
          onSuccess={() => router.push(`/ja/photo-sessions/${sessionId}`)}
        />
      </div>
    </AuthenticatedLayout>
  );
}
