'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ModelSearchResult } from '@/types/photo-session';
import { logger } from '@/lib/utils/logger';

interface ModelSearchInputProps {
  onModelSelect: (model: ModelSearchResult) => void;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

// 空配列の安定した参照を作成
const EMPTY_ARRAY: string[] = [];

export function ModelSearchInput({
  onModelSelect,
  excludeIds,
  placeholder = 'モデル名または@usernameで検索...',
  disabled = false,
}: ModelSearchInputProps) {
  // excludeIdsの安定化 - 参照の変更を回避
  const stableExcludeIds = useMemo(() => {
    return excludeIds && excludeIds.length > 0 ? excludeIds : EMPTY_ARRAY;
  }, [excludeIds]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ModelSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // デバウンス付き検索実行（@username対応版）
  const searchModels = async (searchQuery: string, excludeList: string[]) => {
    const trimmedQuery = searchQuery.trim();

    // 2文字未満の場合は結果をクリアして終了
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    try {
      const supabase = createClient();
      const searchTerm = `%${trimmedQuery}%`;
      const usernameQuery = trimmedQuery.replace('@', '').toLowerCase();

      let data: ModelSearchResult[] = [];
      let searchError: Error | null = null;

      // まず@username形式での完全一致検索（モデルのみ）
      if (
        trimmedQuery.startsWith('@') ||
        /^[a-zA-Z0-9_]+$/.test(trimmedQuery)
      ) {
        let usernameQueryBuilder = supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, user_type, username')
          .eq('user_type', 'model')
          .eq('username', usernameQuery);

        // excludeIdsがある場合のみフィルタリング
        if (excludeList.length > 0) {
          usernameQueryBuilder = usernameQueryBuilder.not(
            'id',
            'in',
            `(${excludeList.join(',')})`
          );
        }

        const { data: usernameData, error: usernameError } =
          await usernameQueryBuilder.limit(1);

        if (!usernameError && usernameData && usernameData.length > 0) {
          data = usernameData;
        } else if (usernameError) {
          searchError = usernameError;
        }
      }

      // @username検索で結果がない場合は統合検索を実行（モデルのみ）
      if (data.length === 0 && !searchError) {
        let integratedQueryBuilder = supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, user_type, username')
          .eq('user_type', 'model')
          .or(
            `username.ilike.${searchTerm},display_name.ilike.${searchTerm},bio.ilike.${searchTerm}`
          )
          .order('display_name', { ascending: true });

        // excludeIdsがある場合のみフィルタリング
        if (excludeList.length > 0) {
          integratedQueryBuilder = integratedQueryBuilder.not(
            'id',
            'in',
            `(${excludeList.join(',')})`
          );
        }

        const { data: searchData, error: searchDataError } =
          await integratedQueryBuilder.limit(10);

        if (!searchDataError && searchData) {
          data = searchData;
        } else if (searchDataError) {
          searchError = searchDataError;
        }
      }

      if (searchError) {
        logger.error('モデル検索エラー:', searchError);
        setResults([]);
        return;
      }

      setResults(data || []);
    } catch (error) {
      logger.error('予期しないモデル検索エラー:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // デバウンス処理
  useEffect(() => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 新しいタイマーを設定
    timeoutRef.current = setTimeout(() => {
      searchModels(query, stableExcludeIds);
    }, 300);

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, stableExcludeIds]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelSelect = (model: ModelSearchResult) => {
    onModelSelect(model);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 空文字列の場合は即座に結果をクリア
    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
    } else if (value.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (query.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
        />
      </div>

      {/* 検索結果ドロップダウン */}
      {isOpen && query.trim().length >= 2 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                検索中...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                モデルが見つかりませんでした
              </div>
            ) : (
              <div className="py-2">
                {results.map(model => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors text-left"
                    disabled={disabled}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={model.avatar_url}
                        alt={model.display_name}
                      />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {model.display_name}
                      </p>
                      {model.username && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                          @{model.username}
                        </p>
                      )}
                      {model.bio && (
                        <p className="text-xs text-muted-foreground truncate">
                          {model.bio}
                        </p>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
