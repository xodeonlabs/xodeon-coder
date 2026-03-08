import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AdBanner } from '@/components/AdBanner';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const HIDE_AD_ROUTES = ['/editor', '/preview'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const showAd = !HIDE_AD_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar only on lg+ */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          {showAd && (
            <div className="hidden lg:block px-4 sm:px-6 pb-4 pt-2">
              <AdBanner />
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
