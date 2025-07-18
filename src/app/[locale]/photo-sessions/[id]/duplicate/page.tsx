'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy } from 'lucide-react';
import type { PhotoSessionWithOrganizer } from '@/types/database';

export default function DuplicatePhotoSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [originalSession, setOriginalSession] =
    useState<PhotoSessionWithOrganizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ja/auth/signin');
    }
  }, [user, authLoading, router]);

  const loadOriginalSession = useCallback(async () => {
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
        logger.error('Error loading session:', error);
        setError('撮影会の読み込みに失敗しました');
        return;
      }

      if (!data) {
        setError('撮影会が見つかりません');
        return;
      }

      // Check if user is the organizer
      if (data.organizer_id !== user?.id) {
        setError('この撮影会を複製する権限がありません');
        return;
      }

      setOriginalSession(data as PhotoSessionWithOrganizer);
    } catch (error) {
      logger.error('Error loading session:', error);
      setError('撮影会の読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [supabase, sessionId, user?.id]);

  useEffect(() => {
    if (user && sessionId) {
      loadOriginalSession();
    }
  }, [user, sessionId, loadOriginalSession]);

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

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (!originalSession) {
    return (
      <DashboardLayout>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>撮影会が見つかりません</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              撮影会を複製
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                「{originalSession.title}」を複製します。
                必要に応じて内容を編集してください。
              </AlertDescription>
            </Alert>

            <PhotoSessionForm
              initialData={originalSession}
              isDuplicating={true}
              onSuccess={() => router.push('/ja/dashboard')}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
