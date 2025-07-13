# ShutterHub v2 Design Tokens for Figma

## 概要

ShutterHub v2のカラーシステムをFigma Design Tokens形式で書き出したファイルです。

## ファイル構成

- `shutter-hub-tokens.json` - Figma Design Tokens形式のJSONファイル
- `color-preview.html` - 色見本確認用HTMLファイル
- `README.md` - このファイル

## Figmaでの使用方法

### 1. Figma Tokens Pluginのインストール

1. Figmaを開く
2. Plugins → Browse plugins in Community
3. "Figma Tokens" を検索してインストール

### 2. Design Tokensの読み込み

1. Figma Tokens Pluginを開く
2. "Settings" → "Import"
3. `shutter-hub-tokens.json` ファイルを選択
4. "Import" をクリック

### 3. カラーシステムの適用

- **ブランドカラー**: `global.brand.*`
- **セマンティックカラー**: `global.semantic.light.*` / `global.semantic.dark.*`
- **システムカラー**: `global.system.light.*` / `global.system.dark.*`

## カラーシステム構成

### ブランドカラー
- `primary`: #6F5091 （メインブランドカラー）
- `secondary`: #101820 （サブブランドカラー）

### セマンティックカラー
- `success`: 成功・空きあり状態
- `warning`: 注意・待機状態
- `info`: 情報・リンク
- `error`: エラー・満席状態
- `available`: 空きあり状態
- `booked`: 満席状態
- `pending`: 待機・保留状態

## 更新方法

1. `scripts/figma-tokens-export.js` を実行
2. 生成された `shutter-hub-tokens.json` をFigmaに再インポート

```bash
node scripts/figma-tokens-export.js
```

## 注意事項

- ライトモード・ダークモードの両方に対応
- CSS Variablesとの整合性を保持
- 既存のTailwindCSS設定と連動
