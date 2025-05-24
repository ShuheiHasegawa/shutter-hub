import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default async function AuthCodeErrorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            認証エラー
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            認証プロセス中にエラーが発生しました。
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <p className="text-sm text-gray-700">以下の原因が考えられます：</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>認証がキャンセルされました</li>
              <li>一時的なネットワークエラーが発生しました</li>
              <li>認証コードの有効期限が切れました</li>
            </ul>

            <div className="pt-4">
              <Link
                href={`/${locale}/auth/signin`}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                再度ログインを試す
              </Link>
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
