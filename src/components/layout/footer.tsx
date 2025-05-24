import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* ブランド */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Camera className="h-6 w-6 text-shutter-primary" />
              <span className="font-bold text-xl">ShutterHub</span>
            </Link>
            <p className="text-sm text-muted-foreground">{t('brand')}</p>
          </div>

          {/* サービス */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('services.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/photo-sessions"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('services.findSessions')}
                </Link>
              </li>
              <li>
                <Link
                  href="/photo-sessions/create"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('services.createSession')}
                </Link>
              </li>
              <li>
                <Link
                  href="/instant"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('services.instantRequest')}
                </Link>
              </li>
              <li>
                <Link
                  href="/studios"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('services.studioWiki')}
                </Link>
              </li>
            </ul>
          </div>

          {/* サポート */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('support.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('support.helpCenter')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('support.contact')}
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('support.faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* 法的情報 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('legal.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('legal.cookies')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
