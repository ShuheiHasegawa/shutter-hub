/**
 * データエクスポートボタン
 * GDPR Article 20対応 - 即座データダウンロード
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Loader2,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { exportUserData } from '@/app/actions/legal-documents';
import { toast } from '@/hooks/use-toast';
import { UserDataExport } from '@/types/legal-documents';

interface DataExportButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function DataExportButton({
  variant = 'default',
  size = 'default',
  className,
}: DataExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportData, setExportData] = useState<UserDataExport | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportData(null);
    setExportError(null);

    try {
      // プログレスバーのアニメーション
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await exportUserData();

      clearInterval(progressInterval);
      setExportProgress(100);

      if (result.success && result.data) {
        setExportData(result.data);
        toast({
          title: 'エクスポート完了',
          description: 'データの準備が完了しました。',
        });
      } else {
        setExportError(result.error || 'データエクスポートに失敗しました');
        toast({
          title: 'エクスポートエラー',
          description: result.error || 'データエクスポートに失敗しました',
          variant: 'destructive',
        });
      }
    } catch {
      setExportError('予期しないエラーが発生しました');
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadAsJson = () => {
    if (!exportData) return;

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shutterhub-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'ダウンロード開始',
      description: 'データファイルのダウンロードを開始しました。',
    });
  };

  const copyToClipboard = async () => {
    if (!exportData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast({
        title: 'クリップボードにコピー',
        description: 'データがクリップボードにコピーされました。',
      });
    } catch {
      toast({
        title: 'コピー失敗',
        description: 'クリップボードへのコピーに失敗しました。',
        variant: 'destructive',
      });
    }
  };

  const resetExport = () => {
    setExportData(null);
    setExportError(null);
    setExportProgress(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Download className="w-4 h-4 mr-2" />
          データエクスポート
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            個人データのエクスポート
          </DialogTitle>
          <DialogDescription>
            GDPR第20条（データポータビリティ権）に基づき、
            あなたの個人データを構造化された形式でダウンロードできます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* エクスポート情報 */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>含まれるデータ:</strong>{' '}
              プロフィール情報、撮影会参加履歴、
              メッセージ履歴、同意履歴、設定情報など。
              機密性の高い情報（パスワード、決済情報など）は含まれません。
            </AlertDescription>
          </Alert>

          {/* エクスポート処理中 */}
          {isExporting && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">
                  データを準備しています...
                </span>
              </div>
              <Progress value={exportProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                データ量によって数秒から数分かかる場合があります
              </p>
            </div>
          )}

          {/* エクスポートエラー */}
          {exportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}

          {/* エクスポート完了 */}
          {exportData && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  データの準備が完了しました。下記のボタンからダウンロードできます。
                </AlertDescription>
              </Alert>

              {/* データサマリー */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">エクスポート日時</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(
                      exportData.export_metadata.exported_at
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">データカテゴリ</p>
                  <p className="text-xs text-muted-foreground">
                    {exportData.export_metadata.data_categories.join('、')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">アクティビティ</p>
                  <p className="text-xs text-muted-foreground">
                    予約: {exportData.activity_data.bookings?.length || 0}件、
                    メッセージ: {exportData.activity_data.messages?.length || 0}
                    件
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">同意履歴</p>
                  <p className="text-xs text-muted-foreground">
                    {exportData.consent_history.length}件の同意記録
                  </p>
                </div>
              </div>

              {/* ダウンロードボタン */}
              <div className="flex gap-2">
                <Button onClick={downloadAsJson} className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  JSONファイルをダウンロード
                </Button>
                <Button variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  コピー
                </Button>
              </div>

              {/* データ保持に関する情報 */}
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  <strong>データ保持期間:</strong>
                  <ul className="mt-2 text-xs space-y-1">
                    {Object.entries(
                      exportData.export_metadata.retention_info
                    ).map(([category, retention]) => (
                      <li key={category}>
                        • {category}: {retention}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-between pt-4 border-t">
            {exportData ? (
              <Button variant="outline" onClick={resetExport}>
                新しいエクスポート
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    データエクスポートを開始
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="ml-2"
            >
              閉じる
            </Button>
          </div>

          {/* 注意事項 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• このエクスポートは基本的な個人データのみを含みます</p>
            <p>
              • より詳細なデータが必要な場合は、正式なGDPR要求を提出してください
            </p>
            <p>
              •
              エクスポートされたデータは安全に管理し、第三者と共有しないでください
            </p>
            <p>• データに誤りがある場合は、データ訂正要求をご利用ください</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
