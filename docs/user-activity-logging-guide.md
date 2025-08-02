# ユーザー行動ログシステム設計書

## 📋 概要

ShutterHub v2における将来のAIアルゴリズム活用とユーザー体験向上を目的とした、包括的なユーザー行動ログシステムを設計・実装します。このシステムは、ユーザーの行動パターンを分析し、パーソナライズされた推薦やUX改善に活用します。

## 🎯 目的・効果

### 主要目的
- **AIアルゴリズム基盤**: 機械学習・推薦システムのデータ基盤構築
- **ユーザー体験分析**: 行動パターン分析によるUX改善
- **パーソナライゼーション**: 個別最適化されたコンテンツ提供
- **ビジネス改善**: データドリブンな意思決定支援

### 期待効果
- **推薦精度**: 70%以上の的中率を持つ撮影会推薦
- **ユーザー満足度**: 20%向上（パーソナライズ機能により）
- **コンバージョン率**: 15%向上（最適化されたUXにより）
- **プラットフォーム理解度**: 包括的なユーザー行動分析

## 🏗️ システム構成

### 1. ログ収集対象

#### ページビュー・ナビゲーション
```javascript
{
  action_type: 'page_view',
  target_type: 'page',
  target_id: null,
  metadata: {
    page_path: '/photo-sessions',
    referrer: '/dashboard',
    user_agent: 'Mozilla/5.0...',
    viewport_size: '1920x1080',
    load_time: 1250, // ms
    session_id: 'sess_xyz123'
  }
}
```

#### 検索・フィルタリング行動
```javascript
{
  action_type: 'search',
  target_type: 'photo_session',
  target_id: null,
  metadata: {
    search_query: 'コスプレ 東京',
    filters_applied: {
      location: '東京都',
      price_min: 3000,
      price_max: 8000,
      date_range: '2025-02-01,2025-02-28'
    },
    results_count: 15,
    search_duration: 850, // ms
    result_clicked: 'session_abc123'
  }
}
```

#### 撮影会関連行動
```javascript
{
  action_type: 'photo_session_view',
  target_type: 'photo_session',
  target_id: 'session_abc123',
  metadata: {
    view_duration: 45000, // ms
    sections_viewed: ['details', 'slots', 'reviews'],
    scroll_depth: 85, // %
    images_viewed: ['img1', 'img2'],
    cta_interactions: ['bookmark', 'share'],
    exit_point: 'booking_button'
  }
}
```

#### 予約・決済行動
```javascript
{
  action_type: 'booking_attempt',
  target_type: 'photo_session',
  target_id: 'session_abc123',
  metadata: {
    booking_type: 'first_come',
    slot_selected: 'slot_def456',
    form_completion_time: 120000, // ms
    form_errors: ['invalid_phone'],
    abandonment_point: 'payment_step',
    completion_status: 'abandoned' // or 'completed'
  }
}
```

#### ソーシャル・コミュニケーション
```javascript
{
  action_type: 'social_interaction',
  target_type: 'user',
  target_id: 'user_ghi789',
  metadata: {
    interaction_type: 'follow', // follow, unfollow, message, like
    source_context: 'profile_page',
    relationship_duration: null, // 既存関係の場合は期間
    mutual_connections: 5
  }
}
```

#### コンテンツ操作
```javascript
{
  action_type: 'content_interaction',
  target_type: 'post',
  target_id: 'post_jkl012',
  metadata: {
    interaction_type: 'like', // like, comment, share, save
    content_type: 'photo',
    engagement_time: 15000, // ms
    scroll_position: 60, // %
    reaction_delay: 2000 // クリックまでの時間
  }
}
```

### 2. ログ分類システム

#### アクションタイプ分類
```typescript
type ActionType = 
  // ナビゲーション
  | 'page_view' | 'page_exit' | 'navigation' | 'back_button'
  // 検索・発見
  | 'search' | 'filter_apply' | 'sort_change' | 'suggestion_click'
  // 撮影会関連
  | 'photo_session_view' | 'photo_session_bookmark' | 'photo_session_share'
  | 'booking_attempt' | 'booking_complete' | 'booking_cancel'
  // ソーシャル
  | 'follow' | 'unfollow' | 'message_send' | 'profile_view'
  // コンテンツ
  | 'content_view' | 'content_like' | 'content_comment' | 'content_share'
  // レビュー・評価
  | 'review_write' | 'review_submit' | 'rating_give'
  // プロフィール・設定
  | 'profile_edit' | 'settings_change' | 'preference_update'
  // システム
  | 'login' | 'logout' | 'error_encounter' | 'performance_issue';

type TargetType = 
  | 'page' | 'photo_session' | 'user' | 'post' | 'message' 
  | 'review' | 'booking' | 'search_result' | 'notification'
  | 'ui_element' | 'system';
```

### 3. データ収集戦略

#### フロントエンド収集（React Hooks）
```typescript
// useActivityLogger.ts
export const useActivityLogger = () => {
  const { user } = useAuth();
  
  const logActivity = useCallback(async (
    actionType: ActionType,
    targetType: TargetType,
    targetId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    
    const logEntry = {
      user_id: user.id,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // バッチ処理でパフォーマンス最適化
    await logActivityBatch([logEntry]);
  }, [user]);
  
  return { logActivity };
};

// 自動追跡Hooks
export const usePageViewLogger = () => {
  const { logActivity } = useActivityLogger();
  const pathname = usePathname();
  
  useEffect(() => {
    const startTime = Date.now();
    
    logActivity('page_view', 'page', pathname, {
      referrer: document.referrer,
      load_time: Date.now() - startTime
    });
    
    return () => {
      logActivity('page_exit', 'page', pathname, {
        session_duration: Date.now() - startTime
      });
    };
  }, [pathname, logActivity]);
};
```

#### バックエンド処理（Server Actions）
```typescript
// /src/app/actions/activity-logger.ts
export async function logUserActivity(
  logEntries: ActivityLogEntry[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    
    // バッチインサート（パフォーマンス最適化）
    const { error } = await supabase
      .from('user_activity_logs')
      .insert(logEntries);
    
    if (error) throw error;
    
    // リアルタイム分析トリガー（必要に応じて）
    await triggerAnalysisUpdate(logEntries);
    
    return { success: true };
  } catch (error) {
    logger.error('活動ログ記録エラー:', error);
    return { success: false, message: 'ログ記録に失敗しました' };
  }
}

// 分析用集約処理
export async function aggregateUserBehavior(
  userId: string,
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<UserBehaviorAnalysis> {
  // 集約クエリ実行
  // 行動パターン分析
  // パーソナライゼーション用データ生成
}
```

## 🗄️ データベース設計

### メインテーブル設計

```sql
-- ユーザー活動ログメインテーブル
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 基本アクション情報
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  
  -- メタデータ（JSONB で柔軟な構造）
  metadata JSONB DEFAULT '{}',
  
  -- セッション情報
  session_id VARCHAR(100),
  
  -- 技術的情報
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- パフォーマンス情報
  page_load_time INTEGER, -- ミリ秒
  interaction_delay INTEGER, -- ミリ秒
  
  -- 地理・環境情報
  timezone VARCHAR(50),
  viewport_width INTEGER,
  viewport_height INTEGER,
  device_type VARCHAR(20), -- desktop, mobile, tablet
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー行動パターン集約テーブル（分析用）
CREATE TABLE user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 期間情報
  analysis_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- 基本統計
  total_sessions INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- 秒
  unique_pages_visited INTEGER DEFAULT 0,
  
  -- 行動分析
  most_active_hour INTEGER, -- 0-23
  preferred_device VARCHAR(20),
  average_session_duration INTEGER, -- 秒
  
  -- エンゲージメント指標
  search_queries_count INTEGER DEFAULT 0,
  bookings_attempted INTEGER DEFAULT 0,
  bookings_completed INTEGER DEFAULT 0,
  reviews_written INTEGER DEFAULT 0,
  social_interactions INTEGER DEFAULT 0,
  
  -- 興味・嗜好分析
  preferred_categories JSONB DEFAULT '[]',
  price_range_preference JSONB DEFAULT '{}',
  location_preferences JSONB DEFAULT '[]',
  time_preferences JSONB DEFAULT '{}', -- 好む時間帯
  
  -- 行動パターン
  bounce_rate DECIMAL(5,2), -- 直帰率
  conversion_rate DECIMAL(5,2), -- コンバージョン率
  engagement_score DECIMAL(5,2), -- エンゲージメントスコア
  
  -- メタデータ
  analysis_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, analysis_period, period_start)
);

-- セッション情報テーブル
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- セッション基本情報
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- セッション統計
  pages_visited INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  
  -- 技術情報
  ip_address INET,
  user_agent TEXT,
  initial_referrer TEXT,
  device_info JSONB DEFAULT '{}',
  
  -- セッション成果
  goals_achieved JSONB DEFAULT '[]', -- 達成した目標
  conversions JSONB DEFAULT '[]', -- コンバージョン
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 検索・フィルタ履歴テーブル（推薦システム用）
CREATE TABLE user_search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 検索情報
  search_query TEXT,
  search_type VARCHAR(50) DEFAULT 'general', -- general, photo_session, user
  
  -- フィルタ情報
  filters_applied JSONB DEFAULT '{}',
  sort_order VARCHAR(50),
  
  -- 結果・反応
  results_count INTEGER,
  results_clicked JSONB DEFAULT '[]',
  time_to_first_click INTEGER, -- ミリ秒
  
  -- メタデータ
  search_context VARCHAR(100), -- ページや機能
  search_session_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- リアルタイム分析テーブル（HOTデータ）
CREATE TABLE real_time_user_metrics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- リアルタイム指標
  current_session_id VARCHAR(100),
  last_activity_time TIMESTAMPTZ DEFAULT NOW(),
  
  -- 今日の活動
  today_sessions INTEGER DEFAULT 0,
  today_actions INTEGER DEFAULT 0,
  today_time_spent INTEGER DEFAULT 0, -- 秒
  
  -- 最近の傾向
  recent_interests JSONB DEFAULT '[]', -- 最近の興味分野
  current_behavior_score DECIMAL(5,2) DEFAULT 0, -- リアルタイム行動スコア
  
  -- ターゲティング情報
  recommended_categories JSONB DEFAULT '[]',
  predicted_next_action VARCHAR(50),
  engagement_likelihood DECIMAL(5,2),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### インデックス最適化

```sql
-- パフォーマンス最適化用インデックス
CREATE INDEX idx_activity_logs_user_id_created ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON user_activity_logs(action_type);
CREATE INDEX idx_activity_logs_target ON user_activity_logs(target_type, target_id);
CREATE INDEX idx_activity_logs_session ON user_activity_logs(session_id);
CREATE INDEX idx_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- メタデータ検索用インデックス
CREATE INDEX idx_activity_logs_metadata_gin ON user_activity_logs USING GIN(metadata);

-- 行動パターン分析用インデックス
CREATE INDEX idx_behavior_patterns_user_period ON user_behavior_patterns(user_id, analysis_period, period_start);
CREATE INDEX idx_behavior_patterns_engagement ON user_behavior_patterns(engagement_score DESC);

-- 検索履歴分析用インデックス
CREATE INDEX idx_search_history_user_created ON user_search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_query ON user_search_history USING GIN(to_tsvector('japanese', search_query));

-- リアルタイム分析用インデックス
CREATE INDEX idx_real_time_metrics_last_activity ON real_time_user_metrics(last_activity_time DESC);
CREATE INDEX idx_real_time_metrics_engagement ON real_time_user_metrics(engagement_likelihood DESC);
```

### パーティショニング戦略

```sql
-- 月次パーティショニング（大量データ対応）
CREATE TABLE user_activity_logs_y2025m01 PARTITION OF user_activity_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_activity_logs_y2025m02 PARTITION OF user_activity_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- パーティション自動管理関数
CREATE OR REPLACE FUNCTION create_monthly_partition(
  target_date DATE
) RETURNS VOID AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := date_trunc('month', target_date);
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'user_activity_logs_y' || 
                   extract(year from start_date) || 'm' || 
                   lpad(extract(month from start_date)::text, 2, '0');
  
  EXECUTE format('CREATE TABLE %I PARTITION OF user_activity_logs 
                  FOR VALUES FROM (%L) TO (%L)',
                 partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## 🤖 AI分析・推薦システム設計

### 1. 行動パターン分析

#### ユーザークラスタリング
```typescript
interface UserCluster {
  cluster_id: string;
  cluster_name: string;
  characteristics: {
    activity_level: 'low' | 'medium' | 'high';
    preferred_times: string[]; // ['morning', 'evening']
    favorite_categories: string[];
    price_sensitivity: 'low' | 'medium' | 'high';
    social_activity: 'low' | 'medium' | 'high';
  };
  user_count: number;
  typical_behavior: string[];
}

// クラスタリング実装例
export async function analyzeUserClusters(): Promise<UserCluster[]> {
  // K-means クラスタリング
  // 行動パターン分析
  // 特徴量抽出
}
```

#### 推薦アルゴリズム
```typescript
interface RecommendationEngine {
  // コンテンツベースフィルタリング
  contentBased(userId: string, limit: number): Promise<PhotoSession[]>;
  
  // 協調フィルタリング
  collaborativeFiltering(userId: string, limit: number): Promise<PhotoSession[]>;
  
  // ハイブリッド推薦
  hybridRecommendation(userId: string, limit: number): Promise<PhotoSession[]>;
  
  // リアルタイム推薦
  realTimeRecommendation(userId: string, context: RecommendationContext): Promise<PhotoSession[]>;
}
```

### 2. 予測モデル

#### 参加確率予測
```typescript
interface ParticipationPrediction {
  user_id: string;
  session_id: string;
  participation_probability: number; // 0-1
  confidence_score: number; // 0-1
  factors: {
    time_preference_match: number;
    category_interest: number;
    price_appropriateness: number;
    social_influence: number;
    historical_pattern: number;
  };
}
```

#### 離脱リスク予測
```typescript
interface ChurnPrediction {
  user_id: string;
  churn_probability: number; // 0-1
  risk_level: 'low' | 'medium' | 'high';
  key_factors: string[];
  recommended_actions: string[];
  prediction_confidence: number;
}
```

## 📊 分析ダッシュボード設計

### 1. ユーザー向け分析

#### 個人活動ダッシュボード
```typescript
const PersonalAnalytics = () => (
  <div className="space-y-6">
    <ActivitySummaryCard />
    <InterestAnalysisChart />
    <ParticipationPatternHeatmap />
    <RecommendedImprovement />
  </div>
);
```

#### パーソナル推薦
```typescript
const PersonalizedRecommendations = () => (
  <div className="space-y-4">
    <RecommendedSessions reason="interest_match" />
    <TrendingInYourArea />
    <FollowedUsersActivity />
    <UpcomingInYourCalendar />
  </div>
);
```

### 2. 管理者向け分析

#### プラットフォーム分析ダッシュボード
```typescript
const PlatformAnalytics = () => (
  <Tabs defaultValue="overview">
    <TabsContent value="overview">
      <MetricsOverview />
      <UserEngagementTrends />
      <ConversionFunnelAnalysis />
    </TabsContent>
    
    <TabsContent value="users">
      <UserBehaviorAnalysis />
      <UserSegmentation />
      <ChurnAnalysis />
    </TabsContent>
    
    <TabsContent value="content">
      <ContentPerformance />
      <SearchAnalytics />
      <RecommendationEffectiveness />
    </TabsContent>
  </Tabs>
);
```

## ⚙️ データ処理パイプライン

### 1. リアルタイム処理

```typescript
// リアルタイムストリーミング処理
export class ActivityStreamProcessor {
  async processActivityStream(logEntry: ActivityLogEntry): Promise<void> {
    // 1. バリデーション・クレンジング
    const cleanedEntry = await this.validateAndClean(logEntry);
    
    // 2. リアルタイム指標更新
    await this.updateRealTimeMetrics(cleanedEntry);
    
    // 3. アラート・通知判定
    await this.checkAlertConditions(cleanedEntry);
    
    // 4. 推薦システム更新
    await this.updateRecommendationContext(cleanedEntry);
    
    // 5. 異常検知
    await this.detectAnomalies(cleanedEntry);
  }
}
```

### 2. バッチ処理

```typescript
// 日次バッチ分析
export class DailyAnalysisJob {
  async runDailyAnalysis(): Promise<void> {
    // 1. ユーザー行動パターン分析
    await this.analyzeUserBehaviorPatterns();
    
    // 2. コンテンツパフォーマンス分析
    await this.analyzeContentPerformance();
    
    // 3. 推薦モデル更新
    await this.updateRecommendationModels();
    
    // 4. 異常値検出・アラート
    await this.detectAndAlertAnomalies();
    
    // 5. レポート生成
    await this.generateDailyReports();
  }
}
```

## 🔒 プライバシー・セキュリティ

### 1. データ匿名化

```typescript
interface PrivacySettings {
  data_retention_days: number; // デフォルト: 365日
  anonymization_after_days: number; // デフォルト: 90日
  tracking_consent: boolean;
  analytics_consent: boolean;
  personalization_consent: boolean;
}

// 匿名化処理
export async function anonymizeOldData(): Promise<void> {
  // 90日以上前のデータを匿名化
  // PII（個人識別情報）削除
  // 統計的差分プライバシー適用
}
```

### 2. GDPR準拠

```typescript
// データ削除機能
export async function deleteUserActivityData(
  userId: string,
  deleteType: 'soft' | 'hard' = 'soft'
): Promise<void> {
  if (deleteType === 'hard') {
    // 完全削除
    await permanentlyDeleteUserLogs(userId);
  } else {
    // ソフト削除（匿名化）
    await anonymizeUserLogs(userId);
  }
}

// データエクスポート機能
export async function exportUserActivityData(
  userId: string
): Promise<UserActivityExport> {
  // GDPR準拠のデータエクスポート
  return {
    activity_logs: await getUserActivityLogs(userId),
    behavior_patterns: await getUserBehaviorPatterns(userId),
    search_history: await getUserSearchHistory(userId),
    export_date: new Date().toISOString(),
    retention_policy: getRetentionPolicy()
  };
}
```

## 🚀 実装ロードマップ

### Phase 1: 基盤システム構築（2日）
- [ ] データベーススキーマ設計・実装
- [ ] 基本ログ収集システム構築
- [ ] React Hooks実装（useActivityLogger）
- [ ] Server Actions実装

### Phase 2: 分析システム構築（2日）
- [ ] バッチ分析処理実装
- [ ] ユーザー行動パターン分析
- [ ] 基本統計ダッシュボード
- [ ] データ集約・最適化

### Phase 3: AI・推薦システム基盤（2日）
- [ ] 推薦アルゴリズム実装
- [ ] ユーザークラスタリング
- [ ] 予測モデル基盤構築
- [ ] パーソナライゼーション機能

### Phase 4: UI/UX統合（1日）
- [ ] 分析ダッシュボードUI
- [ ] パーソナル推薦表示
- [ ] プライバシー設定画面
- [ ] 既存システム統合

### Phase 5: 最適化・運用準備（1日）
- [ ] パフォーマンス最適化
- [ ] セキュリティ・プライバシー対応
- [ ] 監視・アラート設定
- [ ] ドキュメント・テスト完成

## 📈 成功指標（KPI）

### データ品質指標
- **ログ収集率**: 99%以上
- **データ整合性**: 99.9%以上
- **リアルタイム処理遅延**: 100ms以下
- **バッチ処理完了時間**: 1時間以内

### AI・推薦指標
- **推薦精度**: 70%以上（クリック率）
- **推薦カバレッジ**: 90%以上（ユーザーベース）
- **パーソナライゼーション効果**: 20%向上
- **予測精度**: 80%以上（参加確率）

### ビジネス指標
- **ユーザーエンゲージメント**: 25%向上
- **コンバージョン率**: 15%向上
- **ユーザー満足度**: 4.5/5.0以上
- **プラットフォーム滞在時間**: 30%向上

## 🔮 将来の拡張案

### フェーズ2: 高度分析機能
- **感情分析**: レビュー・コメント感情分析
- **画像分析**: アップロード画像の自動タグ付け
- **自然言語処理**: 検索クエリの意図理解
- **時系列予測**: トレンド・需要予測

### フェーズ3: 外部連携・統合
- **Google Analytics 4連携**: ウェブ分析統合
- **外部データソース**: 天気・イベント情報連携
- **SNS連携**: Instagram・Twitter分析統合
- **IoTデータ**: 位置情報・センサーデータ活用

### フェーズ4: 次世代AI機能
- **大規模言語モデル**: ChatGPT連携推薦
- **画像生成AI**: パーソナライズド画像生成
- **音声分析**: 音声検索・コマンド
- **AR/VR分析**: 仮想現実体験分析

---

**実装開始日**: 2025年1月27日  
**完成予定日**: 2025年2月4日（8日間）  
**担当者**: フルスタック開発者 + データサイエンティスト  
**レビュー予定**: Phase毎の完了時点でデータ品質・プライバシー監査実施