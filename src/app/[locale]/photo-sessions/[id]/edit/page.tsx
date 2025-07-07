'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import type { PhotoSessionWithOrganizer } from '@/types/database';

export default function EditPhotoSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<PhotoSessionWithOrganizer | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('photoSessions.form');
  const tCommon = useTranslations('common');
  const supabase = createClient();

  const loadSession = async () => {
    try {
      setLoading(true);
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

      if (error) {
        console.error('Error loading session:', error);
        setError('撮影会の読み込みに失敗しました');
        return;
      }

      if (!data) {
        setError('撮影会が見つかりません');
        return;
      }

      // Check if user is the organizer
      if (data.organizer_id !== user?.id) {
        setError('この撮影会を編集する権限がありません');
        return;
      }

      setSession(data as PhotoSessionWithOrganizer);
    } catch (error) {
      console.error('Error loading session:', error);
      setError('撮影会の読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ja/auth/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && sessionId) {
      loadSession();
    }
  }, [user, sessionId, loadSession]);

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
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || '撮影会が見つかりません'}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

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
          isEditing={true}
          onSuccess={() => router.push(`/ja/photo-sessions/${sessionId}`)}
        />
      </div>
    </DashboardLayout>
  );
}
