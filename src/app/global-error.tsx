'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Logger from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentryとカスタムロガーの両方でエラーを記録
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'global',
        component: 'app-root',
      },
      extra: {
        digest: error.digest,
        timestamp: new Date().toISOString(),
      },
    });

    Logger.error('Global application error caught', error, {
      component: 'global-error-boundary',
      action: 'render-error',
      digest: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              padding: '40px',
              borderRadius: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
            }}
          >
            <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>
              申し訳ございません
            </h1>
            <p
              style={{
                color: '#6c757d',
                marginBottom: '30px',
                lineHeight: '1.6',
              }}
            >
              ShutterHub v2でエラーが発生しました。
              <br />
              このエラーは自動的に報告され、開発チームが対応いたします。
            </p>
            <div
              style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                再試行
              </button>
              <button
                onClick={() => (window.location.href = '/ja')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ホームに戻る
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#dc3545' }}>
                  開発者向け詳細
                </summary>
                <pre
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f1f3f4',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
