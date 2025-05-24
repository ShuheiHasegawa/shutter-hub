import { updateSession } from '@/lib/supabase/middleware';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Handle internationalization first
  const intlResponse = intlMiddleware(request);

  // If intl middleware returns a response (redirect), use it
  if (intlResponse) {
    return intlResponse;
  }

  // Otherwise, handle Supabase session
  return await updateSession(request);
}

export const config = {
  // Match only internationalized pathnames and auth callback
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(ja|en)/:path*',

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!_next|_vercel|.*\\..*).*)',

    // Auth callback
    '/auth/callback',
  ],
};
