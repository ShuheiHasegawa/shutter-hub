import type { ReactionType } from '@/constants/reactions';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  content: string;
  category: CommunityCategory;
  createdAt: Date;
  updatedAt?: Date;
  reactions: Record<ReactionType, number>; // 各絵文字のリアクション数
  userReaction: ReactionType | null; // 現在のユーザーのリアクション
  isOrganizer: boolean; // 主催者バッジ表示用
  isPinned: boolean; // ピン留め
}

export type CommunityCategory =
  | 'announcement'
  | 'question'
  | 'introduction'
  | 'impression'
  | 'other';

export interface CommunityBoardProps {
  sessionId: string;
  currentUserId: string;
  isOrganizer: boolean; // 現在のユーザーが主催者か
  posts: CommunityPost[];
  participantCount: number;
  eventTimeRange?: string;
  onPost: (content: string, category: CommunityCategory) => Promise<void>;
  onEdit: (postId: string, content: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
  onReaction: (postId: string, emoji: ReactionType) => Promise<void>;
  onPin: (postId: string, isPinned: boolean) => Promise<void>;
}
