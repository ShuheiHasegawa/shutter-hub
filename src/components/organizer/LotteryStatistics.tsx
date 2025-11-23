'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLotteryStatistics } from '@/app/actions/multi-slot-lottery';
import type { LotteryStatistics as LotteryStatisticsType } from '@/types/multi-slot-lottery';
import {
  Users,
  Calendar,
  User,
  Camera,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface LotteryStatisticsProps {
  lotterySessionId: string;
}

export function LotteryStatistics({
  lotterySessionId,
}: LotteryStatisticsProps) {
  const [statistics, setStatistics] = useState<LotteryStatisticsType | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatistics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getLotteryStatistics(lotterySessionId);
        if (result.success && result.data) {
          setStatistics(result.data);
        } else {
          setError(result.error || '統計の取得に失敗しました');
        }
      } catch {
        setError('統計の取得中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatistics();
  }, [lotterySessionId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              総エントリー数
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total_entries}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.total_groups}グループ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">チェキ合計</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.cheki_summary.total_unsigned +
                statistics.cheki_summary.total_signed}
              枚
            </div>
            <p className="text-xs text-muted-foreground">
              サインなし: {statistics.cheki_summary.total_unsigned}枚 /
              サインあり: {statistics.cheki_summary.total_signed}枚
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              キャンセルポリシー
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.cancellation_policy_distribution.all_or_nothing +
                statistics.cancellation_policy_distribution.partial_ok}
            </div>
            <p className="text-xs text-muted-foreground">
              全当選のみ:{' '}
              {statistics.cancellation_policy_distribution.all_or_nothing} /
              部分可: {statistics.cancellation_policy_distribution.partial_ok}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* スロット別エントリー数 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            スロット別エントリー数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.entries_by_slot.map(slot => (
              <div
                key={slot.slot_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">スロット{slot.slot_number}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {slot.entry_count}件のエントリー
                  </span>
                </div>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        statistics.total_entries > 0
                          ? (slot.entry_count / statistics.total_entries) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 推しモデル人気度 */}
      {statistics.model_popularity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              推しモデル人気度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.model_popularity
                .sort((a, b) => b.selection_count - a.selection_count)
                .map(model => (
                  <div
                    key={model.model_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{model.model_name}</span>
                      <Badge variant="secondary">
                        {model.selection_count}回選択
                      </Badge>
                    </div>
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            statistics.total_entries > 0
                              ? (model.selection_count /
                                  statistics.total_entries) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* チェキ準備枚数詳細 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            チェキ準備枚数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                サインなし
              </div>
              <div className="text-2xl font-bold">
                {statistics.cheki_summary.total_unsigned}枚
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                サインあり
              </div>
              <div className="text-2xl font-bold">
                {statistics.cheki_summary.total_signed}枚
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">合計</div>
            <div className="text-2xl font-bold">
              {statistics.cheki_summary.total_unsigned +
                statistics.cheki_summary.total_signed}
              枚
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
