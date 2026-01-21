'use client';

import { type LucideIcon } from 'lucide-react';
import { AccountCard } from './AccountCard';
import type { TestAccount } from '../data/testAccounts';

interface AccountSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  accounts: TestAccount[];
  isLoading: boolean;
  loadingAccount: string | null;
  onLogin: (account: TestAccount) => void;
  onDelete: (email: string) => void;
  colorTheme: 'blue' | 'pink' | 'purple' | 'rose';
  gridCols?:
    | 'md:grid-cols-2 lg:grid-cols-3'
    | 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
}

export function AccountSection({
  title,
  icon: Icon,
  iconColor,
  accounts,
  isLoading,
  loadingAccount,
  onLogin,
  onDelete,
  colorTheme,
  gridCols = 'md:grid-cols-2 lg:grid-cols-3',
}: AccountSectionProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Icon className={`h-6 w-6 mr-2 ${iconColor}`} />
        {title}
      </h2>
      <div className={`grid ${gridCols} gap-4`}>
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            isLoading={isLoading}
            isCurrentLoading={loadingAccount === account.id}
            onLogin={onLogin}
            onDelete={onDelete}
            colorTheme={colorTheme}
          />
        ))}
      </div>
    </section>
  );
}
