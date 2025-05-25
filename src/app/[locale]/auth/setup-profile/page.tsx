'use client';

import { ProfileForm } from '@/components/profile/ProfileForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';

export default function SetupProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';

  const handleSuccess = () => {
    router.push(`/${locale}/dashboard`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>認証が必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
