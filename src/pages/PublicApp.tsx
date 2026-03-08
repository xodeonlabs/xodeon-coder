import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NGCPreview } from '@/components/NGCPreview';
import { parseNGC } from '@/lib/ngc-parser';
import { AdBanner } from '@/components/AdBanner';
import { Pin, PinOff } from 'lucide-react';

const PublicApp = () => {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const [code, setCode] = useState('');
  const [appId, setAppId] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('apps')
      .select('id, ngc_code, name, organization_id')
      .eq('slug', slug)
      .eq('is_public', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setCode(data.ngc_code || '');
          setAppName(data.name);
          setAppId(data.id);
          setOrgId((data as any).organization_id || null);
          // Check if pinned
          if (session?.user?.id) {
            supabase.from('pinned_apps' as any).select('id').eq('user_id', session.user.id).eq('app_id', data.id).maybeSingle().then(({ data: pin }) => {
              setIsPinned(!!pin);
            });
          }
          // Record page view
          supabase.from('app_views').insert({
            app_id: data.id,
            referrer: document.referrer || null,
          }).then(() => {});
        }
        setLoading(false);
      });
  }, [slug, session?.user?.id]);

  const togglePin = async () => {
    if (!session?.user?.id || !appId) return;
    if (isPinned) {
      await supabase.from('pinned_apps' as any).delete().eq('user_id', session.user.id).eq('app_id', appId);
      setIsPinned(false);
      window.dispatchEvent(new Event('pinned-apps-changed'));
    } else {
      const { data: existing } = await supabase.from('pinned_apps' as any).select('id').eq('user_id', session.user.id);
      if (existing && (existing as any[]).length >= 3) return;
      await supabase.from('pinned_apps' as any).insert({ user_id: session.user.id, app_id: appId, sort_order: (existing as any[])?.length || 0 } as any);
      setIsPinned(true);
      window.dispatchEvent(new Event('pinned-apps-changed'));
    }
  };

  const { ast } = useMemo(() => parseNGC(code), [code]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0f172a' }}>
        <span className="text-sm text-muted-foreground">Laden...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-foreground mb-2">App niet gevonden</h1>
          <p className="text-sm text-muted-foreground">Deze app bestaat niet of is niet publiek.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen" style={{ background: '#0f172a' }}>
      <div
        className="flex items-center justify-between px-4 h-10 shrink-0"
        style={{ background: 'hsl(var(--ide-toolbar))', borderBottom: '1px solid hsl(var(--border))' }}
      >
        <span className="text-xs font-medium text-foreground">{appName}</span>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-sm overflow-hidden shrink-0"><img src="/ngc-logo.png" alt="NGC" className="h-full w-full object-cover" /></div>
          <span className="text-[10px] text-muted-foreground">NGC Studio</span>
        </div>
      </div>
      {orgId && (
        <div className="px-4 py-2 shrink-0">
          <AdBanner page="public" organizationId={orgId} />
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <NGCPreview ast={ast} organizationId={orgId} />
      </div>
    </div>
  );
};

export default PublicApp;
