'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemePaletteSelectorProps {
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  className?: string;
}

/**
 * テーマパレット選択コンポーネント
 *
 * public-header.tsx と header.tsx で共通使用する
 * カラーパレット切り替え機能を提供する
 */
export function ThemePaletteSelector({
  size = 'icon',
  variant = 'ghost',
  className = '',
}: ThemePaletteSelectorProps) {
  const { settings, setPalette, availablePalettes } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${size === 'icon' ? 'h-9 w-9' : ''} ${className}`}
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">テーマ選択</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>カラーテーマ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePalettes.map(palette => (
          <DropdownMenuItem
            key={palette.name}
            onClick={() => setPalette(palette.name)}
            className="flex items-center gap-3"
          >
            <div className="flex gap-1">
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: palette.colors.primary }}
              />
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: palette.colors.neutral }}
              />
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: palette.colors.accent }}
              />
            </div>
            <span className="text-sm">{palette.name}</span>
            {settings.palette === palette.name && (
              <span className="ml-auto text-xs text-muted-foreground">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
