# カメラマン向けサブスクリプションプラン

> **カメラマンユーザー専用のサブスクリプションプラン詳細仕様**

## 🎯 カメラマンユーザーのニーズ分析

### ターゲット像
- **趣味カメラマン**: 週末の撮影、作品作りが主目的
- **セミプロカメラマン**: 副業として収益化開始
- **プロカメラマン**: 本業、クライアント管理・ブランディング重視
- **スタジオ経営者**: 複数カメラマンの管理、ビジネス拡大が目標

### 主要ペインポイント
1. **作品管理の効率性**: 大量の写真の整理・管理が困難
2. **クライアント獲得**: 新規顧客開拓・リピーター確保が課題
3. **ブランディング**: 他のカメラマンとの差別化が困難
4. **商用利用**: 権利関係・ライセンス管理の複雑さ
5. **品質担保**: 高解像度・商用品質の作品提供

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

カメラマン特化機能:
  clientManagement: false
  advancedPortfolio: false
  commercialLicense: false
  watermarkRemoval: false
  brandingCustomization: false
  highResDownload: false
  shootingSchedule: false
```

#### **制限事項**
- クライアント管理機能なし
- 透かし付きでの作品表示
- 標準解像度のみ（Web表示用）
- 商用利用ライセンス表示なし
- ブランディングカスタマイズ不可

#### **ターゲット**
- ShutterHub初心者カメラマン
- 機能確認・お試し利用
- 趣味レベルの撮影活動

---

### 🎨 プロプラン（¥980/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 20冊
  premiumTemplates: true
  exportQuality: "high"
  prioritySupport: false
  storageLimit: 5GB

カメラマン特化機能:
  clientManagement: true
  advancedPortfolio: true
  commercialLicense: false
  watermarkRemoval: true
  brandingCustomization: false
  highResDownload: true
  shootingSchedule: true
  basicAnalytics: true
```

#### **新規解放機能**

##### **クライアント管理システム**
```typescript
interface ClientManagement {
  // クライアント情報管理
  contacts: {
    personalInfo: ClientInfo;
    communicationHistory: Message[];
    preferences: ShootingPreferences;
  };
  
  // プロジェクト管理
  projects: {
    shootingSchedule: ScheduleItem[];
    deliveryStatus: DeliveryStatus;
    paymentTracking: PaymentInfo[];
  };
  
  // 見積もり・請求
  quotation: {
    automaticGeneration: boolean;
    customTemplates: boolean;
    pdfExport: boolean;
  };
}
```

##### **高度なポートフォリオ**
- カテゴリ別作品整理（ポートレート・風景・商品撮影等）
- 作品への詳細メタデータ設定
- SEO最適化されたポートフォリオページ
- SNS連携による自動投稿

##### **透かし除去**
- 作品表示時の透かし完全除去
- クライアント向けプレビューでの透かし非表示
- 高品質での作品表示

##### **高解像度ダウンロード**
- 最大4K解像度でのダウンロード
- RAW形式での保存・提供
- 印刷用高解像度（300dpi以上）対応

#### **ターゲット**
- 副業カメラマン
- 定期的にクライアント撮影を行うカメラマン
- 作品品質向上を重視するユーザー

---

### 🏢 ビジネスプラン（¥1,980/月）

#### **基本機能**
```yaml
共通機能:
  photobookLimit: 無制限
  premiumTemplates: true
  exportQuality: "ultra"
  prioritySupport: true
  storageLimit: 20GB

カメラマン特化機能:
  clientManagement: true
  advancedPortfolio: true
  commercialLicense: true
  watermarkRemoval: true
  brandingCustomization: true
  highResDownload: true
  shootingSchedule: true
  advancedAnalytics: true
  apiAccess: true
  teamManagement: true
```

#### **ビジネス限定機能**

##### **商用ライセンス管理**
```typescript
interface CommercialLicense {
  licenseTypes: {
    editorial: boolean;      // 編集利用
    commercial: boolean;     // 商用利用
    exclusive: boolean;      // 独占利用
    unlimited: boolean;      // 無制限利用
  };
  
  rightsManagement: {
    modelReleases: ModelRelease[];
    propertyReleases: PropertyRelease[];
    copyrightInfo: CopyrightData;
    usageRestrictions: UsageTerms;
  };
  
  licenseGeneration: {
    automaticGeneration: boolean;
    customTerms: boolean;
    digitalSignature: boolean;
  };
}
```

##### **ブランディングカスタマイズ**
- カスタムロゴ・色調でのポートフォリオ
- 独自ドメインでのポートフォリオ公開
- 名刺・フライヤー用デザインテンプレート
- クライアント向けブランドガイドライン

##### **高度な分析機能**
- 詳細な売上分析・収益予測
- クライアント別収益性分析
- 作品パフォーマンス分析
- 市場トレンド分析

##### **チーム管理機能**
- アシスタントカメラマンの管理
- 撮影チームでの作品共有
- 権限レベル別のアクセス制御
- チーム内コミュニケーションツール

##### **API アクセス**
- 外部ツールとの連携
- 自動化ワークフローの構築
- カスタムアプリケーション開発支援

#### **ターゲット**
- プロカメラマン・スタジオ経営者
- 法人クライアント中心のビジネス
- チーム体制での撮影事業

## 🎨 機能実装詳細

### クライアント管理システム

#### **データベース設計**
```sql
-- クライアント情報テーブル
CREATE TABLE photographer_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 撮影プロジェクトテーブル
CREATE TABLE shooting_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES photographer_clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  shooting_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'completed', 'delivered', 'cancelled')),
  budget INTEGER,
  delivered_photos INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **見積もり生成システム**
```typescript
interface QuotationGenerator {
  baseRates: {
    hourlyRate: number;
    halfDayRate: number;
    fullDayRate: number;
    editingRate: number;
  };
  
  additionalServices: {
    extraPhotographer: number;
    rushDelivery: number;
    additionalEditing: number;
    printDelivery: number;
  };
  
  generateQuotation(project: ProjectDetails): {
    lineItems: QuotationItem[];
    subtotal: number;
    tax: number;
    total: number;
    validUntil: Date;
  };
}
```

### 商用ライセンス管理

#### **ライセンス自動生成**
```typescript
export class LicenseManager {
  async generateCommercialLicense(
    photoId: string,
    licenseType: LicenseType,
    clientInfo: ClientInfo
  ): Promise<CommercialLicense> {
    const license = {
      id: generateLicenseId(),
      photoId,
      licenseType,
      clientInfo,
      terms: await this.getStandardTerms(licenseType),
      validFrom: new Date(),
      validUntil: this.calculateExpiryDate(licenseType),
      restrictions: this.getLicenseRestrictions(licenseType),
      signature: await this.generateDigitalSignature()
    };
    
    await this.saveLicense(license);
    await this.sendLicenseToClient(license);
    
    return license;
  }
}
```

### ブランディングシステム

#### **カスタムテーマ設定**
```typescript
interface BrandingSettings {
  logo: {
    primary: string;
    secondary?: string;
    favicon: string;
  };
  
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  
  typography: {
    headingFont: string;
    bodyFont: string;
    logoFont: string;
  };
  
  customDomain?: string;
  socialLinks: SocialMediaLinks;
  contactInfo: ContactInformation;
}
```

## 📊 価格設定の根拠

### 競合分析
| サービス | フリー | 有料プラン |
|----------|--------|------------|
| **ShutterHub** | ¥0 | ¥980-¥1,980 |
| Adobe Portfolio | なし | $9.99-$19.99/月 |
| SmugMug | なし | $5-$40/月 |
| Format | $6-$24/月 | - |
| 22slides | €5-€19/月 | - |

### 価値提案の根拠

#### **プロプラン（¥980）**
- **1件のクライアント撮影**: 平均¥30,000-¥100,000
- **クライアント管理効率化**: 月2-3時間の時短 = ¥6,000-¥9,000相当
- **高品質作品による単価向上**: 10-20%の単価アップ
- **ROI**: 約6-10倍の価値提供

#### **ビジネスプラン（¥1,980）**
- **商用ライセンス管理**: 法的リスク回避価値 ¥50,000-¥100,000
- **ブランディング効果**: 新規顧客獲得率20-30%向上
- **チーム管理効率**: 月10-15時間の時短 = ¥30,000-¥45,000相当
- **ROI**: 約15-25倍の価値提供

## 🎯 マーケティング戦略

### アップセル戦略

#### **フリー → プロ**
- 5回目のクライアント連絡時にCRM機能の価値訴求
- 透かし付き作品の制約を実感するタイミングでアップグレード提案
- 高解像度ニーズ発生時（印刷・商用利用）にプラン変更促進

#### **プロ → ビジネス**
- 月10件以上のプロジェクト管理時に上位機能の価値訴求
- 法人クライアント獲得時に商用ライセンス機能の必要性アピール
- チーム拡大時のスケーラビリティを提案

### パートナーシップ戦略

#### **機材メーカー連携**
- カメラ・レンズメーカーとの協業
- 新製品体験会への優先参加
- 機材レンタル割引特典

#### **印刷業者連携**
- 高品質印刷サービスとの提携
- ビジネスプラン加入者向け印刷割引
- フォトブック印刷・配送サービス

## 📈 成功指標（KPI）

### 転換率目標
- **フリー → プロ**: 25%（クリエイター向けサービス平均20%を上回る）
- **プロ → ビジネス**: 20%（高付加価値による転換）
- **全体有料化率**: 25%（カメラマンユーザー全体）

### 継続率目標
- **3ヶ月継続率**: 90%（ビジネスツールとしての必要性）
- **6ヶ月継続率**: 85%
- **12ヶ月継続率**: 80%

### ビジネス成果指標
- **平均プロジェクト単価向上**: 15-25%
- **新規クライアント獲得率**: 月2-5件
- **リピートクライアント率**: 60%以上

### 満足度指標
- **CSAT（顧客満足度）**: 4.3/5.0以上
- **NPS（推奨度）**: 50以上
- **機能利用率**: 85%以上（契約機能の実利用率）

## 🚀 ロードマップ

### Phase 1（実装開始後1ヶ月）
- 基本的なクライアント管理機能
- 透かし除去機能
- 高解像度ダウンロード

### Phase 2（実装開始後2ヶ月）
- 商用ライセンス管理
- 基本的なブランディング機能
- 見積もり生成機能

### Phase 3（実装開始後3ヶ月）
- 高度な分析機能
- API アクセス
- チーム管理機能

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
  - カメラマン特化機能（クライアント管理等）
  - 透かし除去・商用ライセンス機能
  - ブランディングカスタマイズ
  - 高度な分析・レポート機能
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
**対象ユーザータイプ**: Photographer  
**実装方針**: 基本仕組み優先・詳細機能は後回し  
**次回レビュー**: Phase 1実装開始前
