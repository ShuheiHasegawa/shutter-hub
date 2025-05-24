import Link from 'next/link';
import { Camera } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* ブランド */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-shutter-primary" />
              <span className="font-bold text-xl">ShutterHub</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              撮影業界をつなぐ統合型プラットフォーム
            </p>
          </div>

          {/* サービス */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">サービス</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/photo-sessions"
                  className="text-muted-foreground hover:text-foreground"
                >
                  撮影会を探す
                </Link>
              </li>
              <li>
                <Link
                  href="/photo-sessions/create"
                  className="text-muted-foreground hover:text-foreground"
                >
                  撮影会を開催
                </Link>
              </li>
              <li>
                <Link
                  href="/instant"
                  className="text-muted-foreground hover:text-foreground"
                >
                  即座撮影リクエスト
                </Link>
              </li>
              <li>
                <Link
                  href="/studios"
                  className="text-muted-foreground hover:text-foreground"
                >
                  スタジオWiki
                </Link>
              </li>
            </ul>
          </div>

          {/* サポート */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">サポート</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground hover:text-foreground"
                >
                  ヘルプセンター
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground"
                >
                  お問い合わせ
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-foreground"
                >
                  よくある質問
                </Link>
              </li>
            </ul>
          </div>

          {/* 法的情報 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">法的情報</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  利用規約
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cookie ポリシー
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 ShutterHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
