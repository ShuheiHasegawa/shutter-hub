'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats } from '@/app/actions/dashboard-stats';
import {
  Camera,
  Calendar,
  Star,
  Users,
  TrendingUp,
  Award,
  MapPin,
  Zap,
} from 'lucide-react';
import { FormattedPrice } from '@/components/ui/formatted-display';

interface DashboardStatsCardsProps {
  stats: DashboardStats;
  userType: 'model' | 'photographer' | 'organizer';
}

export function DashboardStatsCards({
  stats,
  userType,
}: DashboardStatsCardsProps) {
  const getStatsForUserType = () => {
    const baseStats = [
      {
        title: '総撮影会数',
        value: stats.totalSessions.toString(),
        icon: Camera,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      },
      {
        title: '今後の予定',
        value: stats.upcomingSessions.toString(),
        icon: Calendar,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      {
        title: '完了済み',
        value: stats.completedSessions.toString(),
        icon: Award,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
      },
      {
        title: '平均評価',
        value: stats.averageRating.toFixed(1),
        unit: '/5.0',
        icon: Star,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
      },
    ];

    const typeSpecificStats = [];

    if (userType === 'model') {
      typeSpecificStats.push({
        title: '招待状受信',
        value: (stats.userTypeStats.invitationsReceived || 0).toString(),
        icon: MapPin,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
      });
    } else if (userType === 'photographer') {
      typeSpecificStats.push(
        {
          title: '即座撮影リクエスト',
          value: (stats.userTypeStats.instantRequestsCount || 0).toString(),
          icon: Zap,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
        },
        {
          title: '今月の収益',
          value: stats.userTypeStats.monthlyEarnings || 0,
          isPrice: true,
          icon: TrendingUp,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100',
        }
      );
    } else if (userType === 'organizer') {
      typeSpecificStats.push(
        {
          title: '主催セッション数',
          value: (stats.userTypeStats.organizedSessions || 0).toString(),
          icon: Users,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100',
        },
        {
          title: '総参加者数',
          value: (stats.userTypeStats.totalParticipants || 0).toString(),
          icon: Users,
          color: 'text-teal-600',
          bgColor: 'bg-teal-100',
        }
      );
    }

    return [...baseStats, ...typeSpecificStats];
  };

  const statsCards = getStatsForUserType();

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {statsCards.map((stat, index) => (
        <Card
          key={index}
          className="hover:shadow-lg transition-all duration-200 border-border/50 bg-card/50 backdrop-blur-sm"
        >
          <CardContent className="p-3 md:p-4 lg:p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
                  {stat.title}
                </p>
                <div
                  className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor} flex-shrink-0`}
                >
                  <stat.icon
                    className={`h-3.5 w-3.5 md:h-4 md:w-4 ${stat.color}`}
                  />
                </div>
              </div>
              <div className="flex items-baseline space-x-0.5">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                  {'isPrice' in stat && stat.isPrice ? (
                    <FormattedPrice
                      value={stat.value as number}
                      format="simple"
                    />
                  ) : (
                    stat.value
                  )}
                </p>
                {'unit' in stat && stat.unit && (
                  <span className="text-xs md:text-sm text-muted-foreground">
                    {stat.unit}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
