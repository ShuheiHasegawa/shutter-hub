'use client';

import { OrganizerModelsCommon } from './OrganizerModelsCommon';
import type { OrganizerModelWithProfile } from '@/types/organizer-model';

interface OrganizerModelsProfileViewProps {
  models: OrganizerModelWithProfile[];
  isLoading?: boolean;
  showContactButton?: boolean; // 他のユーザーのプロフィールを見る場合
  isOwnProfile?: boolean; // 自分のプロフィールかどうか
}

/**
 * プロフィールページ用のシンプルなモデル一覧表示
 * 管理機能なし、表示のみに特化
 */
export function OrganizerModelsProfileView({
  models,
  isLoading = false,
  showContactButton = false,
  isOwnProfile = false,
}: OrganizerModelsProfileViewProps) {
  return (
    <OrganizerModelsCommon
      models={models}
      isLoading={isLoading}
      showContactButton={showContactButton}
      showStatistics={true}
      variant="profile"
      isOwnProfile={isOwnProfile}
    />
  );
}
