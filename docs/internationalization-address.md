# 国際化対応：住所フィールドの課題と設計案

## 概要

現在のスタジオ住所フィールドは日本の住所構造（都道府県・市区町村）に特化しており、グローバル展開時のボトルネックとなる可能性があります。本ドキュメントでは、現状の課題と将来の対応案を整理します。

## 現状のデータベーススキーマ

```sql
CREATE TABLE studios (
  address TEXT NOT NULL,      -- 住所
  prefecture TEXT NOT NULL,   -- 都道府県
  city TEXT NOT NULL,         -- 市区町村
  ...
);
```

### 制約

- `prefecture` (都道府県) → 日本特有の概念
- `city` (市区町村) → 日本特有の概念
- 郵便番号、州/省、国コードなどのフィールドが未定義

## 海外展開時のボトルネック

| 国/地域 | 住所構造 | 現在の対応状況 |
|--------|---------|-------------|
| 日本 | 都道府県・市区町村・住所 | ✅ 完全対応 |
| アメリカ | State・City・Street Address・Zip Code | ❌ 未対応 |
| イギリス | City・Postcode・Street Address | ❌ 未対応 |
| ヨーロッパ | 国により異なる | ❌ 未対応 |

### 主な課題

1. **フィールド不足**: 郵便番号（Zip/Postal Code）、州（State/Province）、国（Country）が未定義
2. **命名の固定化**: `prefecture` が日本語概念、`city` は多義的
3. **バリデーション**: 日本の住所形式前提
4. **UI/UX**: 都道府県セレクトボックスが日本特化

## グローバル対応の設計案

### 推奨アプローチ: フィールド拡張 + 国別フォーマット

#### データベーススキーマ変更案

```sql
-- 新規フィールド追加
ALTER TABLE studios ADD COLUMN country TEXT DEFAULT 'JP';
ALTER TABLE studios ADD COLUMN postal_code TEXT;
ALTER TABLE studios ADD COLUMN state_province TEXT;  -- prefecture の汎用版
ALTER TABLE studios ADD COLUMN address_line1 TEXT;
ALTER TABLE studios ADD COLUMN address_line2 TEXT;

-- 移行: prefecture → state_province (データ保持)
UPDATE studios SET state_province = prefecture WHERE state_province IS NULL;
UPDATE studios SET country = 'JP' WHERE country IS NULL;
```

#### フォーム設計

- **国選択** → 住所フォーマット動的切替
- **日本**: prefecture (翻訳キー使用) + city + address
- **アメリカ**: state + city + street address + zip code
- **その他**: 柔軟な address_line1/2 形式

#### 実装コスト

- データベースマイグレーション: 中
- フォームロジック変更: 大
- 既存データ移行: 小（日本のみ）
- UI/UX設計: 大（国別バリデーション）

## 短期的な緩和策

### 即座に実行可能な対応

1. **メッセージファイルでの抽象化**: "Prefecture/State" のような汎用ラベル使用
2. **都道府県セレクトの条件分岐**: 日本以外では通常の Input に切替
3. **バリデーション緩和**: 海外住所は柔軟に受け入れ

### 長期的な完全対応

- フェーズ2での大規模リファクタリング
- Google Maps Geocoding API 導入（国際対応強化）
- 国別住所フォーマット対応

## 実装タイムライン

### Phase 1（現在）

- ✅ 住所自動入力の改善（MapPicker）
- ✅ エラーアラートの共通コンポーネント化
- ✅ 多言語化対応（ラベル・バリデーションメッセージ）

### Phase 2（将来）

- ⚠️ データベーススキーマ拡張
- ⚠️ 国別住所フォーマット対応
- ⚠️ Google Maps Geocoding API 導入検討
- ⚠️ 既存データの移行

## 参考資料

- [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [OpenStreetMap Nominatim API](https://nominatim.org/release-docs/latest/api/Overview/)
- [国際住所フォーマット標準](https://www.upu.int/en/activities/addressing/postal-addressing-systems-in-member-countries.html)

## 更新履歴

- 2025-01-24: 初版作成（Phase 1実装完了時）
