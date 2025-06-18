# ActionBar コンポーネント

固定フッター型アクションバーコンポーネント。main要素内の下部に固定表示され、サイドバーを避けて配置されるアクションボタンバー。

## 特徴

- ✅ **main要素内固定表示**（サイドバーを避ける）
- ✅ **レスポンシブサイドバー対応**（デスクトップ: left-64、モバイル: left-0）
- ✅ 等間隔の列表示（1-4列対応）
- ✅ ローディング状態対応
- ✅ アイコン対応
- ✅ 柔軟なボタンスタイリング
- ✅ 背景ブラー効果
- ✅ ActionBarSpacerによる余白調整

## レイアウト配置

```
┌─────────────────────────────────────┐
│ DashboardLayout                     │
├──────────┬──────────────────────────┤
│ Sidebar  │ Main Content Area        │
│ (w-64)   │                          │
│          │  ┌─────────────────────┐ │
│          │  │ Page Content        │ │
│          │  │                     │ │
│          │  │                     │ │
│          │  └─────────────────────┘ │
│          │  ┌─────────────────────┐ │
│          │  │ ActionBar (fixed)   │ │ ← main要素内に固定
│          │  └─────────────────────┘ │
└──────────┴──────────────────────────┘
```

## 使用方法

### 基本的な使用例

```tsx
import { ActionBar, ActionBarButton, ActionBarSpacer } from '@/components/ui/action-bar';
import { CreditCard, Calendar } from 'lucide-react';

const actions: ActionBarButton[] = [
  {
    id: 'reserve',
    label: '予約する',
    variant: 'default',
    onClick: () => console.log('Reserve'),
    icon: <CreditCard className="h-4 w-4" />,
    className: 'bg-blue-600 hover:bg-blue-700',
  },
];

// JSX
<div>
  {/* メインコンテンツ */}
  <div>コンテンツ...</div>
  
  {/* 固定フッターがある場合のスペーサー */}
  <ActionBarSpacer />
  
  {/* 固定フッターアクションバー（main要素内に固定） */}
  <ActionBar
    actions={actions}
    maxColumns={1}
    background="blur"
    sticky={true}
  />
</div>
```

### 撮影会詳細ページでの使用例

```tsx
// 予約可能状態の判定
const canBook = !isOrganizer && !isParticipant && isUpcoming && user;

// アクションバーのボタン設定
const getActionBarButtons = (): ActionBarButton[] => {
  if (!canBook) return [];

  if (hasSlots) {
    return [
      {
        id: 'select-slot',
        label: '時間枠を選択',
        variant: 'default',
        onClick: () => {
          // スロット選択エリアにスクロール
          const slotsElement = document.getElementById('slots-section');
          if (slotsElement) {
            slotsElement.scrollIntoView({ behavior: 'smooth' });
          }
        },
        icon: <Calendar className="h-4 w-4" />,
        className: 'bg-blue-600 hover:bg-blue-700',
      },
    ];
  } else {
    return [
      {
        id: 'book-now',
        label: isFull ? 'キャンセル待ちに登録' : '予約する',
        variant: 'default',
        onClick: () => setShowBookingForm(true), // 詳細予約フォームを表示
        icon: <CreditCard className="h-4 w-4" />,
        className: 'bg-blue-600 hover:bg-blue-700',
      },
    ];
  }
};

// JSX - main要素内に配置
{canBook && <ActionBarSpacer />}
{canBook && (
  <ActionBar
    actions={getActionBarButtons()}
    maxColumns={1}
    background="blur"
  />
)}
```

### プロフィール編集での使用例

```tsx
const profileActions: ActionBarButton[] = [
  {
    id: 'cancel',
    label: 'キャンセル',
    variant: 'outline',
    onClick: () => router.back(),
    className: 'border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  {
    id: 'save',
    label: '保存',
    variant: 'default',
    onClick: form.handleSubmit(onSubmit),
    loading: isLoading,
    icon: <Save className="h-4 w-4" />,
    className: 'bg-blue-600 hover:bg-blue-700',
  },
];

// JSX
<ActionBar
  actions={profileActions}
  maxColumns={2}
  background="blur"
/>
```

## Props

### ActionBar

| プロパティ | 型 | デフォルト | 説明 |
|------------|----|-----------|----|
| `actions` | `ActionBarButton[]` | 必須 | 表示するアクションボタンの配列 |
| `className` | `string` | - | 追加のCSSクラス |
| `sticky` | `boolean` | `true` | main要素内の下部に固定表示するか |
| `maxColumns` | `1 \| 2 \| 3 \| 4` | `2` | 最大列数 |
| `background` | `'default' \| 'blur' \| 'solid'` | `'blur'` | 背景スタイル |

### ActionBarButton

| プロパティ | 型 | デフォルト | 説明 |
|------------|----|-----------|----|
| `id` | `string` | 必須 | ボタンの一意識別子 |
| `label` | `string` | 必須 | ボタンのラベル |
| `onClick` | `() => void` | 必須 | クリック時のハンドラー |
| `variant` | Button variant | `'default'` | ボタンのスタイル |
| `size` | Button size | `'lg'` | ボタンのサイズ |
| `disabled` | `boolean` | `false` | 無効状態 |
| `loading` | `boolean` | `false` | ローディング状態 |
| `icon` | `ReactNode` | - | アイコン |
| `className` | `string` | - | 追加のCSSクラス |

## スタイリングオプション

### 背景スタイル

```tsx
// ブラー効果（推奨）
<ActionBar background="blur" />

// ソリッド背景
<ActionBar background="solid" />

// デフォルト
<ActionBar background="default" />
```

### 列数設定

```tsx
// 1列表示（フルワイド）
<ActionBar maxColumns={1} />

// 2列表示（推奨）
<ActionBar maxColumns={2} />

// 3列表示
<ActionBar maxColumns={3} />

// 4列表示
<ActionBar maxColumns={4} />
```

### カスタムスタイリング

```tsx
const customActions: ActionBarButton[] = [
  {
    id: 'primary',
    label: 'プライマリ',
    variant: 'default',
    onClick: () => {},
    className: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
  },
  {
    id: 'secondary',
    label: 'セカンダリ',
    variant: 'outline',
    onClick: () => {},
    className: 'border-2 border-gray-300 hover:border-gray-400',
  },
];
```

## 使用ケース

- **撮影会詳細ページ**: 予約ボタンの常時表示（詳細フォームへのエントリーポイント）
- **プロフィール編集**: 保存・キャンセルボタン
- **商品詳細ページ**: カート追加・購入ボタン
- **フォーム画面**: 送信・リセットボタン
- **記事詳細**: いいね・シェアボタン

## レスポンシブ動作

### デスクトップ（md以上）
- サイドバー幅（256px）を避けて `left-64` で配置
- main要素内の右端まで表示

### モバイル（mdより小さい）
- `left-0` で画面左端から配置
- サイドバーはモバイルメニューとして非表示

## 注意事項

1. **ActionBarSpacerの使用**: 固定フッターがコンテンツにかぶらないよう、必ずActionBarSpacerを配置
2. **main要素内配置**: DashboardLayout構造でのみ適切に動作
3. **サイドバー考慮**: デスクトップでサイドバー（w-64）を避ける配置
4. **アクセシビリティ**: ボタンには適切なaria-labelを設定
5. **モバイル対応**: タッチ操作を考慮した十分なボタンサイズ（h-12）
6. **背景透過**: コンテンツが見えるよう背景にブラー効果を使用

## 技術詳細

- **z-index**: `z-40`で他のコンテンツより前面に表示
- **位置指定**: `fixed bottom-0 right-0` + `left-0 md:left-64`
- **backdrop-blur**: CSS backdrop-filterでブラー効果
- **Container**: 最大幅4xlでセンタリング
- **Grid**: CSS Gridで等間隔配置
- **Position**: main要素内の下部に固定

## ActionBarとActionSheetの使い分け

| 機能 | ActionBar | ActionSheet |
|------|-----------|-------------|
| 表示方式 | 常時固定表示 | クリック時モーダル |
| 用途 | 主要アクション | 詳細オプション |
| 位置 | main要素内下部 | 画面下部フルワイド |
| 例 | 予約ボタン | 保存・キャンセル選択 | 