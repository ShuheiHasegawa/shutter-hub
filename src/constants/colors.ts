// ShutterHub カラーパレット
// detailed-requirements.mdcで定義されたブランドカラー

export const colors = {
  // ブランドカラー
  primary: '#6F5091',
  secondary: '#101820',

  // 拡張パレット
  primaryLight: '#8B6BB1',
  primaryDark: '#5A4073',
  secondaryLight: '#2A2A2A',

  // アクセントカラー
  accent: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFE66D',
  info: '#4D96FF',

  // ニュートラルカラー
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

export type ColorKeys = keyof typeof colors;
