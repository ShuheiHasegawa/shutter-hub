/**
 * レビューリアクションタイプの定義
 */

export const REACTION_TYPES = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

/**
 * リアクションタイプが有効かチェックする
 */
export function isValidReactionType(
  reaction: string
): reaction is ReactionType {
  return REACTION_TYPES.includes(reaction as ReactionType);
}

/**
 * リアクションタイプのラベル（多言語対応用キー）
 */
export const REACTION_LABELS: Record<ReactionType, string> = {
  '👍': 'thumbsUp',
  '❤️': 'heart',
  '😂': 'laugh',
  '😮': 'surprised',
  '😢': 'sad',
  '😡': 'angry',
} as const;
