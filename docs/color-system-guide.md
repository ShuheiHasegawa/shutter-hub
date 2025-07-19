# ShutterHub v2 カラーシステム実装ガイド

> **重要**: このガイドは`.cursor/rules/dev-rules/detailed-requirements.mdc`で定義された公式カラーパレットの実装方法を説明します。

## 📋 **公式カラーパレット（`.cursor/rules`準拠）**

### **プライマリーカラー**
```css
/* 公式ブランドカラー（.cursor/rules/dev-rules/detailed-requirements.mdc） */
#6F5091  /* primary - メインブランド色 */
#8B6BB1  /* primary_light - ライトバリエーション */
#5A4073  /* primary_dark - ダークバリエーション */

#101820  /* secondary - セカンダリブランド色 */
#2A2A2A  /* secondary_light - ライトバリエーション */
```

### **アクセントカラー**
```css
/* 公式アクセントカラー */
#FF6B6B  /* accent - エラー・重要・強調 */
#4ECDC4  /* success - 成功・完了・利用可能 */
#FFE66D  /* warning - 警告・注意・評価 */
#4D96FF  /* info - 情報・リンク・詳細 */
```

### **ニュートラルカラー**
```css
/* 公式グレースケール（完全準拠） */
#FFFFFF  /* white */
#F9FAFB  /* gray_50 */
#F3F4F6  /* gray_100 */
#E5E7EB  /* gray_200 */
#D1D5DB  /* gray_300 */
#9CA3AF  /* gray_400 */
#6B7280  /* gray_500 */
#4B5563  /* gray_600 */
#374151  /* gray_700 */
#1F2937  /* gray_800 */
#111827  /* gray_900 */
#000000  /* black */
```

## 🎨 **実装システム**

### **セマンティックカラー（推奨）**

```css
/* Shadcn/ui セマンティックカラー */
text-foreground        /* メインテキスト */
text-muted-foreground  /* セカンダリテキスト */
text-card-foreground   /* カード内テキスト */

bg-background          /* メイン背景 */
bg-card                /* カード背景 */
bg-muted               /* ミュート背景 */

border-border          /* デフォルトボーダー */
```

### **ShutterHubブランドカラー**

```css
/* 実装済みカスタムクラス */
text-shutter-primary      /* #6F5091 - メインブランド */
text-shutter-secondary    /* #101820 - セカンダリブランド */

text-shutter-accent       /* #FF6B6B - 強調・エラー */
text-shutter-success      /* #4ECDC4 - 成功・完了 */
text-shutter-warning      /* #FFE66D - 警告・注意 */
text-shutter-info         /* #4D96FF - 情報・リンク */
```

## 🚀 **実装例：Before/After**

### **❌ Before（非推奨）**
```tsx
// .cursor/rules違反の直接カラー指定
<div className="text-gray-600 bg-gray-100 border-gray-200">
  <MapPin className="text-blue-600" />
  <span className="text-green-600">成功</span>
  <span className="text-red-500">エラー</span>
  <span className="text-yellow-600">警告</span>
</div>
```

### **✅ After（推奨）**
```tsx
// .cursor/rules準拠のセマンティックカラー
<div className="text-muted-foreground bg-muted border-border">
  <MapPin className="text-shutter-info" />
  <span className="text-shutter-success">成功</span>
  <span className="text-shutter-accent">エラー</span>
  <span className="text-shutter-warning">警告</span>
</div>
```

## 📊 **実装状況チェックリスト**

### **✅ 完了済み**
- [x] 公式カラーパレット実装（CSS Variables）
- [x] Shadcn/uiセマンティックカラー対応
- [x] カスタムブランドカラークラス実装
- [x] ダークモード自動対応
- [x] QuickRequestForm, LocationPermissionCheck統一
- [x] Hydrationエラー修正（カラー関連）

### **🔄 改善推奨**

#### **ニュートラルカラーの活用**
```css
/* 必要に応じて公式グレーを直接指定 */
bg-[#F9FAFB]  /* gray_50 - 最も薄いグレー */
bg-[#F3F4F6]  /* gray_100 - 薄いグレー */
border-[#D1D5DB]  /* gray_300 - ボーダー用 */
text-[#6B7280]  /* gray_500 - 中間グレーテキスト */
```

## 🎯 **開発ガイドライン**

### **必須ルール（`.cursor/rules`準拠）**

```yaml
color_usage_rules:
  prohibited:
    - "green-500, blue-600等のTailwind色直接使用"
    - "text-gray-600単独使用（ダークモード未対応）"
    - "#FF0000等のHEX色直接指定"
  
  required:
    - "セマンティックカラー優先使用"
    - "ブランドカラーはtext-shutter-*使用"
    - "公式グレースケールからの選択"
    - "ダークモード自動対応確認"
```

### **実装前チェック**

```bash
# Tailwind色使用の検出
grep -r "green-[0-9]\|blue-[0-9]\|red-[0-9]\|yellow-[0-9]" src/components/

# セマンティック色への置き換え確認
npm run build  # エラーがないか確認
```

## 🔄 **統合効果**

### **🎯 達成済み**
1. **一元管理**: 公式ルール（`.cursor/rules`）を参照する実装ガイド
2. **重複解消**: 同じ情報の2重管理を解消
3. **更新効率**: 公式ルール変更時の一括更新
4. **実装一貫性**: 開発者間でのカラー使用統一

### **📈 継続的改善**
- 新規実装時は必ず`.cursor/rules`確認
- 公式カラーパレット変更時は実装ガイドも自動更新
- 実装例の継続的な追加・改善

---

**このガイドは`.cursor/rules/dev-rules/detailed-requirements.mdc`の公式カラーパレットに100%準拠した実装方法を提供します。** 