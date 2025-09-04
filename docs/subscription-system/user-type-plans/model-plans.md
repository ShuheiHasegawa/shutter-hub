# モデル向けサブスクリプションプラン

> **モデルユーザー専用のサブスクリプションプラン詳細仕様**

## 🎯 モデルユーザーのニーズ分析

### ターゲット像
- **学生モデル**: 予算重視、ポートフォリオ構築が主目的
- **アマチュアモデル**: 趣味の延長、SNS映え重視
- **セミプロモデル**: 収益化を目指す、プロフィール強化が重要
- **プロモデル**: ビジネスツール、高品質・効率性重視

### 主要ペインポイント
1. **ポートフォリオ管理の制限**: 掲載可能写真数の不足
2. **人気撮影会への参加困難**: 抽選・先着で落選が多い
3. **プロフィールの差別化不足**: 他のモデルとの差別化が困難
4. **評価・分析機能の不足**: 自身のパフォーマンス把握が困難

## 💰 プラン構成

### 📱 フリープラン（¥0/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 2冊
  premiumTemplates: false
  exportQuality: "standard"
  prioritySupport: false
  storageLimit: 1GB

モデル特化機能:
  portfolioLimit: 10枚
  priorityBookingTickets: 0枚/月
  reviewAnalytics: false
  profileBoost: false
  premiumBadge: false
  privateGallery: false
```

#### **制限事項**
- プレミアムテンプレート利用不可
- 高解像度エクスポート不可
- 撮影会優先予約なし
- 詳細な評価分析なし

#### **ターゲット**
- ShutterHub初心者
- 機能確認・お試し利用
- 月1-2回程度の軽い利用

---

### 🌟 ベーシックプラン（¥680/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 10冊
  premiumTemplates: true
  exportQuality: "high"
  prioritySupport: false
  storageLimit: 3GB

モデル特化機能:
  portfolioLimit: 50枚
  priorityBookingTickets: 2枚/月
  reviewAnalytics: true
  profileBoost: true
  premiumBadge: false
  privateGallery: true
```

#### **新規解放機能**

##### **プレミアムテンプレート**
- 高品質なフォトブックテンプレート利用可能
- プロデザイナー制作のレイアウト
- 印刷品質に最適化されたデザイン

##### **ポートフォリオ拡張**
- 掲載可能写真数: 10枚 → 50枚
- 高解像度表示対応
- カテゴリ別整理機能

##### **優先予約システム**
- 月2枚の優先予約チケット付与
- 人気撮影会への優先参加権
- 抽選撮影会での当選率向上

##### **プロフィール強化**
- 検索結果での上位表示
- おすすめモデル欄への表示優先
- プロフィールページの拡張表示

##### **評価分析機能**
- 詳細な評価統計表示
- 月別・撮影会別の評価推移
- 強み・改善点の自動分析
- 他のモデルとの比較データ

#### **ターゲット**
- 定期的に撮影会に参加するモデル
- ポートフォリオ充実を目指すユーザー
- 月3-8回程度の利用

---

### 👑 プレミアムプラン（¥1,280/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 無制限
  premiumTemplates: true
  exportQuality: "ultra"
  prioritySupport: true
  storageLimit: 10GB

モデル特化機能:
  portfolioLimit: 無制限
  priorityBookingTickets: 5枚/月
  reviewAnalytics: true
  profileBoost: true
  premiumBadge: true
  privateGallery: true
  exclusiveEvents: true
```

#### **プレミアム限定機能**

##### **無制限利用**
- フォトブック作成数無制限
- ポートフォリオ写真数無制限
- 高品質テンプレート全種類利用可能

##### **最高品質エクスポート**
- Ultra品質（300dpi以上）での出力
- 商用利用可能な高解像度
- RAW形式での保存・ダウンロード

##### **プレミアムバッジ**
- プロフィールにプレミアムバッジ表示
- 検索結果での特別表示
- 信頼性・プロ意識のアピール

##### **優先サポート**
- 専用サポート窓口
- 24時間以内の回答保証
- 電話・チャットサポート対応

##### **限定イベント**
- プレミアムモデル限定撮影会
- 有名カメラマンとのコラボ企画
- ファッションブランドとのタイアップ

#### **ターゲット**
- プロ・セミプロモデル
- 高頻度利用ユーザー（月10回以上）
- 収益化を本格的に目指すユーザー

## 🎨 機能実装詳細

### ポートフォリオ管理システム

#### **写真アップロード制限**
```typescript
// 実装例: ポートフォリオ写真数チェック
export async function checkPortfolioLimit(userId: string): Promise<{
  canUpload: boolean;
  currentCount: number;
  limit: number;
  planName: string;
}> {
  const subscription = await getUserSubscription(userId);
  const limit = subscription.features.portfolioLimit;
  const currentCount = await getPortfolioPhotoCount(userId);
  
  return {
    canUpload: limit === -1 || currentCount < limit,
    currentCount,
    limit: limit === -1 ? Infinity : limit,
    planName: subscription.planName
  };
}
```

#### **表示優先度システム**
```sql
-- プロフィール検索での優先度計算
SELECT 
  p.*,
  CASE 
    WHEN sp.tier = 'premium' THEN 100
    WHEN sp.tier = 'basic' THEN 50
    ELSE 0
  END + 
  CASE 
    WHEN p.is_verified THEN 20
    ELSE 0
  END AS search_priority
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE p.user_type = 'model'
ORDER BY search_priority DESC, p.created_at DESC;
```

### 優先予約システム

#### **チケット管理**
```typescript
// 月次チケット付与バッチ処理
export async function grantMonthlyTickets() {
  const activeSubscriptions = await supabase
    .from('user_subscriptions')
    .select(`
      user_id,
      plan_id,
      subscription_plans!inner(type_specific_features)
    `)
    .eq('status', 'active')
    .eq('subscription_plans.user_type', 'model');

  for (const subscription of activeSubscriptions.data) {
    const ticketCount = subscription.subscription_plans.type_specific_features.priorityBookingTickets;
    
    if (ticketCount > 0) {
      await grantPriorityTickets(subscription.user_id, ticketCount);
    }
  }
}
```

### 評価分析システム

#### **分析データ構造**
```typescript
interface ModelAnalytics {
  overallRating: number;
  totalReviews: number;
  categoryBreakdown: {
    communication: number;
    punctuality: number;
    professionalism: number;
    appearance: number;
  };
  monthlyTrends: Array<{
    month: string;
    averageRating: number;
    reviewCount: number;
    sessionCount: number;
  }>;
  competitorComparison: {
    averageInCategory: number;
    rankingPercentile: number;
    strongPoints: string[];
    improvementAreas: string[];
  };
}
```

## 📊 価格設定の根拠

### 競合分析
| サービス | フリー | 有料プラン |
|----------|--------|------------|
| **ShutterHub** | ¥0 | ¥680-¥1,280 |
| 競合A | ¥0 | ¥800-¥1,500 |
| 競合B | なし | ¥1,200-¥2,000 |
| 競合C | ¥500 | ¥1,000-¥1,800 |

### 価値提案の根拠

#### **ベーシックプラン（¥680）**
- **1回の撮影会参加費**: 平均¥3,000-¥5,000
- **月2回の優先予約**: 機会損失回避価値 ¥6,000-¥10,000
- **ROI**: 約9-15倍の価値提供

#### **プレミアムプラン（¥1,280）**
- **プロ写真1枚の価値**: ¥2,000-¥5,000
- **月5回の優先予約**: 機会損失回避価値 ¥15,000-¥25,000
- **プレミアムバッジによる信頼性向上**: 予約率10-20%向上
- **ROI**: 約12-20倍の価値提供

## 🎯 マーケティング戦略

### アップセル戦略

#### **フリー → ベーシック**
- 3回目のポートフォリオ写真アップロード時にアップグレード提案
- 人気撮影会の抽選落選時に優先予約チケットの価値訴求
- 月5回以上の利用時にコスト効率の良さを提示

#### **ベーシック → プレミアム**
- 月10冊以上のフォトブック作成時に無制限プランの価値訴求
- 高品質エクスポートの必要性（印刷・商用利用）をアピール
- プレミアムバッジによる差別化効果を実例で紹介

### 継続率向上施策

#### **オンボーディング強化**
- プラン別機能の詳細ガイド
- 初回利用時の手厚いサポート
- 成功事例・活用方法の紹介

#### **エンゲージメント向上**
- 月次レポートの自動送信
- 達成バッジ・マイルストーン機能
- コミュニティイベントへの優先参加

## 📈 成功指標（KPI）

### 転換率目標
- **フリー → ベーシック**: 8%（業界平均5%を上回る）
- **ベーシック → プレミアム**: 15%（高付加価値による転換）
- **全体有料化率**: 10%（モデルユーザー全体）

### 継続率目標
- **3ヶ月継続率**: 85%
- **6ヶ月継続率**: 75%
- **12ヶ月継続率**: 65%

### 満足度指標
- **CSAT（顧客満足度）**: 4.2/5.0以上
- **NPS（推奨度）**: 40以上
- **機能利用率**: 80%以上（契約機能の実利用率）

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
  - ユーザータイプ別詳細機能
  - 高度な制限ロジック
  - 分析・レポート機能
  - マーケティング機能
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
**対象ユーザータイプ**: Model  
**実装方針**: 基本仕組み優先・詳細機能は後回し  
**次回レビュー**: Phase 1実装開始前
