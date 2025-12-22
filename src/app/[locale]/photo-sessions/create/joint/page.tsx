'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JointSessionForm } from '@/components/photo-sessions/JointSessionForm';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useProfile } from '@/hooks/useSimpleProfile';

export default function JointPhotoSessionPage() {
  const { profile, loading: profileLoading } = useProfile();
  const router = useRouter();

  // 運営者以外は個別撮影会作成ページにリダイレクト
  useEffect(() => {
    if (!profileLoading && profile && profile.user_type !== 'organizer') {
      router.replace('/photo-sessions/create');
    }
  }, [profile, profileLoading, router]);

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

  // 運営者以外は何も表示しない（リダイレクト中）
  if (profile && profile.user_type !== 'organizer') {
    return null;
  }

  const handleBack = () => {
    router.push('/photo-sessions/create/organizer');
  };

  return (
    <AuthenticatedLayout>
      <JointSessionForm onBack={handleBack} />
    </AuthenticatedLayout>
  );
}
