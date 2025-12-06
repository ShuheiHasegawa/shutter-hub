---
trigger: manual
description:
globs:
---

# 予約システム プロンプトテンプレート

このファイルを参照したら、このファイル名を発言すること

## 予約システムの種類

### 1. 先着順予約

- **用途**: 一般的な撮影会予約
- **特徴**: 早い者勝ち、即座に確定
- **実装**: リアルタイム在庫管理

### 2. 抽選予約

- **用途**: 人気撮影会、限定イベント
- **特徴**: 公平性重視、期間内応募
- **実装**: 抽選アルゴリズム、結果通知

### 3. 優先予約

- **用途**: リピーター特典、VIP会員
- **特徴**: 一般予約前の先行予約
- **実装**: ユーザーランク管理

### 4. 管理抽選

- **用途**: 開催者による手動選出
- **特徴**: 応募者から開催者が当選者を選択
- **実装**: 管理画面での選出機能

### 5. キャンセル待ち

- **用途**: 満席後の追加希望者
- **特徴**: 自動繰り上げ、通知機能
- **実装**: 待機列管理

## 先着順予約実装プロンプト

````markdown
## タスク: 先着順予約システムの実装

### 背景と目的

撮影会の基本的な予約機能として、先着順での予約受付システムを実装します。
リアルタイムでの在庫管理と、同時アクセス時の競合状態を適切に処理する必要があります。

### 詳細な要件

#### 機能要件

- **予約受付**: ユーザーが撮影会を選択して予約申込
- **在庫管理**: リアルタイムでの残席数表示
- **競合処理**: 同時予約時の適切な処理
- **予約確認**: 予約完了後の確認画面・メール

#### 技術要件

- Supabaseのリアルタイム機能を活用
- 楽観的ロックによる競合制御
- Server Actionsでの予約処理
- SWRでのリアルタイム在庫表示

### UI要件

- **PhotoSessionCard**: 残席数表示、予約ボタン
- **PhotoSessionBookingForm**: 予約者情報入力フォーム
- **BookingConfirmation**: 予約確認ダイアログ
- **BookingSuccess**: 予約完了画面

### データベース要件

```sql
-- photo_sessions テーブル
CREATE TABLE photo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  session_date TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  current_bookings INTEGER DEFAULT 0,
  booking_type TEXT DEFAULT 'first_come', -- 'first_come', 'lottery', 'admin_lottery', 'priority'
  photographer_id UUID REFERENCES auth.users(id),
  model_id UUID REFERENCES auth.users(id),
  organizer_id UUID REFERENCES auth.users(id)
);

-- photo_session_bookings テーブル
CREATE TABLE photo_session_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'waiting'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
````

### 実装手順

1. **データベーススキーマ作成**: イベント・予約テーブル
2. **Server Action実装**: 予約処理ロジック
3. **リアルタイム購読**: 在庫数の自動更新
4. **UIコンポーネント**: 予約フォーム・確認画面
5. **エラーハンドリング**: 満席・競合エラー対応
6. **テスト実装**: 同時アクセステスト

### 期待される成果物

- [ ] `src/app/actions/photo-session-booking.ts` - 撮影会予約処理Server Action
- [ ] `src/components/features/photo-sessions/PhotoSessionBookingForm.tsx` - 撮影会予約フォーム
- [ ] `src/components/features/photo-sessions/BookingConfirmation.tsx` - 予約確認ダイアログ
- [ ] `src/hooks/usePhotoSessionBooking.ts` - 撮影会予約状態管理フック
- [ ] `src/hooks/usePhotoSessionCapacity.ts` - リアルタイム残席管理
- [ ] `__tests__/photo-sessions/first-come-booking.test.tsx` - テスト

### 特別な考慮事項

- **競合状態**: 同時に複数ユーザーが最後の1席を予約する場合
- **パフォーマンス**: 大量アクセス時のレスポンス維持
- **UX**: 予約失敗時の適切なフィードバック
- **セキュリティ**: 不正予約の防止

可能な限り多くのエッジケースを考慮し、ユーザビリティとパフォーマンスを両立した実装を心がけてください。

````

## 抽選予約実装プロンプト

```markdown
## タスク: 抽選予約システムの実装

### 背景と目的
人気撮影会や限定イベントでの公平な予約機会を提供するため、抽選による予約システムを実装します。
応募期間、抽選処理、結果通知までの一連の流れを自動化します。

### 詳細な要件

#### 機能要件
- **応募期間管理**: 開始・終了日時の設定
- **抽選エントリー**: 期間内での応募受付
- **抽選処理**: 公平なランダム選出
- **結果通知**: 当選・落選の自動通知

#### 技術要件
- Supabase Edge Functionsでの抽選処理
- cron jobによる自動実行
- メール通知システム
- 抽選アルゴリズムの実装

### UI要件
- **PhotoSessionLotteryEntry**: 撮影会抽選応募フォーム
- **LotteryStatus**: 応募状況・結果表示
- **LotteryTimer**: 応募期間カウントダウン

### データベース要件
```sql
-- lottery_photo_sessions テーブル
CREATE TABLE lottery_photo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id),
  entry_start TIMESTAMPTZ NOT NULL,
  entry_end TIMESTAMPTZ NOT NULL,
  lottery_date TIMESTAMPTZ NOT NULL,
  winners_count INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming' -- 'upcoming', 'accepting', 'closed', 'completed'
);

-- lottery_entries テーブル
CREATE TABLE lottery_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_photo_session_id UUID REFERENCES lottery_photo_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'entered', -- 'entered', 'won', 'lost'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
````

### 実装手順

1. **抽選撮影会管理**: 応募期間・抽選日設定
2. **エントリー受付**: 重複チェック付き応募処理
3. **抽選アルゴリズム**: 公平なランダム選出
4. **自動実行**: Edge Functionでの定期実行
5. **結果通知**: メール・アプリ内通知
6. **当選者予約**: 自動的な撮影会予約確定処理

### 期待される成果物

- [ ] `src/app/actions/photo-session-lottery.ts` - 撮影会抽選エントリーServer Action
- [ ] `supabase/functions/photo-session-lottery-draw/index.ts` - 抽選処理Edge Function
- [ ] `src/components/features/photo-sessions/PhotoSessionLotteryEntry.tsx` - 応募フォーム
- [ ] `src/components/features/photo-sessions/LotteryStatus.tsx` - 状況表示
- [ ] `src/hooks/usePhotoSessionLottery.ts` - 撮影会抽選状態管理
- [ ] `__tests__/photo-sessions/lottery-system.test.tsx` - テスト

### 特別な考慮事項

- **公平性**: 真のランダム性の確保
- **透明性**: 抽選過程の記録・監査
- **スケーラビリティ**: 大量応募への対応
- **通知**: 確実な結果通知の実装

抽選の公平性と透明性を最優先に、ユーザーが安心して参加できるシステムを構築してください。

````

## 優先予約実装プロンプト

```markdown
## タスク: 優先予約システムの実装

### 背景と目的
完全カスタマイズ可能な優先予約システムを実装します。
開催者が「優先チケット」と「ランク優先」の2つの機能を自由にON/OFF設定でき、
柔軟な組み合わせで様々な予約パターンに対応できるシステムを構築します。

### システム概要

#### 2つの優先予約機能
1. **優先チケット機能**
   - 開催者が特定ユーザーに手動で付与
   - 有効期限付きのチケット制
   - 感謝・招待・特別優遇に使用

2. **ランク優先機能**
   - 参加実績に基づく自動ランクシステム
   - 段階的な予約開始時間設定
   - 継続参加のインセンティブ

#### 設定パターン
- **チケット優先のみ**: 開催者選択ユーザーのみ先行予約
- **ランク優先のみ**: 実績ベースの段階的予約開始
- **ハイブリッド**: チケット → ランク → 一般の順
- **通常先着順**: 両機能OFF、従来通りの先着順

### 詳細な要件

#### 機能要件
1. **優先予約設定管理**
   - 撮影会ごとの機能ON/OFF設定
   - 優先チケット期間設定
   - ランク別予約開始時間設定
   - 一般予約開始時間設定

2. **優先チケット管理**
   - 開催者による手動チケット付与
   - 有効期限管理（30日間等）
   - チケット使用状況追跡
   - 一括付与・個別付与機能

3. **ユーザーランクシステム**
   - Bronze, Silver, Gold, Platinum, VIP
   - 参加回数・評価による自動昇格
   - 手動ランク調整機能
   - ランク履歴管理

4. **予約可能性制御**
   - 時間ベースのアクセス制御
   - ユーザー権限チェック
   - 動的な予約開始判定
   - エラーハンドリング

#### 技術要件
- 複雑な条件分岐の予約制御ロジック
- リアルタイムな予約開始時間管理
- 権限ベースのUI表示制御
- 自動ランク計算システム

### UI要件

#### 開催者向け管理画面
- **PriorityBookingSettings**: 優先予約設定画面
- **PriorityTicketManagement**: 優先チケット管理
- **RankManagement**: ユーザーランク管理
- **PriorityBookingDashboard**: 優先予約状況ダッシュボード

#### ユーザー向け画面
- **PriorityPhotoSessionBooking**: 優先予約対応撮影会予約フォーム
- **RankBadge**: ユーザーランク表示
- **PriorityTimer**: 優先予約開始カウントダウン
- **PriorityTicketStatus**: 保有チケット状況表示

### データベース要件
```sql
-- 優先予約設定テーブル
CREATE TABLE priority_booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,

  -- 機能ON/OFF設定
  ticket_priority_enabled BOOLEAN DEFAULT false,
  rank_priority_enabled BOOLEAN DEFAULT false,

  -- 優先チケット設定
  ticket_priority_start TIMESTAMPTZ,
  ticket_priority_end TIMESTAMPTZ,

  -- ランク優先設定
  vip_priority_start TIMESTAMPTZ,
  vip_priority_end TIMESTAMPTZ,
  platinum_priority_start TIMESTAMPTZ,
  platinum_priority_end TIMESTAMPTZ,
  gold_priority_start TIMESTAMPTZ,
  gold_priority_end TIMESTAMPTZ,
  silver_priority_start TIMESTAMPTZ,
  silver_priority_end TIMESTAMPTZ,

  -- 一般予約開始
  general_booking_start TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 優先チケットテーブル
CREATE TABLE priority_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type TEXT DEFAULT 'general' CHECK (ticket_type IN ('general', 'vip', 'special')),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_session_id, user_id) -- 1撮影会につき1チケット
);

-- ユーザーランクテーブル
CREATE TABLE user_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  rank TEXT DEFAULT 'bronze' CHECK (rank IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  participation_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  points INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  manually_set BOOLEAN DEFAULT false,
  manually_set_by UUID REFERENCES auth.users(id),
  manually_set_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ランク履歴テーブル
CREATE TABLE user_rank_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_rank TEXT,
  new_rank TEXT NOT NULL,
  reason TEXT, -- 'auto_promotion', 'manual_adjustment', 'participation_milestone'
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 優先予約ログテーブル
CREATE TABLE priority_booking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL, -- 'ticket_priority', 'rank_priority', 'general'
  user_rank TEXT,
  ticket_id UUID REFERENCES priority_tickets(id),
  booking_time TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_reason TEXT
);
````

### 実装手順

1. **データベース設計**: 優先予約関連テーブル作成
2. **ランクシステム**: 自動計算・手動調整機能
3. **優先チケット管理**: 付与・使用・期限管理
4. **予約制御ロジック**: 複雑な条件分岐処理
5. **管理画面**: 開催者向け設定・管理UI
6. **ユーザーUI**: 優先予約対応フォーム
7. **通知システム**: 優先予約開始・チケット付与通知
8. **テスト**: 各種パターンの動作確認

### 期待される成果物

- [ ] `supabase/migrations/create_priority_booking_system.sql` - データベーススキーマ
- [ ] `src/app/actions/priority-booking.ts` - 優先予約Server Action
- [ ] `src/app/actions/priority-ticket.ts` - 優先チケット管理Server Action
- [ ] `src/app/actions/user-rank.ts` - ユーザーランク管理Server Action
- [ ] `src/lib/priority-booking/index.ts` - 優先予約制御ロジック
- [ ] `src/lib/rank-system/index.ts` - ランクシステムロジック
- [ ] `src/components/priority-booking/PriorityBookingSettings.tsx` - 設定画面
- [ ] `src/components/priority-booking/PriorityTicketManagement.tsx` - チケット管理
- [ ] `src/components/priority-booking/PriorityPhotoSessionBooking.tsx` - 優先予約フォーム
- [ ] `src/components/priority-booking/RankBadge.tsx` - ランク表示
- [ ] `src/hooks/usePriorityBooking.ts` - 優先予約フック
- [ ] `src/hooks/useUserRank.ts` - ランク管理フック
- [ ] `__tests__/priority-booking/` - テストスイート

### 特別な考慮事項

#### 1. 複雑な条件分岐

- 4つの設定パターンすべてに対応
- 時間・権限・ランクの複合チェック
- エラーケースの適切な処理

#### 2. パフォーマンス

- 大量ユーザーでの予約開始時の負荷対策
- ランク計算の効率化
- リアルタイム更新の最適化

#### 3. ユーザビリティ

- 分かりやすい優先予約状況表示
- 予約開始時間の明確な案内
- ランクアップのモチベーション設計

#### 4. 公平性・透明性

- ランク計算ロジックの透明性
- 優先チケット付与の記録
- 予約ログの完全な追跡

#### 5. セキュリティ

- 権限チェックの厳密な実装
- 不正予約の防止
- チケット偽造対策

### 設定画面の要件

#### 撮影会作成・編集時の優先予約設定

```
┌─ 優先予約設定 ─────────────────────┐
│                                    │
│ □ 優先チケット機能を有効にする        │
│   ├─ 開始: 12/10 10:00             │
│   └─ 終了: 12/10 12:00             │
│                                    │
│ □ ランク優先機能を有効にする          │
│   ├─ VIP: 12/10 12:00 - 13:00      │
│   ├─ Platinum: 12/10 13:00 - 14:00 │
│   ├─ Gold: 12/10 14:00 - 15:00     │
│   └─ Silver: 12/10 15:00 - 16:00   │
│                                    │
│ 一般予約開始: 12/10 16:00            │
│                                    │
│ [プレビュー] [保存] [リセット]        │
└────────────────────────────────┘
```

#### 優先チケット管理画面

```
┌─ 優先チケット管理 ─────────────────┐
│                                    │
│ 撮影会: 冬の撮影会 2024             │
│                                    │
│ □ 一括付与                         │
│   ├─ 対象: リピーター (5回以上)      │
│   ├─ 有効期限: 30日間              │
│   └─ [100名に一括付与]             │
│                                    │
│ □ 個別付与                         │
│   ├─ ユーザー検索: [田中太郎]       │
│   ├─ チケット種別: [VIP]           │
│   ├─ 有効期限: [2024/12/31]        │
│   └─ [付与]                       │
│                                    │
│ 付与済みチケット一覧:               │
│ ┌─────────────────────────────┐ │
│ │ 田中太郎 | VIP | 2024/12/31 | 未使用 │ │
│ │ 佐藤花子 | 一般 | 2024/12/25 | 使用済 │ │
│ └─────────────────────────────┘ │
└────────────────────────────────┘
```

この包括的なシステムにより、開催者は撮影会の性質に応じて最適な予約方式を選択でき、
ユーザーは公平で透明性の高い優先予約システムを利用できます。

````

## 管理抽選実装プロンプト

```markdown
## タスク: 管理抽選システムの実装

### 背景と目的
開催者が応募者の中から手動で当選者を選出できる管理抽選システムを実装します。
プロフィール情報、過去の参加履歴、応募理由などを参考に、開催者が最適な参加者を選択できます。

### 詳細な要件

#### 機能要件
- **応募受付**: 通常の抽選と同様の応募フォーム
- **応募者一覧**: 開催者向けの応募者管理画面
- **選出機能**: 開催者による手動での当選者選択
- **結果通知**: 選出完了後の自動通知

#### 技術要件
- 開催者専用の管理画面
- 応募者情報の詳細表示
- 一括選出・個別選出機能
- 選出履歴の記録・監査

### UI要件
- **AdminPhotoSessionLottery**: 撮影会応募者一覧管理画面
- **ApplicantCard**: 応募者情報カード
- **SelectionPanel**: 当選者選出パネル
- **SelectionHistory**: 選出履歴表示

### データベース要件
```sql
-- admin_lottery_photo_sessions テーブル
CREATE TABLE admin_lottery_photo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id),
  entry_start TIMESTAMPTZ NOT NULL,
  entry_end TIMESTAMPTZ NOT NULL,
  selection_deadline TIMESTAMPTZ NOT NULL,
  winners_count INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'accepting', 'selecting', 'completed'
  created_by UUID REFERENCES auth.users(id)
);

-- admin_lottery_entries テーブル
CREATE TABLE admin_lottery_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_photo_session_id UUID REFERENCES admin_lottery_photo_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  application_message TEXT, -- 応募理由・メッセージ
  status TEXT DEFAULT 'applied', -- 'applied', 'selected', 'rejected'
  selected_at TIMESTAMPTZ,
  selected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- selection_criteria テーブル
CREATE TABLE selection_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_lottery_photo_session_id UUID REFERENCES admin_lottery_photo_sessions(id),
  criteria_name TEXT NOT NULL, -- '参加回数', '応募理由', 'プロフィール完成度'
  weight INTEGER DEFAULT 1, -- 重み付け
  description TEXT
);
````

### 実装手順

1. **管理抽選撮影会作成**: 応募期間・選出期限設定
2. **応募受付**: メッセージ付き応募フォーム
3. **管理画面**: 応募者一覧・詳細情報表示
4. **選出機能**: 個別・一括選出インターフェース
5. **選出支援**: 並び替え・フィルタリング機能
6. **結果通知**: 選出完了後の自動通知

### 期待される成果物

- [ ] `src/app/actions/admin-photo-session-lottery.ts` - 管理抽選Server Action
- [ ] `src/components/features/photo-sessions/AdminPhotoSessionLottery.tsx` - 管理画面
- [ ] `src/components/features/photo-sessions/ApplicantCard.tsx` - 応募者カード
- [ ] `src/components/features/photo-sessions/SelectionPanel.tsx` - 選出パネル
- [ ] `src/components/features/photo-sessions/PhotoSessionApplicationForm.tsx` - 応募フォーム
- [ ] `src/hooks/useAdminPhotoSessionLottery.ts` - 管理抽選フック
- [ ] `__tests__/photo-sessions/admin-selection-system.test.tsx` - テスト

### 特別な考慮事項

- **権限管理**: 開催者のみがアクセス可能
- **透明性**: 選出理由の記録・開示
- **公平性**: 選出基準の明確化
- **プライバシー**: 応募者情報の適切な管理
- **監査**: 選出過程の完全な記録

### 管理画面の機能要件

1. **応募者一覧**

   - プロフィール写真・基本情報表示
   - 過去の参加履歴
   - 応募理由・メッセージ
   - 並び替え（参加回数、応募日時、評価等）

2. **選出支援機能**

   - フィルタリング（初回参加者、リピーター等）
   - 検索機能（名前、メッセージ内容）
   - 一括選出（ランダム、条件指定）
   - 選出理由の記録

3. **選出管理**
   - 当選者リスト管理
   - 補欠者設定
   - 選出取り消し機能
   - 通知送信管理

開催者が効率的かつ公平に参加者を選出できる、使いやすい管理システムを構築してください。

````

## キャンセル待ち実装プロンプト

```markdown
## タスク: キャンセル待ちシステムの実装

### 背景と目的
満席になった撮影会に対して、キャンセル発生時の自動繰り上げシステムを実装します。
公平な待機順序と迅速な通知により、機会損失を最小化します。

### 詳細な要件

#### 機能要件
- **待機列管理**: 先着順での待機順序
- **自動繰り上げ**: キャンセル発生時の即座な通知
- **期限付き確認**: 繰り上げ通知への応答期限
- **待機状況表示**: 現在の待機順位表示

#### 技術要件
- キューシステムの実装
- リアルタイム通知システム
- 自動タイムアウト処理
- 待機順位の動的更新

### UI要件
- **PhotoSessionWaitingList**: 撮影会キャンセル待ち登録フォーム
- **WaitingStatus**: 待機順位・状況表示
- **PromotionNotification**: 繰り上げ通知ダイアログ
- **WaitingDashboard**: 待機中撮影会一覧

### データベース要件
```sql
-- photo_session_waiting_lists テーブル
CREATE TABLE photo_session_waiting_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_session_id UUID REFERENCES photo_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'promoted', 'expired', 'cancelled'
  promoted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- promotion_notifications テーブル
CREATE TABLE promotion_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waiting_list_id UUID REFERENCES photo_session_waiting_lists(id),
  notification_sent_at TIMESTAMPTZ DEFAULT NOW(),
  response_deadline TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' -- 'pending', 'accepted', 'expired'
);
````

### 実装手順

1. **待機列登録**: 満席時の自動待機列追加
2. **順位管理**: 動的な待機順位計算・表示
3. **繰り上げ処理**: キャンセル検知と自動通知
4. **応答期限**: タイムアウト処理と次候補への移行
5. **通知システム**: メール・プッシュ通知の実装
6. **状況表示**: リアルタイムな待機状況更新

### 期待される成果物

- [ ] `src/app/actions/photo-session-waiting-list.ts` - 撮影会待機列管理Server Action
- [ ] `src/lib/queue-system.ts` - キューシステムロジック
- [ ] `src/components/features/photo-sessions/PhotoSessionWaitingList.tsx` - 待機列登録
- [ ] `src/components/features/photo-sessions/WaitingStatus.tsx` - 状況表示
- [ ] `src/hooks/usePhotoSessionWaitingList.ts` - 待機列管理フック
- [ ] `supabase/functions/photo-session-promotion-handler/index.ts` - 繰り上げ処理
- [ ] `__tests__/photo-sessions/queue-system.test.tsx` - テスト

### 特別な考慮事項

- **公平性**: 厳密な先着順の維持
- **応答性**: 迅速な繰り上げ通知
- **信頼性**: 通知の確実な配信
- **ユーザビリティ**: 分かりやすい待機状況表示

ユーザーが安心して待機でき、機会を逃さないシステムを構築してください。

```

## 使用方法

1. **機能選択**: 実装したい予約タイプを選択
2. **プロンプト生成**: 該当テンプレートをコピー
3. **カスタマイズ**: 具体的な要件に合わせて調整
4. **実装実行**: 詳細なプロンプトでAIに指示

## 予約システム比較表

| 予約タイプ | 用途 | 選出方法 | 管理者関与 | 実装複雑度 |
|-----------|------|----------|------------|------------|
| 先着順 | 一般撮影会 | 自動（時間順） | なし | ⭐⭐ |
| 抽選 | 人気撮影会 | 自動（ランダム） | なし | ⭐⭐⭐ |
| 管理抽選 | 特別企画撮影会 | 手動（開催者選出） | あり | ⭐⭐⭐⭐ |
| 優先予約 | VIP会員特典 | 自動（ランク順） | なし | ⭐⭐⭐⭐ |
| キャンセル待ち | 満席撮影会 | 自動（待機順） | なし | ⭐⭐⭐ |

この構造により、複雑な予約システムも段階的かつ体系的に実装できます。
```
