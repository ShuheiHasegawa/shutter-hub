// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://45bb336843c3d9bf6bc644e90c2de586@o4509768225325056.ingest.us.sentry.io/4509768241643520',

  environment: process.env.NODE_ENV,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({
      // ShutterHub: PII保護のため個人情報をマスク
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],

  // プロダクション環境ではサンプリング率を調整
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // セッションリプレイ設定 - 写真関連アプリなので慎重に
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 開発環境でのみデバッグ有効
  debug: process.env.NODE_ENV === 'development',

  // ShutterHub固有のタグ付け
  beforeSend(event) {
    // クライアントサイドタグ追加
    if (event.tags) {
      event.tags.side = 'client';
      event.tags.app = 'shutter-hub-v2';
    } else {
      event.tags = { side: 'client', app: 'shutter-hub-v2' };
    }

    // ユーザー画像URLなどの機密情報をサニタイズ
    if (event.exception?.values) {
      event.exception.values.forEach(exception => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames.forEach(frame => {
            // Supabase Storage URLなどをマスク
            if (frame.filename?.includes('supabase.co')) {
              frame.filename = '[MASKED_STORAGE_URL]';
            }
          });
        }
      });
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
