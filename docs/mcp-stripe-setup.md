# Cursor×Stripe MCP連携セットアップガイド

## 📋 概要

CursorでStripe MCPサーバーを使用して、Stripeのダッシュボード情報を直接取得・操作できるように設定します。

## 🔧 セットアップ手順

### 1. 環境変数設定

#### プロジェクトの `.env.local` に以下を追加:
```bash
# Stripe設定（既存）
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# MCP連携用（新規追加）
MCP_STRIPE_ENABLED=true
```

### 2. Cursor設定ファイル確認

**グローバル** `~/.cursor/mcp.json` ファイルに追加済み:
```json
{
  "mcpServers": {
    "supabase": { ... },
    "Framelink Figma MCP": { ... },
    "stripe": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-stripe@latest"
      ],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_実際のキー"
      }
    }
  }
}
```

### 3. 実際の設定手順

✅ **設定完了済み** - 以下の設定が自動で適用されています:

1. **Stripeテストキー設定済み**:
   - `.env.local` からテスト環境用のキーを取得
   - **グローバル `~/.cursor/mcp.json`** に自動設定完了

2. **既存MCP連携**:
   - ✅ **Supabase MCP**: 既に設定済み
   - ✅ **Figma MCP**: 既に設定済み  
   - ✅ **Stripe MCP**: 新規追加完了

3. **次の手順**:
   - **Cursor を完全に再起動してください**
   - MCP連携が自動で有効になります
   - グローバル設定のため、プロジェクト固有ファイルは不要

### 4. 動作確認

#### Cursor再起動後、Chat内で以下をテスト:
```
@stripe 決済情報を取得してください
@stripe 最新のトランザクションを表示してください
@stripe 顧客リストを取得してください
```

## 🎯 使用可能な機能

### Stripe MCP サーバーで利用可能な操作:

1. **決済情報取得**:
   - Payment Intents
   - Charges
   - Refunds

2. **顧客管理**:
   - Customer情報
   - Subscription状況

3. **商品・価格管理**:
   - Products
   - Prices
   - Coupons

4. **分析・レポート**:
   - 売上統計
   - 決済状況

## ⚠️ 注意事項

1. **セキュリティ**:
   - テスト環境のキーのみ使用
   - 本番キーは絶対に設定しない
   - 設定ファイルをGitにコミットしない

2. **制限事項**:
   - Stripe MCPは読み取り専用操作を推奨
   - 本格的な決済処理は既存のサーバーアクション使用

3. **トラブルシューティング**:
   - Cursor再起動で解決することが多い
   - 環境変数の値を再確認
   - ネットワーク接続確認

## 🔗 関連リンク

- [Stripe MCP Server Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/stripe)
- [Cursor MCP Integration Guide](https://docs.cursor.com/mcp)
- 既存のStripe実装: `src/lib/stripe/config.ts`

## 📝 次のステップ

1. MCP連携動作確認
2. E2E CI/CD統合準備
3. 決済フロー自動テスト実装
