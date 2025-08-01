import * as React from 'react';
import { Button, ButtonProps } from './button';

/**
 * テーマ対応ボタンの専用プロパティ
 */
export interface ThemeButtonProps
  extends Omit<ButtonProps, 'variant' | 'colorMode'> {
  /**
   * ボタンの基本バリアント
   * テーマ色で自動的にスタイリングされます
   */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'outline'
    | 'ghost'
    | 'link';

  /**
   * カラーモード
   * - 'standard': 従来のshadcn/ui色を使用
   * - 'theme': 現在のテーマ色を使用（デフォルト）
   */
  colorMode?: 'standard' | 'theme';
}

/**
 * テーマ対応ボタンコンポーネント
 *
 * 現在適用されているテーマ色を自動的に使用し、
 * ダーク・ライトモードに対応したボタンを提供します。
 *
 * @example
 * ```tsx
 * // テーマのプライマリ色を使用
 * <ThemeButton variant="primary">保存</ThemeButton>
 *
 * // テーマのアクセント色を使用
 * <ThemeButton variant="accent">削除</ThemeButton>
 *
 * // 標準色を使用（従来通り）
 * <ThemeButton variant="primary" colorMode="standard">保存</ThemeButton>
 * ```
 */
const ThemeButton = React.forwardRef<HTMLButtonElement, ThemeButtonProps>(
  ({ variant = 'default', colorMode = 'theme', className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant as ButtonProps['variant']}
        colorMode={colorMode}
        className={className}
        {...props}
      />
    );
  }
);
ThemeButton.displayName = 'ThemeButton';

/**
 * テーマボタンの使用例コンポーネント
 * 開発・デバッグ用のプレビューコンポーネント
 */
export function ThemeButtonPreview() {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-theme-text-primary mb-2">
          ThemeButton コンポーネント
        </h3>
        <p className="text-theme-text-secondary">
          現在のテーマカラーが自動適用されます
        </p>
      </div>

      {/* 基本バリアント */}
      <div className="space-y-3">
        <h4 className="font-medium text-theme-text-primary">基本バリアント</h4>
        <div className="flex gap-3 flex-wrap">
          <ThemeButton variant="primary">Primary</ThemeButton>
          <ThemeButton variant="secondary">Secondary</ThemeButton>
          <ThemeButton variant="accent">Accent</ThemeButton>
          <ThemeButton variant="outline">Outline</ThemeButton>
          <ThemeButton variant="ghost">Ghost</ThemeButton>
          <ThemeButton variant="link">Link</ThemeButton>
        </div>
      </div>

      {/* サイズバリエーション */}
      <div className="space-y-3">
        <h4 className="font-medium text-theme-text-primary">
          サイズバリエーション
        </h4>
        <div className="flex gap-3 items-center flex-wrap">
          <ThemeButton variant="primary" size="sm">
            Small
          </ThemeButton>
          <ThemeButton variant="primary" size="default">
            Default
          </ThemeButton>
          <ThemeButton variant="primary" size="lg">
            Large
          </ThemeButton>
        </div>
      </div>

      {/* 標準色との比較 */}
      <div className="space-y-3">
        <h4 className="font-medium text-theme-text-primary">
          カラーモード比較
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-theme-text-secondary">
              テーマ色（推奨）
            </p>
            <div className="flex gap-2 flex-wrap">
              <ThemeButton variant="primary" colorMode="theme">
                Theme
              </ThemeButton>
              <ThemeButton variant="outline" colorMode="theme">
                Theme
              </ThemeButton>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-theme-text-secondary">標準色</p>
            <div className="flex gap-2 flex-wrap">
              <ThemeButton variant="primary" colorMode="standard">
                Standard
              </ThemeButton>
              <ThemeButton variant="outline" colorMode="standard">
                Standard
              </ThemeButton>
            </div>
          </div>
        </div>
      </div>

      {/* 状態バリエーション */}
      <div className="space-y-3">
        <h4 className="font-medium text-theme-text-primary">
          状態バリエーション
        </h4>
        <div className="flex gap-3 flex-wrap">
          <ThemeButton variant="primary">通常</ThemeButton>
          <ThemeButton variant="primary" disabled>
            無効
          </ThemeButton>
        </div>
      </div>
    </div>
  );
}

export { ThemeButton };
