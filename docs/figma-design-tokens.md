# ShutterHub v2 Figma Design Tokens 連携ガイド

## 概要

ShutterHub v2のカラーシステムをFigma Design Tokens形式で書き出し、デザイン・開発の連携を強化するシステムです。

## 特徴

- **完全自動化**: 現在のCSS Variables → Figma Tokens形式への変換
- **ライト・ダークモード対応**: 両モードのカラーを自動生成
- **セマンティックカラー**: success, warning, info, errorなどの意味別カラー
- **ブランドカラー統一**: #6F5091 (primary), #101820 (secondary)
- **視覚的確認**: HTMLプレビューで色見本を確認可能

## 生成されるファイル

```
figma-tokens/
├── shutter-hub-tokens.json    # Figma Design Tokens JSON
├── color-preview.html          # 色見本プレビュー
└── README.md                   # 使用方法ガイド
```

## 使用方法

### 1. Design Tokens生成

```bash
npm run figma:export
```

### 2. Figmaでの読み込み

1. **Figma Tokens Plugin** をインストール
   - Figma → Plugins → Browse plugins in Community
   - "Figma Tokens" を検索してインストール

2. **Design Tokens読み込み**
   - Figma Tokens Plugin を開く
   - "Settings" → "Import"
   - `figma-tokens/shutter-hub-tokens.json` を選択
   - "Import" をクリック

3. **カラーシステム適用**
   - ブランドカラー: `global.brand.*`
   - セマンティックカラー: `global.semantic.light.*` / `global.semantic.dark.*`
   - システムカラー: `global.system.light.*` / `global.system.dark.*`

## カラーシステム構成

### ブランドカラー
```
primary: #6F5091          # メインブランドカラー（紫）
primary-light: #8B6BB1    # ライトバリエーション
primary-dark: #5A4073     # ダークバリエーション
secondary: #101820        # セカンダリー（ダークグレー）
secondary-light: #2A2A2A  # ライトバリエーション
```

### セマンティックカラー
```
success: #21c45d    # 成功・空きあり（緑系）
warning: #fbbd23    # 注意・待機状態（黄系）
info: #3c83f6       # 情報・リンク（青系）
error: #ef4343      # エラー・満席（赤系）
available: #21c45d  # 空きあり状態
booked: #ef4343     # 満席状態
pending: #fbbd23    # 待機・保留状態
```

### システムカラー（Shadcn/ui）
```
background: #ffffff     # 背景色
foreground: #0f172a     # 前景色
card: #ffffff           # カード背景
border: #e2e8f0         # ボーダー
muted: #f1f5f9          # ミュート背景
... (ライト・ダークモード両対応)
```

## 開発ワークフロー

### 1. カラー変更時の手順

1. **CSS Variables更新** (`src/app/globals.css`)
2. **Design Tokens再生成** (`npm run figma:export`)
3. **Figmaに再インポート** (上記手順2)
4. **デザイン更新** (Figmaでデザイン調整)
5. **実装反映** (Figmaデザインを元に実装)

### 2. 新しいセマンティックカラー追加

1. **スクリプト更新** (`scripts/figma-tokens-export.js`)
2. **CSS Variables追加** (`src/app/globals.css`)
3. **TailwindCSS設定更新** (`tailwind.config.ts`)
4. **Design Tokens再生成** (`npm run figma:export`)

## 技術詳細

### HSL → HEX変換

CSS VariablesのHSL値を自動的にHEX値に変換：

```javascript
// 例: '142 71% 45%' → '#21c45d'
parseHslToHex('142 71% 45%')
```

### Figma Tokens形式

```json
{
  "global": {
    "brand": {
      "primary": {
        "value": "#6F5091",
        "type": "color",
        "description": "ShutterHub brand color: primary"
      }
    }
  }
}
```

## 今後の拡張予定

### Phase 2: フォント・タイポグラフィ
- フォントファミリー: Inter, Noto Sans JP
- フォントサイズ: TailwindCSSサイズスケール
- 行間・文字間隔: デザインシステム統一

### Phase 3: スペーシング・レイアウト
- マージン・パディング: TailwindCSSスペーシング
- ボーダー半径: `--radius` CSS Variable
- シャドウ: Shadcn/uiシャドウシステム

### Phase 4: コンポーネントトークン
- ボタン: サイズ・バリアント・状態
- カード: パディング・ボーダー・シャドウ
- フォーム: 入力フィールド・ラベル・エラー

## トラブルシューティング

### よくある問題

1. **色が正しく表示されない**
   - HSL → HEX変換の確認
   - CSS Variablesの値をチェック

2. **Figma Pluginで読み込めない**
   - JSONファイルの形式を確認
   - Figma Tokens Pluginの最新版を使用

3. **ダークモードの色が反映されない**
   - `global.semantic.dark.*` の使用を確認
   - ライト・ダークモードの切り替え設定

### デバッグ方法

1. **色見本HTML確認** (`figma-tokens/color-preview.html`)
2. **JSON構造確認** (`figma-tokens/shutter-hub-tokens.json`)
3. **コンソールログ確認** (スクリプト実行時)

## 貢献・改善

### 新機能提案
- フォント・スペーシング対応
- コンポーネントレベルのトークン
- 自動同期システム

### バグ報告
- カラー変換の不具合
- Figma連携の問題
- ドキュメントの改善提案

---

このシステムにより、デザイナーと開発者の連携が大幅に改善され、一貫したデザインシステムの維持が可能になります。 