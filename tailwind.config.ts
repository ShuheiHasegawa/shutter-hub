import type { Config } from 'tailwindcss';
import type { PluginAPI } from 'tailwindcss/types/config';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'var(--font-noto-sans-jp)',
          'system-ui',
          'sans-serif',
        ],
        inter: ['var(--font-inter)', 'sans-serif'],
        'noto-sans-jp': ['var(--font-noto-sans-jp)', 'sans-serif'],
      },
      colors: {
        // ShutterHub カスタムカラー（固定）
        'shutter-primary': '#6F5091',
        'shutter-primary-light': '#8B6BB1',
        'shutter-primary-dark': '#5A4073',
        'shutter-secondary': '#101820',
        'shutter-secondary-light': '#2A2A2A',
        'shutter-accent': '#FF6B6B',
        'shutter-success': '#4ECDC4',
        'shutter-warning': '#FFE66D',
        'shutter-info': '#4D96FF',

        // テーマ対応カラー（動的切り替え可能）
        'theme-background': {
          DEFAULT: 'hsl(var(--theme-background))',
          foreground: 'hsl(var(--theme-background-foreground))',
        },
        'theme-primary': {
          DEFAULT: 'hsl(var(--theme-primary))',
          foreground: 'hsl(var(--theme-primary-foreground))',
          1: 'hsl(var(--theme-primary) / 0.1)', // 10% - 最も薄い
          2: 'hsl(var(--theme-primary) / 0.25)', // 25% - 薄い
          3: 'hsl(var(--theme-primary) / 0.5)', // 50% - 中間
          4: 'hsl(var(--theme-primary) / 0.75)', // 75% - 濃い
          5: 'hsl(var(--theme-primary) / 0.9)', // 90% - 最も濃い
        },
        'theme-secondary': {
          DEFAULT: 'hsl(var(--theme-secondary))',
          foreground: 'hsl(var(--theme-secondary-foreground))',
          1: 'hsl(var(--theme-secondary) / 0.1)',
          2: 'hsl(var(--theme-secondary) / 0.25)',
          3: 'hsl(var(--theme-secondary) / 0.5)',
          4: 'hsl(var(--theme-secondary) / 0.75)',
          5: 'hsl(var(--theme-secondary) / 0.9)',
        },
        'theme-accent': {
          DEFAULT: 'hsl(var(--theme-accent))',
          foreground: 'hsl(var(--theme-accent-foreground))',
          1: 'hsl(var(--theme-accent) / 0.1)',
          2: 'hsl(var(--theme-accent) / 0.25)',
          3: 'hsl(var(--theme-accent) / 0.5)',
          4: 'hsl(var(--theme-accent) / 0.75)',
          5: 'hsl(var(--theme-accent) / 0.9)',
        },
        'theme-neutral': {
          DEFAULT: 'hsl(var(--theme-neutral))',
          foreground: 'hsl(var(--theme-neutral-foreground))',
          1: 'hsl(var(--theme-neutral) / 0.1)',
          2: 'hsl(var(--theme-neutral) / 0.25)',
          3: 'hsl(var(--theme-neutral) / 0.5)',
          4: 'hsl(var(--theme-neutral) / 0.75)',
          5: 'hsl(var(--theme-neutral) / 0.9)',
        },

        // テーマ対応テキストカラー（シンプルで実用的）
        'theme-text': {
          primary: 'hsl(var(--theme-text-primary))', // メインテキスト
          secondary: 'hsl(var(--theme-text-secondary))', // セカンダリテキスト
          muted: 'hsl(var(--theme-text-muted))', // 控えめなテキスト
        },

        // 🚀 セマンティックサーフェース（背景+テキストの自動ペア）
        // 使用例: <div className="surface-primary">自動で背景色+最適なテキスト色</div>
        surface: {
          // プライマリサーフェース（メインブランド色）
          primary: 'hsl(var(--surface-primary))',
          'primary-text': 'hsl(var(--surface-primary-text))',
          'primary-0': 'hsl(var(--surface-primary-0))', // 明るめバリエーション
          'primary-0-text': 'hsl(var(--surface-primary-0-text))',
          'primary-1': 'hsl(var(--surface-primary-1))', // 暗めバリエーション
          'primary-1-text': 'hsl(var(--surface-primary-1-text))',

          // アクセントサーフェース（強調・アクション用）
          accent: 'hsl(var(--surface-accent))',
          'accent-text': 'hsl(var(--surface-accent-text))',
          'accent-0': 'hsl(var(--surface-accent-0))', // 明るめバリエーション
          'accent-0-text': 'hsl(var(--surface-accent-0-text))',
          'accent-1': 'hsl(var(--surface-accent-1))', // 暗めバリエーション
          'accent-1-text': 'hsl(var(--surface-accent-1-text))',

          // ニュートラルサーフェース（控えめ・サブ要素用）
          neutral: 'hsl(var(--surface-neutral))',
          'neutral-text': 'hsl(var(--surface-neutral-text))',
          'neutral-0': 'hsl(var(--surface-neutral-0))', // 明るめバリエーション
          'neutral-0-text': 'hsl(var(--surface-neutral-0-text))',
          'neutral-1': 'hsl(var(--surface-neutral-1))', // 暗めバリエーション
          'neutral-1-text': 'hsl(var(--surface-neutral-1-text))',
        },

        // Shadcn/ui カラー
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // ShutterHub セマンティックカラー
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
        },
        available: {
          DEFAULT: 'hsl(var(--available))',
          foreground: 'hsl(var(--available-foreground))',
        },
        booked: {
          DEFAULT: 'hsl(var(--booked))',
          foreground: 'hsl(var(--booked-foreground))',
        },
        pending: {
          DEFAULT: 'hsl(var(--pending))',
          foreground: 'hsl(var(--pending-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
      },
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,

    // 🎨 セマンティックサーフェース用カスタムプラグイン
    // 背景色とテキスト色を自動でペアにする `surface-*` クラスを生成
    function ({ addUtilities }: PluginAPI) {
      const surfaceUtilities: Record<string, Record<string, string>> = {};

      // セマンティックサーフェースのユーティリティクラスを生成
      const surfaceTypes = [
        'primary',
        'primary-0',
        'primary-1', // プライマリ系
        'accent',
        'accent-0',
        'accent-1', // アクセント系
        'neutral',
        'neutral-0',
        'neutral-1', // ニュートラル系
      ];

      surfaceTypes.forEach(type => {
        // 基本的なsurfaceクラス: surface-primary, surface-accent など
        // 使用例: <div className="surface-primary">自動で背景+テキスト色</div>
        surfaceUtilities[`.surface-${type}`] = {
          'background-color': `hsl(var(--surface-${type}))`,
          color: `hsl(var(--surface-${type}-text))`,
        };
      });

      addUtilities(surfaceUtilities);
    },
    // 🎯 インタラクティブサーフェース用プラグイン
    // hover:surface-*, focus:surface-* クラスを生成
    function ({ addUtilities }: PluginAPI) {
      const hoverSurfaceUtilities: Record<string, Record<string, string>> = {};

      const surfaceTypes = [
        'primary',
        'primary-0',
        'primary-1',
        'accent',
        'accent-0',
        'accent-1',
        'neutral',
        'neutral-0',
        'neutral-1',
      ];

      surfaceTypes.forEach(type => {
        // hover:surface-* クラス
        // 使用例: <button className="surface-primary hover:surface-accent">
        hoverSurfaceUtilities[`.hover\\:surface-${type}:hover`] = {
          'background-color': `hsl(var(--surface-${type}) / 0.9)`,
        };

        // focus:surface-* クラス
        // 使用例: <button className="surface-primary focus:surface-accent">
        hoverSurfaceUtilities[`.focus\\:surface-${type}:focus`] = {
          outline: `2px solid hsl(var(--surface-${type}) / 0.5)`,
          'outline-offset': '2px',
        };
      });

      addUtilities(hoverSurfaceUtilities);
    },
  ],
};

export default config;
