/**
 * 共通タイトルを生成する
 * メイン + （任意のサフィックス） + | ShutterHub を返却する
 */
export function buildTitle(main: string, suffix?: string): string {
  const base = suffix ? `${main} - ${suffix}` : main;
  return `${base} | ShutterHub`;
}
