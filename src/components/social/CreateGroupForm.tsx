'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users, X, ImageIcon, Search } from 'lucide-react';
import { createGroupConversation } from '@/app/actions/message';
import { UserWithFollowInfo } from '@/types/social';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateGroupFormProps {
  availableUsers: UserWithFollowInfo[];
  onSuccess?: (conversationId: string) => void;
  className?: string;
}

export function CreateGroupForm({
  availableUsers,
  onSuccess,
  className,
}: CreateGroupFormProps) {
  const t = useTranslations('social.messaging');
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フィルタリングされたユーザー
  const filteredUsers = availableUsers.filter(user =>
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // メンバー選択/選択解除
  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 選択されたユーザー情報を取得
  const selectedUsers = availableUsers.filter(user =>
    selectedMembers.includes(user.id)
  );

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('groupNameRequired'));
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error(t('selectMembers'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createGroupConversation(
        formData.name,
        formData.description,
        selectedMembers,
        formData.imageUrl
      );

      if (result.success) {
        toast.success(result.message);
        setIsOpen(false);
        // フォームリセット
        setFormData({ name: '', description: '', imageUrl: '' });
        setSelectedMembers([]);
        setSearchQuery('');

        if (onSuccess && result.data) {
          onSuccess(result.data.id);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Create group error:', error);
      toast.error(t('createGroupError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // メンバー削除
  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(id => id !== userId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn('w-full', className)}>
          <Users className="h-4 w-4 mr-2" />
          {t('createGroup')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('createGroup')}
          </DialogTitle>
          <DialogDescription>{t('createGroupDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-6">
          {/* グループ基本情報 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">{t('groupName')}</Label>
              <Input
                id="group-name"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder={t('groupNamePlaceholder')}
                maxLength={50}
                required
              />
            </div>

            <div>
              <Label htmlFor="group-description">{t('groupDescription')}</Label>
              <Textarea
                id="group-description"
                value={formData.description}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t('groupDescriptionPlaceholder')}
                maxLength={200}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="group-image">
                {t('groupImage')} ({t('optional')})
              </Label>
              <div className="flex gap-2">
                <Input
                  id="group-image"
                  type="url"
                  value={formData.imageUrl}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder={t('groupImagePlaceholder')}
                />
                <Button type="button" variant="outline" size="icon">
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 選択されたメンバー */}
          {selectedUsers.length > 0 && (
            <div>
              <Label>
                {t('selectedMembers')} ({selectedUsers.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map(user => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.display_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.display_name}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(user.id)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* メンバー検索・選択 */}
          <div className="flex-1 min-h-0">
            <Label>{t('selectMembers')}</Label>
            <div className="space-y-3 mt-2">
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('searchUsers')}
                  className="pl-10"
                />
              </div>

              {/* ユーザー一覧 */}
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {searchQuery ? t('noSearchResults') : t('noUsers')}
                    </p>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => toggleMember(user.id)}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.display_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {user.display_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.user_type === 'model' && t('model')}
                            {user.user_type === 'photographer' &&
                              t('photographer')}
                            {user.user_type === 'organizer' && t('organizer')}
                          </p>
                        </div>
                        {/* フォロー状態表示 */}
                        {user.is_following && (
                          <Badge variant="outline" className="text-xs">
                            {t('following')}
                          </Badge>
                        )}
                        {user.is_followed_by && (
                          <Badge variant="secondary" className="text-xs">
                            {t('follower')}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* フッター */}
          <CardFooter className="flex justify-between p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.name.trim() ||
                selectedMembers.length === 0 ||
                isSubmitting
              }
            >
              {isSubmitting ? t('creating') : t('createGroup')}
            </Button>
          </CardFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
