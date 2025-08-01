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
        title: '総フォトセッション数',
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
          value: `¥${(stats.userTypeStats.monthlyEarnings || 0).toLocaleString()}`,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <div className="flex items-baseline space-x-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {'unit' in stat && stat.unit && (
                    <span className="text-sm text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
