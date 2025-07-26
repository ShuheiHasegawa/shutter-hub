import { AppHeader } from './header';
import { Footer } from './footer';
import { BottomNavigation } from './bottom-navigation';

interface MainLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export function MainLayout({
  children,
  showBottomNav = true,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader variant="default" />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      {showBottomNav && <BottomNavigation />}
    </div>
  );
}
