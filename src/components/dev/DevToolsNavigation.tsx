'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DevToolsNavigationProps {
  className?: string;
}

export function DevToolsNavigation({ className }: DevToolsNavigationProps) {
  const pathname = usePathname();

  const isDevToolsPage = pathname?.includes('/dev');
  const isDevToolsRoot = pathname?.endsWith('/dev');

  if (!isDevToolsPage) return null;

  return (
    <div className={cn('border-b bg-muted/50', className)}>
      <div className="container">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Link href="/ja">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                ホーム
              </Button>
            </Link>

            {!isDevToolsRoot && (
              <Link href="/ja/dev">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  開発ツール一覧
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              開発ツール
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
