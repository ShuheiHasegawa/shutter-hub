# ユーザースケジュール管理機能 要件定義書

> **最終更新**: 2025-09-23  
> **ステータス**: 要件定義完了  
> **実装フェーズ**: Phase 2（拡張機能）

## 📋 **機能概要**

### **目的**
全ユーザー（model/photographer/organizer）が自身の空き時間を設定・管理できる機能を提供し、将来的なリクエスト撮影依頼システムの基盤とする。

### **主要機能**
1. **個人スケジュール設定**: 月単位で空き時間（◯日の何時〜何時）を設定
2. **運営連携表示**: モデルユーザーが所属運営のスケジュールとの重複を確認
3. **柔軟な時間設定**: 連続時間・分割時間の両方をサポート
4. **複製機能**: 繰り返し設定のための効率的な複製機能

### **スコープ外（将来実装）**
- マッチング機能
- 予約・依頼機能  
- 自動提案機能

---

## 🎯 **詳細機能要件**

### **1. スケジュール設定機能**

#### **基本設定**
```yaml
時間設定形式:
  連続時間: "10:00〜18:00"（8時間連続）
  分割時間: "10:00〜12:00, 14:00〜18:00"（昼休憩あり）
  複数設定: 同一日に複数の時間枠を設定可能

入力方式:
  日付選択: カレンダーからクリック選択
  時間設定: 開始時間・終了時間の入力（30分刻み）
  時間枠追加: 同一日に複数の時間枠を追加可能

データ形式:
  保存単位: 各時間枠を個別レコードとして保存
  時間表現: 分単位（0-1439）で効率的管理
  重複防止: PostgreSQL EXCLUDE制約で同一時間重複を防止
```

#### **複製・繰り返し機能**
```yaml
複製機能:
  日付間複製: "この設定を他の日にも適用"
  週間複製: "この週の設定を来週にも適用"  
  月間複製: "この月の設定を来月にも適用"
  
一括設定:
  曜日選択: 平日・土日・特定曜日のみ
  期間選択: 開始日〜終了日
  除外日設定: 特定日を除外（祝日・予定日等）

操作方法:
  設定済み日のコンテキストメニューから複製実行
  複製先の日付を範囲選択
  除外したい日付をチェックボックスで選択
```

### **2. 運営連携表示機能（モデル専用）**

#### **対象条件**
```yaml
表示条件:
  - ユーザーが model タイプ
  - organizer_models テーブルで運営に所属済み
  - 所属運営がスケジュール設定済み

複数運営対応:
  - 全ての所属運営のスケジュールを統合表示
  - 運営名での区別表示
  - 重複度合いによる視覚化
```

#### **UI設計**
```yaml
レイヤー表示方式:
  自分の空き時間: 青色（#3B82F6）
  運営の空き時間: 緑色（#10B981）
  重複時間: 紫色（#8B5CF6）
  
表示方法:
  - 日付クリック時にモーダル表示
  - 時間軸での視覚的重複表示
  - 重複時間帯の詳細情報
  
情報表示:
  - 重複時間帯の時間
  - 対象運営名
  - 重複度（部分/完全）
```

---

## 📊 **データベース設計**

### **汎用テーブル設計**

```sql
-- ユーザー可用性管理テーブル（汎用設計）
CREATE TABLE user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- 日付・時間管理
  available_date DATE NOT NULL,
  start_time_minutes INTEGER NOT NULL, -- 0-1439 (24時間 × 60分)
  end_time_minutes INTEGER NOT NULL,
  
  -- 設定タイプ・メタ情報
  availability_type TEXT DEFAULT 'manual' CHECK (
    availability_type IN ('manual', 'recurring_copy', 'bulk_set')
  ),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- 作成・更新日時
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約・バリデーション
  CONSTRAINT valid_time_range CHECK (start_time_minutes < end_time_minutes),
  CONSTRAINT valid_time_bounds CHECK (
    start_time_minutes >= 0 AND start_time_minutes < 1440 AND
    end_time_minutes > 0 AND end_time_minutes <= 1440
  ),
  
  -- 重複防止（同じユーザー・同じ日・重複する時間帯は不可）
  EXCLUDE USING gist (
    user_id WITH =,
    available_date WITH =,
    int4range(start_time_minutes, end_time_minutes) WITH &&
  )
);

-- インデックス（パフォーマンス最適化）
CREATE INDEX idx_user_availability_user_date 
ON user_availability(user_id, available_date);

CREATE INDEX idx_user_availability_date_range 
ON user_availability(available_date, start_time_minutes, end_time_minutes);
```

### **運営-モデル関係**

```sql
-- 既存のorganizer_modelsテーブル活用
-- organizer_idとmodel_idの関係で運営連携を判定
```

### **データ操作関数**

```sql
-- 重複チェック関数
CREATE OR REPLACE FUNCTION check_availability_overlap(
  p_user_id UUID,
  p_date DATE,
  p_start_minutes INTEGER,
  p_end_minutes INTEGER
) RETURNS TABLE(
  has_overlap BOOLEAN,
  overlap_details JSONB
) AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM user_availability
  WHERE user_id = p_user_id
    AND available_date = p_date
    AND is_active = true
    AND int4range(start_time_minutes, end_time_minutes) && 
        int4range(p_start_minutes, p_end_minutes);
  
  RETURN QUERY SELECT 
    (overlap_count > 0) AS has_overlap,
    jsonb_build_object(
      'overlap_count', overlap_count,
      'requested_time', p_start_minutes || '-' || p_end_minutes
    ) AS overlap_details;
END;
$$ LANGUAGE plpgsql;

-- 運営との重複確認関数（モデル専用）
CREATE OR REPLACE FUNCTION get_organizer_schedule_overlap(
  p_model_id UUID,
  p_date DATE
) RETURNS TABLE(
  organizer_name TEXT,
  overlap_slots JSONB[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.display_name,
    array_agg(
      jsonb_build_object(
        'start_minutes', ua.start_time_minutes,
        'end_minutes', ua.end_time_minutes,
        'notes', ua.notes
      )
    )
  FROM organizer_models om
  JOIN profiles p ON p.id = om.organizer_id  
  JOIN user_availability ua ON ua.user_id = om.organizer_id
  WHERE om.model_id = p_model_id
    AND ua.available_date = p_date
    AND ua.is_active = true
    AND om.is_active = true
  GROUP BY p.display_name;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 **UI/UX設計仕様**

### **1. プロフィールページ統合設計**

#### **タブ構成**
```typescript
interface ProfileTab {
  id: 'overview' | 'photobook' | 'reviews' | 'activity' | 'schedule';
  label: string;
  component: React.ComponentType;
}

// タブ追加
const profileTabs: ProfileTab[] = [
  { id: 'overview', label: '概要', component: ProfileOverview },
  { id: 'photobook', label: 'フォトブック', component: ProfilePhotobook },
  { id: 'reviews', label: 'レビュー', component: ProfileReviews },
  { id: 'activity', label: '活動履歴', component: ProfileActivity },
  { id: 'schedule', label: 'スケジュール', component: UserScheduleManager }, // 新規追加
];
```

#### **ページルート設定**
```typescript
// URLパス例
/profile/[userId]?tab=schedule
// 例: /profile/a30ed0cd-9684-4c5a-be90-c7cb71a0b3fd?tab=schedule
```

### **2. カレンダーベース設計**

#### **メインカレンダー表示**
```typescript
interface ScheduleCalendarView {
  // 既存PhotoSessionCalendarを拡張
  baseComponent: 'PhotoSessionCalendar';
  
  // 新機能追加
  editMode: boolean;              // 編集モード切り替え
  userAvailability: TimeSlot[];   // ユーザーの空き時間
  organizerOverlaps?: TimeSlot[]; // 運営との重複（モデルのみ）
  
  // インタラクション
  onDateClick: (date: Date) => void;     // 日付クリック→モーダル表示
  onSlotEdit: (slot: TimeSlot) => void;  // 時間枠編集
  onSlotDelete: (slotId: string) => void; // 時間枠削除
}

interface TimeSlot {
  id: string;
  date: string;           // "2025-09-28"
  startTime: string;      // "10:00"
  endTime: string;        // "12:00"
  startMinutes: number;   // 600 (10:00 = 10*60)
  endMinutes: number;     // 720 (12:00 = 12*60)
  notes?: string;
  type: 'manual' | 'recurring_copy' | 'bulk_set';
}
```

#### **モーダル設計**
```typescript
interface ScheduleEditModal {
  // 基本情報
  selectedDate: Date;
  existingSlots: TimeSlot[];
  
  // モデル専用機能
  isModel: boolean;
  organizerOverlaps?: OrganizerOverlap[];
  
  // 表示レイヤー（モデル専用）
  showUserLayer: boolean;      // 青色：自分の空き時間
  showOrganizerLayer: boolean; // 緑色：運営の空き時間
  showOverlapLayer: boolean;   // 紫色：重複時間
  
  // アクション
  onAddSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  onEditSlot: (slot: TimeSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onCopyToOtherDates: (slotIds: string[], targetDates: Date[]) => void;
}

interface OrganizerOverlap {
  organizerName: string;
  organizerId: string;
  overlappingSlots: {
    startMinutes: number;
    endMinutes: number;
    overlapType: 'partial' | 'complete';
    notes?: string;
  }[];
}
```

### **3. 時間入力UI設計**

#### **時間選択コンポーネント**
```typescript
interface TimeSlotInput {
  // 基本設定
  startTime: string;        // "10:00"
  endTime: string;          // "18:00"
  timeStep: number;         // 30（30分刻み）
  
  // UI設定
  format: '24h';           // 24時間表記
  validation: boolean;     // 開始<終了の自動チェック
  
  // 分割機能
  allowMultipleSlots: boolean; // 同一日の複数時間枠
  maxSlotsPerDay: number;      // 最大時間枠数（デフォルト5）
  
  // 視覚的ヘルプ
  suggestedTimes: string[];    // ["09:00", "10:00", "14:00", "18:00"]
  busyTimeWarning: boolean;    // 一般的に忙しい時間の警告表示
}
```

---

## 🔧 **技術実装仕様**

### **1. データベース移行戦略**

#### **既存テーブルの整理**
```sql
-- Phase 1: 汎用テーブル作成
CREATE TABLE user_availability (...); -- 上記設計

-- Phase 2: 既存未使用テーブルの確認・削除
-- model_availability が使用されていない場合は削除
-- organizer_staff_availability が使用されていない場合は削除

-- Phase 3: 関連関数の作成
-- check_availability_overlap()
-- get_organizer_schedule_overlap()
```

#### **マイグレーション手順**
1. **新テーブル作成**: `user_availability`
2. **関数作成**: 重複チェック・運営連携関数
3. **インデックス作成**: パフォーマンス最適化
4. **旧テーブル削除**: 未使用確認後に削除

### **2. Server Actions設計**

#### **CRUD操作**
```typescript
// server actions/user-availability.ts

// 空き時間作成
async function createAvailability(data: {
  availableDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}): Promise<ActionResult>

// 空き時間一覧取得
async function getUserAvailability(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<TimeSlot[]>>

// 空き時間更新
async function updateAvailability(
  slotId: string,
  data: Partial<TimeSlot>
): Promise<ActionResult>

// 空き時間削除
async function deleteAvailability(slotId: string): Promise<ActionResult>

// 複製機能
async function copyAvailabilityToOtherDates(
  sourceSlotIds: string[],
  targetDates: string[]
): Promise<ActionResult>

// 運営重複確認（モデル専用）
async function getOrganizerOverlaps(
  modelId: string,
  date: string
): Promise<ActionResult<OrganizerOverlap[]>>
```

### **3. コンポーネント設計**

#### **メインコンポーネント**
```typescript
// UserScheduleManager.tsx（プロフィールタブ用）
interface UserScheduleManagerProps {
  userId: string;
  isOwnProfile: boolean;  // 本人のプロフィールかどうか
  userType: 'model' | 'photographer' | 'organizer';
}

// ScheduleEditModal.tsx（日付編集用）
interface ScheduleEditModalProps {
  selectedDate: Date;
  existingSlots: TimeSlot[];
  userId: string;
  userType: string;
  onSave: (slots: TimeSlot[]) => void;
  onClose: () => void;
}

// TimeSlotEditor.tsx（時間枠編集用）
interface TimeSlotEditorProps {
  slot?: TimeSlot;        // 新規作成時はundefined
  onSave: (slot: TimeSlot) => void;
  onCancel: () => void;
  onDelete?: () => void;  // 編集時のみ
}

// OrganizerOverlapView.tsx（モデル専用）
interface OrganizerOverlapViewProps {
  date: Date;
  modelId: string;
  userSlots: TimeSlot[];
  organizerOverlaps: OrganizerOverlap[];
}
```

### **4. 既存システム拡張**

#### **PhotoSessionCalendar拡張**
```typescript
// 既存コンポーネントに機能追加
interface PhotoSessionCalendarProps {
  sessions: PhotoSessionData[];
  
  // 新機能追加
  userAvailability?: TimeSlot[];     // ユーザーの空き時間
  editMode?: boolean;                // 編集モード
  showAvailabilityLayer?: boolean;   // 空き時間レイヤー表示
  onDateClick?: (date: Date) => void; // 日付クリックハンドラ
}

// 既存機能への影響なし・後方互換性維持
```

---

## 🎨 **UI/UX詳細設計**

### **1. カレンダー表示**

#### **視覚的表現**
```yaml
日付セルの表示:
  空き時間あり: 青い点・バー表示
  運営重複あり: 紫の点・バー表示（モデルのみ）
  未設定: デフォルト表示
  
レイヤー切り替え:
  - チェックボックスで表示/非表示制御
  - "自分の空き時間を表示"
  - "運営との重複を表示"（モデルのみ）
  
凡例表示:
  - 青色：自分の空き時間
  - 緑色：運営の空き時間（モーダル内のみ）
  - 紫色：重複時間（モーダル内のみ）
```

### **2. モーダル内時間編集**

#### **時間軸表示**
```yaml
表示範囲: 6:00〜24:00（18時間）
時間刻み: 30分単位
視覚化: ガントチャート風の横棒表示

編集操作:
  時間枠追加: 空白部分をドラッグで選択
  時間枠編集: 既存枠をクリックして時間調整
  時間枠削除: 右クリック→削除メニュー
  
重複表示（モデル専用）:
  - 自分の時間枠: 青色バー
  - 運営の時間枠: 緑色バー（背景）
  - 重複部分: 紫色ハイライト
```

### **3. 複製・一括設定機能**

#### **複製UI**
```yaml
トリガー: 設定済み日の右クリックメニュー

複製オプション:
  - "この日の設定を複製"
  - "この週の設定を複製"
  - "カスタム期間に複製"
  
ターゲット選択:
  カレンダー上で複製先日付を複数選択
  曜日フィルタ（平日のみ・土日のみ等）
  除外日設定（祝日・既存予定等）
  
確認画面:
  - 複製元の詳細表示
  - 複製先の一覧表示
  - 既存設定との競合警告
```

---

## 🔒 **権限・セキュリティ設計**

### **Row Level Security (RLS)**

```sql
-- ユーザー自身のデータのみアクセス可能
CREATE POLICY "Users can manage own availability" 
ON user_availability FOR ALL USING (
  user_id = auth.uid()
);

-- 運営は所属モデルの空き時間を閲覧可能（編集不可）
CREATE POLICY "Organizers can view model availability" 
ON user_availability FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organizer_models om
    WHERE om.model_id = user_availability.user_id
    AND om.organizer_id = auth.uid()
    AND om.is_active = true
  )
);
```

### **API制限**
```yaml
レート制限:
  作成: 100回/時間（通常の設定ペース）
  更新: 200回/時間（編集時の調整）
  削除: 50回/時間（誤操作防止）
  複製: 20回/時間（一括処理制限）

データ制限:
  最大時間枠数: 5枠/日（過密スケジュール防止）
  最大設定期間: 6ヶ月先まで
  最小時間枠: 30分（細かすぎる設定を防止）
  最大時間枠: 18時間/日（現実的な上限）
```

---

## 🔄 **段階的実装計画**

### **Phase 1: 基本機能（1週間）**

```yaml
Week 1-2: データベース・基本CRUD
実装内容:
  - user_availability テーブル作成
  - 基本的なServer Actions実装
  - プロフィールページにスケジュールタブ追加
  - 簡単な時間設定フォーム

成果物:
  - [ ] マイグレーションファイル
  - [ ] Server Actions (CRUD)
  - [ ] UserScheduleManager コンポーネント
  - [ ] 基本的な時間入力フォーム
  - [ ] プロフィールページタブ統合
```

### **Phase 2: カレンダー統合・編集機能（1週間）**

```yaml
Week 2-3: カレンダー機能・モーダル
実装内容:
  - PhotoSessionCalendar拡張
  - ScheduleEditModal作成
  - 時間軸での視覚的編集
  - 重複チェック機能

成果物:
  - [ ] 拡張カレンダーコンポーネント
  - [ ] ScheduleEditModal
  - [ ] TimeSlotEditor
  - [ ] 重複チェック機能
```

### **Phase 3: 運営連携・複製機能（1週間）**

```yaml
Week 3-4: 高度な機能
実装内容:
  - 運営重複表示（モデル専用）
  - レイヤー表示機能
  - 複製・一括設定機能
  - パフォーマンス最適化

成果物:
  - [ ] OrganizerOverlapView
  - [ ] レイヤー表示切り替え
  - [ ] 複製・一括設定機能
  - [ ] パフォーマンス最適化
```

---

## 🧪 **テスト・品質保証**

### **機能テスト項目**

```yaml
基本機能テスト:
  - [ ] 時間枠の作成・編集・削除
  - [ ] 重複時間の防止チェック
  - [ ] 時間範囲バリデーション（0-1439分）
  - [ ] 複数時間枠の設定
  
UI/UXテスト:
  - [ ] カレンダーの月次表示
  - [ ] 日付クリック→モーダル表示
  - [ ] 時間軸でのレイヤー表示
  - [ ] レスポンシブ対応（スマホ・タブレット）
  
権限テスト:
  - [ ] 本人のみ編集可能
  - [ ] 運営による閲覧権限（モデルの場合）
  - [ ] 他人のスケジュール編集禁止
  
パフォーマンステスト:
  - [ ] 大量データでの表示速度
  - [ ] 複製処理の効率性
  - [ ] リアルタイム更新の応答性
```

---

## 🚀 **将来拡張への対応**

### **リクエスト撮影依頼システム接続準備**

```yaml
データ構造:
  - user_availability テーブルは将来の依頼システムで活用
  - 空き時間 → 依頼可能時間への変換ロジック
  - マッチングアルゴリズムでの活用

API設計:
  - 空き時間検索API（外部システム用）
  - 時間枠予約API（依頼受付用）
  - 可用性チェックAPI（リアルタイム確認用）

通知連携:
  - スケジュール変更通知
  - 依頼マッチング通知
  - 運営への報告機能
```

### **機能拡張候補**

```yaml
自動化機能:
  - 過去のパターン学習
  - スマート複製提案
  - 最適な空き時間提案

統計・分析:
  - 空き時間の利用率
  - 運営との重複率
  - 効率的な時間設定の提案

外部連携:
  - Googleカレンダー同期
  - 他カレンダーアプリとの連携
  - iCal形式でのエクスポート
```

---

## 📋 **実装チェックリスト**

### **準備作業**
- [ ] 既存model_availability/organizer_staff_availabilityテーブルの使用状況確認
- [ ] 既存PhotoSessionCalendarコンポーネントの詳細仕様確認
- [ ] プロフィールページの現在のタブ構成確認

### **データベース設計**  
- [ ] user_availabilityテーブル設計・作成
- [ ] 重複チェック関数の実装
- [ ] 運営連携関数の実装（モデル用）
- [ ] 適切なインデックス作成

### **UI/UXコンポーネント**
- [ ] UserScheduleManagerコンポーネント
- [ ] ScheduleEditModalコンポーネント  
- [ ] TimeSlotEditorコンポーネント
- [ ] OrganizerOverlapViewコンポーネント
- [ ] PhotoSessionCalendar拡張

### **機能実装**
- [ ] 基本的なCRUD操作
- [ ] 複製・一括設定機能
- [ ] 運営重複表示機能（モデル専用）
- [ ] レイヤー表示切り替え機能

### **品質保証**
- [ ] 単体テスト実装
- [ ] 統合テスト実装
- [ ] アクセシビリティチェック
- [ ] パフォーマンステスト

---

## 🎯 **成功指標**

### **機能指標**
- **利用率**: ユーザーの70%がスケジュール設定を行う
- **更新頻度**: 週1回以上のスケジュール更新
- **運営連携**: モデルユーザーの50%が運営重複確認を活用

### **技術指標**
- **レスポンス時間**: カレンダー表示 < 500ms
- **データ整合性**: 重複エラー発生率 < 0.1%
- **ユーザビリティ**: タスク完了率 > 90%

---

## 📝 **補足事項**

### **開発上の注意点**
- **後方互換性**: 既存PhotoSessionCalendarへの影響なし
- **段階的ロールアウト**: ユーザータイプ別の段階的機能公開
- **パフォーマンス**: 大量データでも快適な操作性を維持

### **ユーザー体験重視**
- **直感的操作**: ドラッグ&ドロップでの時間設定
- **視覚的フィードバック**: 設定状況の明確な表示  
- **エラー防止**: リアルタイムバリデーション
- **効率性**: 複製機能による設定工数削減

この要件定義書に基づいて、**重複のない効率的な実装**を進めることができます。

