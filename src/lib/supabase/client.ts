import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import Logger from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

/**
 * Supabaseクライアントに監視機能を追加するラッパー
 */
function addMonitoring(client: SupabaseClient) {
  // 元のメソッドを保存
  const originalFrom = client.from.bind(client);
  const originalAuth = client.auth;

  // fromメソッドを監視付きでラップ（一時的に無効化）
  client.from = (table: string) => {
    // TODO: 型の問題が解決後に監視機能を復活させる
    return originalFrom(table);
  };

  // 認証メソッドの監視
  const originalSignIn = originalAuth.signInWithPassword.bind(originalAuth);
  const originalSignUp = originalAuth.signUp.bind(originalAuth);
  const originalSignOut = originalAuth.signOut.bind(originalAuth);

  client.auth.signInWithPassword = async (credentials: {
    email: string;
    password: string;
  }) => {
    const startTime = Date.now();
    try {
      const result = await originalSignIn(credentials);
      const duration = Date.now() - startTime;

      if (result.error) {
        Logger.supabase.error(
          'signInWithPassword',
          new Error(result.error.message),
          {
            duration,
            email: credentials.email,
          }
        );
      } else {
        Logger.info('User sign in successful', {
          component: 'supabase',
          action: 'signInWithPassword',
          duration,
          userId: result.data.user?.id,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.supabase.error('signInWithPassword', error as Error, {
        duration,
        email: credentials.email,
      });
      throw error;
    }
  };

  client.auth.signUp = async (credentials: {
    email: string;
    password: string;
  }) => {
    const startTime = Date.now();
    try {
      const result = await originalSignUp(credentials);
      const duration = Date.now() - startTime;

      if (result.error) {
        Logger.supabase.error('signUp', new Error(result.error.message), {
          duration,
          email: credentials.email,
        });
      } else {
        Logger.info('User sign up successful', {
          component: 'supabase',
          action: 'signUp',
          duration,
          userId: result.data.user?.id,
          critical: true,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.supabase.error('signUp', error as Error, {
        duration,
        email: credentials.email,
      });
      throw error;
    }
  };

  client.auth.signOut = async () => {
    const startTime = Date.now();
    try {
      const result = await originalSignOut();
      const duration = Date.now() - startTime;

      if (result.error) {
        Logger.supabase.error('signOut', new Error(result.error.message), {
          duration,
        });
      } else {
        Logger.info('User sign out successful', {
          component: 'supabase',
          action: 'signOut',
          duration,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.supabase.error('signOut', error as Error, {
        duration,
      });
      throw error;
    }
  };

  return client;
}

/**
 * クエリ実行の監視ラッパー
 */
function _wrapQueryExecution(
  query: unknown,
  _operation: string,
  _table: string,
  _startTime: number
) {
  // TODO: 型の問題が解決後に復活させる
  return query;
}

export const createClient = () => {
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return addMonitoring(client);
};
