/**
 * ShutterHub v2 カラーパレット SVG 自動生成
 *
 * FigmaにアップロードするためのカラーパレットSVGを生成
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ShutterHub v2 カラーシステム
const colorSystem = {
  brand: {
    primary: { hex: '#6F5091', name: 'Primary', description: 'メインパープル' },
    primaryLight: {
      hex: '#8B6BB1',
      name: 'Primary Light',
      description: 'ライトパープル',
    },
    primaryDark: {
      hex: '#5A4073',
      name: 'Primary Dark',
      description: 'ダークパープル',
    },
    secondary: {
      hex: '#101820',
      name: 'Secondary',
      description: 'ダークグレー',
    },
    secondaryLight: {
      hex: '#2A2A2A',
      name: 'Secondary Light',
      description: 'ライトグレー',
    },
  },
  semantic: {
    success: { hex: '#21c45d', name: 'Success', description: '成功・空きあり' },
    warning: { hex: '#fbbd23', name: 'Warning', description: '注意・待機' },
    info: { hex: '#3c83f6', name: 'Info', description: '情報・リンク' },
    error: { hex: '#ef4343', name: 'Error', description: 'エラー・満席' },
  },
  state: {
    available: {
      hex: '#21c45d',
      name: 'Available',
      description: '空きあり状態',
    },
    booked: { hex: '#ef4343', name: 'Booked', description: '満席状態' },
    pending: { hex: '#fbbd23', name: 'Pending', description: '待機・保留状態' },
  },
};

// テキストの色を自動判定（背景色に応じて白/黒）
function getTextColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

// カラーサンプルSVG要素を生成
function generateColorSample(color, x, y, width = 120, height = 120) {
  const textColor = getTextColor(color.hex);
  const fontSize = 12;
  const textY = y + height / 2;

  return `
    <!-- ${color.name} Color Sample -->
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" 
            fill="${color.hex}" stroke="#E5E7EB" stroke-width="1" rx="8"/>
      <text x="${x + width / 2}" y="${textY - 8}" 
            font-family="Inter, system-ui, sans-serif" 
            font-size="${fontSize}" font-weight="600"
            fill="${textColor}" text-anchor="middle">${color.name}</text>
      <text x="${x + width / 2}" y="${textY + 8}" 
            font-family="Inter, system-ui, sans-serif" 
            font-size="${fontSize - 2}" 
            fill="${textColor}" text-anchor="middle">${color.hex}</text>
      <text x="${x + width / 2}" y="${textY + 24}" 
            font-family="Inter, system-ui, sans-serif" 
            font-size="${fontSize - 3}" 
            fill="${textColor}" text-anchor="middle" opacity="0.8">${color.description}</text>
    </g>`;
}

// セクションタイトルを生成
function generateSectionTitle(title, x, y) {
  return `
    <text x="${x}" y="${y}" 
          font-family="Inter, system-ui, sans-serif" 
          font-size="18" font-weight="700"
          fill="#1F2937">${title}</text>`;
}

// カラーパレット全体のSVGを生成
function generateColorPaletteSVG() {
  const sampleWidth = 120;
  const sampleHeight = 120;
  const spacing = 20;
  const sectionSpacing = 60;
  const titleHeight = 40;

  let currentY = 40;
  let svgElements = [];

  // SVGヘッダー
  svgElements.push(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" viewBox="0 0 800 600" 
     xmlns="http://www.w3.org/2000/svg">
  
  <!-- Background -->
  <rect width="800" height="600" fill="#FFFFFF"/>
  
  <!-- Title -->
  <text x="40" y="30" 
        font-family="Inter, system-ui, sans-serif" 
        font-size="24" font-weight="800"
        fill="#1F2937">ShutterHub v2 Color Palette</text>`);

  // ブランドカラーセクション
  currentY += titleHeight;
  svgElements.push(generateSectionTitle('Brand Colors', 40, currentY));
  currentY += titleHeight;

  let x = 40;
  Object.values(colorSystem.brand).forEach((color, index) => {
    svgElements.push(
      generateColorSample(color, x, currentY, sampleWidth, sampleHeight)
    );
    x += sampleWidth + spacing;
    if ((index + 1) % 3 === 0) {
      x = 40;
      currentY += sampleHeight + spacing;
    }
  });

  // セマンティックカラーセクション
  currentY += sectionSpacing;
  svgElements.push(generateSectionTitle('Semantic Colors', 40, currentY));
  currentY += titleHeight;

  x = 40;
  Object.values(colorSystem.semantic).forEach(color => {
    svgElements.push(
      generateColorSample(color, x, currentY, sampleWidth, sampleHeight)
    );
    x += sampleWidth + spacing;
  });

  // 状態カラーセクション
  currentY += sampleHeight + sectionSpacing;
  svgElements.push(generateSectionTitle('State Colors', 40, currentY));
  currentY += titleHeight;

  x = 40;
  Object.values(colorSystem.state).forEach(color => {
    svgElements.push(
      generateColorSample(color, x, currentY, sampleWidth, sampleHeight)
    );
    x += sampleWidth + spacing;
  });

  // SVGフッター
  svgElements.push('</svg>');

  return svgElements.join('\n');
}

// メイン実行関数
function main() {
  try {
    console.log('🎨 ShutterHub v2 カラーパレット SVG 生成開始...');

    // 出力ディレクトリ作成
    const outputDir = path.join(__dirname, '..', 'figma-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // SVG生成
    const svg = generateColorPaletteSVG();

    // ファイル保存
    const svgPath = path.join(outputDir, 'shutter-hub-color-palette.svg');
    fs.writeFileSync(svgPath, svg, 'utf8');

    console.log('✅ カラーパレット SVG 生成完了!');
    console.log(`📁 保存先: ${svgPath}`);

    // カラー情報サマリー
    const totalColors =
      Object.keys(colorSystem.brand).length +
      Object.keys(colorSystem.semantic).length +
      Object.keys(colorSystem.state).length;

    console.log(`\n📊 生成された色数:`);
    console.log(
      `   ブランドカラー: ${Object.keys(colorSystem.brand).length}色`
    );
    console.log(
      `   セマンティックカラー: ${Object.keys(colorSystem.semantic).length}色`
    );
    console.log(`   状態カラー: ${Object.keys(colorSystem.state).length}色`);
    console.log(`   合計: ${totalColors}色`);

    console.log(`\n🎯 次のステップ:`);
    console.log(`   1. 生成されたSVGファイルを確認`);
    console.log(`   2. FigmaにSVGをアップロード`);
    console.log(`   3. MCP連携で結果を確認`);

    return svgPath;
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as generateColorPaletteSVG };
