'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Conversation,
  ConversationWithUsers,
  MessageWithUser,
  MessageActionResult,
  SendMessageRequest,
  ConversationFilter,
} from '@/types/social';

// 会話作成または取得
export async function createOrGetConversation(
  recipientId: string
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    if (user.id === recipientId) {
      return {
        success: false,
        message: '自分にメッセージを送ることはできません',
      };
    }

    // ブロック状態をチェック
    const { data: isBlocked } = await supabase
      .from('user_blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${user.id})`
      )
      .single();

    if (isBlocked) {
      return { success: false, message: 'メッセージを送信できません' };
    }

    // 会話作成または取得（ストアドプロシージャを使用）
    const { data: conversationId, error: conversationError } =
      await supabase.rpc('get_or_create_direct_conversation', {
        user1_id: user.id,
        user2_id: recipientId,
      });

    if (conversationError) {
      console.error('Conversation creation error:', conversationError);
      return { success: false, message: '会話の作成に失敗しました' };
    }

    // 作成された会話を取得
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      return { success: false, message: '会話の取得に失敗しました' };
    }

    return {
      success: true,
      message: '会話が作成されました',
      data: conversation,
    };
  } catch (error) {
    console.error('Create conversation error:', error);
    return { success: false, message: '予期しないエラーが発生しました' };
  }
}

// メッセージ送信
export async function sendMessage(
  request: SendMessageRequest
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    let conversationId = request.conversation_id;

    // 会話IDが指定されていない場合は作成
    if (!conversationId && request.recipient_id) {
      const conversationResult = await createOrGetConversation(
        request.recipient_id
      );
      if (!conversationResult.success || !conversationResult.data) {
        return conversationResult;
      }
      conversationId = (conversationResult.data as Conversation).id;
    }

    if (!conversationId) {
      return {
        success: false,
        message: '会話IDまたは受信者IDが必要です',
      };
    }

    // ファイルアップロード処理（今後実装）
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let fileType: string | undefined;

    if (request.file) {
      // TODO: ファイルアップロード処理を実装
      // const uploadResult = await uploadMessageFile(request.file);
      // if (uploadResult.success) {
      //   fileUrl = uploadResult.url;
      //   fileName = request.file.name;
      //   fileSize = request.file.size;
      //   fileType = request.file.type;
      // }
    }

    // メッセージを挿入
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: request.content,
        message_type: request.message_type || 'text',
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        reply_to_id: request.reply_to_id,
      })
      .select('*')
      .single();

    if (messageError) {
      console.error('Message insert error:', messageError);
      return { success: false, message: 'メッセージの送信に失敗しました' };
    }

    // パスを再検証（リアルタイム更新のため）
    revalidatePath('/messages');

    return {
      success: true,
      message: 'メッセージが送信されました',
      data: message,
    };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, message: '予期しないエラーが発生しました' };
  }
}

// 会話一覧取得
export async function getConversations(
  filter: ConversationFilter = {}
): Promise<ConversationWithUsers[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [];
    }

    // 基本クエリ
    let query = supabase
      .from('conversations')
      .select(
        `
        *,
        participant1:participant1_id(id, display_name, avatar_url, user_type),
        participant2:participant2_id(id, display_name, avatar_url, user_type),
        last_message:last_message_id(id, content, message_type, sender_id, created_at)
      `
      )
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    // フィルター適用
    if (filter.type === 'direct') {
      query = query.eq('is_group', false);
    } else if (filter.type === 'group') {
      query = query.eq('is_group', true);
    }

    const { data: conversations, error: conversationsError } = await query;

    if (conversationsError) {
      console.error('Conversations fetch error:', conversationsError);
      return [];
    }

    if (!conversations) {
      return [];
    }

    // 各会話の未読数を取得
    const conversationsWithUnread = await Promise.all(
      conversations.map(async conversation => {
        const { data: unreadCount } = await supabase.rpc(
          'get_unread_message_count',
          {
            user_id_param: user.id,
            conversation_id_param: conversation.id,
          }
        );

        return {
          ...conversation,
          unread_count: unreadCount || 0,
        } as ConversationWithUsers;
      })
    );

    // 未読のみフィルター
    if (filter.unread_only) {
      return conversationsWithUnread.filter(
        conv => (conv.unread_count || 0) > 0
      );
    }

    return conversationsWithUnread;
  } catch (error) {
    console.error('Get conversations error:', error);
    return [];
  }
}

// 会話のメッセージ取得
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageWithUser[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [];
    }

    // 会話のアクセス権限をチェック
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id, is_group')
      .eq('id', conversationId)
      .single();

    if (
      !conversation ||
      (!conversation.is_group &&
        conversation.participant1_id !== user.id &&
        conversation.participant2_id !== user.id)
    ) {
      return [];
    }

    // メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:sender_id(id, display_name, avatar_url, user_type),
        reply_to:reply_to_id(id, content, sender_id, created_at, 
          sender:sender_id(id, display_name, avatar_url))
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return [];
  }
}

// メッセージを既読にする
export async function markMessagesAsRead(
  conversationId: string
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // 既読処理（ストアドプロシージャを使用）
    const { data: markedCount, error: markError } = await supabase.rpc(
      'mark_messages_as_read',
      {
        user_id_param: user.id,
        conversation_id_param: conversationId,
      }
    );

    if (markError) {
      console.error('Mark as read error:', markError);
      return { success: false, message: '既読処理に失敗しました' };
    }

    // パスを再検証
    revalidatePath('/messages');

    return {
      success: true,
      message: `${markedCount}件のメッセージを既読にしました`,
    };
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return { success: false, message: '予期しないエラーが発生しました' };
  }
}

// メッセージ編集
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // メッセージを更新
    const { data: message, error: updateError } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', user.id) // 送信者のみ編集可能
      .select('*')
      .single();

    if (updateError) {
      console.error('Message edit error:', updateError);
      return { success: false, message: 'メッセージの編集に失敗しました' };
    }

    // パスを再検証
    revalidatePath('/messages');

    return {
      success: true,
      message: 'メッセージが編集されました',
      data: message,
    };
  } catch (error) {
    console.error('Edit message error:', error);
    return { success: false, message: '予期しないエラーが発生しました' };
  }
}

// メッセージ削除
export async function deleteMessage(
  messageId: string
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // メッセージを削除
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id); // 送信者のみ削除可能

    if (deleteError) {
      console.error('Message delete error:', deleteError);
      return { success: false, message: 'メッセージの削除に失敗しました' };
    }

    // パスを再検証
    revalidatePath('/messages');

    return {
      success: true,
      message: 'メッセージが削除されました',
    };
  } catch (error) {
    console.error('Delete message error:', error);
    return { success: false, message: '予期しないエラーが発生しました' };
  }
}

// グループ会話作成
export async function createGroupConversation(
  name: string,
  description?: string,
  memberIds: string[] = [],
  imageUrl?: string
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    if (!name.trim()) {
      return { success: false, message: 'グループ名を入力してください' };
    }

    if (memberIds.length === 0) {
      return { success: false, message: 'メンバーを選択してください' };
    }

    // 重複を除去し、作成者を含める
    const uniqueMemberIds = Array.from(new Set([user.id, ...memberIds]));

    // グループ会話を作成
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        is_group: true,
        group_name: name.trim(),
        group_description: description?.trim(),
        group_image_url: imageUrl,
        created_by: user.id,
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Group conversation creation error:', conversationError);
      return { success: false, message: 'グループの作成に失敗しました' };
    }

    // メンバーを追加
    const memberInserts = uniqueMemberIds.map(memberId => ({
      conversation_id: conversation.id,
      user_id: memberId,
      role: memberId === user.id ? 'admin' : 'member',
    }));

    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert(memberInserts);

    if (membersError) {
      console.error('Group members creation error:', membersError);
      // グループを削除して巻き戻し
      await supabase.from('conversations').delete().eq('id', conversation.id);
      return { success: false, message: 'メンバーの追加に失敗しました' };
    }

    // システムメッセージを送信
    await sendMessage({
      conversation_id: conversation.id,
      content: 'グループが作成されました',
      message_type: 'system',
    });

    revalidatePath('/messages');
    return {
      success: true,
      message: 'グループが作成されました',
      data: conversation,
    };
  } catch (error) {
    console.error('Create group conversation error:', error);
    return { success: false, message: 'グループの作成に失敗しました' };
  }
}

// グループメンバー追加
export async function addGroupMembers(
  conversationId: string,
  memberIds: string[]
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // グループの管理権限をチェック
    const { data: member } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return { success: false, message: '権限がありません' };
    }

    // 既存メンバーを除外
    const { data: existingMembers } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    const existingMemberIds = existingMembers?.map(m => m.user_id) || [];
    const newMemberIds = memberIds.filter(
      id => !existingMemberIds.includes(id)
    );

    if (newMemberIds.length === 0) {
      return {
        success: false,
        message: '追加できる新しいメンバーがありません',
      };
    }

    // 新メンバーを追加
    const memberInserts = newMemberIds.map(memberId => ({
      conversation_id: conversationId,
      user_id: memberId,
      role: 'member',
    }));

    const { error: insertError } = await supabase
      .from('conversation_members')
      .insert(memberInserts);

    if (insertError) {
      console.error('Add group members error:', insertError);
      return { success: false, message: 'メンバーの追加に失敗しました' };
    }

    // システムメッセージを送信
    await sendMessage({
      conversation_id: conversationId,
      content: `${newMemberIds.length}人のメンバーが追加されました`,
      message_type: 'system',
    });

    revalidatePath('/messages');
    return {
      success: true,
      message: `${newMemberIds.length}人のメンバーを追加しました`,
    };
  } catch (error) {
    console.error('Add group members error:', error);
    return { success: false, message: 'メンバーの追加に失敗しました' };
  }
}

// グループメンバー削除/退出
export async function removeGroupMember(
  conversationId: string,
  memberId: string,
  isLeaving: boolean = false
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // 自分の退出の場合は権限チェック不要
    if (!isLeaving || memberId !== user.id) {
      // 管理権限をチェック
      const { data: member } = await supabase
        .from('conversation_members')
        .select('role')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!member || !['admin', 'moderator'].includes(member.role)) {
        return { success: false, message: '権限がありません' };
      }
    }

    // メンバーを非アクティブに設定
    const { error: updateError } = await supabase
      .from('conversation_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', memberId);

    if (updateError) {
      console.error('Remove group member error:', updateError);
      return { success: false, message: 'メンバーの削除に失敗しました' };
    }

    // システムメッセージを送信
    const action = isLeaving && memberId === user.id ? '退出' : '削除';
    await sendMessage({
      conversation_id: conversationId,
      content: `メンバーがグループから${action}しました`,
      message_type: 'system',
    });

    revalidatePath('/messages');
    return {
      success: true,
      message: isLeaving
        ? 'グループから退出しました'
        : 'メンバーを削除しました',
    };
  } catch (error) {
    console.error('Remove group member error:', error);
    return { success: false, message: 'メンバーの削除に失敗しました' };
  }
}

// グループ設定更新
export async function updateGroupSettings(
  conversationId: string,
  updates: {
    name?: string;
    description?: string;
    imageUrl?: string;
  }
): Promise<MessageActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'ログインが必要です' };
    }

    // 管理権限をチェック
    const { data: member } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return { success: false, message: '権限がありません' };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.group_name = updates.name.trim();
    if (updates.description !== undefined)
      updateData.group_description = updates.description?.trim();
    if (updates.imageUrl !== undefined)
      updateData.group_image_url = updates.imageUrl;

    if (Object.keys(updateData).length === 0) {
      return { success: false, message: '更新する内容がありません' };
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (updateError) {
      console.error('Update group settings error:', updateError);
      return { success: false, message: 'グループ設定の更新に失敗しました' };
    }

    // システムメッセージを送信
    const changes = [];
    if (updates.name) changes.push('名前');
    if (updates.description) changes.push('説明');
    if (updates.imageUrl) changes.push('画像');

    await sendMessage({
      conversation_id: conversationId,
      content: `グループの${changes.join('・')}が更新されました`,
      message_type: 'system',
    });

    revalidatePath('/messages');
    return {
      success: true,
      message: 'グループ設定を更新しました',
    };
  } catch (error) {
    console.error('Update group settings error:', error);
    return { success: false, message: 'グループ設定の更新に失敗しました' };
  }
}

// グループメンバー一覧取得
export async function getGroupMembers(conversationId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [];
    }

    // アクセス権限をチェック
    const { data: member } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!member) {
      return [];
    }

    // メンバー一覧を取得
    const { data: members, error: membersError } = await supabase
      .from('conversation_members')
      .select(
        `
        *,
        user:user_id(id, display_name, avatar_url, user_type)
      `
      )
      .eq('conversation_id', conversationId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Get group members error:', membersError);
      return [];
    }

    return members || [];
  } catch (error) {
    console.error('Get group members error:', error);
    return [];
  }
}

// 総未読メッセージ数取得
export async function getTotalUnreadCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return 0;
    }

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (!conversations) {
      return 0;
    }

    // 各会話の未読数を合計
    let totalUnread = 0;
    for (const conversation of conversations) {
      const { data: unreadCount } = await supabase.rpc(
        'get_unread_message_count',
        {
          user_id_param: user.id,
          conversation_id_param: conversation.id,
        }
      );
      totalUnread += unreadCount || 0;
    }

    return totalUnread;
  } catch (error) {
    console.error('Get total unread count error:', error);
    return 0;
  }
}
