'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Star } from 'lucide-react';
import type {
  RatingTrendData,
  BaseChartProps,
} from '@/types/user-activity-stats';
import { LineChartSkeleton } from './ChartSkeleton';

interface RatingTrendChartProps extends BaseChartProps {
  data: RatingTrendData[];
}

/**
 * 評価推移の線グラフコンポーネント
 * 時系列での評価スコア変化を表示
 */
export function RatingTrendChart({
  data,
  height = 320,
  isLoading = false,
}: RatingTrendChartProps) {
  if (isLoading) {
    return <LineChartSkeleton />;
  }

  // データが空の場合の表示
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            評価推移
          </CardTitle>
          <CardDescription>時系列での評価スコア変化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Star className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                まだ評価データがありません
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 日付の表示名変換（YYYY-MM → MM月）
  const formattedData = data.map(item => ({
    ...item,
    monthLabel: `${item.date.split('-')[1]}月`,
    ratingNum: Number(item.rating),
  }));

  // カスタムツールチップ
  const CustomTooltip = ({
    active,
    payload,
    _label,
  }: {
    active?: boolean;
    payload?: unknown[];
    _label?: unknown;
  }) => {
    if (active && payload && payload.length) {
      const monthData = (
        payload[0] as {
          payload: { date: string; rating: string; count: number };
        }
      ).payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${monthData.date}`}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">
                評価: {Number(monthData.rating).toFixed(1)}点
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              セッション数: {monthData.count}回
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 平均評価の計算
  const averageRating =
    data.reduce((sum, item) => sum + Number(item.rating), 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          評価推移
        </CardTitle>
        <CardDescription>
          時系列での評価スコア変化（平均: {averageRating.toFixed(1)}点）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthLabel"
                className="text-sm fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 5]}
                className="text-sm fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={value => `${value}点`}
              />
              {/* 平均評価の参考線 */}
              <ReferenceLine
                y={averageRating}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: `平均 ${averageRating.toFixed(1)}`,
                  position: 'right',
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="ratingNum"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                }}
                activeDot={{
                  r: 7,
                  fill: 'hsl(var(--primary))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
