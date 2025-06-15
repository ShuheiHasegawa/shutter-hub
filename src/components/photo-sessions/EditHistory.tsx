'use client';

import { useState, useEffect } from 'react';
// import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  History,
  Clock,
  Edit,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface EditHistoryEntry {
  id: string;
  photo_session_id: string;
  editor_id: string;
  action_type: 'create' | 'update' | 'duplicate' | 'restore';
  changes: Record<string, { old: unknown; new: unknown }>;
  metadata: {
    ip_address?: string;
    user_agent?: string;
    reason?: string;
  };
  created_at: string;
  editor: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface EditHistoryProps {
  sessionId: string;
  organizerId: string;
  currentUserId: string;
}

export function EditHistory({
  sessionId,
  organizerId,
  currentUserId,
}: EditHistoryProps) {
  // const t = useTranslations('photoSessions.history');
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set()
  );
  const [restoring, setRestoring] = useState<string | null>(null);

  // 権限チェック
  const isOrganizer = currentUserId === organizerId;

  useEffect(() => {
    fetchEditHistory();
  }, [sessionId]);

  const fetchEditHistory = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photo_session_edit_history')
        .select(
          `
          id,
          photo_session_id,
          editor_id,
          action_type,
          changes,
          metadata,
          created_at,
          editor:profiles!photo_session_edit_history_editor_id_fkey(
            id,
            display_name,
            avatar_url
          )
        `
        )
        .eq('photo_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // editorが配列として返される場合があるため、最初の要素を取得
      const processedData = (data || []).map(item => ({
        ...item,
        editor: Array.isArray(item.editor) ? item.editor[0] : item.editor,
      }));
      setHistory(processedData as EditHistoryEntry[]);
    } catch (error) {
      console.error('編集履歴取得エラー:', error);
      toast.error('編集履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const restoreToVersion = async (historyId: string) => {
    if (!isOrganizer) return;

    setRestoring(historyId);
    try {
      const supabase = createClient();

      // 復元処理のServer Actionを呼び出し
      const { error } = await supabase.rpc('restore_photo_session_version', {
        p_session_id: sessionId,
        p_history_id: historyId,
        p_editor_id: currentUserId,
      });

      if (error) throw error;

      toast.success('撮影会を指定のバージョンに復元しました');

      // 履歴を再取得
      await fetchEditHistory();
    } catch (error) {
      console.error('復元エラー:', error);
      toast.error('復元に失敗しました');
    } finally {
      setRestoring(null);
    }
  };

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const getActionBadge = (actionType: string) => {
    const actionConfig = {
      create: { label: '作成', variant: 'default' as const, icon: Edit },
      update: { label: '更新', variant: 'secondary' as const, icon: Edit },
      duplicate: { label: '複製', variant: 'outline' as const, icon: Edit },
      restore: {
        label: '復元',
        variant: 'destructive' as const,
        icon: RotateCcw,
      },
    };

    const config = actionConfig[actionType as keyof typeof actionConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatFieldName = (fieldName: string) => {
    const fieldNames: Record<string, string> = {
      title: 'タイトル',
      description: '説明',
      location: '場所',
      address: '住所',
      start_time: '開始時刻',
      end_time: '終了時刻',
      max_participants: '最大参加者数',
      price_per_person: '参加費',
      booking_type: '予約方式',
      is_published: '公開状態',
      image_urls: '画像',
    };
    return fieldNames[fieldName] || fieldName;
  };

  const formatValue = (value: unknown, fieldName: string) => {
    if (value === null || value === undefined) return '未設定';

    switch (fieldName) {
      case 'start_time':
      case 'end_time':
        return format(new Date(value as string), 'yyyy年MM月dd日 HH:mm', {
          locale: ja,
        });
      case 'is_published':
        return value ? '公開' : '非公開';
      case 'booking_type':
        const bookingTypes: Record<string, string> = {
          first_come: '先着順',
          lottery: '抽選',
          admin_lottery: '管理抽選',
          priority: '優先予約',
          waitlist: 'キャンセル待ち',
        };
        return bookingTypes[value as string] || String(value);
      case 'price_per_person':
        return `¥${(value as number).toLocaleString()}`;
      case 'image_urls':
        return Array.isArray(value) ? `${value.length}枚の画像` : '画像なし';
      default:
        return String(value);
    }
  };

  const renderChanges = (
    changes: Record<string, { old: unknown; new: unknown }>
  ) => {
    return Object.entries(changes).map(([fieldName, change]) => (
      <div key={fieldName} className="border-l-2 border-muted pl-4 py-2">
        <div className="font-medium text-sm">{formatFieldName(fieldName)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
          <div className="text-sm">
            <span className="text-muted-foreground">変更前:</span>
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300">
              {formatValue(change.old, fieldName)}
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">変更後:</span>
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300">
              {formatValue(change.new, fieldName)}
            </div>
          </div>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          編集履歴 ({history.length}件)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            編集履歴がありません
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(entry => {
              const isExpanded = expandedEntries.has(entry.id);
              const hasChanges = Object.keys(entry.changes).length > 0;

              return (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.editor.avatar_url} />
                        <AvatarFallback>
                          {entry.editor.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.editor.display_name}
                          </span>
                          {getActionBadge(entry.action_type)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(entry.created_at),
                            'yyyy年MM月dd日 HH:mm',
                            { locale: ja }
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasChanges && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          詳細
                        </Button>
                      )}

                      {isOrganizer && entry.action_type !== 'restore' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreToVersion(entry.id)}
                          disabled={restoring === entry.id}
                        >
                          {restoring === entry.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                              復元中...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              復元
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 変更詳細 */}
                  {isExpanded && hasChanges && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <h4 className="font-medium">変更内容</h4>
                        {renderChanges(entry.changes)}
                      </div>
                    </>
                  )}

                  {/* メタデータ */}
                  {isExpanded && entry.metadata.reason && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-medium mb-2">変更理由</h4>
                        <p className="text-sm text-muted-foreground">
                          {entry.metadata.reason}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
