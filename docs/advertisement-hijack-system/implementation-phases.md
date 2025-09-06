# 画像ハイジャック広告システム 実装計画書

## 📋 概要

ShutterHub広告掲載システムの段階的実装計画。リスクを最小化し、確実な品質を保ちながら段階的にシステムを構築する。

## 🎯 実装戦略

### 基本方針
- **段階的リリース**: 小さく始めて段階的に拡張
- **品質重視**: 機能数より品質・安定性を優先
- **ユーザーフィードバック**: 各段階でユーザーの声を収集
- **リスク管理**: 各段階でリスクを評価・対策

### 成功基準
- **技術的安定性**: エラー率1%以下
- **ユーザー満足度**: 4.0/5.0以上
- **運用効率**: 承認作業時間の最適化
- **収益性**: 運用コストを上回る売上

## 📅 Phase 1: MVP実装（3-4週間）

### 🎯 目標
最小限の機能で広告システムの基本を実装し、運用ノウハウを蓄積する。

### 📋 実装範囲

#### 広告枠
```yaml
対象枠:
  - トップページメインバナー: 1つのみ
  - サイズ: 1200x300px固定
  - 位置: メインビジュアル下

表示制御:
  - 時間単位での切り替え
  - デフォルト画像への自動フォールバック
  - 簡単なローディング表示
```

#### 予約システム
```yaml
予約機能:
  - カレンダー形式の時間選択
  - 15分単位での予約
  - 最短24時間前までの予約
  - 最長30日先までの予約

料金設定:
  - 固定料金: 100円/分
  - 1時間パック: 5,000円
  - 前払い決済のみ
```

#### 承認システム
```yaml
承認フロー:
  - 手動承認のみ
  - 承認期限: 掲載開始12時間前
  - 基本的な画像チェック
  - 簡単な拒否理由テンプレート

管理画面:
  - 申請一覧表示
  - 承認・拒否ボタン
  - 基本的な統計表示
```

### 🛠️ 技術実装

#### データベース設計
```sql
-- 広告枠定義
CREATE TABLE advertisement_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    base_price_per_minute DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 広告予約
CREATE TABLE advertisement_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES advertisement_slots(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_alt TEXT,
    link_url TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected', 'active', 'expired', 'cancelled'
    rejection_reason TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired', 'cancelled'))
);

-- 重複予約防止のインデックス
CREATE UNIQUE INDEX idx_no_overlap_bookings 
ON advertisement_bookings (slot_id, start_time, end_time) 
WHERE status IN ('approved', 'active');

-- 設定管理
CREATE TABLE advertisement_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### コンポーネント設計
```yaml
フロントエンド:
  - AdvertisementSlot: 広告表示コンポーネント
  - BookingCalendar: 予約カレンダー
  - ImageUploader: 画像アップロード
  - BookingForm: 予約フォーム
  - BookingList: 予約一覧

バックエンド:
  - advertisement-booking.ts: 予約関連Server Actions
  - advertisement-display.ts: 表示制御
  - payment-processing.ts: 決済処理
  - moderation.ts: 承認処理
```

### 📊 成功指標
- **月間申請数**: 10件以上
- **承認率**: 70%以上
- **システム稼働率**: 99%以上
- **承認所要時間**: 平均8時間以内

### ⚠️ Phase 1のリスク
- 手動承認による運用負荷
- 1つの広告枠のみでの需要検証
- 基本的な機能のみでのユーザー満足度

## 📅 Phase 2: 機能拡張（4-6週間）

### 🎯 目標
Phase 1の運用実績を基に機能を拡張し、より多くのユーザーに価値を提供する。

### 📋 実装範囲

#### 広告枠拡張
```yaml
追加枠:
  - ログインページサイドパネル: 400x800px
  - ヘッダー下バナー: 1200x200px（全ページ共通）
  - サイドバー広告: 300x600px

枠別設定:
  - 異なる料金設定
  - 時間帯別料金
  - 枠の優先度設定
```

#### 自動化機能
```yaml
自動チェック:
  - Google Cloud Vision API連携
  - 基本的なNGワード検出
  - ファイルサイズ・形式チェック
  - 重複画像検出

自動承認:
  - 信頼ユーザーの自動承認
  - 低リスクコンテンツの自動承認
  - 承認条件のスコア化
```

#### 管理機能強化
```yaml
管理画面:
  - 詳細な統計・分析
  - 料金設定の動的変更
  - ユーザー管理機能
  - 一括操作機能

レポート機能:
  - 売上レポート
  - 利用状況レポート
  - 承認状況レポート
  - パフォーマンスレポート
```

### 🛠️ 技術実装

#### データベース拡張
```sql
-- 自動チェック結果
CREATE TABLE advertisement_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES advertisement_bookings(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL,
    result JSONB NOT NULL,
    score DECIMAL(5,2),
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 料金設定履歴
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID REFERENCES advertisement_slots(id) ON DELETE CASCADE,
    price_per_minute DECIMAL(10,2) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_until TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 新機能コンポーネント
```yaml
自動化:
  - AutoModerationService: 自動チェック
  - PriceCalculator: 動的料金計算
  - NotificationService: 通知管理

分析:
  - AnalyticsCollector: データ収集
  - ReportGenerator: レポート生成
  - PerformanceMonitor: パフォーマンス監視
```

### 📊 成功指標
- **月間申請数**: 50件以上
- **承認率**: 80%以上
- **自動承認率**: 40%以上
- **承認所要時間**: 平均4時間以内

## 📅 Phase 3: 高度化・最適化（6-8週間）

### 🎯 目標
AIを活用した高度な自動化と、ビジネスの拡張性を確保する。

### 📋 実装範囲

#### AI・機械学習
```yaml
画像解析:
  - カスタムAIモデルの訓練
  - ShutterHub特化の判定基準
  - 継続学習システム

予測機能:
  - 需要予測
  - 最適料金提案
  - ユーザー行動分析
```

#### 高度な管理機能
```yaml
動的価格設定:
  - 需要に応じた価格調整
  - 時間帯・季節別料金
  - A/Bテスト機能

競合管理:
  - オークション機能
  - 自動入札システム
  - 価格競争の管理
```

#### API・統合
```yaml
外部連携:
  - 広告効果測定API
  - SNS連携機能
  - 外部ツール連携

開発者向け:
  - REST API提供
  - Webhook機能
  - SDK提供
```

### 📊 成功指標
- **月間申請数**: 200件以上
- **自動承認率**: 80%以上
- **収益**: 月間300万円以上
- **ユーザー満足度**: 4.5/5.0以上

## 🛠️ 共通技術要件

### セキュリティ
```yaml
データ保護:
  - 画像の暗号化保存
  - アクセスログの記録
  - 不正アクセス検知

プライバシー:
  - GDPR準拠
  - データ削除機能
  - 匿名化処理
```

### パフォーマンス
```yaml
最適化:
  - CDN活用
  - 画像最適化
  - キャッシュ戦略

スケーラビリティ:
  - 負荷分散
  - データベース最適化
  - 非同期処理
```

### 監視・運用
```yaml
モニタリング:
  - システム監視
  - エラー追跡
  - パフォーマンス測定

運用サポート:
  - 自動バックアップ
  - 災害復旧計画
  - 24時間監視体制
```

## 📋 実装チェックリスト

### Phase 1
- [ ] データベース設計・マイグレーション作成
- [ ] 基本的な広告表示システム
- [ ] 予約カレンダー機能
- [ ] 画像アップロード機能
- [ ] 決済システム連携
- [ ] 手動承認システム
- [ ] 基本的な管理画面
- [ ] ユーザー向け予約管理画面
- [ ] 基本的なテスト作成
- [ ] セキュリティ設定

### Phase 2
- [ ] 複数広告枠対応
- [ ] 自動チェック機能
- [ ] 動的料金設定
- [ ] 統計・分析機能
- [ ] 通知システム
- [ ] 管理機能強化
- [ ] パフォーマンス最適化
- [ ] 詳細テスト作成

### Phase 3
- [ ] AI機能実装
- [ ] 高度な管理機能
- [ ] API開発
- [ ] 外部連携機能
- [ ] 高度な分析機能
- [ ] スケーラビリティ対応
- [ ] 包括的テスト

## ⚠️ リスク管理

### 技術リスク
- **複雑性の増大**: 段階的実装で管理
- **パフォーマンス問題**: 事前の負荷テスト
- **セキュリティ脆弱性**: 定期的なセキュリティ監査

### 運用リスク
- **承認作業負荷**: 自動化の段階的導入
- **品質管理**: 明確な基準とトレーニング
- **ユーザーサポート**: 十分なドキュメント整備

### ビジネスリスク
- **需要の不確実性**: 小規模開始で検証
- **競合の出現**: 差別化機能の継続開発
- **規制変更**: 法的動向の継続監視

---

**文書作成日**: 2025年1月18日  
**最終更新日**: 2025年1月18日  
**作成者**: ShutterHub開発チーム  
**承認者**: （未定）
