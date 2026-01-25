'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommunityCategory } from './types';

interface CommunityBoardPostFormProps {
  onPost: (content: string, category: CommunityCategory) => Promise<void>;
}

export function CommunityBoardPostForm({
  onPost,
}: CommunityBoardPostFormProps) {
  const t = useTranslations('communityBoard');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('other');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isPosting) return;

    setIsPosting(true);
    try {
      await onPost(content.trim(), category);
      setContent('');
      setCategory('other');
    } catch {
      // エラーハンドリングは親コンポーネントで行う
    } finally {
      setIsPosting(false);
    }
  };

  const categories: CommunityCategory[] = [
    'announcement',
    'question',
    'introduction',
    'impression',
    'other',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('newPost')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('category')}
          </label>
          <Select
            value={category}
            onValueChange={value => setCategory(value as CommunityCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t('placeholder')}
          className="min-h-[120px] resize-none"
          disabled={isPosting}
        />
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isPosting}
          className="w-full"
        >
          {isPosting
            ? t('posting', { defaultValue: '投稿中...' })
            : t('postButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
