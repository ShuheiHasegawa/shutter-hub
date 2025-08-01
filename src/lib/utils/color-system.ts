/**
 * 拡張可能なカラーシステム
 * 複数テーマ・ダークモード・自動文字色調整に対応
 */

// カラーパレットの型定義
export interface ColorPalette {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  // 明度順に分類された色（明るい順）
  lightColors: string[];
  darkColors: string[];
  // テキストカラー（オプション）
  textColors?: {
    primary?: string; // メインテキスト
    secondary?: string; // セカンダリテキスト
    muted?: string; // 控えめなテキスト
  };
}

// 明度を計算してforeground色を決定するユーティリティ
export function getContrastColor(hexColor: string): string {
  // HEXカラーをRGBに変換
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#FFFFFF';

  // 相対輝度を計算 (WCAG標準)
  const luminance = calculateLuminance(rgb);

  // 明度50%を境界として白/黒を決定
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * セマンティックサーフェースペアを生成
 * 各カラーに対して最適なテキストカラーを自動設定
 */
function generateSurfacePairs(
  root: HTMLElement,
  lightColors: string[],
  darkColors: string[],
  isDark: boolean
): void {
  // プライマリサーフェース (テーマの主要色)
  const primaryColor = isDark ? lightColors[0] : darkColors[0];
  const primaryText = getContrastColor(primaryColor);
  root.style.setProperty('--surface-primary', hexToHsl(primaryColor));
  root.style.setProperty('--surface-primary-text', hexToHsl(primaryText));

  // プライマリレベル0 (明るめ)
  const primary0Color = lightColors[0];
  const primary0Text = getContrastColor(primary0Color);
  root.style.setProperty('--surface-primary-0', hexToHsl(primary0Color));
  root.style.setProperty('--surface-primary-0-text', hexToHsl(primary0Text));

  // プライマリレベル1 (暗め)
  const primary1Color = darkColors[0];
  const primary1Text = getContrastColor(primary1Color);
  root.style.setProperty('--surface-primary-1', hexToHsl(primary1Color));
  root.style.setProperty('--surface-primary-1-text', hexToHsl(primary1Text));

  // アクセントサーフェース (強調用色)
  const accentColor = isDark
    ? lightColors[1] || lightColors[0]
    : darkColors[1] || darkColors[0];
  const accentText = getContrastColor(accentColor);
  root.style.setProperty('--surface-accent', hexToHsl(accentColor));
  root.style.setProperty('--surface-accent-text', hexToHsl(accentText));

  // アクセントレベル0 (明るめ)
  const accent0Color = lightColors[1] || lightColors[0];
  const accent0Text = getContrastColor(accent0Color);
  root.style.setProperty('--surface-accent-0', hexToHsl(accent0Color));
  root.style.setProperty('--surface-accent-0-text', hexToHsl(accent0Text));

  // アクセントレベル1 (暗め)
  const accent1Color = darkColors[1] || darkColors[0];
  const accent1Text = getContrastColor(accent1Color);
  root.style.setProperty('--surface-accent-1', hexToHsl(accent1Color));
  root.style.setProperty('--surface-accent-1-text', hexToHsl(accent1Text));

  // ニュートラルサーフェース（中間トーン・控えめ）
  const neutralColor = isDark
    ? darkColors[0]
    : lightColors[1] || lightColors[0];
  const neutralText = getContrastColor(neutralColor);
  root.style.setProperty('--surface-neutral', hexToHsl(neutralColor));
  root.style.setProperty('--surface-neutral-text', hexToHsl(neutralText));

  // ニュートラルレベル0 (明るめ)
  const neutral0Color = lightColors[1] || lightColors[0];
  const neutral0Text = getContrastColor(neutral0Color);
  root.style.setProperty('--surface-neutral-0', hexToHsl(neutral0Color));
  root.style.setProperty('--surface-neutral-0-text', hexToHsl(neutral0Text));

  // ニュートラルレベル1 (暗め)
  const neutral1Color = darkColors[1] || darkColors[0];
  const neutral1Text = getContrastColor(neutral1Color);
  root.style.setProperty('--surface-neutral-1', hexToHsl(neutral1Color));
  root.style.setProperty('--surface-neutral-1-text', hexToHsl(neutral1Text));
}

// HEXをRGBに変換
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// 相対輝度を計算
function calculateLuminance({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// HEXをHSLに変換（CSS変数用）
export function hexToHsl(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '0 0% 0%';

  const { r, g, b } = rgb;
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / diff + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / diff + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// 色を明るく/暗くする
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  const newRgb = {
    r: adjust(rgb.r),
    g: adjust(rgb.g),
    b: adjust(rgb.b),
  };

  return `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
}

// デフォルトテキストカラーを生成
export function getDefaultTextColors(isDark: boolean) {
  if (isDark) {
    return {
      primary: '#FFFFFF', // 白 - メインテキスト
      secondary: '#E5E7EB', // ライトグレー - セカンダリテキスト
      muted: '#9CA3AF', // グレー - 控えめなテキスト
    };
  } else {
    return {
      primary: '#111827', // ダークグレー（完全な黒ではない） - メインテキスト
      secondary: '#374151', // ミディアムグレー - セカンダリテキスト
      muted: '#6B7280', // グレー - 控えめなテキスト
    };
  }
}

// 事前定義されたカラーパレット（明度分析済み）
export const colorPalettes: ColorPalette[] = [
  {
    name: 'default',
    colors: {
      primary: '#0F172A', // Shadcn/ui primary (ライト): 222.2 47.4% 11.2%
      secondary: '#F1F5F9', // Shadcn/ui secondary (ライト): 210 40% 96.1%
      accent: '#F1F5F9', // Shadcn/ui accent (ライト): 210 40% 96.1%
      neutral: '#64748B', // Shadcn/ui muted-foreground: 215.4 16.3% 46.9%
    },
    lightColors: ['#F1F5F9', '#64748B', '#0F172A'], // 明るい順: secondary, neutral, primary
    darkColors: ['#0F172A', '#1E293B'], // 暗い順: primary, 追加ダーク色
  },
  {
    name: 'Pink',
    colors: {
      primary: '#D583A2',
      secondary: '#ECE7ED',
      accent: '#624B61',
      neutral: '#EAD5E7',
    },
    lightColors: ['#EAD5E7', '#ECE7ED', '#D583A2'], // 明るい順
    darkColors: ['#D583A2', '#624B61'], // 暗い順
  },
  {
    name: 'Purple',
    colors: {
      primary: '#BFAADA',
      secondary: '#D3CFF1',
      accent: '#201F28',
      neutral: '#C4C1F1',
    },
    lightColors: ['#D3CFF1', '#C4C1F1', '#BFAADA'], // 明るい順
    darkColors: ['#BFAADA', '#201F28'], // 暗い順
  },
  {
    name: 'Blue',
    colors: {
      primary: '#1F2C5D',
      secondary: '#3A539F',
      accent: '#C2CCDF',
      neutral: '#829FB6',
    },
    lightColors: ['#C2CCDF', '#829FB6', '#3A539F'], // 明るい順
    darkColors: ['#3A539F', '#1F2C5D'], // 暗い順
  },
  {
    name: 'BluePink',
    colors: {
      primary: '#002159',
      secondary: '#F16F8B',
      accent: '#FFB8CD',
      neutral: '#526076',
    },
    lightColors: ['#FFB8CD', '#F16F8B', '#526076'], // 明るい順
    darkColors: ['#526076', '#002159'], // 暗い順
  },
];

// テーマ切り替え用のCSS変数生成
export function generateThemeCSS(
  palette: ColorPalette,
  isDark = false
): string {
  const { colors } = palette;

  const variables: Record<string, string> = {};

  // 基本カラー
  variables['--theme-primary'] = hexToHsl(colors.primary);
  variables['--theme-primary-foreground'] = hexToHsl(
    getContrastColor(colors.primary)
  );
  variables['--theme-secondary'] = hexToHsl(colors.secondary);
  variables['--theme-secondary-foreground'] = hexToHsl(
    getContrastColor(colors.secondary)
  );
  variables['--theme-accent'] = hexToHsl(colors.accent);
  variables['--theme-accent-foreground'] = hexToHsl(
    getContrastColor(colors.accent)
  );
  variables['--theme-neutral'] = hexToHsl(colors.neutral);
  variables['--theme-neutral-foreground'] = hexToHsl(
    getContrastColor(colors.neutral)
  );

  // ダークモード対応（明度調整）
  if (isDark) {
    variables['--theme-primary'] = hexToHsl(
      adjustBrightness(colors.primary, -20)
    );
    variables['--theme-secondary'] = hexToHsl(
      adjustBrightness(colors.secondary, -30)
    );
    variables['--theme-accent'] = hexToHsl(
      adjustBrightness(colors.accent, -15)
    );
    variables['--theme-neutral'] = hexToHsl(
      adjustBrightness(colors.neutral, -40)
    );
  }

  // CSS文字列として返す
  const cssVars = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n    ');

  return `:root {\n    ${cssVars}\n  }`;
}

// ブラウザでテーマを適用（新しいライト/ダークモード対応）
export function applyTheme(paletteName: string, isDark = false): void {
  const palette = colorPalettes.find(p => p.name === paletteName);
  if (!palette) return;

  const { lightColors, darkColors, textColors } = palette;
  const root = document.documentElement;

  // テキストカラーを決定（カスタム > デフォルト）
  const defaultTextColors = getDefaultTextColors(isDark);
  const finalTextColors = {
    primary: textColors?.primary || defaultTextColors.primary,
    secondary: textColors?.secondary || defaultTextColors.secondary,
    muted: textColors?.muted || defaultTextColors.muted,
  };

  // テキストカラーを設定
  root.style.setProperty(
    '--theme-text-primary',
    hexToHsl(finalTextColors.primary)
  );
  root.style.setProperty(
    '--theme-text-secondary',
    hexToHsl(finalTextColors.secondary)
  );
  root.style.setProperty('--theme-text-muted', hexToHsl(finalTextColors.muted));

  // セマンティックサーフェースペアを生成
  generateSurfacePairs(root, lightColors, darkColors, isDark);

  if (isDark) {
    // ダークモード: 最も暗い色を背景、明るい色をアクセントに
    const [darkBg, darkSecondary] = darkColors;
    const [lightAccent, lightSecondary, lightNeutral] = lightColors;

    // darkColorsの最後の要素（最も暗い色）を背景に使用
    const darkestColor = darkColors[darkColors.length - 1] || darkBg;
    root.style.setProperty('--theme-background', hexToHsl(darkestColor));
    root.style.setProperty(
      '--theme-background-foreground',
      hexToHsl(getContrastColor(darkestColor))
    );

    root.style.setProperty('--theme-primary', hexToHsl(lightAccent));
    root.style.setProperty(
      '--theme-primary-foreground',
      hexToHsl(getContrastColor(lightAccent))
    );

    root.style.setProperty('--theme-secondary', hexToHsl(darkSecondary));
    root.style.setProperty(
      '--theme-secondary-foreground',
      hexToHsl(getContrastColor(darkSecondary))
    );

    root.style.setProperty('--theme-accent', hexToHsl(lightSecondary));
    root.style.setProperty(
      '--theme-accent-foreground',
      hexToHsl(getContrastColor(lightSecondary))
    );

    root.style.setProperty('--theme-neutral', hexToHsl(lightNeutral));
    root.style.setProperty(
      '--theme-neutral-foreground',
      hexToHsl(getContrastColor(lightNeutral))
    );
  } else {
    // ライトモード: 明るい色を背景、暗い色をアクセントに
    const [lightBg, lightSecondary, lightNeutral] = lightColors;
    const [darkAccent, darkSecondary] = darkColors;

    root.style.setProperty('--theme-background', hexToHsl(lightBg));
    root.style.setProperty(
      '--theme-background-foreground',
      hexToHsl(getContrastColor(lightBg))
    );

    root.style.setProperty('--theme-primary', hexToHsl(darkAccent));
    root.style.setProperty(
      '--theme-primary-foreground',
      hexToHsl(getContrastColor(darkAccent))
    );

    root.style.setProperty('--theme-secondary', hexToHsl(lightSecondary));
    root.style.setProperty(
      '--theme-secondary-foreground',
      hexToHsl(getContrastColor(lightSecondary))
    );

    root.style.setProperty('--theme-accent', hexToHsl(darkSecondary));
    root.style.setProperty(
      '--theme-accent-foreground',
      hexToHsl(getContrastColor(darkSecondary))
    );

    root.style.setProperty('--theme-neutral', hexToHsl(lightNeutral));
    root.style.setProperty(
      '--theme-neutral-foreground',
      hexToHsl(getContrastColor(lightNeutral))
    );
  }
}
