'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const locales = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const;

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: 'ja' | 'en') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">言語を切り替え</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map(localeOption => (
          <DropdownMenuItem
            key={localeOption.code}
            onClick={() => handleLocaleChange(localeOption.code)}
            className={locale === localeOption.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeOption.flag}</span>
            {localeOption.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
