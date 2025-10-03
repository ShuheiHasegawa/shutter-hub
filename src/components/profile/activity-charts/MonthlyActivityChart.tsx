'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type {
  MonthlyActivityData,
  BaseChartProps,
} from '@/types/user-activity-stats';
import { ChartSkeleton } from './ChartSkeleton';

interface MonthlyActivityChartProps extends BaseChartProps {
  data: MonthlyActivityData[];
}

/**
 * 月別活動統計の棒グラフコンポーネント
 * 過去12ヶ月の撮影会参加・主催数を表示
 */
export function MonthlyActivityChart({
  data,
  height = 320,
  isLoading = false,
}: MonthlyActivityChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // データが空の場合の表示
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            月別活動統計
          </CardTitle>
          <CardDescription>過去12ヶ月の撮影会参加・主催数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-2">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                まだ活動データがありません
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 月の表示名変換（YYYY-MM → MM月）
  const formattedData = data.map(item => ({
    ...item,
    monthLabel: `${item.month.split('-')[1]}月`,
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
          payload: { month: string; organized: number; participated: number };
        }
      ).payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${monthData.month}`}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-primary rounded mr-2"></span>
              参加: {monthData.participated}回
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-secondary rounded mr-2"></span>
              主催: {monthData.organized}回
            </p>
            <p className="text-sm font-medium text-primary">
              合計: {monthData.participated + monthData.organized}回
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          月別活動統計
        </CardTitle>
        <CardDescription>過去12ヶ月の撮影会参加・主催数</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
                className="text-sm fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <Bar
                dataKey="participated"
                fill="hsl(var(--primary))"
                name="参加"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="organized"
                fill="hsl(var(--secondary))"
                name="主催"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
