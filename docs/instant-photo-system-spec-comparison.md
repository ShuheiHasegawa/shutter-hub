# 即座撮影リクエスト機能：現在の実装と構想仕様の比較

## 📋 概要

現在の実装と構想している仕様の差分を確認し、必要な修正点を明確化します。

## 🔍 1. 受諾資格の確認

### 構想仕様

1. **即座撮影リクエストを受け付けるフラグがON**
   - `is_online = true`
   - `accepting_requests = true`（該当フィールドがあれば）

2. **周辺にいるフォトグラファー**
   - 同県レベルでのフィルタリング
   - より良い方法があれば提案

### 現在の実装

#### ❌ 問題点

```typescript:src/app/actions/instant-photo.ts
// getPhotographerRequests()関数
const { data, error } = await supabase
  .from('instant_photo_requests')
  .select('*')
  .or(`status.eq.pending,matched_photographer_id.eq.${user.id}`)
  .order('created_at', { ascending: false })
  .limit(20);
```

**問題**:
- `is_online`のチェックがない
- 位置情報によるフィルタリングがない
- 同県などの地理的フィルタリングがない
- `accepting_requests`フラグのチェックがない

#### ✅ 必要な修正

1. **フォトグラファーの位置情報とオンライン状態を確認**
2. **同県レベルでのフィルタリング実装**
3. **RPC関数`find_nearby_instant_photo_requests`の活用**

## 🔄 2. マッチングフローの変更

### 構想仕様

```
リクエスト作成
  ↓
フォトグラファーが受諾ボタンを押下
  ↓
リクエストユーザー（ゲスト）が受諾したフォトグラファーで納得できるか判定
  ↓
マッチング成否が決まる
```

### 現在の実装

#### ❌ 問題点

```typescript:src/app/actions/instant-photo.ts
// respondToRequest()関数
const { error: updateError, data: updatedRequests } = await supabase
  .from('instant_photo_requests')
  .update({
    status: 'matched',  // ← 即座にmatchedになる
    matched_photographer_id: user.id,
    matched_at: new Date().toISOString(),
  })
```

**問題**:
- フォトグラファーが受諾したら即座に`status='matched'`になる
- ゲストの承認ステップがない
- ゲストが複数のフォトグラファーから受諾があった場合の選択機能がない

#### ✅ 必要な修正

1. **ステータスの段階的遷移**
   ```
   pending → photographer_accepted → guest_approved → matched
   ```

2. **新しいテーブルまたはカラムの追加**
   - `photographer_request_responses`テーブルを活用
   - または`instant_photo_requests`に`pending_photographer_id`を追加

3. **ゲスト承認UIの実装**
   - 受諾したフォトグラファーの一覧表示
   - プロフィール・評価・料金の確認
   - 承認/拒否ボタン

## 📊 実装状況の詳細比較

### 受諾資格チェック

| 項目 | 構想仕様 | 現在の実装 | 状態 |
|------|---------|-----------|------|
| `is_online`チェック | ✅ 必須 | ❌ なし | **要修正** |
| `accepting_requests`チェック | ✅ 必須 | ❓ 未確認 | **要確認** |
| 位置情報フィルタリング | ✅ 同県レベル | ❌ なし | **要修正** |
| 距離ベースフィルタリング | ✅ 推奨 | ❌ なし | **要修正** |

### マッチングフロー

| ステップ | 構想仕様 | 現在の実装 | 状態 |
|---------|---------|-----------|------|
| リクエスト作成 | ✅ 実装済み | ✅ 実装済み | ✅ |
| フォトグラファー受諾 | ✅ 実装済み | ✅ 実装済み | ✅ |
| **ゲスト承認** | ✅ **必須** | ❌ **なし** | **要実装** |
| マッチング成立 | ✅ 実装済み | ✅ 実装済み | ✅ |

## 🛠️ 必要な修正内容

### 1. 受諾資格チェックの改善

#### A. `getPhotographerRequests()`関数の修正

```typescript
// 修正前
const { data, error } = await supabase
  .from('instant_photo_requests')
  .select('*')
  .or(`status.eq.pending,matched_photographer_id.eq.${user.id}`)
  .limit(20);

// 修正後（案）
// 1. フォトグラファーの位置情報とオンライン状態を取得
const { data: photographerLocation } = await supabase
  .from('photographer_locations')
  .select('*')
  .eq('photographer_id', user.id)
  .single();

if (!photographerLocation || !photographerLocation.is_online) {
  // オフラインまたは位置情報がない場合は、マッチング済みのリクエストのみ返す
  return { success: true, data: matchedRequests || [] };
}

// 2. 同県レベルでのフィルタリング（都道府県コードを使用）
// または、RPC関数で距離ベースフィルタリング
const { data: nearbyRequests } = await supabase.rpc(
  'find_nearby_instant_photo_requests',
  {
    photographer_lat: photographerLocation.latitude,
    photographer_lng: photographerLocation.longitude,
    radius_meters: photographerLocation.response_radius || 5000, // デフォルト5km
  }
);
```

#### B. 同県フィルタリングの実装方法

**方法1: 都道府県コードを使用（推奨）**
- `location_address`から都道府県を抽出
- フォトグラファーの位置情報から都道府県を抽出
- 一致するもののみ表示

**方法2: 距離ベース（現在の実装）**
- 半径5km以内（デフォルト）
- ユーザーが設定可能な`response_radius`を使用

**方法3: ハイブリッド**
- まず同県でフィルタリング
- その中で距離ベースでソート

### 2. マッチングフローの変更

#### A. データベーススキーマの変更

```sql
-- instant_photo_requestsテーブルに新しいステータスを追加
-- または、既存のstatusカラムの値を拡張

-- ステータス遷移:
-- pending → photographer_accepted → guest_approved → matched

-- オプション1: statusカラムの値を拡張
ALTER TABLE instant_photo_requests 
  ADD CONSTRAINT status_check 
  CHECK (status IN ('pending', 'photographer_accepted', 'guest_approved', 'matched', 'in_progress', 'completed', 'cancelled'));

-- オプション2: 新しいカラムを追加
ALTER TABLE instant_photo_requests 
  ADD COLUMN pending_photographer_id UUID REFERENCES auth.users(id),
  ADD COLUMN photographer_accepted_at TIMESTAMPTZ,
  ADD COLUMN guest_approved_at TIMESTAMPTZ;
```

#### B. `respondToRequest()`関数の修正

```typescript
// 修正前
.update({
  status: 'matched',
  matched_photographer_id: user.id,
  matched_at: new Date().toISOString(),
})

// 修正後
.update({
  status: 'photographer_accepted',  // ← 変更
  pending_photographer_id: user.id,  // ← 新規
  photographer_accepted_at: new Date().toISOString(),  // ← 新規
  // matched_photographer_idはまだ設定しない
})
```

#### C. ゲスト承認機能の実装

```typescript
// 新しいServer Action: approvePhotographer
export async function approvePhotographer(
  requestId: string,
  photographerId: string
): Promise<ActionResult<void>> {
  // ゲストがフォトグラファーを承認
  // statusを'guest_approved' → 'matched'に変更
  // matched_photographer_idを設定
}

// 新しいServer Action: rejectPhotographer
export async function rejectPhotographer(
  requestId: string,
  photographerId: string
): Promise<ActionResult<void>> {
  // ゲストがフォトグラファーを拒否
  // statusを'pending'に戻す
  // pending_photographer_idをクリア
}
```

## 📝 実装優先度

### 優先度1: 受諾資格チェックの改善
- [ ] `getPhotographerRequests()`で`is_online`チェックを追加
- [ ] 位置情報によるフィルタリングを追加
- [ ] 同県レベルでのフィルタリングを実装（または距離ベースで改善）

### 優先度2: マッチングフローの変更
- [ ] データベーススキーマの変更（status拡張または新規カラム追加）
- [ ] `respondToRequest()`関数の修正（`photographer_accepted`状態に変更）
- [ ] ゲスト承認UIの実装
- [ ] ゲスト承認Server Actionの実装

## 🎯 推奨実装順序

1. **Phase 1: 受諾資格チェックの改善**（即座対応可能）
   - `getPhotographerRequests()`の修正
   - 位置情報・オンライン状態のチェック追加

2. **Phase 2: マッチングフローの変更**（スキーマ変更が必要）
   - データベースマイグレーション
   - Server Actionの修正
   - UI実装

## 💡 提案：同県フィルタリングの実装方法

### 推奨方法：距離ベース + 都道府県コード

```typescript
// 1. 距離ベースで候補を絞り込む（半径10km以内）
// 2. その中で都道府県コードが一致するものを優先表示
// 3. 同県内に候補がない場合は、距離ベースで表示

const prefectureCode = extractPrefectureCode(location_address);
const { data: requests } = await supabase.rpc(
  'find_nearby_instant_photo_requests',
  {
    photographer_lat: latitude,
    photographer_lng: longitude,
    radius_meters: 10000, // 10km
    prefecture_code: prefectureCode, // オプション
  }
);
```

この方法により、**同県内のフォトグラファーを優先**しつつ、**候補がない場合は広範囲から検索**できます。

