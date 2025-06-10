'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Note: alert-dialog コンポーネントが不足している場合は追加が必要
import {
  Settings,
  UserPlus,
  MoreVertical,
  Shield,
  Crown,
  UserMinus,
  LogOut,
} from 'lucide-react';
import {
  getGroupMembers,
  removeGroupMember,
  updateGroupSettings,
} from '@/app/actions/message';
import {
  ConversationMember,
  UserWithFollowInfo,
  ConversationWithUsers,
} from '@/types/social';
import { toast } from 'sonner';
import { CreateGroupForm } from './CreateGroupForm';

interface GroupManagementProps {
  conversation: ConversationWithUsers;
  currentUserId: string;
  availableUsers: UserWithFollowInfo[];
  onUpdate?: () => void;
  className?: string;
}

export function GroupManagement({
  conversation,
  currentUserId,
  availableUsers,
  onUpdate,
  className,
}: GroupManagementProps) {
  const t = useTranslations('social.messaging');
  const [members, setMembers] = useState<
    (ConversationMember & { user: UserWithFollowInfo })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [groupSettings, setGroupSettings] = useState({
    name: conversation.group_name || '',
    description: conversation.group_description || '',
    imageUrl: conversation.group_image_url || '',
  });

  // 現在のユーザーのロール
  const currentUserMember = members.find(m => m.user_id === currentUserId);
  const currentUserRole = currentUserMember?.role;
  const isAdmin = currentUserRole === 'admin';
  const isModerator = ['admin', 'moderator'].includes(currentUserRole || '');

  // メンバー一覧を取得
  const loadMembers = async () => {
    setLoading(true);
    try {
      const groupMembers = await getGroupMembers(conversation.id);
      setMembers(groupMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error(t('loadMembersError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [conversation.id, loadMembers]);

  // グループ設定更新
  const handleUpdateSettings = async () => {
    try {
      const result = await updateGroupSettings(conversation.id, groupSettings);
      if (result.success) {
        toast.success(result.message);
        setIsSettingsOpen(false);
        onUpdate?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Update settings error:', error);
      toast.error(t('updateSettingsError'));
    }
  };

  // メンバー削除
  const handleRemoveMember = async (memberId: string) => {
    try {
      const result = await removeGroupMember(conversation.id, memberId, false);
      if (result.success) {
        toast.success(result.message);
        loadMembers();
        onUpdate?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Remove member error:', error);
      toast.error(t('removeMemberError'));
    }
  };

  // グループ退出
  const handleLeaveGroup = async () => {
    try {
      const result = await removeGroupMember(
        conversation.id,
        currentUserId,
        true
      );
      if (result.success) {
        toast.success(result.message);
        // 親コンポーネントに退出を通知
        onUpdate?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Leave group error:', error);
      toast.error(t('leaveGroupError'));
    }
  };

  // ロールアイコン
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  // ロールバッジ
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="default" className="text-xs bg-yellow-500">
            {t('admin')}
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="secondary" className="text-xs">
            {t('moderator')}
          </Badge>
        );
      default:
        return null;
    }
  };

  // 追加可能なユーザーをフィルタリング
  const availableToAdd = availableUsers.filter(
    user => !members.some(member => member.user_id === user.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {conversation.group_name}
                {isModerator && (
                  <Dialog
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('groupSettings')}</DialogTitle>
                        <DialogDescription>
                          {t('groupSettingsDescription')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="group-name-edit">
                            {t('groupName')}
                          </Label>
                          <Input
                            id="group-name-edit"
                            value={groupSettings.name}
                            onChange={e =>
                              setGroupSettings(prev => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            maxLength={50}
                          />
                        </div>
                        <div>
                          <Label htmlFor="group-description-edit">
                            {t('groupDescription')}
                          </Label>
                          <Textarea
                            id="group-description-edit"
                            value={groupSettings.description}
                            onChange={e =>
                              setGroupSettings(prev => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            maxLength={200}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="group-image-edit">
                            {t('groupImage')}
                          </Label>
                          <Input
                            id="group-image-edit"
                            type="url"
                            value={groupSettings.imageUrl}
                            onChange={e =>
                              setGroupSettings(prev => ({
                                ...prev,
                                imageUrl: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsSettingsOpen(false)}
                        >
                          {t('cancel')}
                        </Button>
                        <Button onClick={handleUpdateSettings}>
                          {t('saveChanges')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
              <CardDescription>
                {conversation.group_description || t('noDescription')}
              </CardDescription>
            </div>

            {/* グループアクション */}
            <div className="flex items-center gap-2">
              {isModerator && availableToAdd.length > 0 && (
                <Dialog
                  open={isAddMembersOpen}
                  onOpenChange={setIsAddMembersOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-1" />
                      {t('addMembers')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <CreateGroupForm
                      availableUsers={availableToAdd}
                      onSuccess={() => {
                        // 実際のメンバー追加処理
                        setIsAddMembersOpen(false);
                        loadMembers();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}

              {/* グループ退出 */}
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={handleLeaveGroup}
              >
                <LogOut className="h-4 w-4 mr-1" />
                {t('leaveGroup')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div>
            <h4 className="font-medium mb-3">
              {t('members')} ({members.length})
            </h4>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.user.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {member.user.display_name?.charAt(0).toUpperCase() ||
                            'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.user.display_name}
                          </p>
                          {getRoleIcon(member.role)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.user.user_type === 'model' && t('model')}
                          {member.user.user_type === 'photographer' &&
                            t('photographer')}
                          {member.user.user_type === 'organizer' &&
                            t('organizer')}
                          {member.user_id === currentUserId && ` (${t('you')})`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getRoleBadge(member.role)}

                      {/* メンバー管理アクション（管理者・モデレーターのみ） */}
                      {isModerator && member.user_id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdmin && member.role === 'member' && (
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                {t('makeModeratorAction')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              {t('removeMember')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
