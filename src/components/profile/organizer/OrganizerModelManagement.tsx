'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { ModelInvitationForm } from './ModelInvitationForm';
import { OrganizerModelsList } from './OrganizerModelsList';
import { PendingInvitationsList } from './PendingInvitationsList';
import {
  getOrganizerModelsAction,
  getOrganizerInvitationsAction,
} from '@/app/actions/organizer-model';
import type {
  OrganizerModelWithProfile,
  OrganizerModelInvitationWithProfiles,
} from '@/types/organizer-model';
import { RefreshCw, Users, Mail } from 'lucide-react';

export function OrganizerModelManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'models' | 'invitations' | 'invite'
  >('models');

  // データ状態
  const [models, setModels] = useState<OrganizerModelWithProfile[]>([]);
  const [invitations, setInvitations] = useState<
    OrganizerModelInvitationWithProfiles[]
  >([]);

  // データ読み込み
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modelsResult, invitationsResult] = await Promise.all([
        getOrganizerModelsAction(),
        getOrganizerInvitationsAction(),
      ]);

      if (modelsResult.success && Array.isArray(modelsResult.data)) {
        setModels(modelsResult.data);
      } else {
        logger.error('所属モデル取得エラー:', modelsResult.error);
        // テーブル未存在の場合でも空配列で継続
        setModels([]);
      }

      if (invitationsResult.success && Array.isArray(invitationsResult.data)) {
        setInvitations(invitationsResult.data);
      } else {
        logger.error('招待一覧取得エラー:', invitationsResult.error);
        // テーブル未存在の場合でも空配列で継続
        setInvitations([]);
      }
    } catch (error) {
      logger.error('データ読み込みエラー:', error);
      toast({
        title: 'エラー',
        description: 'データの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 招待成功時のコールバック
  const handleInvitationSent = () => {
    loadData(); // データを再読み込み
    setActiveTab('invitations'); // 招待一覧タブに切り替え
    toast({
      title: '成功',
      description: 'モデルに招待を送信しました',
    });
  };

  // モデル削除成功時のコールバック
  const handleModelRemoved = () => {
    loadData(); // データを再読み込み
    toast({
      title: '成功',
      description: '所属関係を削除しました',
    });
  };

  // 保留中の招待数
  const pendingInvitationsCount = invitations.filter(
    inv => inv.status === 'pending'
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              所属モデル管理
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 概要統計 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    所属モデル
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {models.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    保留中招待
                  </p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {pendingInvitationsCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    総招待数
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {invitations.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('models')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'models'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                所属モデル ({models.length})
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                送信済み招待 ({invitations.length})
              </button>
              <button
                onClick={() => setActiveTab('invite')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invite'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                新規招待
              </button>
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="mt-6">
            {activeTab === 'models' && (
              <OrganizerModelsList
                models={models}
                onModelRemoved={handleModelRemoved}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'invitations' && (
              <PendingInvitationsList
                invitations={invitations}
                onDataChanged={loadData}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'invite' && (
              <ModelInvitationForm onInvitationSent={handleInvitationSent} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
