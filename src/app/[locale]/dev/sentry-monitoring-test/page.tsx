'use client';

import { useState } from 'react';
import {
  testServerActionError,
  testPhotoSessionError,
  testSupabaseError,
  testAsyncError,
} from '@/app/actions/sentry-test-actions';
import Logger from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';

export default function SentryMonitoringTestPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const addResult = (message: string) => {
    setResults(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testClientError = () => {
    try {
      throw new Error('Test client-side error');
    } catch (error) {
      Logger.error('Client error test', error as Error, {
        component: 'test-page',
        action: 'client-error',
      });
      addResult('Client error sent to Sentry');
    }
  };

  const testServerAction = async (shouldFail: boolean) => {
    setLoading(true);
    try {
      const result = await testServerActionError(shouldFail);
      if (result.success) {
        addResult(`Server Action Success: ${result.data.message}`);
      } else {
        addResult(`Server Action Error: ${result.error}`);
      }
    } catch (error) {
      addResult(`Server Action Exception: ${error}`);
    }
    setLoading(false);
  };

  const testPhotoSession = async () => {
    setLoading(true);
    try {
      const result = await testPhotoSessionError('test-session-123');
      if (result.success) {
        addResult('Photo Session: Success');
      } else {
        addResult(`Photo Session Error: ${result.error}`);
      }
    } catch (error) {
      addResult(`Photo Session Exception: ${error}`);
    }
    setLoading(false);
  };

  const testSupabaseOperation = async () => {
    setLoading(true);
    try {
      const result = await testSupabaseError('test-operation');
      if (result.success) {
        addResult('Supabase: Success');
      } else {
        addResult(`Supabase Error: ${result.error}`);
      }
    } catch (error) {
      addResult(`Supabase Exception: ${error}`);
    }
    setLoading(false);
  };

  const testAsyncOperation = async () => {
    setLoading(true);
    try {
      const result = await testAsyncError(1000);
      if (result.success) {
        addResult(`Async Success: ${result.data.message}`);
      } else {
        addResult(`Async Error: ${result.error}`);
      }
    } catch (error) {
      addResult(`Async Exception: ${error}`);
    }
    setLoading(false);
  };

  const testSupabaseClient = async () => {
    setLoading(true);
    try {
      // テスト用のクエリ実行
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (error) {
        addResult(`Supabase Client Error: ${error.message}`);
      } else {
        addResult(
          `Supabase Client Success: Retrieved ${data?.length || 0} records`
        );
      }
    } catch (error) {
      addResult(`Supabase Client Exception: ${error}`);
    }
    setLoading(false);
  };

  const testCustomLogger = () => {
    Logger.info('Custom logger test', {
      component: 'test-page',
      action: 'logger-test',
      critical: true,
    });

    Logger.warning('Test warning message', {
      component: 'test-page',
      action: 'warning-test',
    });

    Logger.photoSession.created('test-session-456', 'test-user-789', {
      testData: 'example',
    });

    addResult('Custom logger messages sent');
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Sentry監視機能テスト</h1>
      <p>ShutterHubのSentry連携をテストするためのページです。</p>

      <div style={{ marginBottom: '20px' }}>
        <h2>テスト項目</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
          }}
        >
          <button
            onClick={testClientError}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            クライアントエラー
          </button>

          <button
            onClick={() => testServerAction(true)}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Server Actionエラー
          </button>

          <button
            onClick={() => testServerAction(false)}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Server Action成功
          </button>

          <button
            onClick={testPhotoSession}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            写真セッションエラー
          </button>

          <button
            onClick={testSupabaseOperation}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#20c997',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Supabaseエラー
          </button>

          <button
            onClick={testAsyncOperation}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            非同期処理テスト
          </button>

          <button
            onClick={testSupabaseClient}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Supabaseクライアント
          </button>

          <button
            onClick={testCustomLogger}
            disabled={loading}
            style={{
              padding: '10px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            カスタムロガー
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <h2>実行結果</h2>
        <button
          onClick={clearResults}
          style={{
            padding: '5px 10px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          クリア
        </button>
      </div>

      <div
        style={{
          minHeight: '200px',
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '10px',
        }}
      >
        {results.length === 0 ? (
          <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
            ボタンをクリックしてテストを実行してください
          </p>
        ) : (
          results.map((result, index) => (
            <div key={index} style={{ marginBottom: '5px', fontSize: '14px' }}>
              {result}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
        }}
      >
        <h3>Sentryダッシュボード確認</h3>
        <p>
          テスト実行後、以下のリンクでSentryダッシュボードを確認してください：
          <br />
          <a
            href="https://shutter-hub.sentry.io/issues/?project=4509768241643520"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#007bff' }}
          >
            ShutterHub Sentry Issues
          </a>
        </p>
      </div>

      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ color: 'white', fontSize: '18px' }}>実行中...</div>
        </div>
      )}
    </div>
  );
}
