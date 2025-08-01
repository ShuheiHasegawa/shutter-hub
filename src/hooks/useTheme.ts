/**
 * テーマ切り替え用フック
 * カラーパレットとダークモードの管理
 */

import { useState, useEffect } from 'react';
import { useTheme as useNextThemes } from 'next-themes';
import { applyTheme, colorPalettes } from '@/lib/utils/color-system';

export interface ThemeSettings {
  palette: string;
  isDark: boolean;
}

export function useTheme() {
  const { theme, setTheme } = useNextThemes();
  const [settings, setSettings] = useState<ThemeSettings>({
    palette: 'default',
    isDark: false,
  });

  // ローカルストレージからテーマ設定を読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shutter-hub-theme');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ThemeSettings;
          setSettings(parsed);
          applyTheme(parsed.palette, parsed.isDark);
        } catch {
          // テーマ設定の読み込みに失敗した場合はデフォルトを使用
        }
      }

      // next-themesとの同期
      const currentTheme = theme;
      if (currentTheme) {
        const isDarkMode = currentTheme === 'dark';
        setSettings(prev => ({ ...prev, isDark: isDarkMode }));
      }

      // システムのダークモード設定を反映
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (!saved) {
          // 設定がない場合のみシステム設定を反映
          const newIsDark = e.matches;
          setSettings(prev => ({ ...prev, isDark: newIsDark }));
          setTheme(newIsDark ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, setTheme]);

  // next-themesの変更を監視してsettingsを同期
  useEffect(() => {
    if (theme) {
      const isDarkMode = theme === 'dark';
      setSettings(prev => {
        if (prev.isDark !== isDarkMode) {
          return { ...prev, isDark: isDarkMode };
        }
        return prev;
      });
    }
  }, [theme]);

  // テーマ変更時にCSSとストレージを更新
  useEffect(() => {
    applyTheme(settings.palette, settings.isDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shutter-hub-theme', JSON.stringify(settings));
    }
  }, [settings]);

  // パレット変更
  const setPalette = (paletteName: string) => {
    setSettings(prev => ({ ...prev, palette: paletteName }));
  };

  // ダークモード切り替え
  const toggleDarkMode = () => {
    const newIsDark = !settings.isDark;
    setSettings(prev => ({ ...prev, isDark: newIsDark }));
    setTheme(newIsDark ? 'dark' : 'light');
  };

  // ダークモード設定
  const setDarkMode = (isDark: boolean) => {
    setSettings(prev => ({ ...prev, isDark }));
    setTheme(isDark ? 'dark' : 'light');
  };

  // 利用可能なパレット一覧を取得
  const availablePalettes = colorPalettes;

  // 現在のパレット情報を取得
  const currentPalette =
    colorPalettes.find(p => p.name === settings.palette) || colorPalettes[0];

  return {
    settings,
    setPalette,
    toggleDarkMode,
    setDarkMode,
    availablePalettes,
    currentPalette,
  };
}
