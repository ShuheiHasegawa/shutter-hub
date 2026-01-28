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
        display: ['var(--font-playfair-display)', 'serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
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

        // 🚀 新カラーシステムv2（ブランド色・固定）
        brand: {
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
          success: 'hsl(var(--brand-success))',
          warning: 'hsl(var(--brand-warning))',
          error: 'hsl(var(--brand-error))',
          info: 'hsl(var(--brand-info))',
        },

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

          // アクセントサーフェース（強調・アクション用）
          accent: 'hsl(var(--surface-accent))',
          'accent-text': 'hsl(var(--surface-accent-text))',

          // ニュートラルサーフェース（控えめ・サブ要素用）
          neutral: 'hsl(var(--surface-neutral))',
          'neutral-text': 'hsl(var(--surface-neutral-text))',

          // 🎯 意図ベースサーフェース
          cta: 'hsl(var(--surface-cta))',
          'cta-text': 'hsl(var(--surface-cta-text))',
          action: 'hsl(var(--surface-action))',
          'action-text': 'hsl(var(--surface-action-text))',
          navigation: 'hsl(var(--surface-navigation))',
          'navigation-text': 'hsl(var(--surface-navigation-text))',
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

    // 🎨 セマンティックサーフェース用プラグイン（v2・シンプル版）
    function ({ addUtilities }: PluginAPI) {
      const surfaceUtilities: Record<string, Record<string, string>> = {};

      // シンプルなサーフェースクラス（明度レベルなし）
      const surfaceTypes = [
        'primary',
        'accent',
        'neutral',
        'cta',
        'action',
        'navigation',
      ];

      surfaceTypes.forEach(type => {
        // surface-primary, surface-accent, surface-neutral, surface-cta
        surfaceUtilities[`.surface-${type}`] = {
          'background-color': `hsl(var(--surface-${type}))`,
          color: `hsl(var(--surface-${type}-text))`,
          transition: 'background-color 0.2s ease, color 0.2s ease',
        };
      });

      // 🔧 明示的にsurface-ctaクラスを追加（デバッグ用）
      surfaceUtilities['.surface-cta'] = {
        'background-color': 'hsl(var(--surface-cta))',
        color: 'hsl(var(--surface-cta-text))',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      };

      addUtilities(surfaceUtilities);
    },

    // 🎨 ブランド色用プラグイン（v2）
    function ({ addUtilities }: PluginAPI) {
      const brandUtilities: Record<string, Record<string, string>> = {};

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

export default config;
