'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Camera, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserType } from '@/app/actions/onboarding';

type UserType = 'model' | 'photographer' | 'organizer';

export default function OnboardingPage() {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'ja';
  const t = useTranslations('auth.onboarding');

  const handleContinue = async () => {
    if (!selectedType) {
      toast.error(t('title'), {
        description: 'ユーザータイプを選択してください',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateUserType(selectedType);

      if (result.success) {
        toast.success('アカウント設定が完了しました');
        router.push(`/${locale}/dashboard`);
      } else {
        toast.error('エラー', {
          description: result.error || 'ユーザータイプの設定に失敗しました',
        });
      }
    } catch {
      toast.error('エラー', {
        description: '予期しないエラーが発生しました',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push(`/${locale}/dashboard`);
  };

  const userTypes: Array<{
    type: UserType;
    icon: React.ReactNode;
    titleKey: string;
    descriptionKey: string;
  }> = [
    {
      type: 'model',
      icon: <User className="h-8 w-8" />,
      titleKey: 'model.title',
      descriptionKey: 'model.description',
    },
    {
      type: 'photographer',
      icon: <Camera className="h-8 w-8" />,
      titleKey: 'photographer.title',
      descriptionKey: 'photographer.description',
    },
    {
      type: 'organizer',
      icon: <Building2 className="h-8 w-8" />,
      titleKey: 'organizer.title',
      descriptionKey: 'organizer.description',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('title')}</CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userTypes.map(({ type, icon, titleKey, descriptionKey }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`
                    p-6 rounded-lg border-2 transition-all text-left
                    ${
                      selectedType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div
                      className={`
                        p-3 rounded-full
                        ${
                          selectedType === type
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }
                      `}
                    >
                      {icon}
                    </div>
                    <h3 className="font-semibold text-lg">{t(titleKey)}</h3>
                    <p className="text-sm text-gray-600 text-center">
                      {t(descriptionKey)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleContinue}
                disabled={!selectedType || isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? '処理中...' : t('continue')}
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isLoading}
              >
                {t('skip')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
