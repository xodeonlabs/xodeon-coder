import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCPreview } from '@/components/NGCPreview';
import { parseNGC } from '@/lib/ngc-parser';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

type DeviceMode = 'desktop' | 'tablet' | 'phone';

const DEVICES: { mode: DeviceMode; label: string; icon: typeof Monitor; width: number; frameW: number; frameH: number }[] = [
  { mode: 'phone', label: 'Telefoon', icon: Smartphone, width: 375, frameW: 395, frameH: 720 },
  { mode: 'tablet', label: 'Tablet', icon: Tablet, width: 768, frameW: 800, frameH: 600 },
  { mode: 'desktop', label: 'Desktop', icon: Monitor, width: 0, frameW: 0, frameH: 0 },
];

const Preview = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<DeviceMode>('desktop');

  useEffect(() => {
    if (!appId) return;
    const loadApp = () => {
      supabase.from('apps').select('ngc_code, organization_id').eq('id', appId).single().then(({ data }) => {
        setCode(data?.ngc_code || '');
        setOrgId((data as any)?.organization_id || null);
        setLoading(false);
      });
    };
    loadApp();

    // Auto-refresh when app is updated
    const channel = supabase
      .channel(`preview-${appId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'apps', filter: `id=eq.${appId}` }, (payload) => {
        const newCode = payload.new?.ngc_code;
        if (newCode && newCode !== code) {
          setCode(newCode);
          setOrgId(payload.new?.organization_id || null);
        }
      })
      .subscribe();

    // Admin force-refresh channel
    const refreshChannel = supabase
      .channel('admin-force-refresh')
      .on('broadcast', { event: 'force-refresh' }, () => {
        window.location.reload();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(refreshChannel);
    };
  }, [appId]);

  const { ast } = useMemo(() => parseNGC(code), [code]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><span className="text-sm text-muted-foreground">Laden...</span></div>;

  const isFramed = device !== 'desktop';
  const deviceConfig = DEVICES.find(d => d.mode === device)!;

  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-border" style={{ background: 'hsl(var(--ide-toolbar))' }}>
        <span className="text-xs font-medium text-foreground">Xodeon Preview</span>

        {/* Device switcher */}
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-0.5">
          {DEVICES.map(d => {
            const Icon = d.icon;
            return (
              <button
                key={d.mode}
                onClick={() => setDevice(d.mode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  device === d.mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={d.label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigate(`/editor/${appId}`)}
          className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 transition-colors"
        >
          ← Terug naar editor
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-start justify-center" style={{ background: isFramed ? 'hsl(var(--muted) / 0.3)' : undefined }}>
        {isFramed ? (
          <div className="my-6 flex flex-col items-center">
            {/* Device frame */}
            <div
              className="rounded-[2rem] border-[6px] border-foreground/10 bg-background shadow-2xl shadow-black/20 overflow-hidden relative"
              style={{ width: deviceConfig.frameW, height: deviceConfig.frameH }}
            >
              {/* Notch for phone */}
              {device === 'phone' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-foreground/10 rounded-b-2xl z-10" />
              )}
              <div className="w-full h-full overflow-auto">
                <div style={{ width: deviceConfig.width, minHeight: '100%' }}>
                  <NGCPreview ast={ast} organizationId={orgId} />
                </div>
              </div>
            </div>
            {/* Device label */}
            <span className="mt-3 text-[11px] text-muted-foreground">{deviceConfig.label} — {deviceConfig.width}px</span>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto">
            <NGCPreview ast={ast} organizationId={orgId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Preview;
