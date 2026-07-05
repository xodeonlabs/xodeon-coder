import { useEffect, useState } from 'react';
import { UserCog, LogOut } from 'lucide-react';
import { getImpersonationInfo, stopImpersonation, type ImpersonationInfo } from '@/lib/impersonation';
import { toast } from '@/hooks/use-toast';

export function ImpersonationBanner() {
  const [info, setInfo] = useState<ImpersonationInfo | null>(() => getImpersonationInfo());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = () => setInfo(getImpersonationInfo());
    window.addEventListener('storage', check);
    const iv = setInterval(check, 1500);
    return () => { window.removeEventListener('storage', check); clearInterval(iv); };
  }, []);

  if (!info) return null;

  const exit = async () => {
    setBusy(true);
    try {
      await stopImpersonation();
      setInfo(null);
      toast({ title: 'Terug naar admin account' });
      setTimeout(() => window.location.assign('/admin'), 300);
    } catch (e: any) {
      toast({ title: 'Kon niet terugkeren', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-orange-500/40 bg-gradient-to-r from-orange-500/90 to-amber-500/90 px-4 py-2 text-xs text-white shadow-md backdrop-blur-md">
      <div className="flex items-center gap-2 min-w-0">
        <UserCog className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Je bent ingelogd als <strong>{info.target_email}</strong>
          {info.admin_email && <span className="opacity-80"> · admin: {info.admin_email}</span>}
        </span>
      </div>
      <button
        onClick={exit}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1 font-semibold hover:bg-white/30 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" />
        {busy ? 'Bezig...' : 'Terugkeren'}
      </button>
    </div>
  );
}
