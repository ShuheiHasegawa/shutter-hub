# ActionBar コンポーネント

固定フッター型アクションバーコンポーネント。画面下部に固定表示されるアクションボタンバー。

## 特徴

- ✅ 固定フッター表示（常時表示）
- ✅ 等間隔の列表示（1-4列対応）
- ✅ レスポンシブ対応
- ✅ ローディング状態対応
- ✅ アイコン対応
- ✅ 柔軟なボタンスタイリング
- ✅ 背景ブラー効果
- ✅ ActionBarSpacerによる余白調整

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
  
  {/* 固定フッターアクションバー */}
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
        onClick: () => setShowBookingForm(true),
        icon: <CreditCard className="h-4 w-4" />,
        className: 'bg-blue-600 hover:bg-blue-700',
      },
    ];
  }
};

// JSX
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
| `sticky` | `boolean` | `true` | 画面下部に固定表示するか |
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

- **撮影会詳細ページ**: 予約ボタンの常時表示
- **プロフィール編集**: 保存・キャンセルボタン
- **商品詳細ページ**: カート追加・購入ボタン
- **フォーム画面**: 送信・リセットボタン
- **記事詳細**: いいね・シェアボタン

## 注意事項

1. **ActionBarSpacerの使用**: 固定フッターがコンテンツにかぶらないよう、必ずActionBarSpacerを配置
2. **アクセシビリティ**: ボタンには適切なaria-labelを設定
3. **モバイル対応**: タッチ操作を考慮した十分なボタンサイズ（h-12）
4. **背景透過**: コンテンツが見えるよう背景にブラー効果を使用

## 技術詳細

- **z-index**: `z-40`で他のコンテンツより前面に表示
- **backdrop-blur**: CSS backdrop-filterでブラー効果
- **Container**: 最大幅4xlでセンタリング
- **Grid**: CSS Gridで等間隔配置
- **Position**: `fixed bottom-0`で画面下部に固定 