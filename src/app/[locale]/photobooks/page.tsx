import React from 'react';
import { logger } from '@/lib/utils/logger';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PhotobookDashboard } from '@/components/photobook/PhotobookDashboard';
import { getUserSubscriptionPlan } from '@/app/actions/subscription';

export const metadata: Metadata = {
  title: 'フォトブック・ポートフォリオ | ShutterHub',
  description: 'あなたの撮影作品を美しいフォトブックで整理・共有',
};

async function getUserPhotobookSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ユーザーのサブスクリプション情報取得
  const subscriptionPlan = await getUserSubscriptionPlan(user.id);

  // 料金プランに基づく制限設定
  const photobookLimits = {
    free: {
      maxPhotobooks: 1,
      maxPages: 10,
      maxPhotos: 50,
      hasPremiumTemplates: false,
    },
    premium: {
      maxPhotobooks: 5,
      maxPages: 50,
      maxPhotos: 500,
      hasPremiumTemplates: true,
    },
    admin: {
      maxPhotobooks: -1, // 無制限
      maxPages: -1,
      maxPhotos: -1,
      hasPremiumTemplates: true,
    },
  };

  const userPlan = subscriptionPlan?.subscription_plan || 'free';
  const limits =
    photobookLimits[userPlan as keyof typeof photobookLimits] ||
    photobookLimits.free;

  // 現在のフォトブック数を取得
  const { data: photobooks, error } = await supabase
    .from('photobooks')
    .select('id, title, created_at, is_published, cover_image_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching photobooks:', error);
  }

  return {
    user,
    subscriptionPlan: userPlan,
    limits,
    photobooks: photobooks || [],
    canCreateNew:
      limits.maxPhotobooks === -1 ||
      (photobooks?.length || 0) < limits.maxPhotobooks,
  };
}

export default async function PhotobooksPage() {
  const photobookData = await getUserPhotobookSettings();

  if (!photobookData) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                フォトブック・ポートフォリオ
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                撮影作品を美しいフォトブックで整理・共有しましょう
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    photobookData.subscriptionPlan === 'premium'
                      ? 'bg-purple-100 text-purple-800'
                      : photobookData.subscriptionPlan === 'admin'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {photobookData.subscriptionPlan === 'premium'
                    ? 'PREMIUM'
                    : photobookData.subscriptionPlan === 'admin'
                      ? 'ADMIN'
                      : 'FREE'}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                {photobookData.limits.maxPhotobooks === -1
                  ? `${photobookData.photobooks.length}冊作成済み`
                  : `${photobookData.photobooks.length}/${photobookData.limits.maxPhotobooks}冊`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PhotobookDashboard
          photobooks={photobookData.photobooks}
          limits={photobookData.limits}
          subscriptionPlan={photobookData.subscriptionPlan}
          canCreateNew={photobookData.canCreateNew}
        />
      </div>

      {/* フッター情報 */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>
                  フォトブック作成:{' '}
                  {photobookData.limits.maxPages === -1
                    ? '無制限'
                    : `最大${photobookData.limits.maxPages}ページ`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>
                  写真追加:{' '}
                  {photobookData.limits.maxPhotos === -1
                    ? '無制限'
                    : `最大${photobookData.limits.maxPhotos}枚`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded-full ${photobookData.limits.hasPremiumTemplates ? 'bg-purple-500' : 'bg-gray-400'}`}
                ></div>
                <span>
                  プレミアムテンプレート:{' '}
                  {photobookData.limits.hasPremiumTemplates
                    ? '利用可能'
                    : '有料プラン限定'}
                </span>
              </div>
            </div>

            {photobookData.subscriptionPlan === 'free' && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  もっと多くのフォトブックを作成したい場合は、プレミアムプランにアップグレードしてください
                </p>
                <button className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  プレミアムプランを見る
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
