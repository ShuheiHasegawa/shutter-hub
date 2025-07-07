import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import Link from 'next/link';

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            ShutterHub v2
          </h2>
          <p className="mt-2 text-gray-600">撮影会予約プラットフォーム</p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                アカウントにサインイン
              </h3>

              {/* メール＆パスワード認証フォーム */}
              <EmailPasswordForm />

              {/* 区切り線 */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">または</span>
                </div>
              </div>

              {/* OAuth認証ボタン */}
              <OAuthButtons />
            </div>

            <div className="text-center">
              <Link
                href={`/${locale}`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
