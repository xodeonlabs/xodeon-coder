import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AdBanner } from '@/components/AdBanner';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageCircle, Users, Building2, BarChart3, Shield, Settings, Menu, X, Package, Cloud, ExternalLink, Database,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const HIDE_AD_ROUTES = ['/editor', '/preview'];

// Listen for admin force-refresh broadcast
function useAdminForceRefresh() {
  useEffect(() => {
    const channel = supabase
      .channel('admin-force-refresh')
      .on('broadcast', { event: 'force-refresh' }, () => {
        window.location.reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
}

const XODEON_PRODUCTS = [
  { title: 'Xodeon Cloud', url: 'https://xodeon-cloud-backend--gamerdu54n2.replit.app/login', icon: Cloud },
];

const MOBILE_NAV = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Berichten', url: '/berichten', icon: MessageCircle },
  { title: 'Groepen', url: '/groepen', icon: Users },
  { title: 'Producten', url: '__products__', icon: Package },
  { title: 'Meer', url: '__more__', icon: Menu },
];

const MORE_ITEMS = [
  { title: 'Bedrijven', url: '/organization', icon: Building2 },
  { title: 'Allianties', url: '/alliances', icon: Building2 },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Templates', url: '/templates', icon: LayoutDashboard },
  { title: 'API Data', url: '/xodeon-data', icon: Database },
  { title: 'Instellingen', url: '/settings', icon: Settings },
];

function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('user_roles').select('role').eq('user_id', session.user.id).in('role', ['admin', 'owner']).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session?.user?.id]);

  // Hide on editor/preview routes
  if (HIDE_AD_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[90] bg-black/50" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 left-2 right-2 rounded-xl border border-border/40 bg-background p-2 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-1">
              {MORE_ITEMS.map(item => (
                <button
                  key={item.url}
                  onClick={() => { navigate(item.url); setShowMore(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.url) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => { navigate('/admin'); setShowMore(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin') ? 'bg-destructive/10 text-destructive' : 'text-destructive/60 hover:text-destructive hover:bg-destructive/10'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products menu overlay */}
      {showProducts && (
        <div className="fixed inset-0 z-[90] bg-black/50" onClick={() => setShowProducts(false)}>
          <div
            className="absolute bottom-16 left-2 right-2 rounded-xl border border-border/40 bg-background p-2 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Xodeon Producten</p>
            {XODEON_PRODUCTS.map(product => (
              <button
                key={product.title}
                onClick={() => { window.open(product.url, '_blank'); setShowProducts(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              >
                <product.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{product.title}</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-border/30 bg-background/95 backdrop-blur-md lg:hidden safe-area-bottom">
        <div className="flex items-stretch justify-around h-14">
          {MOBILE_NAV.map(item => {
            const active = item.url === '__more__' ? showMore : item.url === '__products__' ? showProducts : isActive(item.url);
            return (
              <button
                key={item.url}
                onClick={() => {
                  if (item.url === '__more__') {
                    setShowMore(!showMore);
                    setShowProducts(false);
                  } else if (item.url === '__products__') {
                    setShowProducts(!showProducts);
                    setShowMore(false);
                  } else {
                    setShowMore(false);
                    setShowProducts(false);
                    navigate(item.url);
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const showAd = !HIDE_AD_ROUTES.some(r => location.pathname.startsWith(r));
  useAdminForceRefresh();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar only on lg+ */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 pb-16 lg:pb-0">
            {children}
          </div>
          {showAd && (
            <div className="hidden lg:block px-4 sm:px-6 pb-4 pt-2">
              <AdBanner />
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}
