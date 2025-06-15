import { LayoutTemplate, LayoutCategory } from '@/types/photobook';

// 単一ページ用テンプレート
export const singlePageTemplates: LayoutTemplate[] = [
  // 写真1枚を大きく表示
  {
    id: 'single-large',
    name: '1枚大',
    description: '1枚の写真を大きく表示',
    photoPositions: [{ x: 5, y: 5, width: 90, height: 90 }],
  },
  // 写真2枚を縦に並べる
  {
    id: 'vertical-2',
    name: '縦2枚',
    description: '2枚の写真を縦に並べる',
    photoPositions: [
      { x: 5, y: 5, width: 90, height: 42.5 },
      { x: 5, y: 52.5, width: 90, height: 42.5 },
    ],
  },
  // 写真2枚を横に並べる
  {
    id: 'horizontal-2',
    name: '横2枚',
    description: '2枚の写真を横に並べる',
    photoPositions: [
      { x: 5, y: 5, width: 42.5, height: 90 },
      { x: 52.5, y: 5, width: 42.5, height: 90 },
    ],
  },
  // 写真3枚（メイン1枚、サブ2枚）
  {
    id: 'main-2sub',
    name: 'メイン+2枚',
    description: 'メインの写真1枚と小さな写真2枚',
    photoPositions: [
      { x: 5, y: 5, width: 90, height: 60 },
      { x: 5, y: 70, width: 42.5, height: 25 },
      { x: 52.5, y: 70, width: 42.5, height: 25 },
    ],
  },
  // 写真4枚をグリッド状に配置
  {
    id: 'grid-4',
    name: 'グリッド4枚',
    description: '4枚の写真をグリッド状に配置',
    photoPositions: [
      { x: 5, y: 5, width: 42.5, height: 42.5 },
      { x: 52.5, y: 5, width: 42.5, height: 42.5 },
      { x: 5, y: 52.5, width: 42.5, height: 42.5 },
      { x: 52.5, y: 52.5, width: 42.5, height: 42.5 },
    ],
  },
  // 写真6枚（メイン1枚、サブ5枚）
  {
    id: 'main-5sub',
    name: 'メイン+5枚',
    description: 'メインの写真1枚と小さな写真5枚',
    photoPositions: [
      { x: 5, y: 5, width: 60, height: 60 },
      { x: 70, y: 5, width: 25, height: 25 },
      { x: 70, y: 35, width: 25, height: 25 },
      { x: 70, y: 65, width: 25, height: 25 },
      { x: 5, y: 70, width: 28, height: 25 },
      { x: 38, y: 70, width: 28, height: 25 },
    ],
  },
];

// 見開き専用テンプレート（左右ページをまたぐレイアウト）
export const spreadTemplates: LayoutTemplate[] = [
  // 見開き1枚大きく
  {
    id: 'spread-large',
    name: '見開き大',
    description: '見開きページ全体に1枚の写真を表示',
    photoPositions: [{ x: 2, y: 5, width: 96, height: 90 }],
  },
  // 見開きメイン＋左右小
  {
    id: 'spread-main-sides',
    name: '見開きメイン＋左右',
    description: '見開き中央に大きな写真、左右に小さい写真',
    photoPositions: [
      { x: 25, y: 10, width: 50, height: 80 },
      { x: 2, y: 20, width: 20, height: 60 },
      { x: 78, y: 20, width: 20, height: 60 },
    ],
    isPremium: true,
  },
];

// プレミアムテンプレート
export const premiumTemplates: LayoutTemplate[] = [
  // コラージュスタイル（多数の写真をランダムに配置）
  {
    id: 'premium-collage',
    name: 'コラージュ',
    description: '6枚の写真をコラージュスタイルで表示',
    photoPositions: [
      { x: 5, y: 5, width: 30, height: 40, rotation: -5 },
      { x: 40, y: 10, width: 35, height: 25, rotation: 3 },
      { x: 75, y: 5, width: 20, height: 30, rotation: -2 },
      { x: 10, y: 50, width: 25, height: 35, rotation: 4 },
      { x: 40, y: 40, width: 40, height: 50, rotation: -3 },
      { x: 70, y: 55, width: 25, height: 35, rotation: 5 },
    ],
    isPremium: true,
  },
  // 写真9枚をグリッド状に配置
  {
    id: 'premium-grid-9',
    name: 'グリッド9枚',
    description: '9枚の写真をグリッド状に配置',
    photoPositions: [
      { x: 5, y: 5, width: 28, height: 28 },
      { x: 36, y: 5, width: 28, height: 28 },
      { x: 67, y: 5, width: 28, height: 28 },
      { x: 5, y: 36, width: 28, height: 28 },
      { x: 36, y: 36, width: 28, height: 28 },
      { x: 67, y: 36, width: 28, height: 28 },
      { x: 5, y: 67, width: 28, height: 28 },
      { x: 36, y: 67, width: 28, height: 28 },
      { x: 67, y: 67, width: 28, height: 28 },
    ],
    isPremium: true,
  },
];

// カテゴリー定義
export const layoutCategories: LayoutCategory[] = [
  {
    id: 'basic',
    name: '基本レイアウト',
    description: '基本的なページレイアウト',
    thumbnailUrl: '/images/layouts/basic-thumbnail.jpg',
    templates: singlePageTemplates,
  },
  {
    id: 'spread',
    name: '見開きレイアウト',
    description: '見開きページを活用したレイアウト',
    thumbnailUrl: '/images/layouts/spread-thumbnail.jpg',
    templates: spreadTemplates,
  },
  {
    id: 'premium',
    name: 'プレミアムレイアウト',
    description: '有料会員専用の特別レイアウト',
    thumbnailUrl: '/images/layouts/premium-thumbnail.jpg',
    templates: premiumTemplates,
  },
];

// 全テンプレートのフラットな配列
export const allTemplates: LayoutTemplate[] = [
  ...singlePageTemplates,
  ...spreadTemplates,
  ...premiumTemplates,
];

// テンプレートID取得用ヘルパー関数
export const getTemplateById = (id: string): LayoutTemplate | undefined => {
  return allTemplates.find(template => template.id === id);
};
