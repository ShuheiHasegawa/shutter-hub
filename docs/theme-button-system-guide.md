# ShutterHub v2 テーマ・ボタンシステム統合ガイド

> **統合ドキュメント**: 現在実装されているテーマシステムとボタンシステムの使用方法を統合的に説明します。

## 📚 **ドキュメント構成**

### **📋 基本カラーシステム**
- **ファイル**: `docs/color-system-guide.md`
- **対象**: 固定ブランドカラー、Shadcn/uiセマンティックカラー
- **用途**: ブランド一貫性が重要な要素

### **🎨 動的テーマシステム**
- **ファイル**: `.cursor/rules/dev-rules/theme-color-system-guide.mdc`
- **対象**: 5つのテーマ切り替え、セマンティックサーフェース
- **用途**: ユーザーカスタマイズ対応の要素

### **⚙️ 実装詳細**
- **ファイル**: `tailwind.config.ts`（コメント付き設定）
- **ファイル**: `src/lib/utils/color-system.ts`（コアロジック）
- **ファイル**: `src/hooks/useTheme.ts`（React Hook）

## 🎯 **実装のクイックリファレンス**

### **1. 基本的なボタン実装**

```tsx
// ✅ 推奨：セマンティックサーフェース（最もシンプル）
<button className="surface-primary px-4 py-2 rounded">
  プライマリボタン
</button>

<button className="surface-accent px-4 py-2 rounded">
  アクションボタン
</button>

<button className="surface-neutral px-4 py-2 rounded">
  サブボタン
</button>
```

### **2. 状態変化対応**

```tsx
// インタラクティブなボタン
<button className="surface-neutral hover:surface-accent transition-colors px-4 py-2 rounded">
  ホバーで色変化
</button>

// フォーカス対応
<button className="surface-primary focus:surface-accent px-4 py-2 rounded">
  フォーカス時強調
</button>
```

### **3. バリエーション**

```tsx
// 明度レベルでバリエーション
<button className="surface-primary-0">明るめ</button>
<button className="surface-primary">標準</button>
<button className="surface-primary-1">暗め</button>
```

### **4. 固定ブランド色使用**

```tsx
// ブランド色を維持したい場合
<button className="bg-shutter-primary text-white px-4 py-2 rounded">
  固定ブランドボタン
</button>

<span className="text-shutter-success">成功メッセージ</span>
<span className="text-shutter-warning">警告メッセージ</span>
```

## 🔧 **設定・カスタマイズ**

### **テーマ切り替え**

```tsx
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { currentPalette, setPalette, isDark, toggleDarkMode } = useTheme();
  
  return (
    <div>
      <button onClick={() => setPalette('image1')}>
        テーマ1に切り替え
      </button>
      <button onClick={toggleDarkMode}>
        {isDark ? 'ライト' : 'ダーク'}モード
      </button>
    </div>
  );
}
```

### **カスタムテーマの追加**

```typescript
// src/lib/utils/color-system.ts
const newPalette: ColorPalette = {
  name: 'custom',
  colors: {
    primary: '#YOUR_PRIMARY_COLOR',
    secondary: '#YOUR_SECONDARY_COLOR',
    accent: '#YOUR_ACCENT_COLOR',
    neutral: '#YOUR_NEUTRAL_COLOR',
  },
  lightColors: ['#LIGHT_COLOR_1', '#LIGHT_COLOR_2'],
  darkColors: ['#DARK_COLOR_1', '#DARK_COLOR_2'],
};
```

## 📊 **実装チェックリスト**

### **✅ 完了済み**
- [x] 基本カラーシステム（固定ブランド色）
- [x] 動的テーマシステム（5テーマ切り替え）
- [x] セマンティックサーフェース（surface-*クラス）
- [x] 自動コントラスト調整
- [x] ダークモード対応
- [x] Tailwindプラグイン統合
- [x] React Hook（useTheme）
- [x] ドキュメント整備

### **🎯 使い方のベストプラクティス**

| 要素タイプ | 推奨アプローチ | 理由 |
|-----------|---------------|------|
| **メインボタン** | `surface-primary` | テーマに応じた最適な色 |
| **アクションボタン** | `surface-accent` | 強調効果+テーマ対応 |
| **サブボタン** | `surface-neutral` | 控えめ+テーマ対応 |
| **エラー表示** | `text-shutter-accent` | 固定色で意味を明確化 |
| **成功表示** | `text-shutter-success` | 固定色で意味を明確化 |
| **ブランド要素** | `text-shutter-primary` | 一貫したブランド表現 |

## 🚀 **新規開発での活用**

### **コンポーネント作成時**

```tsx
// 新しいカードコンポーネントの例
function FeatureCard({ title, description, action }: Props) {
  return (
    <div className="surface-neutral-0 p-6 rounded-lg">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="opacity-70 mb-4">{description}</p>
      
      <button className="surface-accent px-4 py-2 rounded text-sm">
        {action}
      </button>
    </div>
  );
}
```

### **一貫性の保持**

```tsx
// ✅ 良い例：テーマ対応+固定色の適切な使い分け
<div className="surface-neutral-0">  {/* 背景：テーマ対応 */}
  <h2 className="text-shutter-primary">ShutterHub</h2>  {/* ブランド：固定 */}
  <p className="opacity-80">説明文</p>  {/* テキスト：サーフェース色+透明度 */}
  
  <div className="flex gap-2">
    <button className="surface-accent">メイン</button>  {/* ボタン：テーマ対応 */}
    <span className="text-shutter-success">成功</span>  {/* 状態：固定色 */}
  </div>
</div>
```

---

## 🎉 **まとめ**

ShutterHub v2のカラー・テーマシステムは以下の特徴を持ちます：

1. **🎨 柔軟性**: 5テーマ × ライト/ダーク = 10通りの外観
2. **🔄 一貫性**: 固定ブランド色 + 動的テーマ色の適切な使い分け
3. **⚡ 効率性**: セマンティックサーフェースで背景+テキスト色の自動ペア
4. **🛠 拡張性**: 新しいテーマやコンポーネントの簡単な追加
5. **📚 保守性**: 明確なドキュメント構成とベストプラクティス

**新しく参加したチームメンバーも、このガイドを参考に効率的にテーマ対応の実装を進めることができます！**