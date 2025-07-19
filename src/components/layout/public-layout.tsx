'use client';

import { PublicHeader } from './public-header';
import { Footer } from './footer';

interface PublicLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  className?: string;
}

export function PublicLayout({
  children,
  showFooter = true,
  className = '',
}: PublicLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      <PublicHeader />
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
