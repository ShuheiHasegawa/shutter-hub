'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

export function ModelSearchInput({
  onModelSelect,
  excludeIds = [],
  placeholder = 'モデル名で検索...',
  disabled = false,
}: ModelSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ModelSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // useDebounce hook実装
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);
  const supabase = createClient();

  // 検索実行
  const searchModels = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, user_type')
          .eq('user_type', 'model')
          .ilike('display_name', `%${searchQuery}%`)
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .limit(10);

        if (error) {
          logger.error('モデル検索エラー:', error);
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
    },
    [excludeIds, supabase]
  );

  // デバウンス検索
  useEffect(() => {
    searchModels(debouncedQuery);
  }, [debouncedQuery, searchModels]);

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

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10"
        />
      </div>

      {/* 検索結果ドロップダウン */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                検索中...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {query.length < 2
                  ? '2文字以上入力してください'
                  : 'モデルが見つかりませんでした'}
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
