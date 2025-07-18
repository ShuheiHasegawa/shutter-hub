'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface TableStatus {
  name: string;
  exists: boolean;
  error?: string;
  count?: number;
  sampleData?: unknown[];
}

export function DatabaseStatus() {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const requiredTables = [
    'sns_posts',
    'sns_post_likes',
    'sns_post_comments',
    'sns_comment_likes',
    'sns_hashtags',
    'sns_post_hashtags',
    'sns_post_mentions',
    'sns_timeline_preferences',
  ];

  const checkTableExists = async (tableName: string): Promise<TableStatus> => {
    try {
      const supabase = createClient();

      // まずテーブルの存在確認
      const { error } = await supabase.from(tableName).select('*').limit(1);

      if (error) {
        return {
          name: tableName,
          exists: false,
          error: error.message,
        };
      }

      // sns_postsテーブルの場合、詳細情報を取得
      if (tableName === 'sns_posts') {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        const { data: sampleData } = await supabase
          .from(tableName)
          .select('id, user_id, content, post_type, visibility, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        return {
          name: tableName,
          exists: true,
          count: count || 0,
          sampleData: sampleData || [],
        };
      }

      return {
        name: tableName,
        exists: true,
      };
    } catch (error) {
      return {
        name: tableName,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const checkAllTables = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all(requiredTables.map(checkTableExists));
      setTables(results);
      setLastChecked(new Date());
    } catch (error) {
      logger.error('テーブルチェックエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAllTables();
  }, []);

  const existingTables = tables.filter(t => t.exists);
  const missingTables = tables.filter(t => !t.exists);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データベーステーブル状況
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllTables}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            再チェック
          </Button>
        </div>
        {lastChecked && (
          <p className="text-sm text-muted-foreground">
            最終確認: {lastChecked.toLocaleString()}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">確認中...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  存在するテーブル ({existingTables.length})
                </h4>
                <div className="space-y-1">
                  {existingTables.map(table => (
                    <div
                      key={table.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{table.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  不在なテーブル ({missingTables.length})
                </h4>
                <div className="space-y-1">
                  {missingTables.map(table => (
                    <div key={table.name} className="text-sm">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span>{table.name}</span>
                      </div>
                      {table.error && (
                        <p className="text-xs text-red-400 ml-5 mt-1">
                          {table.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SNS投稿の詳細情報表示 */}
            {(() => {
              const snsPostsTable = tables.find(t => t.name === 'sns_posts');
              if (snsPostsTable?.exists && snsPostsTable.count !== undefined) {
                return (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      SNS投稿情報
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      投稿数: {snsPostsTable.count}件
                    </p>
                    {snsPostsTable.sampleData &&
                      snsPostsTable.sampleData.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">最新の投稿:</p>
                          {snsPostsTable.sampleData.map(
                            (post: unknown, index) => {
                              const p = post as {
                                id: string;
                                user_id: string;
                                content: string;
                                post_type: string;
                                created_at: string;
                              };
                              return (
                                <div
                                  key={index}
                                  className="text-xs bg-white dark:bg-gray-800 p-2 rounded"
                                >
                                  <div>ID: {p.id}</div>
                                  <div>ユーザー: {p.user_id}</div>
                                  <div>内容: {p.content}</div>
                                  <div>タイプ: {p.post_type}</div>
                                  <div>
                                    作成日:{' '}
                                    {new Date(p.created_at).toLocaleString()}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                  </div>
                );
              }
              return null;
            })()}

            {missingTables.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  マイグレーション実行が必要
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  SNS機能を使用するには、以下のマイグレーションファイルをSupabaseダッシュボードで実行してください：
                </p>
                <div className="space-y-1 text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded">
                  <div>
                    1. supabase/migrations/20241201000032_create_sns_system.sql
                  </div>
                  <div>
                    2.
                    supabase/migrations/20241201000033_add_sns_rls_policies.sql
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
