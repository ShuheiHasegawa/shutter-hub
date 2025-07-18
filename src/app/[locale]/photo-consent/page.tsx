import React from 'react';
import { logger } from '@/lib/utils/logger';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConsentSwipeContainer } from '@/components/photo-consent/ConsentSwipeContainer';
import {
  SwipeablePhotoConsent,
  ConsentStatus,
  UsageScope,
} from '@/types/photo-consent';
import {
  updateConsentStatus,
  refreshConsentRequests,
} from '@/app/actions/photo-consent';

// データベースレスポンス型定義
interface DatabaseConsentRequest {
  id: string;
  photographer_id: string;
  model_id: string;
  photo_session_id?: string;
  photo_url: string;
  photo_filename: string;
  photo_hash: string;
  photo_metadata?: Record<string, unknown>;
  consent_status: string;
  usage_scope?: string[];
  usage_notes?: string;
  request_message?: string;
  response_message?: string;
  consent_given_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  gdpr_consent?: boolean;
  data_retention_agreed?: boolean;
  photographer?: {
    display_name: string;
    avatar_url?: string;
  };
  photo_session?: {
    title: string;
    location: string;
    start_date: string;
  };
}

export const metadata: Metadata = {
  title: '写真公開合意管理 | ShutterHub',
  description: 'Tinder風の直感的なUIで写真の公開合意を効率的に管理',
};

interface PhotoConsentPageProps {
  searchParams: Promise<{ view?: string }>;
}

async function getConsentRequests(): Promise<SwipeablePhotoConsent[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // モデルとして受信した合意リクエストを取得
  const { data: requests, error } = await supabase
    .from('photo_consent_requests')
    .select(
      `
      *,
      photographer:photographer_id (
        display_name,
        avatar_url
      ),
      photo_session:photo_session_id (
        title,
        location,
        start_date
      )
    `
    )
    .eq('model_id', user.id)
    .eq('consent_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching consent requests:', error);
    return [];
  }

  return (
    (requests as DatabaseConsentRequest[])?.map(request => ({
      id: request.id,
      photographerId: request.photographer_id,
      modelId: request.model_id,
      photoSessionId: request.photo_session_id,
      photoUrl: request.photo_url,
      photoFilename: request.photo_filename,
      photoHash: request.photo_hash,
      photoMetadata: request.photo_metadata,
      consentStatus: request.consent_status as ConsentStatus,
      usageScope: (request.usage_scope || []) as UsageScope[],
      usageNotes: request.usage_notes,
      requestMessage: request.request_message,
      responseMessage: request.response_message,
      consentGivenAt: request.consent_given_at
        ? new Date(request.consent_given_at)
        : undefined,
      expiresAt: request.expires_at ? new Date(request.expires_at) : undefined,
      createdAt: new Date(request.created_at),
      updatedAt: new Date(request.updated_at),

      // GDPR対応（デフォルト値）
      gdprConsent: request.gdpr_consent || true,
      dataRetentionAgreed: request.data_retention_agreed || true,

      // リレーションデータ
      photographer: {
        id: request.photographer_id,
        displayName: request.photographer?.display_name || '不明',
        avatarUrl: request.photographer?.avatar_url,
      },
      photoSession: request.photo_session
        ? {
            id: request.photo_session_id || '',
            title: request.photo_session.title,
            location: request.photo_session.location,
            date: new Date(request.photo_session.start_date),
          }
        : undefined,
    })) || []
  );
}

export default async function PhotoConsentPage({
  searchParams,
}: PhotoConsentPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const consents = await getConsentRequests();
  const resolvedSearchParams = await searchParams;
  const showBatchMode = resolvedSearchParams.view === 'batch';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                写真公開合意管理
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Tinder風スワイプで効率的に合意管理
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {consents.length > 0
                  ? `${consents.length}件の確認待ち`
                  : '新しい合意リクエストはありません'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ConsentSwipeContainer
          consents={consents}
          onConsentUpdate={async (consentId, status, message) => {
            const result = await updateConsentStatus(
              consentId,
              status,
              message
            );
            if (!result.success) {
              logger.error('Failed to update consent:', result.error);
            }
          }}
          onRefresh={async () => {
            const result = await refreshConsentRequests();
            if (!result.success) {
              logger.error('Failed to refresh:', result.error);
            }
          }}
          showBatchMode={showBatchMode}
        />
      </div>

      {/* フッター情報 */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>右スワイプ: 承認</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>左スワイプ: 拒否</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span>上スワイプ: 要相談</span>
              </div>
            </div>
            <p className="mt-3 text-xs">
              ※ すべての合意は法的証跡として記録され、GDPR準拠の下で管理されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
