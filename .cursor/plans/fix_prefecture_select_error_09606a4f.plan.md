---
name: Fix Prefecture Select Error
overview: ProfileEditFormの都道府県選択で発生しているRadix UI Selectの空文字列エラーを修正します。未選択オプションを削除し、プレースホルダーで未選択状態を表現する方式に変更します。
todos: []
---

# 実装計画：都道府県選択エラー修正

## 問題

`ProfileEditForm.tsx`の505行目で`<SelectItem value="">`を使用しているため、Radix UIのSelectコンポーネントがエラーを発生させています。

```tsx
<SelectContent>
  <SelectItem value="">未選択</SelectItem>  // ← エラーの原因
  {PREFECTURES.map(pref => (
    <SelectItem key={pref} value={pref}>
      {pref}
    </SelectItem>
  ))}
</SelectContent>
```

## 解決方法

未選択オプション（`<SelectItem value="">`）を削除し、プレースホルダーで未選択状態を表現します。

## 実装内容

### 修正ファイル

- `src/components/profile/ProfileEditForm.tsx`

### 変更内容

**Before (505行目):**

```tsx
<SelectContent>
  <SelectItem value="">未選択</SelectItem>
  {PREFECTURES.map(pref => (
    <SelectItem key={pref} value={pref}>
      {pref}
    </SelectItem>
  ))}
</SelectContent>
```

**After:**

```tsx
<SelectContent>
  {PREFECTURES.map(pref => (
    <SelectItem key={pref} value={pref}>
      {pref}
    </SelectItem>
  ))}
</SelectContent>
```

### 動作確認

1. プロフィール編集ページ（`/ja/profile/edit`）にアクセス
2. 都道府県ドロップダウンをクリック
3. エラーが発生しないことを確認
4. プレースホルダー「都道府県を選択」が表示されることを確認
5. 都道府県を選択して保存できることを確認

## 影響範囲

- 最小限の変更（1行削除のみ）
- 既存の保存済みデータには影響なし
- ユーザー体験の向上（よりシンプルなUI）

## 次のステップ

修正完了後、撮影会一覧の「活動拠点フィルター」機能の実装に進みます。