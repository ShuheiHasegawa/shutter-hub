# ShutterHub サブスクリプションシステム

> **ユーザータイプ別サブスクリプション機能の要件定義・設計ドキュメント**

## 📋 ドキュメント構成

### 📚 要件・設計
- [**requirements.md**](./requirements.md) - 全体要件定義
- [**database-design.md**](./database-design.md) - データベース設計
- [**api-specification.md**](./api-specification.md) - API仕様
- [**stripe-integration.md**](./stripe-integration.md) - Stripe連携詳細

### 👥 ユーザータイプ別プラン
- [**user-type-plans/model-plans.md**](./user-type-plans/model-plans.md) - モデル向けプラン
- [**user-type-plans/photographer-plans.md**](./user-type-plans/photographer-plans.md) - カメラマン向けプラン
- [**user-type-plans/organizer-plans.md**](./user-type-plans/organizer-plans.md) - 運営者向けプラン

### 🚀 実装・移行
- [**implementation-phases.md**](./implementation-phases.md) - 実装フェーズ計画
- [**migration-plan.md**](./migration-plan.md) - 既存ユーザー移行計画
- [**feature-hooks-comparison.md**](./feature-hooks-comparison.md) - ユーザータイプ別機能制限フック実装比較

## 🎯 システム概要

ShutterHubのサブスクリプションシステムは、3つのユーザータイプ（モデル・カメラマン・運営者）それぞれに最適化されたプランを提供します。

### 🎨 設計方針

#### **ユーザータイプ別最適化**
- 各ユーザータイプの特有ニーズに対応
- 明確な価値提案と機能境界
- 将来的な拡張性を考慮

#### **ハイブリッドアプローチ**
- 共通基盤機能 + ユーザータイプ特化機能
- 統一されたStripe連携基盤
- 柔軟なプラン変更・ユーザータイプ変更対応

### 🚨 初回実装方針

#### **段階的実装アプローチ**
```yaml
Phase 1 (基本仕組み優先):
  目的: 安定した課金システムの基盤構築
  内容:
    - サブスクリプションテーブル基盤
    - Stripe基本連携（Customer/Subscription）
    - シンプルなプラン選択UI
    - 基本的な機能制限（フォトブック数等）

Phase 2 (詳細機能実装):
  目的: ユーザータイプ特化機能の実装
  内容:
    - 各ユーザータイプ別詳細機能
    - 高度な制限ロジック
    - 分析・レポート機能
    - マーケティング機能
```

#### **Stripe MCP連携必須**
```yaml
基本方針:
  - MCP連携ツールを最優先で使用
  - 連携不可の場合は実装を一時中断
  - 手動接続確立後に実装再開
  - npxコマンドは絶対に使用禁止

中断・再開フロー:
  1. MCP連携テスト失敗時は即座に中断
  2. Stripe管理画面での手動確認・修正
  3. MCP連携再確立後に実装再開
  4. 接続安定性確認後に本格実装
```

## 🏗️ アーキテクチャ概要

```mermaid
graph TB
    A[ユーザー] --> B[認証システム]
    B --> C{ユーザータイプ判定}
    C -->|Model| D[モデル向けプラン]
    C -->|Photographer| E[カメラマン向けプラン]
    C -->|Organizer| F[運営者向けプラン]
    
    D --> G[Stripe Subscription API]
    E --> G
    F --> G
    
    G --> H[サブスクリプション管理]
    H --> I[機能制限・アクセス制御]
    I --> J[各種機能]
    
    J --> K[フォトブック]
    J --> L[撮影会管理]
    J --> M[ポートフォリオ]
```

## 💰 プラン構成概要

### 📸 モデル向けプラン
- **Free**: 基本機能（フォトブック1冊）
- **Basic**: 月額680円（フォトブック10冊）
- **Premium**: 月額1,280円（無制限、プレミアムバッジ）

### 📷 カメラマン向けプラン
- **Free**: 基本機能（フォトブック1冊）
- **Pro**: 月額980円（フォトブック10冊）
- **Business**: 月額1,980円（商用ライセンス、ブランディング）

### 🎬 運営者向けプラン
- **Free**: 基本機能（フォトブック3冊）
- **Standard**: 月額1,480円（分析機能、CRM）
- **Professional**: 月額2,980円（マーケティングツール、API）

## 🚀 実装スケジュール

| Phase | 期間 | 内容 | ステータス |
|-------|------|------|-----------|
| **Phase 1** | 1.5週間 | データベース基盤構築 | ✅ 完了 |
| **Phase 2** | 1週間 | Stripe連携強化 | ✅ 完了 |
| **Phase 3** | 1.5週間 | UI実装 | ✅ 完了 |
| **Phase 4** | 1週間 | 機能制限実装 | ✅ 完了 |

**総工数**: 約5週間

### 📝 実装完了状況（2025-11-06）

#### **Phase 4 実装完了項目**

1. **フォトブック制限チェック移行** ✅
   - サブスクリプションプランベースの制限チェックに移行完了
   - ユーザータイプ別の制限が正しく動作

2. **ユーザータイプ別機能制限フック実装** ✅
   - `useModelFeatures` - モデル向け機能制限
   - `usePhotographerFeatures` - カメラマン向け機能制限
   - `useOrganizerFeatures` - 運営者向け機能制限

3. **FeatureGateコンポーネント実装** ✅
   - 機能制限UI表示コンポーネント
   - アップグレード促進UI

詳細は [implementation-phases.md](./implementation-phases.md) を参照してください。

## 📊 期待される効果

### 💵 収益化
- **月額課金収入**: 安定した収益基盤
- **ユーザータイプ別最適化**: 支払い意欲に応じた価格設定
- **アップセル機会**: 機能拡張による収益向上

### 👥 ユーザー体験
- **明確な価値提案**: 各ユーザータイプに特化した機能
- **段階的成長**: フリー→有料への自然な移行
- **専門性重視**: プロフェッショナルユーザーへの高付加価値提供

## ⚠️ 重要な考慮事項

1. **既存ユーザー移行**: 現在の無料ユーザーの適切なプラン移行
2. **ユーザータイプ変更**: モデル→カメラマン等の変更時の処理
3. **機能制限バランス**: ユーザー離脱を防ぐ適切な制限レベル
4. **競合価格調査**: 市場価格との整合性確認

## 📞 問い合わせ・フィードバック

このドキュメントに関する質問や改善提案は、開発チームまでお知らせください。

## 🛠️ 開発者向けガイド

### ユーザータイプ別機能制限フックの使用

各ユーザータイプに応じた専用フックを使用することで、型安全で簡潔なコードを記述できます。

```typescript
// モデル向けコンポーネント
import { useModelFeatures } from '@/hooks/useModelFeatures';
import { FeatureGate } from '@/components/subscription/FeatureGate';

function ModelPortfolioUpload() {
  const features = useModelFeatures();

  return (
    <FeatureGate
      hasAccess={features.canUsePremiumTemplates}
      featureName="プレミアムテンプレート"
      currentPlanName={features.currentPlan?.name}
      requiredPlanName="ベーシックプラン"
    >
      <PremiumTemplateSelector />
    </FeatureGate>
  );
}
```

詳細な使用例と比較は [feature-hooks-comparison.md](./feature-hooks-comparison.md) を参照してください。

---

**最終更新**: 2025-11-06  
**バージョン**: 1.2  
**ステータス**: Phase 4実装完了・動作確認中
