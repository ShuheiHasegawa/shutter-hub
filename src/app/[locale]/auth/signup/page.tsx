import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { EmailSignUpForm } from '@/components/auth/EmailSignUpForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default async function SignUpPage({
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
            ShutterHub
          </h2>
          <p className="mt-2 text-gray-600">撮影会予約プラットフォーム</p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-6">
                アカウントを作成
              </h3>

              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">メール登録</TabsTrigger>
                  <TabsTrigger value="google">Google登録</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4 mt-6">
                  <EmailSignUpForm />
                </TabsContent>

                <TabsContent value="google" className="space-y-4 mt-6">
                  <GoogleSignInButton />
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Googleでサインインすると自動的にアカウントが作成されます
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                既にアカウントをお持ちですか？{' '}
                <Link
                  href={`/${locale}/auth/signin`}
                  className="text-blue-600 hover:text-blue-500"
                >
                  サインイン
                </Link>
              </p>
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
