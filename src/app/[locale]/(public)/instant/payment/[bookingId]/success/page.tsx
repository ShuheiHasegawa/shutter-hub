'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Clock,
  Shield,
  Camera,
  MessageCircle,
  Home,
  FileImage,
} from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment');
  const [countdown, setCountdown] = useState(72);

  useEffect(() => {
    // 72時間のカウントダウン表示（デモ用）
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 0.001 : 0));
    }, 36);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="container mx-auto px-4 max-w-2xl py-8">
        {/* 成功アイコン */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-success/10 dark:bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">決済が完了しました！</h1>
          <p className="text-muted-foreground">
            エスクロー決済が正常に処理されました
          </p>
        </div>

        {/* 決済詳細 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              エスクロー保護が有効です
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-success/30 bg-success/5 dark:border-success/30 dark:bg-success/20">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                お支払いは安全に預託されています。写真を受け取り次第、決済が確定します。
              </AlertDescription>
            </Alert>

            {paymentId && (
              <div className="text-sm text-muted-foreground">
                決済ID:{' '}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {paymentId}
                </code>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">自動確認まで</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {countdown.toFixed(0)} 時間
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                72時間以内に写真が配信され、問題がなければ自動的に決済が確定します。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 次のステップ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>次のステップ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Badge className="w-6 h-6 flex items-center justify-center p-0">
                  1
                </Badge>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  撮影開始
                </h4>
                <p className="text-sm text-muted-foreground">
                  カメラマンが撮影を開始します。リラックスして撮影をお楽しみください。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Badge className="w-6 h-6 flex items-center justify-center p-0">
                  2
                </Badge>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  写真配信
                </h4>
                <p className="text-sm text-muted-foreground">
                  撮影完了後、24時間以内に写真が配信されます。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Badge className="w-6 h-6 flex items-center justify-center p-0">
                  3
                </Badge>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  受取確認
                </h4>
                <p className="text-sm text-muted-foreground">
                  写真を確認したら、受取確認ボタンを押してください。問題がある場合は争議申請が可能です。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* サポート情報 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              お困りですか？
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              ご質問やお困りの点がございましたら、お気軽にお問い合わせください。
            </p>
            <div className="space-y-1 text-sm">
              <p>📧 support@shutterhub.jp</p>
              <p>📞 03-1234-5678（平日 9:00-18:00）</p>
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1">
            <Link href="/">
              <Home className="h-4 w-4" />
              トップページへ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
