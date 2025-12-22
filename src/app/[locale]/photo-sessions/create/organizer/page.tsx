'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionTypeSelector } from '@/components/photo-sessions/SessionTypeSelector';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useProfile } from '@/hooks/useSimpleProfile';
import type { PhotoSessionType } from '@/types/photo-session';

export default function OrganizerCreatePhotoSessionPage() {
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

  const handleSelect = (type: PhotoSessionType) => {
    if (type === 'individual') {
      router.push('/photo-sessions/create');
    } else {
      router.push('/photo-sessions/create/joint');
    }
  };

  return (
    <AuthenticatedLayout>
      <SessionTypeSelector onSelect={handleSelect} />
    </AuthenticatedLayout>
  );
}
