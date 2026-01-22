'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { TestAccount } from '../data/testAccounts';

interface AccountCardProps {
  account: TestAccount;
  isLoading: boolean;
  isCurrentLoading: boolean;
  onLogin: (account: TestAccount) => void;
  onDelete: (email: string) => void;
  colorTheme: 'blue' | 'pink' | 'purple' | 'rose';
}

const colorConfig = {
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeBorder: 'border-blue-300 text-blue-700',
  },
  pink: {
    border: 'border-pink-200 dark:border-pink-800',
    iconBg: 'bg-pink-100 dark:bg-pink-900',
    iconColor: 'text-pink-600 dark:text-pink-400',
    badgeBorder: 'border-pink-300 text-pink-700',
  },
  purple: {
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeBorder: 'border-purple-300 text-purple-700',
  },
  rose: {
    border: 'border-rose-200 dark:border-rose-800',
    iconBg: 'bg-rose-100 dark:bg-rose-900',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badgeBorder: 'border-rose-300 text-rose-700',
  },
};

export function AccountCard({
  account,
  isLoading,
  isCurrentLoading,
  onLogin,
  onDelete,
  colorTheme,
}: AccountCardProps) {
  const Icon = account.icon;
  const colors = colorConfig[colorTheme];

  return (
    <Card className={`hover:shadow-lg transition-shadow ${colors.border}`}>
      <CardHeader className="text-center pb-3">
        <div className={`mx-auto mb-3 p-2 rounded-full ${colors.iconBg}`}>
          <Icon className={`h-6 w-6 ${colors.iconColor}`} />
        </div>
        <CardTitle className="text-lg">{account.name}</CardTitle>
        <CardDescription className="text-xs">
          {account.description}
        </CardDescription>
        <Badge variant="outline" className={colors.badgeBorder}>
          {account.userType}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Email:</strong> {account.email}
          </p>
          <p>
            <strong>Password:</strong> {account.password}
          </p>
        </div>
        <Button
          onClick={() => onLogin(account)}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isCurrentLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ログイン中...
            </>
          ) : (
            `${account.name}でログイン`
          )}
        </Button>
        <Button
          onClick={() => onDelete(account.email)}
          disabled={isLoading}
          variant="destructive"
          size="sm"
          className="w-full"
        >
          ユーザーを削除
        </Button>
      </CardContent>
    </Card>
  );
}
