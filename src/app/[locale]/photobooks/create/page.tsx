import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Photobook from '@/components/photobook/Photobook';
import { samplePhotobook } from '@/constants/samplePhotobookData';
import { getUserSubscriptionPlan } from '@/app/actions/subscription';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'フォトブック作成 | ShutterHub',
  description: 'あなたの写真を美しいフォトブックに編集しましょう',
};

async function checkUserPermissions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ユーザーのサブスクリプション情報取得
  const subscriptionPlan = await getUserSubscriptionPlan(user.id);
  const userPlan = subscriptionPlan?.subscription_plan || 'free';

  // 現在のフォトブック数を確認
  const { data: photobooks, error } = await supabase
    .from('photobooks')
    .select('id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching photobooks:', error);
  }

  const photobookCount = photobooks?.length || 0;
  const maxAllowed = userPlan === 'admin' ? -1 : userPlan === 'premium' ? 5 : 1;
  const canCreate = maxAllowed === -1 || photobookCount < maxAllowed;

  return {
    user,
    userPlan,
    photobookCount,
    maxAllowed,
    canCreate,
  };
}

export default async function PhotobookCreatePage() {
  const permissions = await checkUserPermissions();

  if (!permissions) {
    redirect('/auth/signin');
  }

  if (!permissions.canCreate) {
    redirect('/photobooks?error=limit-exceeded');
  }

  // 新しいフォトブック用のテンプレートデータを作成
  const newPhotobook = {
    ...samplePhotobook,
    id: 'new-photobook',
    title: '新しいフォトブック',
    description: '',
    userId: permissions.user.id,
    spreads: [], // 空のスプレッドから開始
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                aria-label="フォトブック一覧に戻る"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  フォトブック作成
                </h1>
                <p className="text-sm text-gray-600">
                  写真を配置して、あなただけのフォトブックを作成しましょう
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  permissions.userPlan === 'premium'
                    ? 'bg-purple-100 text-purple-800'
                    : permissions.userPlan === 'admin'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {permissions.userPlan === 'premium'
                  ? 'PREMIUM'
                  : permissions.userPlan === 'admin'
                    ? 'ADMIN'
                    : 'FREE'}
              </span>

              <div className="text-xs text-gray-500">
                {permissions.maxAllowed === -1
                  ? `${permissions.photobookCount}冊作成済み`
                  : `${permissions.photobookCount}/${permissions.maxAllowed}冊`}
              </div>

              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* プラン制限の表示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">
                {permissions.userPlan === 'free'
                  ? 'フリープラン'
                  : permissions.userPlan === 'premium'
                    ? 'プレミアムプラン'
                    : '管理者プラン'}
              </h3>
              <p className="text-sm text-blue-700">
                {permissions.userPlan === 'free'
                  ? '最大10ページ・50枚の写真まで作成可能'
                  : permissions.userPlan === 'premium'
                    ? '最大50ページ・500枚の写真 + プレミアムテンプレート利用可能'
                    : '無制限でフォトブックを作成可能'}
              </p>
            </div>

            {permissions.userPlan === 'free' && (
              <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                プレミアムにアップグレード
              </button>
            )}
          </div>
        </div>

        {/* フォトブック編集コンポーネント */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Photobook
            photobook={newPhotobook}
            isEditable={true}
            onPhotoClick={photo => console.log('Photo clicked:', photo)}
          />
        </div>

        {/* フッター情報 */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>自動保存有効</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>ドラッグ&ドロップで写真配置</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>レイアウトテンプレート選択可能</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
