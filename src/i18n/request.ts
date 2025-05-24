import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // This can either be defined statically at the top-level if no user
  // is involved, or alternatively read from the user database,
  // request headers, etc.
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as 'ja' | 'en')) {
    locale = routing.defaultLocale;
  }

  return {
    locale: locale as string,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
