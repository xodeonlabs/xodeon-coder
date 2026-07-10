import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { UsernameGate } from "@/components/UsernameGate";
import { usePresence } from "@/hooks/usePresence";
import { AppLayout } from "@/components/AppLayout";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { SiteCustomizationApplier } from "@/components/SiteCustomizationApplier";
import { KonamiEasterEgg } from "@/components/KonamiEasterEgg";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Organization from "./pages/Organization";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Preview from "./pages/Preview";
import Guest from "./pages/Guest";
import PublicApp from "./pages/PublicApp";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import Alliances from "./pages/Alliances";
import Profile from "./pages/Profile";
import OrgProfile from "./pages/OrgProfile";
import NotFound from "./pages/NotFound";
import FriendChat from "./pages/FriendChat";
import GroupChats from "./pages/GroupChats";
import Upgrades from "./pages/Upgrades";
import XodeonData from "./pages/XodeonData";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Welcome from "./pages/Welcome";
import Developers from "./pages/Developers";
import Tutorial from "./pages/Tutorial";
import OAuthAuthorize from "./pages/OAuthAuthorize";
import AdminCustomize from "./pages/AdminCustomize";
import AdminConnections from "./components/AdminConnections";
import { AppLayout as _AppLayout } from "@/components/AppLayout";
import { applyModeToDom, getAppMode } from "@/hooks/useAppMode";

// Apply saved mode class as early as possible
applyModeToDom(getAppMode());

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  usePresence();
  if (loading) return <div className="flex h-screen items-center justify-center" style={{ background: '#0a0e1a' }}><span className="text-sm text-muted-foreground">Laden...</span></div>;
  if (!session) return <Navigate to="/welcome" replace />;
  return (
    <UsernameGate userId={session.user.id}>
      <AppLayout>{children}</AppLayout>
    </UsernameGate>
  );
}

function ProtectedPreview() {
  const { session, loading } = useAuth();
  usePresence();
  if (loading) return <div className="flex h-screen items-center justify-center" style={{ background: '#0a0e1a' }}><span className="text-sm text-muted-foreground">Laden...</span></div>;
  if (!session) return <Navigate to="/welcome" replace />;
  return (
    <UsernameGate userId={session.user.id}>
      <Preview />
    </UsernameGate>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <KonamiEasterEgg />
      <BrowserRouter>
        <SiteCustomizationApplier />
        <ImpersonationBanner />
        <Routes>
          <Route path="/admin/customize" element={<ProtectedRoute><AdminCustomize /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/guest" element={<Guest />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/developers" element={<ProtectedRoute><Developers /></ProtectedRoute>} />
          <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
          <Route path="/admin/connections" element={<ProtectedRoute><div className="p-6 max-w-5xl mx-auto"><AdminConnections /></div></ProtectedRoute>} />
          <Route path="/organization" element={<ProtectedRoute><Organization /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/alliances" element={<ProtectedRoute><Alliances /></ProtectedRoute>} />
          <Route path="/editor/:appId" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/preview/:appId" element={<ProtectedPreview />} />
          <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/berichten" element={<ProtectedRoute><FriendChat /></ProtectedRoute>} />
          <Route path="/groepen" element={<ProtectedRoute><GroupChats /></ProtectedRoute>} />
          <Route path="/upgrades" element={<ProtectedRoute><Upgrades /></ProtectedRoute>} />
          <Route path="/xodeon-data" element={<ProtectedRoute><XodeonData /></ProtectedRoute>} />
          <Route path="/app/:slug" element={<PublicApp />} />
          <Route path="/profiel/:username" element={<Profile />} />
          <Route path="/bedrijf/:orgId" element={<OrgProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
