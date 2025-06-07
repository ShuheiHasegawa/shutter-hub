# Vercel環境変数設定ガイド

## 必須環境変数

Vercelでプロジェクトをデプロイする際は、以下の環境変数を設定する必要があります：

### Supabase関連
- `NEXT_PUBLIC_SUPABASE_URL` - SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY` - Supabaseのサービスロールキー（サーバーサイドのみ）

### Stripe関連（オプション - 決済機能を使用する場合）
- `STRIPE_SECRET_KEY` - StripeのシークレットAPIキー
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripeの公開可能キー
- `STRIPE_WEBHOOK_SECRET` - Stripe Webhookのシークレット
- `PLATFORM_FEE_RATE` - プラットフォーム手数料率（デフォルト: 0.10）
- `MINIMUM_PAYOUT_AMOUNT` - 最小支払い金額（デフォルト: 1000）

### その他
- `NEXT_PUBLIC_APP_URL` - アプリケーションのURL（例: https://your-app.vercel.app）

## 設定方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. "Settings" タブをクリック
4. "Environment Variables" セクションに移動
5. 上記の環境変数を追加

## 注意事項

- `NEXT_PUBLIC_` プレフィックスがついた変数はクライアントサイドでも使用可能
- それ以外の変数はサーバーサイドのみで使用可能
- Stripe関連の環境変数が設定されていない場合、決済機能は無効化されます
- 本番環境では必ず本番用のAPIキーを使用してください

## トラブルシューティング

### ビルドエラー: "Neither apiKey nor config.authenticator provided"
- `STRIPE_SECRET_KEY` が設定されていることを確認してください
- 決済機能を使用しない場合は、この環境変数を設定しなくても問題ありません（修正済み）

### その他のエラー
- 環境変数名のタイポがないか確認
- 値の前後に余分なスペースがないか確認
- Vercelでの再デプロイを試す 