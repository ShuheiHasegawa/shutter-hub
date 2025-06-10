// SNS機能（フォロー・メッセージ）関連の型定義

export type FollowStatus = 'pending' | 'accepted' | 'rejected';

export type BlockReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export type ProfileVisibility = 'public' | 'followers_only' | 'private';

export type ActivityVisibility = 'public' | 'followers_only' | 'private';

// フォロー関係
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string;
  updated_at: string;
}

// ブロック関係
export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason?: BlockReason;
  description?: string;
  created_at: string;
}

// ユーザー設定
export interface UserPreferences {
  user_id: string;

  // フォロー関連設定
  follow_approval_required: boolean;
  allow_messages_from_followers: boolean;
  allow_messages_from_following: boolean;
  allow_messages_from_strangers: boolean;

  // 既読表示設定
  show_read_status: boolean;
  show_online_status: boolean;

  // 通知設定
  notify_new_follower: boolean;
  notify_follow_request: boolean;
  notify_new_message: boolean;
  notify_group_message: boolean;
  notify_system_message: boolean;

  // プライバシー設定
  profile_visibility: ProfileVisibility;
  activity_visibility: ActivityVisibility;

  created_at: string;
  updated_at: string;
}

// フォロー統計
export interface UserFollowStats {
  user_id: string;
  followers_count: number;
  following_count: number;
  mutual_follows_count: number;
  updated_at: string;
}

// 拡張されたユーザー情報（フォロー関係を含む）
export interface UserWithFollowInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_type: string;
  location: string | null;
  website: string | null;
  instagram_handle: string | null;
  twitter_handle: string | null;
  is_verified: boolean;
  created_at: string;

  // フォロー関係情報
  follow_stats?: UserFollowStats;
  is_following?: boolean;
  is_followed_by?: boolean;
  is_mutual_follow?: boolean;
  is_blocked?: boolean;
  follow_status?: FollowStatus;
  preferences?: UserPreferences;
}

// フォロー関係詳細（ビューから取得）
export interface FollowRelationship {
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string;
  follower_name: string | null;
  follower_avatar: string | null;
  follower_type: string;
  following_name: string | null;
  following_avatar: string | null;
  following_type: string;
  is_mutual: boolean;
}

// フォロー・アンフォロー操作の結果
export interface FollowActionResult {
  success: boolean;
  message?: string;
  follow_status?: FollowStatus;
  requires_approval?: boolean;
}

// ブロック操作の結果
export interface BlockActionResult {
  success: boolean;
  message?: string;
  is_blocked?: boolean;
}

// フォローリスト取得用のフィルター
export interface FollowListFilter {
  user_id: string;
  type: 'followers' | 'following' | 'mutual';
  status?: FollowStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

// ユーザー検索結果
export interface UserSearchResult {
  users: UserWithFollowInfo[];
  total_count: number;
  has_more: boolean;
}

// フォロー候補ユーザー（推薦機能用）
export interface FollowSuggestion {
  user: UserWithFollowInfo;
  reason:
    | 'mutual_followers'
    | 'same_interests'
    | 'frequent_interactions'
    | 'location_based';
  mutual_followers_count?: number;
  shared_sessions_count?: number;
}

// プライバシー設定更新用
export interface UpdatePrivacySettings {
  follow_approval_required?: boolean;
  allow_messages_from_followers?: boolean;
  allow_messages_from_following?: boolean;
  allow_messages_from_strangers?: boolean;
  show_read_status?: boolean;
  show_online_status?: boolean;
  profile_visibility?: ProfileVisibility;
  activity_visibility?: ActivityVisibility;
}

// 通知設定更新用
export interface UpdateNotificationSettings {
  notify_new_follower?: boolean;
  notify_follow_request?: boolean;
  notify_new_message?: boolean;
  notify_group_message?: boolean;
  notify_system_message?: boolean;
}

// メッセージシステム関連型定義

export type MessageType = 'text' | 'image' | 'file' | 'system';

export type ConversationRole = 'admin' | 'moderator' | 'member';

// 会話
export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id?: string;
  is_group: boolean;
  group_name?: string;
  group_description?: string;
  group_image_url?: string;
  created_by?: string;
  last_message_id?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

// メッセージ
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  reply_to_id?: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

// メッセージ既読状態
export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

// 会話メンバー
export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ConversationRole;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
}

// 会話統計
export interface ConversationStats {
  conversation_id: string;
  participant1_id: string;
  participant2_id?: string;
  is_group: boolean;
  group_name?: string;
  last_message_at: string;
  total_messages: number;
  unread_count: number;
  last_message_content?: string;
  last_message_type?: MessageType;
  last_message_sender_id?: string;
}

// ユーザー情報付きの会話
export interface ConversationWithUsers extends Conversation {
  participant1?: UserWithFollowInfo;
  participant2?: UserWithFollowInfo;
  members?: (ConversationMember & { user: UserWithFollowInfo })[];
  last_message?: Message;
  unread_count?: number;
  is_online?: boolean;
}

// ユーザー情報付きのメッセージ
export interface MessageWithUser extends Message {
  sender: UserWithFollowInfo;
  reply_to?: MessageWithUser;
  read_by?: MessageReadStatus[];
  is_read_by_current_user?: boolean;
}

// メッセージ送信リクエスト
export interface SendMessageRequest {
  conversation_id?: string;
  recipient_id?: string;
  content: string;
  message_type?: MessageType;
  file?: File;
  reply_to_id?: string;
}

// メッセージアクション結果
export interface MessageActionResult {
  success: boolean;
  message?: string;
  data?: Message | Conversation;
  error?: string;
}

// 会話フィルター
export interface ConversationFilter {
  type?: 'all' | 'direct' | 'group';
  unread_only?: boolean;
  search_query?: string;
}

// リアルタイムメッセージイベント
export interface RealtimeMessageEvent {
  event_type: 'new_message' | 'message_read' | 'typing_start' | 'typing_stop';
  conversation_id: string;
  user_id: string;
  message?: Message;
  typing_users?: string[];
}
