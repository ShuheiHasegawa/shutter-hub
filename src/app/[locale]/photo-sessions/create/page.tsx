'use client';

import { useState, useEffect } from 'react';
import { PhotoSessionForm } from '@/components/photo-sessions/PhotoSessionForm';
import { JointSessionForm } from '@/components/photo-sessions/JointSessionForm';
import { SessionTypeSelector } from '@/components/photo-sessions/SessionTypeSelector';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useProfile } from '@/hooks/useSimpleProfile';
import type { PhotoSessionType } from '@/types/photo-session';

export default function CreatePhotoSessionPage() {
  const { profile, loading: profileLoading } = useProfile();
  const [selectedType, setSelectedType] = useState<PhotoSessionType | null>(
    null
  );

  // 運営タイプ以外のユーザーは自動的に個別撮影会に設定
  useEffect(() => {
    if (!profileLoading && profile) {
      if (profile.user_type !== 'organizer') {
        setSelectedType('individual');
      }
    }
  }, [profile, profileLoading]);

  // プロフィール読み込み中
  if (profileLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">読み込み中...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // 運営タイプ以外のユーザーは選択画面をスキップ
  if (profile && profile.user_type !== 'organizer') {
    return (
      <AuthenticatedLayout>
        <PhotoSessionForm />
      </AuthenticatedLayout>
    );
  }

  // 運営タイプのユーザーは選択画面を表示
  if (!selectedType) {
    return (
      <AuthenticatedLayout>
        <SessionTypeSelector onSelect={setSelectedType} />
      </AuthenticatedLayout>
    );
  }

  const handleBack = () => {
    setSelectedType(null);
  };

  return (
    <AuthenticatedLayout>
      {selectedType === 'individual' ? (
        <PhotoSessionForm onBack={handleBack} />
      ) : (
        <JointSessionForm onBack={handleBack} />
      )}
    </AuthenticatedLayout>
  );
}
