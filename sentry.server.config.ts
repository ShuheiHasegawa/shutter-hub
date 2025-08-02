// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://45bb336843c3d9bf6bc644e90c2de586@o4509768225325056.ingest.us.sentry.io/4509768241643520',

  environment: process.env.NODE_ENV,

  // プロダクション環境ではサンプリング率を調整
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 開発環境でのみデバッグ有効
  debug: process.env.NODE_ENV === 'development',

  // ShutterHub固有のサーバーサイド設定
  beforeSend(event) {
    // サーバーサイドタグ追加
    if (event.tags) {
      event.tags.side = 'server';
      event.tags.app = 'shutter-hub-v2';
    } else {
      event.tags = { side: 'server', app: 'shutter-hub-v2' };
    }

    // Supabase認証情報などの機密情報をマスク
    if (event.exception?.values) {
      event.exception.values.forEach(exception => {
        if (exception.value?.includes('supabase')) {
          exception.value = exception.value.replace(
            /key=[^&\s]*/g,
            'key=[MASKED]'
          );
        }
      });
    }

    return event;
  },
});
