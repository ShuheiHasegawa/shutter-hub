/**
 * ShutterHub v2 統合カラーシステム Tailwind設定
 * 新しい命名規則に対応
 */

import type { PluginAPI } from 'tailwindcss/types/config';

export const colorSystemV2Config = {
  theme: {
    extend: {
      colors: {
        // ブランド色（固定・テーマ不変）
        brand: {
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
          success: 'hsl(var(--brand-success))',
          warning: 'hsl(var(--brand-warning))',
          error: 'hsl(var(--brand-error))',
          info: 'hsl(var(--brand-info))',
        },

        // サーフェース色（テーマ対応・シンプル）
        surface: {
          primary: 'hsl(var(--surface-primary))',
          'primary-text': 'hsl(var(--surface-primary-text))',
          accent: 'hsl(var(--surface-accent))',
          'accent-text': 'hsl(var(--surface-accent-text))',
          neutral: 'hsl(var(--surface-neutral))',
          'neutral-text': 'hsl(var(--surface-neutral-text))',
        },
      },
    },
  },
  plugins: [
    // セマンティックサーフェース用プラグイン（シンプル版）
    function ({ addUtilities }: PluginAPI) {
      const surfaceUtilities: Record<string, Record<string, string>> = {};

      // 基本サーフェースクラス
      const surfaceTypes = ['primary', 'accent', 'neutral'];

      surfaceTypes.forEach(type => {
        // surface-primary, surface-accent, surface-neutral
        surfaceUtilities[`.surface-${type}`] = {
          'background-color': `hsl(var(--surface-${type}))`,
          color: `hsl(var(--surface-${type}-text))`,
        };
      });

      addUtilities(surfaceUtilities);
    },

    // ブランド色用プラグイン
    function ({ addUtilities }: PluginAPI) {
      const brandUtilities: Record<string, Record<string, string>> = {};

      // ブランド色クラス
      const brandTypes = [
        'primary',
        'secondary',
        'success',
        'warning',
        'error',
        'info',
      ];

      brandTypes.forEach(type => {
        // brand-primary, brand-success など
        brandUtilities[`.brand-${type}`] = {
          color: `hsl(var(--brand-${type}))`,
        };
      });

      addUtilities(brandUtilities);
    },
  ],
};

export default colorSystemV2Config;
