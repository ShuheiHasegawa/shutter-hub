/**
 * テーマ選択コンポーネント
 * カラーパレットとダークモードの切り替えUI
 */

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
import { Palette, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeSelector() {
  const {
    settings,
    setPalette,
    toggleDarkMode,
    availablePalettes,
    currentPalette,
  } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* カラーパレット選択 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-background/90 backdrop-blur-sm"
          >
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">
              {currentPalette.name.length > 15 ? 'テーマ' : currentPalette.name}
            </span>
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
                  style={{ backgroundColor: palette.colors.secondary }}
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

      {/* ダークモード切り替え */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleDarkMode}
        className="gap-2 bg-background/90 backdrop-blur-sm"
      >
        {settings.isDark ? (
          <>
            <Moon className="h-4 w-4" />
            <span className="hidden sm:inline">Dark</span>
          </>
        ) : (
          <>
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Light</span>
          </>
        )}
      </Button>
    </div>
  );
}

// テーマカラーのプレビューコンポーネント
export function ThemePreview() {
  const { currentPalette } = useTheme();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        現在のテーマ: {currentPalette.name}
      </h3>

      {/* テーマカラーを使用したサンプル */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="bg-theme-primary text-theme-primary-foreground p-4 rounded-lg">
            <h4 className="font-medium">Primary</h4>
            <p className="text-sm opacity-90">メインカラー</p>
          </div>
          <div className="bg-theme-secondary text-theme-secondary-foreground p-4 rounded-lg">
            <h4 className="font-medium">Secondary</h4>
            <p className="text-sm opacity-90">セカンダリカラー</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="bg-theme-accent text-theme-accent-foreground p-4 rounded-lg">
            <h4 className="font-medium">Accent</h4>
            <p className="text-sm opacity-90">アクセントカラー</p>
          </div>
          <div className="bg-theme-neutral text-theme-neutral-foreground p-4 rounded-lg">
            <h4 className="font-medium">Neutral</h4>
            <p className="text-sm opacity-90">ニュートラルカラー</p>
          </div>
        </div>
      </div>

      {/* 実用例 */}
      <div className="space-y-2">
        <h4 className="font-medium">使用例</h4>
        <div className="flex gap-2">
          <Button className="bg-theme-primary text-theme-primary-foreground hover:opacity-90">
            Primary Button
          </Button>
          <Button
            variant="outline"
            className="border-theme-accent text-theme-accent hover:bg-theme-accent hover:text-theme-accent-foreground"
          >
            Accent Button
          </Button>
        </div>
      </div>
    </div>
  );
}
