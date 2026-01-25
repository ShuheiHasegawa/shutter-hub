'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import {
  REACTION_TYPES,
  REACTION_LABELS,
  type ReactionType,
} from '@/constants/reactions';
import { cn } from '@/lib/utils';

interface EmojiReactionPickerProps {
  reactions: Record<ReactionType, number>; // 各絵文字のカウント
  userReaction: ReactionType | null; // 現在のユーザーのリアクション
  onReaction: (emoji: ReactionType) => void; // リアクション時のコールバック
  disabled?: boolean;
  className?: string;
}

/**
 * 絵文字リアクションピッカー共通コンポーネント
 * レビューやコミュニティボードなどで使用可能
 */
export function EmojiReactionPicker({
  reactions,
  userReaction,
  onReaction,
  disabled = false,
  className,
}: EmojiReactionPickerProps) {
  const t = useTranslations('reviews.reactions');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // リアクション数があるもの、または自分のリアクションがあるものを表示
  const visibleReactions = REACTION_TYPES.filter(
    emoji => reactions[emoji] > 0 || userReaction === emoji
  );

  const handleReactionClick = (emoji: ReactionType) => {
    onReaction(emoji);
    setIsPopoverOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* 既存のリアクションを表示 */}
      {visibleReactions.map(emoji => {
        const count = reactions[emoji] || 0;
        const isSelected = userReaction === emoji;

        return (
          <Button
            key={emoji}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onReaction(emoji)}
            disabled={disabled}
            className="flex items-center gap-0.5 h-6 px-1.5"
            title={t(REACTION_LABELS[emoji])}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </Button>
        );
      })}

      {/* リアクション追加ボタン（Popover） */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            disabled={disabled}
            title="リアクションを追加"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex items-center gap-1">
            {REACTION_TYPES.map(emoji => {
              const isSelected = userReaction === emoji;
              return (
                <Button
                  key={emoji}
                  variant={isSelected ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleReactionClick(emoji)}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  title={t(REACTION_LABELS[emoji])}
                >
                  <span className="text-base">{emoji}</span>
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
