'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Shield,
  Flag,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

// スパム検出機能
const detectSpam = (
  content: string
): { isSpam: boolean; confidence: number; reasons: string[] } => {
  const reasons: string[] = [];
  let spamScore = 0;

  // 基本的なスパム検出ルール
  if (content.length < 3) {
    spamScore += 30;
    reasons.push('短すぎるメッセージ');
  }

  // 連続する同じ文字
  const repeatedChars = /(.)\1{4,}/g;
  if (repeatedChars.test(content)) {
    spamScore += 20;
    reasons.push('連続する同じ文字');
  }

  // 過度な絵文字・記号
  const symbolCount = (
    content.match(/[!@#$%^&*()_+={}\[\]|\\:";'<>?,.\/~`]/g) || []
  ).length;
  if (symbolCount > content.length * 0.3) {
    spamScore += 25;
    reasons.push('過度な記号使用');
  }

  // URL の過度な使用
  const urlCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
  if (urlCount > 2) {
    spamScore += 30;
    reasons.push('複数URL');
  }

  // 大文字の過度な使用
  const upperCaseCount = (content.match(/[A-Z]/g) || []).length;
  if (upperCaseCount > content.length * 0.5 && content.length > 10) {
    spamScore += 15;
    reasons.push('過度な大文字使用');
  }

  return {
    isSpam: spamScore >= 50,
    confidence: Math.min(spamScore, 100),
    reasons,
  };
};

// 不適切コンテンツ検出
const detectInappropriate = (
  content: string
): { isInappropriate: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // 基本的な不適切語句パターン（実際の実装では外部データベースやAPIを使用）
  const inappropriatePatterns = [/暴力/i, /脅迫/i, /詐欺/i, /迷惑/i];

  let hasInappropriate = false;

  inappropriatePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      hasInappropriate = true;
      reasons.push('不適切な表現が含まれています');
    }
  });

  return {
    isInappropriate: hasInappropriate,
    reasons,
  };
};

interface MessageModerationProps {
  message: {
    id: string;
    content: string;
    senderId: string;
    conversationId: string;
    createdAt: string;
  };
  onReport?: (messageId: string, reason: string, details: string) => void;
  onBlock?: (userId: string) => void;
  onHide?: (messageId: string) => void;
  showReportButton?: boolean;
  showModerationInfo?: boolean;
}

export function MessageModeration({
  message,
  onReport,
  onBlock,
  onHide,
  showReportButton = true,
  showModerationInfo = false,
}: MessageModerationProps) {
  const t = useTranslations('moderation');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [moderationResult, setModerationResult] = useState<{
    spam: ReturnType<typeof detectSpam>;
    inappropriate: ReturnType<typeof detectInappropriate>;
  } | null>(null);

  // メッセージの自動審査
  useEffect(() => {
    const spam = detectSpam(message.content);
    const inappropriate = detectInappropriate(message.content);

    setModerationResult({ spam, inappropriate });

    // 自動隠匿処理
    if (spam.isSpam && spam.confidence > 80) {
      setIsHidden(true);
      console.log('Auto-hidden spam message:', message.id);
    }

    if (inappropriate.isInappropriate) {
      setIsHidden(true);
      console.log('Auto-hidden inappropriate message:', message.id);
    }
  }, [message.content, message.id]);

  // 報告処理
  const handleReport = async () => {
    if (!reportReason) {
      toast.error(t('report.selectReason'));
      return;
    }

    try {
      await onReport?.(message.id, reportReason, reportDetails);
      toast.success(t('report.success'));
      setIsReportDialogOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (error) {
      console.error('Report error:', error);
      toast.error(t('report.error'));
    }
  };

  // ブロック処理
  const handleBlock = async () => {
    try {
      await onBlock?.(message.senderId);
      toast.success(t('block.success'));
    } catch (error) {
      console.error('Block error:', error);
      toast.error(t('block.error'));
    }
  };

  // メッセージ非表示処理
  const handleHide = async () => {
    try {
      await onHide?.(message.id);
      setIsHidden(true);
      toast.success(t('hide.success'));
    } catch (error) {
      console.error('Hide error:', error);
      toast.error(t('hide.error'));
    }
  };

  return (
    <div className="relative">
      {/* モデレーション情報表示（管理者用） */}
      {showModerationInfo && moderationResult && (
        <div className="mb-2 space-y-1">
          {/* スパム検出結果 */}
          {moderationResult.spam.confidence > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Shield className="h-3 w-3" />
              <span>スパム確率: {moderationResult.spam.confidence}%</span>
              {moderationResult.spam.isSpam && (
                <Badge variant="destructive" className="text-xs">
                  スパム
                </Badge>
              )}
            </div>
          )}

          {/* 不適切コンテンツ検出結果 */}
          {moderationResult.inappropriate.isInappropriate && (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-red-500">
                不適切なコンテンツが検出されました
              </span>
              <Badge variant="destructive" className="text-xs">
                要注意
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* 隠匿されたメッセージ */}
      {isHidden ? (
        <Card className="border-dashed border-gray-300 bg-gray-50 dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4" />
                <span>{t('message.hidden')}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHidden(false)}
              >
                <Eye className="h-4 w-4" />
                {t('message.show')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 通常のメッセージ表示 */}
          <div className="message-content">{message.content}</div>

          {/* 報告・ブロックボタン */}
          {showReportButton && (
            <div className="flex gap-1 mt-2">
              {/* 報告ダイアログ */}
              <Dialog
                open={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    {t('report.button')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('report.title')}</DialogTitle>
                    <DialogDescription>
                      {t('report.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* 報告理由選択 */}
                    <div>
                      <label className="text-sm font-medium">
                        {t('report.reason')}
                      </label>
                      <Select
                        value={reportReason}
                        onValueChange={setReportReason}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('report.selectReason')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spam">
                            {t('report.reasons.spam')}
                          </SelectItem>
                          <SelectItem value="inappropriate">
                            {t('report.reasons.inappropriate')}
                          </SelectItem>
                          <SelectItem value="harassment">
                            {t('report.reasons.harassment')}
                          </SelectItem>
                          <SelectItem value="scam">
                            {t('report.reasons.scam')}
                          </SelectItem>
                          <SelectItem value="other">
                            {t('report.reasons.other')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 詳細説明 */}
                    <div>
                      <label className="text-sm font-medium">
                        {t('report.details')}
                      </label>
                      <Textarea
                        placeholder={t('report.detailsPlaceholder')}
                        value={reportDetails}
                        onChange={e => setReportDetails(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* ボタン */}
                    <div className="flex gap-2">
                      <Button onClick={handleReport} className="flex-1">
                        <Flag className="h-4 w-4 mr-2" />
                        {t('report.submit')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsReportDialogOpen(false)}
                        className="flex-1"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* ブロックボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleBlock}
              >
                <Ban className="h-3 w-3 mr-1" />
                {t('block.button')}
              </Button>

              {/* 非表示ボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleHide}
              >
                <EyeOff className="h-3 w-3 mr-1" />
                {t('hide.button')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 管理者用モデレーションダッシュボード
export function ModerationDashboard() {
  const t = useTranslations('moderation');
  const [filter, setFilter] = useState('all');
  // Note: reports state is prepared for future implementation
  // const [reports, setReports] = useState([]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('dashboard.title')}
          </CardTitle>
          <CardDescription>{t('dashboard.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.stats.pendingReports')}
                    </p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.stats.resolvedToday')}
                    </p>
                    <p className="text-2xl font-bold">8</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.stats.blockedUsers')}
                    </p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.stats.avgResponseTime')}
                    </p>
                    <p className="text-2xl font-bold">2.4h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* フィルター */}
          <div className="mb-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('dashboard.filters.all')}
                </SelectItem>
                <SelectItem value="pending">
                  {t('dashboard.filters.pending')}
                </SelectItem>
                <SelectItem value="resolved">
                  {t('dashboard.filters.resolved')}
                </SelectItem>
                <SelectItem value="spam">
                  {t('dashboard.filters.spam')}
                </SelectItem>
                <SelectItem value="inappropriate">
                  {t('dashboard.filters.inappropriate')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 報告一覧 */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noReports')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
