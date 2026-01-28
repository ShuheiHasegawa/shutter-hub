/**
 * ShutterHub 統合カラーシステム
 * シンプルで明示的な命名規則による統合設計
 */

// import { Logger } from '@/lib/logger';

// ブランド色定義（テーマ不変）
export const brandColors = {
  primary: '#6F5091', // ShutterHubメインブランド
  secondary: '#101820', // セカンダリブランド
  success: '#4ECDC4', // 成功・完了・利用可能
  warning: '#FFE66D', // 警告・注意・評価
  error: '#FF6B6B', // エラー・削除・満席
  info: '#4D96FF', // 情報・リンク・詳細
} as const;

// カラーパレットの型定義（シンプル化）
export interface ColorPalette {
  name: string;
  colors: {
    primary: string; // メインカラー
    accent: string; // アクセントカラー
    neutral: string; // ニュートラルカラー
    cta: {
      light: string;
      dark: string;
    };
    action: {
      light: string;
      dark: string;
    };
    navigation: {
      light: string;
      dark: string;
    };
  };
}

// 利用可能なテーマパレット（既存の組み合わせを使用）
export const colorPalettes: ColorPalette[] = [
  {
    name: 'default',
    colors: {
      primary: '#0F172A', // Shadcn/ui primary
      accent: '#F1F5F9', // Shadcn/ui accent
      neutral: '#64748B', // Shadcn/ui muted-foreground
      // 🎯 用途別ボタン設計（操作の重要度で使い分け）
      cta: {
        // 最重要操作（主要アクション）
        light: '#0F172A',
        // dark: '#4D96FF',
        dark: '#dfa01e',
      },
      action: {
        // 重要操作（サブアクション）
        light: '#F1F5F9', // accent -> action (重要操作)
        dark: '#F1F5F9',
      },
      navigation: {
        // 通常操作（移動・戻る）
        // light: '#64748B', // neutral -> navigation (通常操作)
        // dark: '#64748B',
        light: 'dfdddc', // neutral -> navigation (通常操作)
        dark: 'dfdddc',
      },
    },
  },
  {
    name: 'Pink',
    colors: {
      primary: '#D583A2', // ピンク
      accent: '#624B61', // ダークピンク
      neutral: '#EAD5E7', // ライトピンク
      cta: {
        light: '#D583A2',
        dark: '#D583A2',
      },
      action: {
        light: '#624B61',
        dark: '#624B61',
      },
      navigation: {
        light: '#EAD5E7',
        dark: '#EAD5E7',
      },
    },
  },
  {
    name: 'Purple',
    colors: {
      primary: '#BFAADA', // パープル
      accent: '#201F28', // ダークパープル
      neutral: '#C4C1F1', // ライトパープル
      cta: {
        light: '#BFAADA',
        dark: '#BFAADA',
      },
      action: {
        light: '#201F28',
        dark: '#201F28',
      },
      navigation: {
        light: '#C4C1F1',
        dark: '#C4C1F1',
      },
    },
  },
  {
    name: 'Blue',
    colors: {
      primary: '#1F2C5D', // ダークブルー
      accent: '#C2CCDF', // ライトブルー
      neutral: '#829FB6', // ミディアムブルー
      cta: {
        light: '#1F2C5D',
        dark: '#1F2C5D',
      },
      action: {
        light: '#C2CCDF',
        dark: '#C2CCDF',
      },
      navigation: {
        light: '#829FB6',
        dark: '#829FB6',
      },
    },
  },
  {
    name: 'BluePink',
    colors: {
      primary: '#002159', // ダークネイビー
      accent: '#FFB8CD', // ライトピンク
      neutral: '#526076', // グレーブルー
      cta: {
        light: '#002159',
        dark: '#002159',
      },
      action: {
        light: '#FFB8CD',
        dark: '#FFB8CD',
      },
      navigation: {
        light: '#526076',
        dark: '#526076',
      },
    },
  },
];

// 明度を計算してコントラスト色を決定（改善版）
export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#FFFFFF';

  // 相対輝度を計算 (WCAG標準)
  const luminance = calculateLuminance(rgb);

  // より厳格なコントラスト基準（WCAG AA準拠）
  // 明度30%を境界として白/黒を決定（より確実な視認性）
  return luminance > 0.3 ? '#000000' : '#FFFFFF';
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

// シンプルなテーマ適用関数
export function applyTheme(paletteName: string, isDark = false): void {
  const palette = colorPalettes.find(p => p.name === paletteName);
  if (!palette) return;

  const root = document.documentElement;

  // テーマの中で最も暗い色を背景色として使用
  const colors = [
    palette.colors.primary,
    palette.colors.accent,
    palette.colors.neutral,
  ];
  const darkestColor = colors.reduce((darkest, current) => {
    const darkestLuminance = calculateLuminance(
      hexToRgb(darkest) || { r: 0, g: 0, b: 0 }
    );
    const currentLuminance = calculateLuminance(
      hexToRgb(current) || { r: 0, g: 0, b: 0 }
    );
    return currentLuminance < darkestLuminance ? current : darkest;
  });

  const lightestColor = colors.reduce((lightest, current) => {
    const lightestLuminance = calculateLuminance(
      hexToRgb(lightest) || { r: 255, g: 255, b: 255 }
    );
    const currentLuminance = calculateLuminance(
      hexToRgb(current) || { r: 0, g: 0, b: 0 }
    );
    return currentLuminance > lightestLuminance ? current : lightest;
  });

  // Shadcn/ui の --background を上書きしてテーマ背景色を適用
  if (isDark) {
    // ダークモード: 最も暗い色を背景に
    root.style.setProperty(
      '--background',
      hexToHsl(adjustBrightness(darkestColor, -20))
    );
    root.style.setProperty(
      '--foreground',
      hexToHsl(getContrastColor(adjustBrightness(darkestColor, -20)))
    );
  } else {
    // ライトモード: 最も明るい色を背景に
    root.style.setProperty(
      '--background',
      hexToHsl(adjustBrightness(lightestColor, 20))
    );
    root.style.setProperty(
      '--foreground',
      hexToHsl(getContrastColor(adjustBrightness(lightestColor, 20)))
    );
  }

  // 🎯 用途別ボタン色を取得（ライト/ダークモード対応）
  const ctaColor = palette.colors.cta
    ? isDark
      ? palette.colors.cta.dark
      : palette.colors.cta.light
    : palette.colors.primary; // フォールバック

  const actionColor = palette.colors.action
    ? isDark
      ? palette.colors.action.dark
      : palette.colors.action.light
    : palette.colors.accent; // フォールバック

  const navigationColor = palette.colors.navigation
    ? isDark
      ? palette.colors.navigation.dark
      : palette.colors.navigation.light
    : palette.colors.neutral; // フォールバック

  // サーフェース色を設定（シンプル化）
  // Logger.info(`🎨 Applying ${paletteName} theme:`, {
  //   primary: palette.colors.primary,
  //   accent: palette.colors.accent,
  //   neutral: palette.colors.neutral,
  //   cta: ctaColor,
  //   action: actionColor,
  //   navigation: navigationColor,
  //   isDark,
  // });

  root.style.setProperty('--surface-primary', hexToHsl(palette.colors.primary));
  root.style.setProperty(
    '--surface-primary-text',
    hexToHsl(getContrastColor(palette.colors.primary))
  );

  root.style.setProperty('--surface-accent', hexToHsl(palette.colors.accent));
  root.style.setProperty(
    '--surface-accent-text',
    hexToHsl(getContrastColor(palette.colors.accent))
  );

  root.style.setProperty('--surface-neutral', hexToHsl(palette.colors.neutral));
  root.style.setProperty(
    '--surface-neutral-text',
    hexToHsl(getContrastColor(palette.colors.neutral))
  );

  // 🎯 用途別ボタン色を設定
  root.style.setProperty('--surface-cta', hexToHsl(ctaColor));
  root.style.setProperty(
    '--surface-cta-text',
    hexToHsl(getContrastColor(ctaColor))
  );

  root.style.setProperty('--surface-action', hexToHsl(actionColor));
  root.style.setProperty(
    '--surface-action-text',
    hexToHsl(getContrastColor(actionColor))
  );

  root.style.setProperty('--surface-navigation', hexToHsl(navigationColor));
  root.style.setProperty(
    '--surface-navigation-text',
    hexToHsl(getContrastColor(navigationColor))
  );

  // Logger.info('✅ Surface colors applied:', {
  //   'surface-accent': hexToHsl(palette.colors.accent),
  //   'surface-accent-text': hexToHsl(getContrastColor(palette.colors.accent)),
  //   'surface-cta': hexToHsl(ctaColor),
  //   'surface-cta-text': hexToHsl(getContrastColor(ctaColor)),
  //   'surface-action': hexToHsl(actionColor),
  //   'surface-action-text': hexToHsl(getContrastColor(actionColor)),
  //   'surface-navigation': hexToHsl(navigationColor),
  //   'surface-navigation-text': hexToHsl(getContrastColor(navigationColor)),
  // });

  // ブランド色は固定（変更しない）
  root.style.setProperty('--brand-primary', hexToHsl(brandColors.primary));
  root.style.setProperty('--brand-secondary', hexToHsl(brandColors.secondary));
  root.style.setProperty('--brand-success', hexToHsl(brandColors.success));
  root.style.setProperty('--brand-warning', hexToHsl(brandColors.warning));
  root.style.setProperty('--brand-error', hexToHsl(brandColors.error));
  root.style.setProperty('--brand-info', hexToHsl(brandColors.info));

  // ダークモード対応（サーフェース色の調整）
  if (isDark) {
    // ダークモード時の色調整（より慎重に）
    const primaryDark = adjustBrightness(palette.colors.primary, -10);
    const accentDark = adjustBrightness(palette.colors.accent, -10);
    const neutralDark = adjustBrightness(palette.colors.neutral, -15);

    root.style.setProperty('--surface-primary', hexToHsl(primaryDark));
    root.style.setProperty(
      '--surface-primary-text',
      hexToHsl(getContrastColor(primaryDark))
    );

    root.style.setProperty('--surface-accent', hexToHsl(accentDark));
    root.style.setProperty(
      '--surface-accent-text',
      hexToHsl(getContrastColor(accentDark))
    );

    root.style.setProperty('--surface-neutral', hexToHsl(neutralDark));
    root.style.setProperty(
      '--surface-neutral-text',
      hexToHsl(getContrastColor(neutralDark))
    );

    // 🎯 ダークモード時の用途別ボタン色を再設定（上書き）
    root.style.setProperty('--surface-cta', hexToHsl(ctaColor));
    root.style.setProperty(
      '--surface-cta-text',
      hexToHsl(getContrastColor(ctaColor))
    );

    root.style.setProperty('--surface-action', hexToHsl(actionColor));
    root.style.setProperty(
      '--surface-action-text',
      hexToHsl(getContrastColor(actionColor))
    );

    root.style.setProperty('--surface-navigation', hexToHsl(navigationColor));
    root.style.setProperty(
      '--surface-navigation-text',
      hexToHsl(getContrastColor(navigationColor))
    );

    // Logger.info('🌙 Dark mode colors applied:', {
    //   'surface-accent': hexToHsl(accentDark),
    //   'surface-accent-text': hexToHsl(getContrastColor(accentDark)),
    //   'surface-cta': hexToHsl(ctaColor),
    //   'surface-cta-text': hexToHsl(getContrastColor(ctaColor)),
    //   'surface-action': hexToHsl(actionColor),
    //   'surface-action-text': hexToHsl(getContrastColor(actionColor)),
    //   'surface-navigation': hexToHsl(navigationColor),
    //   'surface-navigation-text': hexToHsl(getContrastColor(navigationColor)),
    // });
  }
}

// 色を明るく/暗くする
function adjustBrightness(hex: string, percent: number): string {
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
