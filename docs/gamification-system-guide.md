# ゲーミフィケーションシステム設計書

## 📋 概要

ShutterHub v2にユーザーエンゲージメント向上を目的としたゲーミフィケーション機能を導入します。バッジ、レベル、実績システムを通じて、ユーザーの継続的な活動を促進し、プラットフォームの価値向上を図ります。

## 🎯 目的・効果

### 主要目的
- **ユーザーエンゲージメント向上**: 継続的な活動促進
- **プラットフォーム定着率向上**: ゲーム要素による楽しさ提供
- **コミュニティ活性化**: 競争・協力要素の導入
- **ユーザー成長の可視化**: 明確な進歩指標の提供

### 期待効果
- 撮影会参加率 30%向上
- アプリ滞在時間 50%増加
- ユーザーリテンション率 40%改善
- レビュー投稿率 2倍向上

## 🏗️ システム構成

### 1. バッジシステム（Badge System）

#### バッジカテゴリ

**🏁 活動系バッジ**
```
撮影会デビュー: 初回撮影会参加
主催者デビュー: 初回撮影会主催
活動的な参加者: 月5回以上参加
人気主催者: 月10名以上の参加者獲得
ベテラン参加者: 50回参加達成
レジェンド主催者: 100回主催達成
月間活動王: 月20回以上活動
年間MVP: 年間最多活動ユーザー
```

**⭐ 評価系バッジ**
```
高評価モデル: 平均評価4.5以上（50評価以上）
信頼される主催者: 平均評価4.8以上（30評価以上）
コミュニケーション上手: コミュニケーション評価4.9以上
完璧主義者: 連続20回5つ星評価獲得
批評家: レビュー100回投稿
建設的批評家: 有用なレビュー50回投稿
```

**🌟 特殊系バッジ**
```
早起き撮影マスター: 朝8時前開始の撮影会20回参加
夜景撮影愛好家: 夜間撮影会50回参加
全国制覇: 10都道府県以上で撮影会参加
コスプレ愛好家: コスプレテーマ撮影会100回参加
四季撮影コレクター: 春夏秋冬各テーマ撮影会参加
ソーシャル王: フォロワー100人達成
```

**🎖️ 限定系バッジ**
```
パイオニア: ベータテスター
記念日コレクター: 特別イベント参加
シーズンマスター: 季節限定撮影会制覇
アニバーサリー: サービス周年記念参加
```

#### バッジ設計仕様

```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide React アイコン名
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'activity' | 'rating' | 'special' | 'achievement' | 'limited';
  requirements: BadgeRequirement[];
  reward_points: number;
  unlock_message: string;
  unlock_animation?: string;
  is_secret: boolean; // 隠しバッジ
  valid_until?: Date; // 限定バッジの有効期限
}

interface BadgeRequirement {
  type: 'count' | 'average' | 'consecutive' | 'timeframe' | 'special';
  target: string; // 対象テーブル・カラム
  value: number;
  condition?: 'gte' | 'lte' | 'eq';
  timeframe?: 'day' | 'week' | 'month' | 'year';
  additional_filters?: Record<string, any>;
}
```

### 2. レベルシステム（Level System）

#### 経験値（XP）設計

**基本アクション**
```
撮影会参加完了: 100 XP
撮影会主催完了: 200 XP
レビュー投稿: 50 XP
高評価獲得（4-5星）: 20 XP
プロフィール完成度向上: 25 XP
フォロー獲得: 10 XP
```

**ボーナス倍率**
```
連続活動ボーナス: 1.5倍（週3回以上活動）
新人歓迎ボーナス: 2倍（レベル1-5）
完璧評価ボーナス: 1.3倍（5つ星評価獲得時）
早期参加ボーナス: 1.2倍（撮影会公開から24時間以内予約）
```

#### レベル設計

```typescript
interface UserLevel {
  level: number;
  title: string;
  required_xp: number;
  total_required_xp: number;
  perks: LevelPerk[];
  badge_unlock?: string;
  unlock_features?: string[];
}

interface LevelPerk {
  type: 'feature' | 'discount' | 'priority' | 'cosmetic';
  name: string;
  description: string;
  value?: number;
}

// レベル段階例
const levelTiers = [
  { range: [1, 5], title: "新人", color: "#gray" },
  { range: [6, 15], title: "アクティブ", color: "#blue" },
  { range: [16, 30], title: "エキスパート", color: "#purple" },
  { range: [31, 50], title: "マスター", color: "#gold" },
  { range: [51, 99], title: "レジェンド", color: "#red" },
  { range: [100, 999], title: "神話", color: "#rainbow" }
];
```

### 3. 実績システム（Achievement System）

#### 実績カテゴリ

**📊 統計系実績**
```
撮影会参加者:
  - 初心者: 10回参加
  - 中級者: 50回参加
  - 上級者: 100回参加
  - エキスパート: 500回参加

撮影会主催者:
  - 新米主催者: 5回主催
  - ベテラン主催者: 25回主催
  - 名物主催者: 100回主催

評価コレクター:
  - 評価初心者: 100回高評価獲得
  - 評価マスター: 500回高評価獲得
  - 評価レジェンド: 1000回高評価獲得
```

**🎯 チャレンジ系実績**
```
パーフェクト記録:
  - パーフェクト週間: 1週間全て5つ星評価
  - パーフェクト月間: 1ヶ月間全て5つ星評価

多様性チャンピオン:
  - テーマ探検家: 10種類以上のテーマ撮影会参加
  - ジャンルマスター: 全ジャンル制覇

地域制覇:
  - 地域探検家: 5都道府県以上で活動
  - 全国制覇: 全都道府県で活動
```

**💎 特別実績**
```
ソーシャル系:
  - 人気者: フォロワー100人達成
  - インフルエンサー: フォロワー1000人達成
  - コミュニティリーダー: 活発なコミュニティ形成

貢献系:
  - 建設的批評家: 有用なレビュー50回投稿
  - コミュニティヘルパー: 新規ユーザーサポート
  - プラットフォーム改善者: フィードバック提供
```

## 🗄️ データベース設計

### ERD概要

```
users (既存)
├── user_gamification (1:1)
├── user_badges (1:N)
├── user_achievements (1:N)
└── user_activity_logs (1:N)

badges (マスター)
├── user_badges (1:N)
└── achievements (N:1)

achievements (マスター)
└── user_achievements (1:N)
```

### テーブル定義

```sql
-- ユーザーゲーミフィケーション情報
CREATE TABLE user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  monthly_xp INTEGER DEFAULT 0,
  weekly_xp INTEGER DEFAULT 0,
  daily_xp INTEGER DEFAULT 0,
  
  -- アクティビティ追跡
  last_activity_date DATE DEFAULT CURRENT_DATE,
  consecutive_days INTEGER DEFAULT 0,
  max_consecutive_days INTEGER DEFAULT 0,
  total_activity_days INTEGER DEFAULT 0,
  
  -- 統計情報
  total_badges INTEGER DEFAULT 0,
  total_achievements INTEGER DEFAULT 0,
  rank_position INTEGER,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- バッジ定義マスター
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  category TEXT NOT NULL CHECK (category IN ('activity', 'rating', 'special', 'achievement', 'limited')),
  
  -- 獲得条件
  requirements JSONB NOT NULL,
  unlock_requirements JSONB, -- 前提条件
  
  -- 報酬・設定
  reward_xp INTEGER DEFAULT 0,
  unlock_message TEXT,
  unlock_animation VARCHAR(50),
  is_secret BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- 限定バッジ設定
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_recipients INTEGER, -- 限定数
  current_recipients INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー獲得バッジ
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  
  -- 獲得情報
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB, -- 獲得時の進捗状況
  is_featured BOOLEAN DEFAULT false, -- プロフィールで強調表示
  
  -- メタデータ
  earning_context JSONB, -- 獲得時の状況
  
  UNIQUE(user_id, badge_id)
);

-- 実績定義マスター
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory VARCHAR(50),
  
  -- 達成条件
  target_type VARCHAR(50) NOT NULL, -- 対象テーブル
  target_value INTEGER NOT NULL,
  condition_type VARCHAR(20) DEFAULT 'gte' CHECK (condition_type IN ('gte', 'lte', 'eq')),
  timeframe VARCHAR(20) CHECK (timeframe IN ('all_time', 'year', 'month', 'week', 'day')),
  additional_filters JSONB,
  
  -- 報酬
  reward_xp INTEGER DEFAULT 0,
  badge_reward_id UUID REFERENCES badges(id),
  
  -- 表示設定
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー実績進捗
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  
  -- 進捗情報
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 THEN LEAST(100.0, (current_value::DECIMAL / target_value) * 100)
      ELSE 0 
    END
  ) STORED,
  
  -- 完了情報
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- メタデータ
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  completion_context JSONB,
  
  UNIQUE(user_id, achievement_id)
);

-- レベル定義マスター
CREATE TABLE level_definitions (
  level INTEGER PRIMARY KEY,
  title VARCHAR(50) NOT NULL,
  required_xp INTEGER NOT NULL,
  total_required_xp INTEGER NOT NULL,
  perks JSONB,
  unlock_features JSONB,
  badge_reward_id UUID REFERENCES badges(id),
  unlock_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 経験値履歴
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  source_type VARCHAR(50), -- 'photo_session', 'review', 'profile' etc.
  source_id UUID,
  
  -- XP情報
  base_xp INTEGER NOT NULL,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
  final_xp INTEGER NOT NULL,
  bonus_reason VARCHAR(100),
  
  -- レベル変化
  level_before INTEGER,
  level_after INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### インデックス定義

```sql
-- パフォーマンス最適化用インデックス
CREATE INDEX idx_user_gamification_level ON user_gamification(current_level DESC);
CREATE INDEX idx_user_gamification_xp ON user_gamification(total_xp DESC);
CREATE INDEX idx_user_gamification_monthly_xp ON user_gamification(monthly_xp DESC);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at DESC);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_progress ON user_achievements(progress_percentage DESC);
CREATE INDEX idx_user_achievements_completed ON user_achievements(is_completed, completed_at);

CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);
CREATE INDEX idx_badges_active ON badges(is_active);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(is_active);

CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_xp_transactions_action_type ON xp_transactions(action_type);
```

## 🎨 UI/UXコンポーネント設計

### コンポーネント構成

```
/src/components/gamification/
├── dashboard/
│   ├── GamificationDashboard.tsx     # メインダッシュボード
│   ├── LevelProgressCard.tsx         # レベル進捗表示
│   ├── WeeklyProgressChart.tsx       # 週間進捗グラフ
│   └── QuickStats.tsx               # 簡易統計表示
├── badges/
│   ├── BadgeCollection.tsx          # バッジコレクション
│   ├── BadgeCard.tsx               # 個別バッジ表示
│   ├── BadgeGrid.tsx               # バッジ一覧グリッド
│   └── BadgeUnlockModal.tsx        # バッジ獲得モーダル
├── achievements/
│   ├── AchievementList.tsx         # 実績一覧
│   ├── AchievementCard.tsx         # 個別実績表示
│   ├── AchievementProgress.tsx     # 進捗バー
│   └── AchievementCategory.tsx     # カテゴリ別表示
├── levels/
│   ├── LevelProgressBar.tsx        # レベル進捗バー
│   ├── XPCounter.tsx              # XP表示
│   ├── LevelBenefits.tsx          # レベル特典表示
│   └── LevelUpAnimation.tsx       # レベルアップアニメーション
├── notifications/
│   ├── XPNotification.tsx         # XP獲得通知
│   ├── BadgeNotification.tsx      # バッジ獲得通知
│   ├── LevelUpNotification.tsx    # レベルアップ通知
│   └── AchievementNotification.tsx # 実績達成通知
└── common/
    ├── RarityBadge.tsx           # レア度表示
    ├── ProgressRing.tsx          # 円形進捗表示
    └── AnimatedCounter.tsx       # アニメーション付きカウンター
```

### ページ構成

```typescript
// /gamification ページ
const GamificationPage = () => (
  <DashboardLayout>
    <div className="space-y-6">
      <GamificationHeader />
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="badges">バッジ</TabsTrigger>
          <TabsTrigger value="achievements">実績</TabsTrigger>
          <TabsTrigger value="leaderboard">ランキング</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LevelProgressCard />
              <WeeklyProgressChart />
            </div>
            <div>
              <QuickStats />
              <RecentBadges />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="badges">
          <BadgeCollection />
        </TabsContent>
        
        <TabsContent value="achievements">
          <AchievementList />
        </TabsContent>
        
        <TabsContent value="leaderboard">
          <Leaderboard />
        </TabsContent>
      </Tabs>
    </div>
  </DashboardLayout>
);
```

## ⚙️ ビジネスロジック設計

### Server Actions

```typescript
// /src/app/actions/gamification.ts

// XP付与処理
export async function awardExperience(
  userId: string,
  action: string,
  sourceType?: string,
  sourceId?: string,
  bonusMultiplier?: number
): Promise<{
  success: boolean;
  xpAwarded: number;
  levelUp?: boolean;
  newLevel?: number;
  message?: string;
}>;

// バッジ獲得チェック
export async function checkBadgeEligibility(
  userId: string,
  triggerAction?: string
): Promise<{
  success: boolean;
  newBadges: Badge[];
  message?: string;
}>;

// 実績進捗更新
export async function updateAchievementProgress(
  userId: string,
  achievementType: string,
  incrementValue?: number
): Promise<{
  success: boolean;
  completedAchievements: Achievement[];
  message?: string;
}>;

// ゲーミフィケーション統計取得
export async function getGamificationStats(
  userId: string
): Promise<{
  success: boolean;
  data?: GamificationStats;
  message?: string;
}>;
```

### トリガーシステム

```typescript
// バッジ・実績トリガー設定
export const GAMIFICATION_TRIGGERS = {
  PHOTO_SESSION_COMPLETED: {
    xp: 100,
    achievements: ['session_participant'],
    badges: ['first_session', 'active_participant']
  },
  PHOTO_SESSION_ORGANIZED: {
    xp: 200,
    achievements: ['session_organizer'],
    badges: ['first_organization', 'popular_organizer']
  },
  REVIEW_POSTED: {
    xp: 50,
    achievements: ['review_contributor'],
    badges: ['first_review', 'critic']
  },
  HIGH_RATING_RECEIVED: {
    xp: 20,
    achievements: ['rating_collector'],
    badges: ['well_rated', 'perfectionist']
  }
} as const;

// トリガー実行
export async function executeTrigger(
  trigger: keyof typeof GAMIFICATION_TRIGGERS,
  userId: string,
  context?: Record<string, any>
): Promise<void>;
```

## 🚀 実装ロードマップ

### Phase 1: データベース基盤構築（1日）
- [ ] マイグレーションファイル作成
- [ ] テーブル作成・インデックス設定
- [ ] 初期データ投入（バッジ・実績定義）
- [ ] RLS設定

### Phase 2: コアロジック実装（2日）
- [ ] XP計算・レベルアップロジック
- [ ] バッジ獲得判定システム
- [ ] 実績進捗追跡システム
- [ ] Server Actions実装

### Phase 3: UI/UXコンポーネント（2日）
- [ ] 基本コンポーネント作成
- [ ] ゲーミフィケーションダッシュボード
- [ ] 通知システム
- [ ] アニメーション実装

### Phase 4: 既存システム統合（1日）
- [ ] 撮影会参加時のトリガー統合
- [ ] レビューシステム連携
- [ ] プロフィール表示統合
- [ ] ナビゲーション追加

### Phase 5: 最適化・テスト（1日）
- [ ] パフォーマンス最適化
- [ ] E2Eテスト作成
- [ ] 動作確認・デバッグ
- [ ] ドキュメント更新

## 🎯 成功指標（KPI）

### ユーザーエンゲージメント
- **撮影会参加率**: 30%向上目標
- **アプリ滞在時間**: 50%増加目標
- **ユーザーリテンション**: 40%改善目標
- **レビュー投稿率**: 2倍向上目標

### ゲーミフィケーション指標
- **バッジ獲得率**: 80%のユーザーが1つ以上獲得
- **レベルアップ率**: 60%のユーザーがレベル5以上到達
- **実績達成率**: 70%のユーザーが5つ以上達成
- **継続ログイン率**: 連続7日ログイン30%向上

### システム指標
- **応答速度**: ゲーミフィケーション画面100ms以内
- **データ整合性**: XP・レベル計算100%正確性
- **通知配信率**: バッジ獲得通知99%以上配信
- **エラー率**: ゲーミフィケーション機能0.1%以下

## 🔮 将来の拡張案

### フェーズ2機能
- **ギルドシステム**: チーム形成・競争
- **シーズンチャレンジ**: 期間限定イベント
- **NFTバッジ**: ブロックチェーン連携
- **ソーシャルランキング**: 友達との競争

### フェーズ3機能
- **AIパーソナライゼーション**: 個別最適化チャレンジ
- **VR/ARバッジ**: 仮想現実での特別体験
- **外部プラットフォーム連携**: Instagram等との連携
- **リアルタイムイベント**: ライブ配信連動機能

---

**実装開始日**: 2025年1月27日  
**完成予定日**: 2025年2月3日（7日間）  
**担当者**: フルスタック開発者  
**レビュー予定**: Phase毎の完了時点で実施