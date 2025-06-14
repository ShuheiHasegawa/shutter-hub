'use client';

import { useState, useEffect } from 'react';
// import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Search,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  user_id: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'waitlisted';
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
    email?: string;
  };
  // 評価情報
  rating?: number;
  review_count?: number;
}

interface ParticipantManagementProps {
  sessionId: string;
  organizerId: string;
  currentUserId: string;
}

export function ParticipantManagement({
  sessionId,
  organizerId,
  currentUserId,
}: ParticipantManagementProps) {
  // const t = useTranslations('photoSessions.participants');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<
    Participant[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [messageText, setMessageText] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [sendingMessage, setSendingMessage] = useState(false);

  // 権限チェック
  const isOrganizer = currentUserId === organizerId;

  useEffect(() => {
    fetchParticipants();
  }, [sessionId]);

  useEffect(() => {
    filterParticipants();
  }, [participants, searchTerm, selectedStatus]);

  const fetchParticipants = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          user_id,
          status,
          created_at,
          user:profiles!bookings_user_id_fkey(
            id,
            display_name,
            avatar_url,
            email
          )
        `
        )
        .eq('photo_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 各参加者の評価情報を取得
      const participantsWithRating = await Promise.all(
        (data || []).map(async participant => {
          const { data: ratingData } = await supabase
            .from('user_rating_stats')
            .select('average_rating, total_reviews')
            .eq('user_id', participant.user_id)
            .single();

          return {
            ...participant,
            rating: ratingData?.average_rating || 0,
            review_count: ratingData?.total_reviews || 0,
          };
        })
      );

      setParticipants(participantsWithRating as Participant[]);
    } catch (error) {
      console.error('参加者取得エラー:', error);
      toast.error('参加者情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const filterParticipants = () => {
    let filtered = participants;

    // ステータスフィルター
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === selectedStatus);
    }

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(
        p =>
          p.user.display_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          p.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredParticipants(filtered);
  };

  const updateParticipantStatus = async (
    participantId: string,
    newStatus: string
  ) => {
    if (!isOrganizer) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', participantId);

      if (error) throw error;

      // ローカル状態を更新
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId
            ? { ...p, status: newStatus as Participant['status'] }
            : p
        )
      );

      toast.success('参加者ステータスを更新しました');
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      toast.error('ステータスの更新に失敗しました');
    }
  };

  const sendMessageToParticipants = async () => {
    if (
      !isOrganizer ||
      !messageText.trim() ||
      selectedParticipants.length === 0
    )
      return;

    setSendingMessage(true);
    try {
      const supabase = createClient();

      // 選択された参加者にメッセージを送信
      const messagePromises = selectedParticipants.map(async participantId => {
        const participant = participants.find(p => p.id === participantId);
        if (!participant) return;

        // 通知テーブルに挿入
        return supabase.from('notifications').insert({
          user_id: participant.user_id,
          type: 'participant_message',
          title: '撮影会主催者からのメッセージ',
          message: messageText,
          data: {
            photo_session_id: sessionId,
            from_organizer: true,
          },
        });
      });

      await Promise.all(messagePromises);

      toast.success(
        `${selectedParticipants.length}名にメッセージを送信しました`
      );
      setMessageText('');
      setSelectedParticipants([]);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      toast.error('メッセージの送信に失敗しました');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: {
        label: '確定',
        variant: 'default' as const,
        icon: CheckCircle,
      },
      pending: { label: '保留', variant: 'secondary' as const, icon: Clock },
      cancelled: {
        label: 'キャンセル',
        variant: 'destructive' as const,
        icon: XCircle,
      },
      waitlisted: {
        label: 'キャンセル待ち',
        variant: 'outline' as const,
        icon: Clock,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
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
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            参加者管理 ({participants.length}名)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 検索 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="参加者名またはメールアドレスで検索..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* ステータスフィルター */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">全てのステータス</option>
              <option value="confirmed">確定</option>
              <option value="pending">保留</option>
              <option value="waitlisted">キャンセル待ち</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 参加者一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>参加者一覧 ({filteredParticipants.length}名)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              参加者が見つかりません
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParticipants.map(participant => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {isOrganizer && (
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() =>
                          toggleParticipantSelection(participant.id)
                        }
                        className="rounded"
                      />
                    )}

                    <Avatar>
                      <AvatarImage src={participant.user.avatar_url} />
                      <AvatarFallback>
                        {participant.user.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="font-medium">
                        {participant.user.display_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {participant.user.email}
                      </div>
                      {participant.rating && participant.rating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{participant.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">
                            ({participant.review_count || 0}件)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(participant.status)}

                    {isOrganizer && (
                      <div className="flex gap-1">
                        {participant.status !== 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateParticipantStatus(
                                participant.id,
                                'confirmed'
                              )
                            }
                          >
                            承認
                          </Button>
                        )}
                        {participant.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateParticipantStatus(
                                participant.id,
                                'cancelled'
                              )
                            }
                          >
                            キャンセル
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* メッセージ送信（主催者のみ） */}
      {isOrganizer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              参加者へメッセージ送信
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                選択された参加者 ({selectedParticipants.length}名)
              </label>
              {selectedParticipants.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  メッセージを送信する参加者を選択してください
                </p>
              )}
            </div>

            <Textarea
              placeholder="参加者へのメッセージを入力してください..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              rows={4}
            />

            <Button
              onClick={sendMessageToParticipants}
              disabled={
                !messageText.trim() ||
                selectedParticipants.length === 0 ||
                sendingMessage
              }
              className="w-full"
            >
              {sendingMessage ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  送信中...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {selectedParticipants.length}名にメッセージを送信
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
