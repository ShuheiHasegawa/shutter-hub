/**
 * ShutterHub v2 Design Tokens Export for Figma
 *
 * 現在のカラーシステムをFigma Design Tokens形式で書き出し
 * 用途: デザイン・開発連携の強化、デザインシステム統一
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HSL値をHEX値に変換するユーティリティ
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// CSS Variables（HSL）をHEX値に変換
function parseHslToHex(hslString) {
  const matches = hslString.match(
    /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/
  );
  if (!matches) return hslString;

  const [, h, s, l] = matches;
  return hslToHex(parseFloat(h), parseFloat(s), parseFloat(l));
}

// ShutterHub v2 カラーシステム定義
const shutterHubColors = {
  // ブランドカラー（固定値）
  brand: {
    primary: '#6F5091',
    'primary-light': '#8B6BB1',
    'primary-dark': '#5A4073',
    secondary: '#101820',
    'secondary-light': '#2A2A2A',
  },

  // セマンティックカラー（ライトモード）
  semantic: {
    light: {
      success: parseHslToHex('142 71% 45%'),
      warning: parseHslToHex('43 96% 56%'),
      info: parseHslToHex('217 91% 60%'),
      error: parseHslToHex('0 84% 60%'),
      available: parseHslToHex('142 71% 45%'),
      booked: parseHslToHex('0 84% 60%'),
      pending: parseHslToHex('43 96% 56%'),
    },
    dark: {
      success: parseHslToHex('142 71% 45%'),
      warning: parseHslToHex('43 96% 40%'),
      info: parseHslToHex('217 91% 55%'),
      error: parseHslToHex('0 84% 55%'),
      available: parseHslToHex('142 71% 45%'),
      booked: parseHslToHex('0 84% 55%'),
      pending: parseHslToHex('43 96% 40%'),
    },
  },

  // Shadcn/ui システムカラー（ライトモード）
  system: {
    light: {
      background: parseHslToHex('0 0% 100%'),
      foreground: parseHslToHex('222.2 84% 4.9%'),
      card: parseHslToHex('0 0% 100%'),
      'card-foreground': parseHslToHex('222.2 84% 4.9%'),
      primary: parseHslToHex('222.2 47.4% 11.2%'),
      'primary-foreground': parseHslToHex('210 40% 98%'),
      secondary: parseHslToHex('210 40% 96.1%'),
      'secondary-foreground': parseHslToHex('222.2 47.4% 11.2%'),
      muted: parseHslToHex('210 40% 96.1%'),
      'muted-foreground': parseHslToHex('215.4 16.3% 46.9%'),
      border: parseHslToHex('214.3 31.8% 91.4%'),
    },
    dark: {
      background: parseHslToHex('222.2 84% 4.9%'),
      foreground: parseHslToHex('210 40% 98%'),
      card: parseHslToHex('222.2 84% 4.9%'),
      'card-foreground': parseHslToHex('210 40% 98%'),
      primary: parseHslToHex('210 40% 98%'),
      'primary-foreground': parseHslToHex('222.2 47.4% 11.2%'),
      secondary: parseHslToHex('217.2 32.6% 17.5%'),
      'secondary-foreground': parseHslToHex('210 40% 98%'),
      muted: parseHslToHex('217.2 32.6% 17.5%'),
      'muted-foreground': parseHslToHex('215 20.2% 65.1%'),
      border: parseHslToHex('217.2 32.6% 17.5%'),
    },
  },
};

// Figma Design Tokens形式に変換
function generateFigmaTokens() {
  const tokens = {
    global: {
      // ブランドカラー
      brand: {},
      // セマンティックカラー
      semantic: {},
      // システムカラー
      system: {},
    },
  };

  // ブランドカラーの変換
  Object.entries(shutterHubColors.brand).forEach(([key, value]) => {
    tokens.global.brand[key] = {
      value: value,
      type: 'color',
      description: `ShutterHub brand color: ${key}`,
    };
  });

  // セマンティックカラーの変換（ライト・ダーク）
  ['light', 'dark'].forEach(mode => {
    tokens.global.semantic[mode] = {};
    Object.entries(shutterHubColors.semantic[mode]).forEach(([key, value]) => {
      tokens.global.semantic[mode][key] = {
        value: value,
        type: 'color',
        description: `Semantic color for ${key} in ${mode} mode`,
      };
    });
  });

  // システムカラーの変換（ライト・ダーク）
  ['light', 'dark'].forEach(mode => {
    tokens.global.system[mode] = {};
    Object.entries(shutterHubColors.system[mode]).forEach(([key, value]) => {
      tokens.global.system[mode][key] = {
        value: value,
        type: 'color',
        description: `System color for ${key} in ${mode} mode`,
      };
    });
  });

  return tokens;
}

// Figma Design Tokens JSON生成
function exportToFigma() {
  const tokens = generateFigmaTokens();

  // 出力ディレクトリ作成
  const outputDir = path.join(__dirname, '..', 'figma-tokens');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Design Tokens JSON書き出し
  const tokensPath = path.join(outputDir, 'shutter-hub-tokens.json');
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

  // 色見本HTML生成（確認用）
  const colorPreviewHtml = generateColorPreviewHtml(tokens);
  const previewPath = path.join(outputDir, 'color-preview.html');
  fs.writeFileSync(previewPath, colorPreviewHtml);

  // 使用方法のREADME生成
  const readmePath = path.join(outputDir, 'README.md');
  fs.writeFileSync(readmePath, generateReadme());

  console.log('✅ Figma Design Tokens書き出し完了:');
  console.log(`📁 出力ディレクトリ: ${outputDir}`);
  console.log(`🎨 Design Tokens: ${tokensPath}`);
  console.log(`👀 色見本HTML: ${previewPath}`);
  console.log(`📖 使用方法: ${readmePath}`);
}

// 色見本HTML生成
function generateColorPreviewHtml(tokens) {
  let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShutterHub v2 カラーシステム</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
    .section { margin-bottom: 40px; }
    .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .color-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .color-swatch { width: 100%; height: 60px; border-radius: 4px; margin-bottom: 8px; }
    .color-name { font-weight: 600; margin-bottom: 4px; }
    .color-value { font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; color: #6b7280; }
    .mode-toggle { margin-bottom: 20px; }
    .dark-mode { background: #1f2937; color: #f9fafb; }
    .dark-mode .color-card { border-color: #374151; background: #374151; }
  </style>
</head>
<body>
  <h1>ShutterHub v2 カラーシステム</h1>
  <div class="mode-toggle">
    <button onclick="toggleMode()">ダークモード切り替え</button>
  </div>
`;

  // ブランドカラー
  html += `
  <div class="section">
    <h2>ブランドカラー</h2>
    <div class="color-grid">
`;
  Object.entries(tokens.global.brand).forEach(([key, token]) => {
    html += `
      <div class="color-card">
        <div class="color-swatch" style="background-color: ${token.value}"></div>
        <div class="color-name">${key}</div>
        <div class="color-value">${token.value}</div>
      </div>
    `;
  });
  html += `    </div>
  </div>`;

  // セマンティックカラー（ライトモード）
  html += `
  <div class="section">
    <h2>セマンティックカラー（ライトモード）</h2>
    <div class="color-grid">
`;
  Object.entries(tokens.global.semantic.light).forEach(([key, token]) => {
    html += `
      <div class="color-card">
        <div class="color-swatch" style="background-color: ${token.value}"></div>
        <div class="color-name">${key}</div>
        <div class="color-value">${token.value}</div>
      </div>
    `;
  });
  html += `    </div>
  </div>`;

  html += `
  <script>
    function toggleMode() {
      document.body.classList.toggle('dark-mode');
    }
  </script>
</body>
</html>`;

  return html;
}

// README生成
function generateReadme() {
  return `# ShutterHub v2 Design Tokens for Figma

## 概要

ShutterHub v2のカラーシステムをFigma Design Tokens形式で書き出したファイルです。

## ファイル構成

- \`shutter-hub-tokens.json\` - Figma Design Tokens形式のJSONファイル
- \`color-preview.html\` - 色見本確認用HTMLファイル
- \`README.md\` - このファイル

## Figmaでの使用方法

### 1. Figma Tokens Pluginのインストール

1. Figmaを開く
2. Plugins → Browse plugins in Community
3. "Figma Tokens" を検索してインストール

### 2. Design Tokensの読み込み

1. Figma Tokens Pluginを開く
2. "Settings" → "Import"
3. \`shutter-hub-tokens.json\` ファイルを選択
4. "Import" をクリック

### 3. カラーシステムの適用

- **ブランドカラー**: \`global.brand.*\`
- **セマンティックカラー**: \`global.semantic.light.*\` / \`global.semantic.dark.*\`
- **システムカラー**: \`global.system.light.*\` / \`global.system.dark.*\`

## カラーシステム構成

### ブランドカラー
- \`primary\`: #6F5091 （メインブランドカラー）
- \`secondary\`: #101820 （サブブランドカラー）

### セマンティックカラー
- \`success\`: 成功・空きあり状態
- \`warning\`: 注意・待機状態
- \`info\`: 情報・リンク
- \`error\`: エラー・満席状態
- \`available\`: 空きあり状態
- \`booked\`: 満席状態
- \`pending\`: 待機・保留状態

## 更新方法

1. \`scripts/figma-tokens-export.js\` を実行
2. 生成された \`shutter-hub-tokens.json\` をFigmaに再インポート

\`\`\`bash
node scripts/figma-tokens-export.js
\`\`\`

## 注意事項

- ライトモード・ダークモードの両方に対応
- CSS Variablesとの整合性を保持
- 既存のTailwindCSS設定と連動
`;
}

// スクリプト実行（ES6モジュール対応）
if (import.meta.url === `file://${process.argv[1]}`) {
  exportToFigma();
}

export { generateFigmaTokens, exportToFigma, shutterHubColors };
