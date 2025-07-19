'use client';

import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './sidebar';
import { DashboardTopbar } from './dashboard-topbar';
import { BottomNavigation } from './bottom-navigation';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      redirect('/auth/signin');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="w-full">
        <DashboardTopbar />
        <main className="flex-1 overflow-y-auto p-6 pb-16 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}
