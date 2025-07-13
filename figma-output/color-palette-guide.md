# ShutterHub v2 Figmaカラーパレット作成ガイド

## 🎨 **Figmaファイル情報**
- **ファイル名**: ShutterHub
- **ファイルキー**: `i5uPEm9Nx81P3rFLHKIsX6`
- **URL**: https://www.figma.com/design/i5uPEm9Nx81P3rFLHKIsX6/ShutterHub

## 📋 **カラーパレット配置プラン**

### **1. ブランドカラーセクション**
```
🟣 Primary Colors
├── Primary: #6F5091 (メインパープル)
├── Primary Light: #8B6BB1 (ライトパープル)
└── Primary Dark: #5A4073 (ダークパープル)

⚫ Secondary Colors  
├── Secondary: #101820 (ダークグレー)
└── Secondary Light: #2A2A2A (ライトグレー)
```

### **2. セマンティックカラーセクション**
```
✅ Success: #21c45d (成功・空きあり状態)
⚠️ Warning: #fbbd23 (注意・待機状態)  
ℹ️ Info: #3c83f6 (情報・リンク)
❌ Error: #ef4343 (エラー・満席状態)
```

### **3. 状態カラーセクション**
```
🟢 Available: #21c45d (空きあり)
🔴 Booked: #ef4343 (満席)
🟡 Pending: #fbbd23 (待機・保留)
```

## 🛠️ **Figmaでの手動作成手順**

### **Step 1: カラーパレットフレーム作成**
1. Figmaで新しいフレームを作成
2. フレーム名: "ShutterHub v2 Color Palette"
3. サイズ: 800x600px (推奨)

### **Step 2: カラーサンプル作成**

#### **ブランドカラー**
1. **Primary (#6F5091)**
   - 長方形を作成: 100x100px
   - Fill: #6F5091
   - テキスト: "Primary\n#6F5091"

2. **Primary Light (#8B6BB1)**
   - 長方形を作成: 100x100px
   - Fill: #8B6BB1
   - テキスト: "Primary Light\n#8B6BB1"

3. **Primary Dark (#5A4073)**
   - 長方形を作成: 100x100px
   - Fill: #5A4073
   - テキスト: "Primary Dark\n#5A4073"

4. **Secondary (#101820)**
   - 長方形を作成: 100x100px
   - Fill: #101820
   - テキスト: "Secondary\n#101820" (白文字)

5. **Secondary Light (#2A2A2A)**
   - 長方形を作成: 100x100px
   - Fill: #2A2A2A
   - テキスト: "Secondary Light\n#2A2A2A" (白文字)

#### **セマンティックカラー**
1. **Success (#21c45d)**
   - 長方形を作成: 100x100px
   - Fill: #21c45d
   - テキスト: "Success\n#21c45d"

2. **Warning (#fbbd23)**
   - 長方形を作成: 100x100px
   - Fill: #fbbd23
   - テキスト: "Warning\n#fbbd23"

3. **Info (#3c83f6)**
   - 長方形を作成: 100x100px
   - Fill: #3c83f6
   - テキスト: "Info\n#3c83f6"

4. **Error (#ef4343)**
   - 長方形を作成: 100x100px
   - Fill: #ef4343
   - テキスト: "Error\n#ef4343"

### **Step 3: レイアウト配置**
```
[Primary]  [Primary Light]  [Primary Dark]
[Secondary]  [Secondary Light]

[Success]  [Warning]  [Info]  [Error]

[Available]  [Booked]  [Pending]
```

### **Step 4: カラースタイル登録**
1. 各カラーサンプルを選択
2. Style → + → Color Style
3. 名前を設定（例: "ShutterHub/Primary"）
4. Description に用途を記載

## 🎯 **使用用途の説明**

### **ブランドカラー**
- **Primary (#6F5091)**: メインボタン、アクセント、ブランド要素
- **Secondary (#101820)**: テキスト、アイコン、サブ要素

### **セマンティックカラー**  
- **Success (#21c45d)**: 成功メッセージ、空きあり表示、確認ボタン
- **Warning (#fbbd23)**: 注意メッセージ、待機状態、警告
- **Info (#3c83f6)**: 情報表示、リンク、詳細ボタン
- **Error (#ef4343)**: エラーメッセージ、満席表示、削除ボタン

### **状態カラー**
- **Available (#21c45d)**: 予約可能状態
- **Booked (#ef4343)**: 満席・予約済み状態  
- **Pending (#fbbd23)**: 待機・保留状態

## 📝 **次のステップ**

1. **カラーパレット作成**: 上記手順でFigmaにカラーパレットを作成
2. **カラースタイル登録**: 各色をFigmaのカラースタイルとして保存
3. **コンポーネント適用**: 既存のUIコンポーネントに適用
4. **デザインシステム構築**: より詳細なデザインシステムの構築

---

このガイドに従って、ShutterHub v2の統一されたカラーシステムをFigmaで管理できるようになります。 