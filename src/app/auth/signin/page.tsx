import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            ShutterHub v2
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            撮影会予約プラットフォーム
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                アカウントにサインイン
              </h3>

              <GoogleSignInButton />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                アカウントをお持ちでない場合は、
                <br />
                Googleでサインインすると自動的に作成されます
              </p>
            </div>

            <div className="text-center">
              <Link
                href="/"
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
