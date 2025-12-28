/**
 * HTML関連のユーティリティ関数
 */

/**
 * HTMLエスケープ関数
 * XSS攻撃を防ぐために、ユーザー入力文字列をHTMLエスケープする
 *
 * @param text - エスケープするテキスト
 * @returns エスケープされたHTML文字列
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
