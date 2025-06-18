# ActionSheet コンポーネント

Shadcn/uiのBottomシートを使用した共通アクションボタン表示コンポーネント。プロフィール編集、撮影会詳細などの画面で共通利用可能。

## 特徴

- ✅ Shadcn/ui Sheet (Bottom) を使用
- ✅ 等間隔の列表示（1-3列対応）
- ✅ レスポンシブ対応
- ✅ ローディング状態対応
- ✅ アイコン対応
- ✅ 柔軟なボタンスタイリング
- ✅ アクセシビリティ対応

## 使用方法

### 基本的な使用例

```tsx
import { ActionSheet, ActionButton } from '@/components/ui/action-sheet';
import { Save, X } from 'lucide-react';

const actions: ActionButton[] = [
  {
    id: 'cancel',
    label: 'キャンセル',
    variant: 'outline',
    onClick: () => console.log('Cancel'),
    icon: <X className="h-4 w-4" />,
  },
  {
    id: 'save',
    label: '保存',
    variant: 'default',
    onClick: () => console.log('Save'),
    icon: <Save className="h-4 w-4" />,
  },
];

<ActionSheet
  trigger={<Button>アクションを選択</Button>}
  title="変更の保存"
  description="この変更を保存しますか？"
  actions={actions}
/>
```

### プロフィール編集での使用例

```tsx
const profileActions: ActionButton[] = [
  {
    id: 'cancel',
    label: 'キャンセル',
    variant: 'outline',
    onClick: handleCancel,
    icon: <X className="h-4 w-4" />,
    className: 'border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  {
    id: 'save',
    label: 'プロフィールを更新',
    variant: 'default',
    onClick: handleSave,
    loading: isLoading,
    icon: <Save className="h-4 w-4" />,
    className: 'bg-blue-600 hover:bg-blue-700',
  },
];

<ActionSheet
  trigger={
    <Button className="w-full" size="lg">
      変更を保存する
    </Button>
  }
  title="変更の保存"
  description="プロフィールの変更を保存しますか？"
  actions={profileActions}
  open={showActionSheet}
  onOpenChange={setShowActionSheet}
/>
```

### 撮影会予約での使用例

```tsx
const bookingActions: ActionButton[] = [
  {
    id: 'cancel',
    label: 'キャンセル',
    variant: 'outline',
    onClick: handleCancel,
    icon: <X className="h-4 w-4" />,
  },
  {
    id: 'confirm',
    label: '予約して決済に進む',
    variant: 'default',
    onClick: handleBooking,
    loading: isProcessing,
    icon: <CreditCard className="h-4 w-4" />,
  },
];

<ActionSheet
  trigger={<Button className="w-full">予約を確認する</Button>}
  title="予約の確認"
  description="この撮影会への参加を確定しますか？"
  actions={bookingActions}
  maxColumns={2}
/>
```

### 3列表示の例

```tsx
const multiActions: ActionButton[] = [
  {
    id: 'edit',
    label: '編集',
    variant: 'outline',
    onClick: handleEdit,
    icon: <Edit className="h-4 w-4" />,
  },
  {
    id: 'duplicate',
    label: '複製',
    variant: 'secondary',
    onClick: handleDuplicate,
    icon: <Copy className="h-4 w-4" />,
  },
  {
    id: 'delete',
    label: '削除',
    variant: 'destructive',
    onClick: handleDelete,
    icon: <Trash className="h-4 w-4" />,
  },
];

<ActionSheet
  trigger={<Button variant="ghost">メニュー</Button>}
  title="アクション選択"
  actions={multiActions}
  maxColumns={3}
/>
```

## Props

### ActionSheetProps

| プロパティ | 型 | デフォルト | 説明 |
|------------|----|-----------|----|
| `trigger` | `ReactNode` | - | シートを開くトリガー要素 |
| `title` | `string` | - | シートのタイトル |
| `description` | `string` | - | シートの説明文 |
| `actions` | `ActionButton[]` | - | アクションボタンの配列 |
| `open` | `boolean` | - | シートの開閉状態（制御モード） |
| `onOpenChange` | `(open: boolean) => void` | - | 開閉状態変更時のコールバック |
| `maxColumns` | `1 \| 2 \| 3` | `2` | ボタンの最大列数 |
| `className` | `string` | - | ボタングリッドの追加クラス |
| `contentClassName` | `string` | - | シートコンテンツの追加クラス |

### ActionButton

| プロパティ | 型 | デフォルト | 説明 |
|------------|----|-----------|----|
| `id` | `string` | - | ボタンの一意識別子 |
| `label` | `string` | - | ボタンのラベル |
| `variant` | `ButtonVariant` | `'default'` | ボタンのバリアント |
| `size` | `ButtonSize` | `'lg'` | ボタンのサイズ |
| `onClick` | `() => void` | - | クリック時のコールバック |
| `disabled` | `boolean` | `false` | ボタンの無効化状態 |
| `loading` | `boolean` | `false` | ローディング状態 |
| `icon` | `ReactNode` | - | ボタンのアイコン |
| `className` | `string` | - | ボタンの追加クラス |

## レスポンシブ対応

- モバイル：Bottom Sheetで画面下部から表示
- タブレット・デスクトップ：同様にBottom Sheetで表示
- `maxColumns`で列数を調整可能
- ボタンは常に等間隔で配置

## アクセシビリティ

- Radix UIの自動ARIA属性
- キーボードナビゲーション対応
- スクリーンリーダー対応
- フォーカストラップ

## カスタマイズ

### スタイリング

```tsx
// カスタムボタンスタイル
const customActions: ActionButton[] = [
  {
    id: 'custom',
    label: 'カスタム',
    variant: 'default',
    onClick: handleCustom,
    className: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
];

// カスタムシートスタイル
<ActionSheet
  actions={actions}
  contentClassName="bg-gray-50 border-t-4 border-blue-500"
  className="gap-4"
/>
```

### 制御モード

```tsx
const [open, setOpen] = useState(false);

<ActionSheet
  trigger={<Button onClick={() => setOpen(true)}>開く</Button>}
  actions={actions}
  open={open}
  onOpenChange={setOpen}
/>
```

## 使用場面

- プロフィール編集の保存・キャンセル
- 撮影会予約の確認・キャンセル
- 削除確認ダイアログ
- 複数アクション選択メニュー
- 設定画面のアクションボタン

## 注意事項

- `maxColumns`は最大3列まで推奨
- ボタンが多すぎる場合は適切にグループ化
- ローディング状態では他のボタンの無効化を検討
- 重要なアクション（削除等）は適切なバリアントを使用 