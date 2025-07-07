// SNS機能（フォロー・メッセージ）関連の型定義

export type FollowStatus = 'pending' | 'accepted' | 'rejected';

export type BlockReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export type ProfileVisibility = 'public' | 'followers_only' | 'private';

export type ActivityVisibility = 'public' | 'followers_only' | 'private';

// 基本的なユーザープロフィール型（SNS機能用の簡略版）
export interface SimpleUserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  user_type: string;
  is_verified: boolean;
}

// Supabaseクエリ結果用の型定義
export interface SupabaseLikeWithProfile {
  post_id: string;
  profiles: SimpleUserProfile;
}

// PostCardの最近のいいね表示用
export interface RecentLikesData {
  post_id: string;
  recent_likes: SimpleUserProfile[];
}

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

// Phase 6: SNS拡張機能の型定義

// 投稿タイプ（sns_post_type ENUMに対応）
export type PostType =
  | 'text'
  | 'image'
  | 'multiple_images'
  | 'photo_session'
  | 'repost';

// 投稿の可視性（sns_post_visibility ENUMに対応）
export type PostVisibility =
  | 'public'
  | 'followers'
  | 'mutual_follows'
  | 'private';

// 投稿（つぶやき・写真投稿）
export interface Post {
  id: string;
  user_id: string;
  content: string;
  post_type: PostType;
  visibility: PostVisibility;

  // 画像関連
  image_urls?: string[];
  image_count?: number;

  // 撮影会関連投稿の場合
  photo_session_id?: string;

  // リポスト関連
  original_post_id?: string;
  repost_comment?: string;

  // 統計
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  views_count: number;

  // ハッシュタグ・メンション
  hashtags?: string[];
  mentions?: string[];

  // 位置情報
  location?: string;

  is_pinned: boolean;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

// いいね
export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// コメント
export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string; // 返信機能
  likes_count: number;
  replies_count: number;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

// コメントへのいいね
export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

// ハッシュタグ
export interface Hashtag {
  id: string;
  name: string; // #を除いた名前
  usage_count: number;
  trending_score: number;
  created_at: string;
  updated_at: string;
}

// 投稿とハッシュタグの関連
export interface PostHashtag {
  id: string;
  post_id: string;
  hashtag_id: string;
  created_at: string;
}

// メンション
export interface PostMention {
  id: string;
  post_id: string;
  mentioned_user_id: string;
  created_at: string;
}

// ユーザー情報付きの投稿
export interface PostWithUser extends Post {
  user: UserWithFollowInfo;
  is_liked_by_current_user?: boolean;
  is_reposted_by_current_user?: boolean;
  original_post?: PostWithUser; // リポストの場合の元投稿
  recent_likes?: UserWithFollowInfo[]; // 最近のいいねユーザー（最大3件）
  photo_session?: {
    id: string;
    title: string;
    date: string;
    location?: string;
  };
}

// コメント（ユーザー情報付き）
export interface CommentWithUser extends PostComment {
  user: UserWithFollowInfo;
  is_liked_by_current_user?: boolean;
  replies?: CommentWithUser[]; // 返信（最大3件表示）
}

// タイムライン投稿
export interface TimelinePost extends PostWithUser {
  interaction_type?: 'liked' | 'commented' | 'reposted' | 'followed'; // フォローしているユーザーのアクション
  interaction_user?: UserWithFollowInfo; // アクションを行ったユーザー
  interaction_timestamp?: string;
}

// 投稿作成用
export interface CreatePostData {
  content: string;
  post_type: PostType;
  visibility: PostVisibility;
  image_files?: File[];
  photo_session_id?: string;
  original_post_id?: string; // リポストの場合
  repost_comment?: string;
  location?: string;
  hashtags?: string[];
  mentions?: string[];
}

// 投稿更新用
export interface UpdatePostData {
  content?: string;
  visibility?: PostVisibility;
  location?: string;
  hashtags?: string[];
  mentions?: string[];
}

// 投稿統計
export interface PostStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_reposts: number;
  average_engagement: number;
  top_hashtags: { hashtag: string; count: number }[];
  most_liked_post?: PostWithUser;
}

// タイムライン設定
export interface TimelinePreferences {
  user_id: string;
  show_reposts: boolean;
  show_likes_from_following: boolean;
  show_comments_from_following: boolean;
  show_suggested_posts: boolean;
  chronological_order: boolean; // true: 時系列順, false: アルゴリズム順
  content_filters: string[]; // フィルタリングするハッシュタグ
  muted_users: string[]; // ミュートするユーザー
  created_at: string;
  updated_at: string;
}

// トレンド情報
export interface TrendingTopic {
  hashtag: string;
  posts_count: number;
  engagement_score: number;
  growth_rate: number; // 24時間での増加率
  category?: 'photography' | 'model' | 'studio' | 'general';
}

// 投稿検索フィルター
export interface PostSearchFilters {
  query?: string;
  hashtags?: string[];
  user_ids?: string[];
  post_type?: PostType;
  date_from?: string;
  date_to?: string;
  has_images?: boolean;
  visibility?: PostVisibility;
  sort_by?: 'newest' | 'oldest' | 'most_liked' | 'most_commented';
}

// フィード設定
export interface FeedType {
  type:
    | 'timeline'
    | 'trending'
    | 'following_activity'
    | 'hashtag'
    | 'user_posts';
  hashtag?: string; // ハッシュタグフィードの場合
  user_id?: string; // ユーザーの投稿フィードの場合
}

// 通知タイプ（投稿関連）
export interface PostNotification {
  id: string;
  user_id: string;
  type:
    | 'post_like'
    | 'post_comment'
    | 'post_repost'
    | 'comment_like'
    | 'comment_reply'
    | 'mention'
    | 'hashtag_trending';
  post_id?: string;
  comment_id?: string;
  from_user_id: string;
  is_read: boolean;
  created_at: string;
}
