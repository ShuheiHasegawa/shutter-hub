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

  // fromメソッドを監視付きでラップ
  client.from = (table: string) => {
    const query = originalFrom(table);
    const startTime = Date.now();

    // クエリメソッドを監視
    const originalSelect = query.select.bind(query);
    const originalInsert = query.insert.bind(query);
    const originalUpdate = query.update.bind(query);
    const originalDelete = query.delete.bind(query);

    query.select = (...args: unknown[]) => {
      const selectQuery = originalSelect(...args);
      return wrapQueryExecution(selectQuery, 'select', table, startTime);
    };

    query.insert = (...args: unknown[]) => {
      const insertQuery = originalInsert(...args);
      return wrapQueryExecution(insertQuery, 'insert', table, startTime);
    };

    query.update = (...args: unknown[]) => {
      const updateQuery = originalUpdate(...args);
      return wrapQueryExecution(updateQuery, 'update', table, startTime);
    };

    query.delete = (...args: unknown[]) => {
      const deleteQuery = originalDelete(...args);
      return wrapQueryExecution(deleteQuery, 'delete', table, startTime);
    };

    return query;
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
function wrapQueryExecution(
  query: unknown,
  operation: string,
  table: string,
  startTime: number
) {
  const originalThen = query.then?.bind(query);

  if (originalThen) {
    (
      query as {
        then: (onFulfilled?: unknown, onRejected?: unknown) => unknown;
      }
    ).then = (onFulfilled?: unknown, onRejected?: unknown) => {
      return originalThen(
        (result: {
          error?: { message: string; code?: string };
          data?: unknown[];
        }) => {
          const duration = Date.now() - startTime;

          if (result.error) {
            Logger.supabase.error(
              `${operation} on ${table}`,
              new Error(result.error.message),
              {
                duration,
                table,
                operation,
                errorCode: result.error.code,
              }
            );
          } else {
            // 遅いクエリを警告
            if (duration > 2000) {
              Logger.supabase.slow(`${operation} on ${table}`, duration, {
                table,
                operation,
                recordCount: result.data?.length,
              });
            }

            Logger.debug(`Supabase ${operation} on ${table} completed`, {
              duration,
              recordCount: result.data?.length,
            });
          }

          return onFulfilled ? onFulfilled(result) : result;
        },
        (error: Error) => {
          const duration = Date.now() - startTime;
          Logger.supabase.error(`${operation} on ${table}`, error, {
            duration,
            table,
            operation,
          });
          return onRejected ? onRejected(error) : Promise.reject(error);
        }
      );
    };
  }

  return query;
}

export const createClient = () => {
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return addMonitoring(client);
};
