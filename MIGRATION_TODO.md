# データベースマイグレーション適用待ち

## 🚨 **重要**: 以下のマイグレーションをSupabaseに手動適用する必要があります

### 1. 即座撮影リクエストシステム
**ファイル**: `supabase/migrations/20241201000009_create_instant_photo_system.sql`

**内容**:
- `instant_photo_requests` テーブル
- `photographer_locations` テーブル  
- `instant_bookings` テーブル
- `photographer_request_responses` テーブル
- `guest_usage_history` テーブル
- ストアドプロシージャ群
- RLSポリシー設定

**適用方法**:
1. Supabase Dashboard → SQL Editor
2. ファイル内容をコピー&ペースト
3. 実行

**依存関係**: 即座撮影リクエスト機能の動作に必須

---

**作成日**: 2024年12月1日  
**ステータス**: 未適用  
**優先度**: 高（即座撮影機能のため） 