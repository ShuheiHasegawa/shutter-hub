import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

interface AuthCodeErrorPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
}

export default async function AuthCodeErrorPage({
  params,
  searchParams,
}: AuthCodeErrorPageProps) {
  const { locale } = await params;
  const { error_code, error_description } = await searchParams;

  // X（Twitter）のメールアドレス取得エラーの場合の特別なメッセージ
  const isEmailError =
    error_code === 'unexpected_failure' && error_description?.includes('email');

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
            {isEmailError ? (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm font-medium text-yellow-800">
                    X（Twitter）からのメールアドレス取得に失敗しました
                  </p>
                  <p className="mt-2 text-sm text-yellow-700">
                    X Developer
                    Portalの設定で、メールアドレス取得の権限が有効になっているか確認してください。
                  </p>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">確認手順：</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    <li>X Developer Portalにログイン</li>
                    <li>
                      アプリの「Settings」→「User authentication
                      settings」を開く
                    </li>
                    <li>
                      「App permissions」で「Read and
                      write」または「Read」を選択
                    </li>
                    <li>
                      「Read email address」の権限が有効になっているか確認
                    </li>
                    <li>設定を保存して再度お試しください</li>
                  </ol>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  以下の原因が考えられます：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>認証がキャンセルされました</li>
                  <li>一時的なネットワークエラーが発生しました</li>
                  <li>認証コードの有効期限が切れました</li>
                </ul>
                {error_description && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs font-mono text-gray-600 break-words">
                      {decodeURIComponent(error_description)}
                    </p>
                  </div>
                )}
              </>
            )}

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
