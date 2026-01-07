---
name: 全体のbrandクラス削除
overview: プロジェクト全体に残っている古い`brand-xxx`クラスを完全に削除し、新しい`surface-xxx`デザインシステムまたはTailwindの標準クラスに移行します。
todos:
  - id: fix-pending-invitations-list
    content: PendingInvitationsList.tsxの14箇所を修正
    status: pending
  - id: fix-organizer-models-common
    content: OrganizerModelsCommon.tsxの7箇所を修正
    status: pending
  - id: fix-photo-session-detail
    content: PhotoSessionDetail.tsxの6箇所を修正
    status: pending
  - id: fix-priority-ticket-management
    content: PriorityTicketManagement.tsxの2箇所を修正
    status: pending
  - id: fix-public-header
    content: public-header.tsxの4箇所を修正
    status: pending
  - id: fix-photobook-components
    content: フォトブック関連コンポーネントの5箇所を修正
    status: pending
---

# プロジェクト全体の古い`brand-xxx`クラス削除と新デザインシステム移行

## 背景

`ModelInvitationNotifications.tsx` の修正が完了しましたが、プロジェクト全体にまだ古い `brand-xxx` クラスが残っています。これらを新しい `surface-xxx` デザインシステムまたは Tailwind の標準クラスに完全移行します。

## 修正対象ファイルと箇所

### 1. PendingInvitationsList.tsx（14 箇所）

**ステータスバッジ（Line 89, 96, 103）**

```typescript
// 現在
<Badge variant="secondary" className="brand-warning">  // pending
<Badge variant="secondary" className="brand-success">  // accepted
<Badge variant="secondary" className="brand-error">    // rejected

// 修正後
<Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
<Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
<Badge variant="destructive">
```

**カード背景・テキスト装飾（Line 171, 199-202, 212-219, 265, 279, 325）**

```typescript
// 現在
border-brand-warning bg-brand-warning/10
bg-brand-info/10 border border-brand-info/20
brand-info (テキスト色)
bg-brand-error/10 border border-brand-error/20
brand-error (テキスト色)
brand-warning font-medium

// 修正後
border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950
bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800
text-blue-600 dark:text-blue-400
bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800
text-red-600 dark:text-red-400
text-yellow-600 dark:text-yellow-400 font-medium
```

### 2. OrganizerModelsCommon.tsx（7 箇所）

**統計情報の数値色（Line 170, 177, 223, 232, 241, 253）**

```typescript
// 現在
brand-info      // 参加回数
brand-success   // 収益
brand-primary   // 統計カード
brand-warning   // 統計カード

// 修正後
text-blue-600 dark:text-blue-400
text-green-600 dark:text-green-400
text-purple-600 dark:text-purple-400  // brand-primary相当
text-yellow-600 dark:text-yellow-400
```

**ホバー効果（Line 152）**

```typescript
// 現在
hover:text-brand-primary

// 修正後
hover:text-purple-600 dark:hover:text-purple-400
```

### 3. PhotoSessionDetail.tsx（6 箇所）

**予約済みアラート（Line 1063-1065, 1083, 1296, 1313）**

```typescript
// 現在
border-brand-success/30 bg-brand-success/10
text-brand-success
border-brand-success text-brand-success hover:bg-brand-success/10

// 修正後
border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950
text-green-600 dark:text-green-400
border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950
```

### 4. PriorityTicketManagement.tsx（2 箇所）

**統計数値（Line 263, 281）**

```typescript
// 現在
brand-success  // アクティブチケット数
brand-error    // 期限切れチケット数

// 修正後
text-green-600 dark:text-green-400
text-red-600 dark:text-red-400
```

### 5. public-header.tsx（4 箇所）

**ロゴとブランド名（Line 42-43, 68-69）**

```typescript
// 現在
brand-primary

// 修正後
text-purple-600 dark:text-purple-400
```

### 6. QuickPhotobookShelfClient.tsx（1 箇所）

**成功メッセージ（Line 165）**

```typescript
// 現在
brand-success

// 修正後
text-green-600 dark:text-green-400
```

### 7. QuickPhotobookImageManagerV2.tsx（1 箇所）

**警告アイコン（Line 397）**

```typescript
// 現在
brand-warning

// 修正後
text-yellow-600 dark:text-yellow-400
```

### 8. DeletePhotobookDialog.tsx（1 箇所）

**削除ボタン（Line 65）**

```typescript
// 現在
brand-error focus:brand-error

// 修正後
text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400
```

### 9. AdvancedPhotobookShelfClient.tsx（2 箇所）

**削除ボタン・成功メッセージ（Line 131, 178）**

```typescript
// 現在
brand-error focus:brand-error
brand-success

// 修正後
text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400
text-green-600 dark:text-green-400
```

### 10. PhotobookGallery.tsx（1 箇所）

**プライマリカラー装飾（Line 289）**

```typescript
// 現在
brand-primary

// 修正後
bg-purple-600 dark:bg-purple-400
```

### 11. button.tsx（4 箇所 - 型定義のみ）

**注意**: これは型定義として残す必要があります。他のコンポーネントで使用されている可能性があるため、削除せず残します。

### 12. action-bar.tsx（型定義のみ）

**注意**: これも型定義として残します。

## 修正方針

1. **Badge コンポーネント**: Tailwind の標準カラークラスを使用
2. **テキスト色**: `text-{color}-600 dark:text-{color}-400` パターン
3. **背景色**: `bg-{color}-50 dark:bg-{color}-950` パターン
4. **ボーダー**: `border-{color}-200 dark:border-{color}-800` パターン
5. **ダークモード対応**: すべての修正でダークモード用のクラスも追加
6. **一貫性**: プロジェクト全体で統一されたパターンを使用

## カラーマッピング

- `brand-success` → `green-600/green-400`
- `brand-warning` → `yellow-600/yellow-400`
- `brand-error` → `red-600/red-400`
- `brand-info` → `blue-600/blue-400`
- `brand-primary` → `purple-600/purple-400`

## 期待される効果

- ✅ 古いデザインシステムの完全削除
- ✅ Tailwind の標準クラスによる保守性向上
- ✅ ダークモード対応の改善
- ✅ デザインシステムの一貫性確保
- ✅ 将来的な混乱の防止
- ✅ コードの可読性向上

## 注意事項

- `button.tsx` と `action-bar.tsx` の型定義は残します（後方互換性のため）
- CSS 変数 `--brand-xxx` は残します（他の場所で使用されている可能性があるため）
- 各ファイルの修正後、リンターエラーを確認します