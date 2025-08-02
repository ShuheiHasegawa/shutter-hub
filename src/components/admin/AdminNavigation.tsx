'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  Shield,
} from 'lucide-react';

interface AdminNavigationProps {
  disputeCount?: number;
}

export function AdminNavigation({ disputeCount = 0 }: AdminNavigationProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      title: '争議管理',
      href: '/admin/disputes',
      icon: AlertTriangle,
      description: '即座撮影の争議案件を管理・解決',
      badge: disputeCount > 0 ? disputeCount : undefined,
      badgeColor: 'destructive' as const,
    },
    {
      title: '分析ダッシュボード',
      href: '/admin/analytics',
      icon: BarChart3,
      description: '売上・利用統計・ユーザー行動分析',
    },
    {
      title: 'ユーザー管理',
      href: '/admin/users',
      icon: Users,
      description: 'ユーザー・カメラマンの管理',
    },
    {
      title: '決済管理',
      href: '/admin/payments',
      icon: CreditCard,
      description: 'エスクロー決済・返金処理',
    },
    {
      title: 'システム設定',
      href: '/admin/settings',
      icon: Settings,
      description: 'プラットフォーム設定・機能管理',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 管理者ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            管理者ダッシュボード
          </CardTitle>
          <p className="text-sm text-gray-600">
            ShutterHub プラットフォームの管理・運営機能
          </p>
        </CardHeader>
      </Card>

      {/* ナビゲーション */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {navigationItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Card
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isActive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon
                        className={`h-5 w-5 ${
                          isActive ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      />
                      {item.title}
                    </span>
                    {item.badge && (
                      <Badge variant={item.badgeColor || 'secondary'}>
                        {item.badge}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 重要なお知らせ */}
      {disputeCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              注意が必要な案件があります
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              {disputeCount}件の未解決争議があります。迅速な対応をお願いします。
            </p>
            <Link
              href="/admin/disputes"
              className="inline-block mt-2 text-orange-800 hover:text-orange-900 underline text-sm font-medium"
            >
              争議管理ページで確認する →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
