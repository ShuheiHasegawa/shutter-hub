import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');
  const { locale } = await params;
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? `/${locale}`;

  // エラーパラメータがある場合はエラーページにリダイレクト
  if (error) {
    const errorParams = new URLSearchParams({
      error,
      ...(errorCode && { error_code: errorCode }),
      ...(errorDescription && { error_description: errorDescription }),
    });
    return NextResponse.redirect(
      `${origin}/${locale}/auth/auth-code-error?${errorParams.toString()}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // 認証成功後、プロフィールの存在とuser_typeをチェック
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_type')
          .eq('id', user.id)
          .single();

        // プロフィールが存在しない場合は設定ページにリダイレクト
        if (!profile) {
          next = `/${locale}/auth/setup-profile`;
        } else if (!profile.user_type) {
          // user_typeが未設定の場合はオンボーディングページにリダイレクト
          next = `/${locale}/auth/onboarding`;
        } else if (next === `/${locale}`) {
          // プロフィールが存在し、user_typeも設定されている場合はダッシュボードにリダイレクト
          next = `/${locale}/dashboard`;
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/${locale}/auth/auth-code-error`);
}
