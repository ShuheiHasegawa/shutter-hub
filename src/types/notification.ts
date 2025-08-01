// 統合通知システムの型定義

export type NotificationType =
  // 即座撮影関連
  | 'instant_photo_new_request'
  | 'instant_photo_match_found'
  | 'instant_photo_payment_received'
  | 'instant_photo_booking_completed'
  | 'instant_photo_booking_started'
  | 'instant_photo_photos_delivered'

  // 撮影会関連
  | 'photo_session_booking_confirmed'
  | 'photo_session_booking_cancelled'
  | 'photo_session_reminder'
  | 'photo_session_slot_available'
  | 'photo_session_review_request'
  | 'photo_session_document_signed'
  | 'photo_session_photos_available'

  // フォローシステム関連
  | 'follow_new_follower'
  | 'follow_request_received'
  | 'follow_request_accepted'
  | 'follow_mutual_follow'

  // メッセージ関連
  | 'message_new_message'
  | 'message_group_invite'
  | 'message_group_message'

  // レビュー関連
  | 'review_received'
  | 'review_reminder'

  // 管理者関連
  | 'admin_user_report'
  | 'admin_system_alert'
  | 'admin_content_flagged'

  // システム関連
  | 'system_maintenance'
  | 'system_update'
  | 'system_security_alert'

  // その他
  | 'general_announcement'
  | 'payment_success'
  | 'payment_failed';

export type NotificationCategory =
  | 'instant_photo'
  | 'photo_session'
  | 'social'
  | 'payment'
  | 'system'
  | 'admin';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// 統合通知型（データベース対応）
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: Record<string, unknown>;
  related_entity_type?: string;
  related_entity_id?: string;
  read: boolean;
  read_at?: string;
  archived: boolean;
  archived_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  push_sent: boolean;
  push_sent_at?: string;
  in_app_sent: boolean;
  action_url?: string;
  action_label?: string;
  action_completed: boolean;
  action_completed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// 通知作成用のデータ
export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
}

// 通知フィルター
export interface NotificationFilters {
  category?: NotificationCategory;
  read?: boolean;
  archived?: boolean;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

// 通知統計
export interface NotificationStats {
  total_count: number;
  unread_count: number;
  high_priority_unread: number;
  categories: Record<
    NotificationCategory,
    {
      total: number;
      unread: number;
    }
  >;
}

// 通知設定
export interface NotificationSettings {
  id?: string;
  user_id: string;
  email_enabled: Record<string, boolean>;
  push_enabled: Record<string, boolean>;
  in_app_enabled: Record<string, boolean>;
  email_enabled_global: boolean;
  push_enabled_global: boolean;
  in_app_enabled_global: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone: string;
  digest_enabled: boolean;
  digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  created_at: string;
  updated_at: string;
}

// 通知テンプレート
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  language: string;
  title_template: string;
  message_template: string;
  email_subject_template?: string;
  email_body_template?: string;
  available_variables: string[];
  created_at: string;
  updated_at: string;
}

// 通知コンポーネント用のプロパティ
export interface NotificationCenterProps {
  userType?: 'photographer' | 'guest' | 'organizer' | 'admin';
  enableSound?: boolean;
  enableRealtime?: boolean;
  maxNotifications?: number;
}

// 通知アイテムコンポーネント用のプロパティ
export interface NotificationItemProps {
  notification: Notification;
  onRead?: (notificationId: string) => void;
  onArchive?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onAction?: (notification: Notification) => void;
  showActions?: boolean;
  compact?: boolean;
}

// 通知リスト用のプロパティ
export interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
  filters?: NotificationFilters;
  onFilterChange?: (filters: NotificationFilters) => void;
}

// 旧InstantPhotoNotificationとの互換性のための型変換関数で使用する型
export interface LegacyInstantPhotoNotification {
  id: string;
  type:
    | 'new_request'
    | 'match_found'
    | 'payment_received'
    | 'booking_completed';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  booking_id?: string;
  read: boolean;
  created_at: string;
}

// 通知ヘルパー関数用の型
export interface NotificationHelper {
  createPhotoSessionBookingNotification: (data: {
    userId: string;
    sessionTitle: string;
    sessionDate: string;
    organizerName: string;
    sessionId: string;
  }) => CreateNotificationData;

  createFollowNotification: (data: {
    userId: string;
    followerName: string;
    followerId: string;
    type: 'new_follower' | 'follow_request' | 'follow_accepted';
  }) => CreateNotificationData;

  createMessageNotification: (data: {
    userId: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
    senderId: string;
  }) => CreateNotificationData;

  createInstantPhotoNotification: (data: {
    userId: string;
    type:
      | 'new_request'
      | 'match_found'
      | 'booking_completed'
      | 'photos_delivered';
    requestData?: Record<string, unknown>;
  }) => CreateNotificationData;
}

// エクスポート用のユーティリティ関数の型
export interface NotificationUtils {
  convertLegacyToNew: (legacy: LegacyInstantPhotoNotification) => Notification;
  formatNotificationTime: (timestamp: string) => string;
  getNotificationIcon: (type: NotificationType) => string;
  getNotificationColor: (priority: NotificationPriority) => string;
  shouldShowNotification: (
    notification: Notification,
    settings: NotificationSettings
  ) => boolean;
  groupNotificationsByDate: (
    notifications: Notification[]
  ) => Record<string, Notification[]>;
}
