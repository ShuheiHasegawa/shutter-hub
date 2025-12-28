import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 新形式のPublishable Keyを優先、なければ従来のAnon Keyを使用
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new format) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy format).'
  );
}

// シングルトンパターン: 複数のcreateClient()呼び出しで同じインスタンスを再利用
let cachedClient: SupabaseClient | null = null;

export const createClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};
