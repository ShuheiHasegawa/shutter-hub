import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ja', 'en'],

  // Used when no locale matches
  defaultLocale: 'ja',

  // The `pathnames` object holds pairs of internal and
  // external paths. Based on the locale, the external
  // paths are rewritten to the shared, internal ones.
  pathnames: {
    // If all locales use the same pathname, a single
    // string or a template string can be provided.
    // Optionally, you can omit the pathnames.
    '/': '/',
    '/search': {
      ja: '/search',
      en: '/search',
    },
    '/bookings': {
      ja: '/bookings',
      en: '/bookings',
    },
    '/instant': {
      ja: '/instant',
      en: '/instant',
    },
    '/profile': {
      ja: '/profile',
      en: '/profile',
    },
    '/settings': {
      ja: '/settings',
      en: '/settings',
    },
    '/photo-sessions': {
      ja: '/photo-sessions',
      en: '/photo-sessions',
    },
    '/photo-sessions/create': {
      ja: '/photo-sessions/create',
      en: '/photo-sessions/create',
    },
    '/studios': {
      ja: '/studios',
      en: '/studios',
    },
    '/login': {
      ja: '/login',
      en: '/login',
    },
    '/auth/signin': {
      ja: '/auth/signin',
      en: '/auth/signin',
    },
    '/auth/signup': {
      ja: '/auth/signup',
      en: '/auth/signup',
    },
    '/about': {
      ja: '/about',
      en: '/about',
    },
    '/help': {
      ja: '/help',
      en: '/help',
    },
    '/contact': {
      ja: '/contact',
      en: '/contact',
    },
    '/faq': {
      ja: '/faq',
      en: '/faq',
    },
    '/terms': {
      ja: '/terms',
      en: '/terms',
    },
    '/privacy': {
      ja: '/privacy',
      en: '/privacy',
    },
    '/cookies': {
      ja: '/cookies',
      en: '/cookies',
    },
  },
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
