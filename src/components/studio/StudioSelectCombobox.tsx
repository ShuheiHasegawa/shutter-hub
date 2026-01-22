'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getStudioListForSelectAction } from '@/app/actions/studio';
import { logger } from '@/lib/utils/logger';
import { useDebounce } from '@/hooks/useDebounce';

interface Studio {
  id: string;
  name: string;
}

interface StudioSelectComboboxProps {
  value?: string;
  onSelect: (studioId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * スタジオ選択用のComboboxコンポーネント
 * 検索可能なスタジオ選択UIを提供する
 */
export function StudioSelectCombobox({
  value,
  onSelect,
  placeholder = 'スタジオを検索...',
  disabled = false,
}: StudioSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // スタジオ一覧を取得
  const fetchStudios = useCallback(async (query: string = '') => {
    setIsLoading(true);
    try {
      const result = await getStudioListForSelectAction(query);
      if (result.success && result.studios) {
        setStudios(result.studios);
      }
    } catch (error) {
      logger.error('スタジオ一覧取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    fetchStudios();
  }, [fetchStudios]);

  // 検索クエリ変更時に再取得
  useEffect(() => {
    if (open) {
      fetchStudios(debouncedQuery);
    }
  }, [debouncedQuery, open, fetchStudios]);

  // 選択されたスタジオ名を取得
  const selectedStudio = studios.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedStudio ? selectedStudio.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="スタジオ名で検索..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? '読み込み中...' : 'スタジオが見つかりませんでした'}
            </CommandEmpty>
            <CommandGroup>
              {studios.map(studio => (
                <CommandItem
                  key={studio.id}
                  value={studio.id}
                  keywords={[studio.name]}
                  onSelect={() => {
                    onSelect(studio.id === value ? null : studio.id);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === studio.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {studio.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * スタジオ選択解除ボタン付きのラッパーコンポーネント
 */
interface StudioSelectWithClearProps extends StudioSelectComboboxProps {
  onClear: () => void;
  showClearButton?: boolean;
}

export function StudioSelectWithClear({
  value,
  onSelect,
  onClear,
  showClearButton = true,
  ...props
}: StudioSelectWithClearProps) {
  const hasValue = !!value;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <StudioSelectCombobox value={value} onSelect={onSelect} {...props} />
      </div>
      {showClearButton && hasValue && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onClear}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
