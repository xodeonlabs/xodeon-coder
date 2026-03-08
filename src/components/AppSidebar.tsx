import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, BarChart3, Building2, Handshake, Users,
  MessageCircle, LayoutGrid, Settings, Shield, LogOut, Coins,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { ProfileAvatar } from '@/components/ProfileAvatar';

const NAV_ITEMS = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Berichten', url: '/berichten', icon: MessageCircle },
  { title: 'Groepen', url: '/groepen', icon: Users },
  { title: 'Bedrijven', url: '/organization', icon: Building2 },
  { title: 'Allianties', url: '/alliances', icon: Handshake },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Templates', url: '/templates', icon: LayoutGrid },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const [isAdmin, setIsAdmin] = useState(false);
  const [coins, setCoins] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
    supabase.from('user_coins').select('balance').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setCoins((data as any)?.balance ?? 0));
    supabase.from('profiles').select('display_name, username').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if ((data as any)?.username) setProfileUsername((data as any).username);
      });
  }, [session?.user?.id]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30">
      <SidebarContent className="pt-3">
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 py-3 mb-2 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-primary/10 shrink-0 overflow-hidden">
            <img src="/ngc-logo.png" alt="NGC" className="h-full w-full object-cover rounded-xl" />
          </div>
          {!collapsed && <span className="text-base font-bold text-foreground font-display tracking-tight">NGC Studio</span>}
        </div>

        {/* Coins */}
        <div className={`mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5 border border-accent/10 ${collapsed ? 'justify-center mx-1 px-1' : ''}`}>
          <Coins className="h-4 w-4 text-accent shrink-0" />
          {!collapsed && <span className="text-xs font-semibold text-accent tabular-nums">{coins} coins</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? '' : 'Navigatie'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <button
                      onClick={() => navigate(item.url)}
                      className={`flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive(item.url)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin')}
                    tooltip={collapsed ? 'Admin' : undefined}
                  >
                    <button
                      onClick={() => navigate('/admin')}
                      className={`flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive('/admin')
                          ? 'bg-destructive/10 text-destructive'
                          : 'text-destructive/60 hover:text-destructive hover:bg-destructive/10'
                      }`}
                    >
                      <Shield className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Admin</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/20 p-3">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'flex-col' : ''}`}>
          <div
            onClick={() => navigate(`/profiel/${profileUsername || session?.user?.id}`)}
            className="cursor-pointer shrink-0"
          >
            <ProfileAvatar size="sm" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{displayName || session?.user?.email}</p>
              {profileUsername && <p className="text-[10px] text-muted-foreground truncate">@{profileUsername}</p>}
            </div>
          )}
          <div className={`flex ${collapsed ? 'flex-col' : ''} gap-1`}>
            <button
              onClick={() => navigate('/settings')}
              className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all ${isActive('/settings') ? 'text-primary bg-primary/10' : ''}`}
              title="Instellingen"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Uitloggen"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
