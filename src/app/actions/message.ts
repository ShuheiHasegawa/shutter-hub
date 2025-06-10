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
