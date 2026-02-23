import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCPreview } from '@/components/NGCPreview';
import { parseNGC } from '@/lib/ngc-parser';

const Preview = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId) return;
    supabase.from('apps').select('ngc_code').eq('id', appId).single().then(({ data }) => {
      setCode(data?.ngc_code || '');
      setLoading(false);
    });
  }, [appId]);

  const { ast } = useMemo(() => parseNGC(code), [code]);

  if (loading) return <div className="flex h-screen items-center justify-center" style={{ background: '#0f172a' }}><span className="text-sm text-muted-foreground">Laden...</span></div>;

  return (
    <div className="flex flex-col h-screen w-screen" style={{ background: '#0f172a' }}>
      <div className="flex items-center justify-between px-4 h-10 shrink-0" style={{ background: 'hsl(var(--ide-toolbar))', borderBottom: '1px solid hsl(var(--border))' }}>
        <span className="text-xs font-medium text-foreground">NGC Preview</span>
        <button
          onClick={() => navigate(`/editor/${appId}`)}
          className="text-xs px-3 py-1 rounded text-muted-foreground hover:text-foreground bg-secondary transition-colors"
        >
          ← Terug naar editor
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <NGCPreview ast={ast} />
      </div>
    </div>
  );
};

export default Preview;
