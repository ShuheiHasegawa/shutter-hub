# 運営者向けサブスクリプションプラン

> **運営者ユーザー専用のサブスクリプションプラン詳細仕様**

## 🎯 運営者ユーザーのニーズ分析

### ターゲット像
- **個人運営者**: 小規模撮影会の主催、副業として運営
- **スタジオ運営者**: 複数撮影会の同時運営、収益最大化重視
- **イベント企業**: 大規模撮影イベントの企画・運営
- **プロデューサー**: 複数カメラマンとの撮影会プロデュース

### 主要ペインポイント
1. **参加者管理の複雑さ**: 多数の参加者情報・履歴管理が困難
2. **収益分析の不足**: 詳細な売上分析・予測ができない
3. **マーケティング効率**: 新規参加者獲得・リピーター確保が課題
4. **運営効率化**: 手作業による運営負荷が高い
5. **競合対応**: 他の撮影会との差別化・価格競争力維持

## 💰 プラン構成

### 📱 フリープラン（¥0/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 3冊
  premiumTemplates: false
  exportQuality: "standard"
  prioritySupport: false
  storageLimit: 1GB

運営者特化機能:
  sessionLimit: 3件
  advancedAnalytics: false
  marketingTools: false
  participantCRM: false
  revenueReports: false
  customBranding: false
  apiAccess: false
  teamManagement: false
```

#### **制限事項**
- 同時開催撮影会数: 最大3件
- 基本的な参加者リストのみ
- 簡易的な売上表示のみ
- マーケティング機能なし
- 詳細分析レポートなし

#### **ターゲット**
- ShutterHub初心者運営者
- 月1-2回程度の小規模撮影会
- 機能確認・お試し利用

---

### 🎯 スタンダードプラン（¥1,480/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 15冊
  premiumTemplates: true
  exportQuality: "high"
  prioritySupport: false
  storageLimit: 5GB

運営者特化機能:
  sessionLimit: 20件
  advancedAnalytics: true
  marketingTools: false
  participantCRM: true
  revenueReports: true
  customBranding: false
  apiAccess: false
  teamManagement: false
  automatedReminders: true
```

#### **新規解放機能**

##### **高度な分析機能**
```typescript
interface AdvancedAnalytics {
  revenueAnalysis: {
    monthlyRevenue: RevenueData[];
    profitMarginAnalysis: ProfitData;
    seasonalTrends: TrendData[];
    forecastProjection: ProjectionData;
  };
  
  participantAnalysis: {
    demographicBreakdown: DemographicData;
    repeatCustomerRate: number;
    acquisitionChannels: ChannelData[];
    lifetimeValue: LTVData;
  };
  
  sessionPerformance: {
    popularityRanking: SessionRankingData[];
    cancellationRates: CancellationData;
    capacityUtilization: UtilizationData;
    pricingOptimization: PricingData;
  };
}
```

##### **参加者CRM機能**
```typescript
interface ParticipantCRM {
  contactManagement: {
    personalInfo: ParticipantInfo;
    participationHistory: SessionHistory[];
    preferences: ParticipantPreferences;
    communicationLog: CommunicationRecord[];
  };
  
  segmentation: {
    frequencySegments: CustomerSegment[];
    spendingSegments: SpendingSegment[];
    preferenceSegments: PreferenceSegment[];
    customSegments: CustomSegment[];
  };
  
  automation: {
    welcomeSequence: AutomationFlow;
    birthdayMessages: AutomationFlow;
    winbackCampaigns: AutomationFlow;
    loyaltyPrograms: LoyaltyConfig;
  };
}
```

##### **収益レポート機能**
- 詳細な売上分析（日別・週別・月別）
- 撮影会別収益性分析
- 参加者別売上貢献度
- 季節トレンド・予測分析
- 競合比較レポート

##### **自動リマインダー**
- 撮影会前日・当日の自動通知
- キャンセル期限の事前通知
- 支払い期限のリマインド
- フォローアップメッセージの自動送信

#### **ターゲット**
- 定期的に撮影会を開催する運営者
- 月5-15回程度の撮影会運営
- 収益分析・効率化を重視するユーザー

---

### 🏢 プロフェッショナルプラン（¥2,980/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 無制限
  premiumTemplates: true
  exportQuality: "ultra"
  prioritySupport: true
  storageLimit: 50GB

運営者特化機能:
  sessionLimit: 無制限
  advancedAnalytics: true
  marketingTools: true
  participantCRM: true
  revenueReports: true
  customBranding: true
  apiAccess: true
  teamManagement: true
  whiteLabel: true
  enterpriseSupport: true
```

#### **プロフェッショナル限定機能**

##### **マーケティングツール**
```typescript
interface MarketingTools {
  emailMarketing: {
    campaignBuilder: CampaignBuilder;
    automationFlows: AutomationFlow[];
    abTesting: ABTestConfig;
    analytics: EmailAnalytics;
  };
  
  socialMediaIntegration: {
    autoPosting: SocialAutoPost;
    contentScheduling: ContentScheduler;
    hashtagOptimization: HashtagTool;
    influencerCollaboration: InfluencerTool;
  };
  
  advertisingIntegration: {
    googleAdsSync: GoogleAdsConfig;
    facebookAdsSync: FacebookAdsConfig;
    retargetingPixels: RetargetingConfig;
    conversionTracking: ConversionTracker;
  };
  
  loyaltyPrograms: {
    pointSystem: PointSystemConfig;
    tierBenefits: TierBenefitsConfig;
    referralPrograms: ReferralConfig;
    exclusiveOffers: ExclusiveOfferConfig;
  };
}
```

##### **カスタムブランディング**
- 独自ドメインでの撮影会ページ公開
- カスタムロゴ・色調での統一ブランディング
- オリジナル撮影会ページデザイン
- 名刺・フライヤー用素材の自動生成

##### **チーム管理機能**
```typescript
interface TeamManagement {
  teamMembers: {
    roles: TeamRole[]; // admin, manager, assistant, photographer
    permissions: PermissionMatrix;
    activityTracking: ActivityLog[];
  };
  
  collaboration: {
    taskAssignment: TaskManager;
    internalMessaging: MessagingSystem;
    fileSharing: FileShareSystem;
    calendarSync: CalendarIntegration;
  };
  
  performanceTracking: {
    memberMetrics: MemberPerformance[];
    teamKPIs: TeamKPI[];
    goalTracking: GoalTracker;
  };
}
```

##### **API アクセス・連携**
- 外部システムとの連携API
- カスタムアプリケーション開発支援
- Webhook による自動化
- サードパーティツール連携

##### **ホワイトラベル機能**
- ShutterHubブランドの完全非表示
- 独自ブランドでのサービス提供
- カスタムドメイン・SSL証明書
- 独自利用規約・プライバシーポリシー

#### **ターゲット**
- 大規模撮影会運営・イベント企業
- 複数スタッフでの運営体制
- 月20件以上の撮影会運営
- 法人・エンタープライズ利用

## 🎨 機能実装詳細

### 高度な分析システム

#### **データベース設計**
```sql
-- 分析用集計テーブル
CREATE TABLE analytics_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES photo_sessions(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  
  -- 基本メトリクス
  total_revenue INTEGER NOT NULL,
  total_participants INTEGER NOT NULL,
  capacity_utilization DECIMAL(5,2), -- 稼働率
  
  -- 参加者分析
  new_participants INTEGER DEFAULT 0,
  repeat_participants INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  
  -- 収益分析
  gross_revenue INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  net_revenue INTEGER NOT NULL,
  
  -- メタデータ
  weather_condition TEXT,
  day_of_week INTEGER,
  is_holiday BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organizer_id, session_id, date)
);

-- 参加者行動分析テーブル
CREATE TABLE participant_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- 参加統計
  total_sessions INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  first_session_date DATE,
  last_session_date DATE,
  
  -- 行動分析
  average_booking_lead_time INTEGER, -- 平均予約リードタイム（日）
  preferred_day_of_week INTEGER,
  preferred_time_slot TEXT,
  cancellation_rate DECIMAL(5,2),
  
  -- セグメンテーション
  customer_segment TEXT, -- 'new', 'regular', 'vip', 'at_risk'
  lifetime_value INTEGER,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organizer_id, participant_id)
);
```

#### **予測分析機能**
```typescript
export class PredictiveAnalytics {
  async generateRevenueForecasting(
    organizerId: string,
    timeframe: 'monthly' | 'quarterly' | 'yearly'
  ): Promise<ForecastResult> {
    const historicalData = await this.getHistoricalRevenue(organizerId, timeframe);
    const seasonalPatterns = await this.analyzeSeasonalTrends(historerId);
    const marketFactors = await this.getMarketFactors();
    
    // 機械学習モデルによる予測（将来的にはML APIを活用）
    const forecast = this.calculateLinearRegression(historicalData, seasonalPatterns);
    
    return {
      predictedRevenue: forecast.revenue,
      confidenceInterval: forecast.confidence,
      keyFactors: forecast.factors,
      recommendations: await this.generateRecommendations(forecast)
    };
  }
}
```

### マーケティング自動化

#### **メール配信システム**
```typescript
interface EmailCampaignBuilder {
  templates: {
    welcome: EmailTemplate;
    reminder: EmailTemplate;
    followUp: EmailTemplate;
    promotional: EmailTemplate;
    reactivation: EmailTemplate;
  };
  
  automation: {
    triggers: TriggerCondition[];
    flows: AutomationFlow[];
    segmentation: SegmentRule[];
  };
  
  analytics: {
    openRates: number;
    clickRates: number;
    conversionRates: number;
    unsubscribeRates: number;
  };
}
```

#### **SNS連携機能**
```typescript
export class SocialMediaManager {
  async schedulePost(
    platforms: ('instagram' | 'twitter' | 'facebook')[],
    content: SocialContent,
    scheduledTime: Date
  ): Promise<ScheduledPost[]> {
    const posts = [];
    
    for (const platform of platforms) {
      const optimizedContent = await this.optimizeForPlatform(content, platform);
      const scheduledPost = await this.scheduleForPlatform(platform, optimizedContent, scheduledTime);
      posts.push(scheduledPost);
    }
    
    return posts;
  }
  
  async generateHashtags(
    content: string,
    category: 'portrait' | 'fashion' | 'event'
  ): Promise<string[]> {
    // AI による最適ハッシュタグ生成
    return await this.aiHashtagGenerator.generate(content, category);
  }
}
```

## 📊 価格設定の根拠

### 競合分析
| サービス | フリー | 有料プラン |
|----------|--------|------------|
| **ShutterHub** | ¥0 | ¥1,480-¥2,980 |
| Eventbrite | ¥0 | 3.5%+手数料 |
| Peatix | ¥0 | 4.9%+手数料 |
| Connpass | ¥0 | なし |
| Doorkeeper | ¥0 | ¥8,000-¥30,000/月 |

### 価値提案の根拠

#### **スタンダードプラン（¥1,480）**
- **1回の撮影会収益**: 平均¥50,000-¥200,000
- **CRM・分析による効率化**: 月10-15時間の時短 = ¥30,000-¥45,000相当
- **リピーター増加**: 20-30%の参加者増加による収益向上
- **ROI**: 約20-30倍の価値提供

#### **プロフェッショナルプラン（¥2,980）**
- **マーケティング自動化**: 月20-30時間の時短 = ¥60,000-¥90,000相当
- **新規顧客獲得**: 30-50%の参加者増加
- **ブランディング効果**: プレミアム価格設定による単価向上
- **チーム効率化**: 複数スタッフの生産性向上
- **ROI**: 約30-50倍の価値提供

## 🎯 マーケティング戦略

### アップセル戦略

#### **フリー → スタンダード**
- 4回目の撮影会開催時に分析機能の価値訴求
- 参加者管理の手間を実感するタイミングでCRM機能提案
- 収益が月10万円を超えた時点で詳細分析の必要性アピール

#### **スタンダード → プロフェッショナル**
- 月15件以上の撮影会開催時にマーケティング自動化の価値訴求
- チーム拡大時の管理機能の必要性を提案
- 法人クライアント獲得時のブランディング機能アピール

### パートナーシップ戦略

#### **会場提携**
- スタジオ・イベント会場との提携
- プロフェッショナルプラン加入者向け会場割引
- 新規会場開拓支援

#### **決済サービス連携**
- 複数決済手段の提供
- 分割払い・後払いサービス
- 法人向け請求書払い対応

## 📈 成功指標（KPI）

### 転換率目標
- **フリー → スタンダード**: 50%（運営者の収益直結性が高い）
- **スタンダード → プロフェッショナル**: 25%（規模拡大による必要性）
- **全体有料化率**: 50%（運営者ユーザー全体）

### 継続率目標
- **3ヶ月継続率**: 95%（ビジネスツールとしての必要性）
- **6ヶ月継続率**: 90%
- **12ヶ月継続率**: 85%

### ビジネス成果指標
- **平均撮影会収益向上**: 25-40%
- **参加者リピート率**: 70%以上
- **新規参加者獲得率**: 月20-50%増加

### 満足度指標
- **CSAT（顧客満足度）**: 4.5/5.0以上
- **NPS（推奨度）**: 60以上
- **機能利用率**: 90%以上（契約機能の実利用率）

## 🚀 ロードマップ

### Phase 1（実装開始後1ヶ月）
- 基本的な分析機能
- 参加者CRM機能
- 自動リマインダー機能

### Phase 2（実装開始後2ヶ月）
- 収益レポート機能
- 基本的なマーケティングツール
- チーム管理機能

### Phase 3（実装開始後3ヶ月）
- 高度なマーケティング自動化
- API アクセス
- ホワイトラベル機能

### Phase 4（実装開始後6ヶ月）
- 予測分析機能
- AI による最適化提案
- エンタープライズ機能拡張

---

## 🚨 初回実装方針

### 実装優先度
```yaml
Phase 1 (基本仕組み優先):
  - サブスクリプションテーブル基盤構築
  - Stripe基本連携（Customer/Subscription作成）
  - 基本的なプラン選択UI
  - 簡易的な機能制限チェック

Phase 2 (詳細機能実装):
  - 運営者特化機能（高度分析、CRM等）
  - マーケティングツール
  - チーム管理機能
  - APIアクセス・ホワイトラベル機能
```

### Stripe MCP連携
```yaml
基本方針:
  - MCP連携を最優先で使用
  - 連携不可の場合は実装を一時中断
  - 手動でStripe接続確立後に再開
  - npxコマンドは使用禁止

中断条件:
  - mcp_stripe_test_connection が失敗
  - Stripe API呼び出しでエラー
  - MCP連携ツールが利用不可

再開手順:
  1. Stripe管理画面での手動確認
  2. API キーの再確認
  3. MCP連携の再確立
  4. 接続確認後に実装再開
```

---

**文書バージョン**: 1.1  
**最終更新**: 2025-09-04  
**対象ユーザータイプ**: Organizer  
**実装方針**: 基本仕組み優先・詳細機能は後回し  
**次回レビュー**: Phase 1実装開始前
