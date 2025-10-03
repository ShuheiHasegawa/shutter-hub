'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import type {
  SessionTypeData,
  BaseChartProps,
} from '@/types/user-activity-stats';
import { PieChartSkeleton } from './ChartSkeleton';

interface SessionTypeChartProps extends BaseChartProps {
  data: SessionTypeData[];
}

/**
 * 撮影会タイプ分布の円グラフコンポーネント
 * スタジオ・屋外・イベント等のタイプ別参加統計を表示
 */
export function SessionTypeChart({
  data,
  height = 320,
  isLoading = false,
}: SessionTypeChartProps) {
  if (isLoading) {
    return <PieChartSkeleton />;
  }

  // データが空の場合の表示
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            撮影会タイプ分布
          </CardTitle>
          <CardDescription>参加した撮影会の種類別割合</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center space-y-2">
              <PieChartIcon className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                まだタイプ別データがありません
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // デフォルトカラーパレット（テーマ対応）
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // カスタムツールチップ
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: unknown[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0] as {
        value: number;
        payload: { total?: number; value?: number; name: string };
      };
      const total = data.payload.total || data.payload.value || 0;
      const percentage = ((data.value / total) * 100).toFixed(1);

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.payload.name}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">件数: {data.value}回</p>
            <p className="text-sm">割合: {percentage}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // カスタムラベル関数
  const renderCustomLabel = ({
    name,
    percent,
  }: {
    name: string;
    percent: number;
  }) => {
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  // カスタム凡例
  const CustomLegend = ({
    payload,
  }: {
    payload: { color: string; value: string }[];
  }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          撮影会タイプ分布
        </CardTitle>
        <CardDescription>参加した撮影会の種類別割合</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="40%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={<CustomLegend />}
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
