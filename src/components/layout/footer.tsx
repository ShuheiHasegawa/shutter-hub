import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { NavLink } from '@/components/ui/nav-link';

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
            <ul className="text-sm">
              <li>
                <NavLink href="/photo-sessions" variant="sideline">
                  {t('services.findSessions')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/photo-sessions/create" variant="sideline">
                  {t('services.createSession')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/instant" variant="sideline">
                  {t('services.instantRequest')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/studios" variant="sideline">
                  {t('services.studioWiki')}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* サポート */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('support.title')}</h3>
            <ul className="text-sm">
              <li>
                <NavLink href="/help" variant="sideline">
                  {t('support.helpCenter')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/contact" variant="sideline">
                  {t('support.contact')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/faq" variant="sideline">
                  {t('support.faq')}
                </NavLink>
              </li>
            </ul>
          </div>

          {/* 法的情報 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('legal.title')}</h3>
            <ul className="text-sm">
              <li>
                <NavLink href="/terms" variant="sideline">
                  {t('legal.terms')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/privacy" variant="sideline">
                  {t('legal.privacy')}
                </NavLink>
              </li>
              <li>
                <NavLink href="/cookies" variant="sideline">
                  {t('legal.cookies')}
                </NavLink>
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
