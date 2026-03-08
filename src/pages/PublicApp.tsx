import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCPreview } from '@/components/NGCPreview';
import { parseNGC } from '@/lib/ngc-parser';

const PublicApp = () => {
  const { slug } = useParams<{ slug: string }>();
  const [code, setCode] = useState('');
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('apps')
      .select('ngc_code, name')
      .eq('slug', slug)
      .eq('is_public', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setCode(data.ngc_code || '');
          setAppName(data.name);
        }
        setLoading(false);
      });
  }, [slug]);

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
        <span className="text-[10px] text-muted-foreground">Gemaakt met NGC Studio</span>
      </div>
      <div className="flex-1 overflow-auto">
        <NGCPreview ast={ast} />
      </div>
    </div>
  );
};

export default PublicApp;
