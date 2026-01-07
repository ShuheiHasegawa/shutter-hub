import DOMPurify from 'isomorphic-dompurify';

/**
 * HTMLコンテンツをサニタイズしてXSS攻撃を防止する
 * @param html サニタイズするHTML文字列
 * @returns サニタイズされたHTML文字列
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'span',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}
