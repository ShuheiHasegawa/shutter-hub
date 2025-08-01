/**
 * セマンティックサーフェース用のユーティリティ関数
 * より高度なカラー操作を提供
 */

// サーフェースタイプの定義
export type SurfaceType = 'primary' | 'accent' | 'neutral';
export type SurfaceLevel = 0 | 1 | 'default';
export type SurfaceVariant =
  | `${SurfaceType}`
  | `${SurfaceType}-${SurfaceLevel}`;

/**
 * サーフェースクラス名を生成
 */
export function getSurfaceClass(
  type: SurfaceType,
  level?: SurfaceLevel
): string {
  if (level === undefined || level === 'default') {
    return `surface-${type}`;
  }
  return `surface-${type}-${level}`;
}

/**
 * 動的なサーフェーススタイルを生成
 * React コンポーネントで使用
 */
export function useSurfaceStyle(type: SurfaceType, level?: SurfaceLevel) {
  const className = getSurfaceClass(type, level);

  return {
    className,
    style: {
      // CSS変数を直接参照（フォールバック付き）
      backgroundColor:
        level !== undefined && level !== 'default'
          ? `hsl(var(--surface-${type}-${level}, var(--surface-${type})))`
          : `hsl(var(--surface-${type}))`,
      color:
        level !== undefined && level !== 'default'
          ? `hsl(var(--surface-${type}-${level}-text, var(--surface-${type}-text)))`
          : `hsl(var(--surface-${type}-text))`,
    },
  };
}

/**
 * 条件付きサーフェースクラスを生成
 * 状態に応じてサーフェースを切り替え
 */
export function getConditionalSurface(
  condition: boolean,
  trueVariant: SurfaceVariant,
  falseVariant: SurfaceVariant
): string {
  return condition ? `surface-${trueVariant}` : `surface-${falseVariant}`;
}

/**
 * 重要度に応じたサーフェースを選択
 */
export function getSurfaceByImportance(
  importance: 'low' | 'medium' | 'high'
): string {
  switch (importance) {
    case 'high':
      return 'surface-primary';
    case 'medium':
      return 'surface-accent';
    case 'low':
      return 'surface-neutral';
    default:
      return 'surface-neutral';
  }
}

/**
 * インタラクション状態に応じたサーフェース
 */
export function getInteractiveSurface(
  base: SurfaceType,
  isActive?: boolean,
  isHovered?: boolean,
  isDisabled?: boolean
): string {
  if (isDisabled) {
    return 'surface-neutral-0';
  }

  if (isActive) {
    return `surface-${base}-1`; // 暗いレベル
  }

  if (isHovered) {
    return `surface-${base}`;
  }

  return `surface-${base}-0`; // 明るいレベル
}

/**
 * React フック: 動的サーフェース管理
 */
export function useDynamicSurface(
  baseType: SurfaceType,
  options?: {
    isActive?: boolean;
    isHovered?: boolean;
    isDisabled?: boolean;
    importance?: 'low' | 'medium' | 'high';
  }
) {
  const { isActive, isHovered, isDisabled, importance } = options || {};

  // 重要度ベースの選択
  if (importance) {
    return getSurfaceByImportance(importance);
  }

  // インタラクション状態ベースの選択
  return getInteractiveSurface(baseType, isActive, isHovered, isDisabled);
}

/**
 * グラデーション用のサーフェースペア
 */
export function getGradientSurface(
  fromType: SurfaceType,
  toType: SurfaceType,
  fromLevel?: SurfaceLevel,
  toLevel?: SurfaceLevel
): string {
  const fromClass = getSurfaceClass(fromType, fromLevel);
  const toClass = getSurfaceClass(toType, toLevel);

  return `bg-gradient-to-r from-${fromClass.replace('surface-', 'surface-')} to-${toClass.replace('surface-', 'surface-')}`;
}

/**
 * アクセシビリティチェック用
 * サーフェースの組み合わせが適切かを検証
 */
export function validateSurfaceCombination(
  backgroundColor: SurfaceVariant,
  textSurface?: SurfaceVariant
): {
  isValid: boolean;
  recommendation?: string;
} {
  // 基本的な組み合わせルール
  const combinations = {
    primary: ['primary-text', 'accent-text'],
    'primary-0': ['primary-0-text', 'neutral-1'],
    'primary-1': ['primary-1-text', 'accent-0'],
    accent: ['accent-text', 'primary-text'],
    'accent-0': ['accent-0-text', 'neutral-1'],
    'accent-1': ['accent-1-text', 'primary-0'],
    neutral: ['neutral-text', 'primary'],
    'neutral-0': ['neutral-0-text', 'primary-1'],
    'neutral-1': ['neutral-1-text', 'accent-0'],
  };

  if (!textSurface) {
    return { isValid: true }; // 自動ペアなので問題なし
  }

  const validCombos =
    combinations[backgroundColor as keyof typeof combinations] || [];
  const isValid = validCombos.includes(textSurface);

  return {
    isValid,
    recommendation: isValid
      ? undefined
      : `推奨: ${validCombos[0]} または ${validCombos[1] || validCombos[0]}`,
  };
}

/**
 * デバッグ用: 現在のサーフェース値を取得
 */
export function getCurrentSurfaceValues(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const root = document.documentElement;
  const computedStyle = window.getComputedStyle(root);

  const surfaceTypes = ['primary', 'accent', 'neutral'];
  const levels = ['', '-0', '-1'];

  const values: Record<string, string> = {};

  surfaceTypes.forEach(type => {
    levels.forEach(level => {
      const bgVar = `--surface-${type}${level}`;
      const textVar = `--surface-${type}${level}-text`;

      values[`surface-${type}${level}`] = computedStyle
        .getPropertyValue(bgVar)
        .trim();
      values[`surface-${type}${level}-text`] = computedStyle
        .getPropertyValue(textVar)
        .trim();
    });
  });

  return values;
}

/**
 * TypeScript型安全性のための型ガード
 */
export function isSurfaceType(value: string): value is SurfaceType {
  return ['primary', 'accent', 'neutral'].includes(value);
}

export function isSurfaceLevel(value: string | number): value is SurfaceLevel {
  return [0, 1, 'default'].includes(value as SurfaceLevel);
}

export function isSurfaceVariant(value: string): value is SurfaceVariant {
  const validVariants = [
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
  return validVariants.includes(value);
}
