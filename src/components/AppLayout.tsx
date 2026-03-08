import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Menu } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar only on lg+ */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
