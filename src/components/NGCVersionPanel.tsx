import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { History, RotateCcw, Save, Trash2, X } from 'lucide-react';

interface Version {
  id: string;
  label: string;
  ngc_code: string;
  created_at: string;
  created_by: string;
}

interface NGCVersionPanelProps {
  appId: string;
  currentCode: string;
  onRestore: (code: string) => void;
}

export function NGCVersionPanel({ appId, currentCode, onRestore }: NGCVersionPanelProps) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    const { data } = await supabase
      .from('app_versions')
      .select('id, label, ngc_code, created_at, created_by')
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(50);
    setVersions((data as Version[]) || []);
    setLoading(false);
  }, [appId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const saveVersion = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    const { error } = await supabase.from('app_versions').insert({
      app_id: appId,
      label: label.trim() || `${t('editor.versions.defaultLabel')} ${new Date().toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      ngc_code: currentCode,
      created_by: session.user.id,
    });
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('editor.versions.saved') });
      setLabel('');
      setShowSaveForm(false);
      fetchVersions();
    }
    setSaving(false);
  };

  const restoreVersion = (version: Version) => {
    onRestore(version.ngc_code);
    toast({ title: t('editor.versions.restored'), description: t('editor.versions.restoredDesc', { label: version.label }) });
  };

  const deleteVersion = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('app_versions').delete().eq('id', id);
    if (!error) {
      setVersions(v => v.filter(ver => ver.id !== id));
      if (previewId === id) setPreviewId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  const previewVersion = versions.find(v => v.id === previewId);

  return (
    <div className="flex flex-col h-full">
      <div className="ide-panel-header justify-between">
        <span className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          {t('editor.versions.title')}
        </span>
        <button
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Save className="h-3 w-3" />
          {t('editor.versions.save')}
        </button>
      </div>

      {showSaveForm && (
        <div className="p-2.5 border-b border-border space-y-2" style={{ background: 'hsl(var(--ide-explorer-bg))' }}>
          <input
            type="text"
            placeholder={t('editor.versions.labelPlaceholder')}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveVersion()}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            autoFocus
          />
          <div className="flex gap-1.5">
            <button onClick={saveVersion} disabled={saving}
              className="flex-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium py-1.5 hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
            >
              {saving ? t('editor.versions.saving') : t('editor.versions.saveSnapshot')}
            </button>
            <button onClick={() => { setShowSaveForm(false); setLabel(''); }}
              className="rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">{t('editor.versions.empty')}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{t('editor.versions.emptyHint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`group px-3 py-2.5 cursor-pointer transition-colors hover:bg-secondary/30 ${
                  previewId === version.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
                onClick={() => setPreviewId(previewId === version.id ? null : version.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{version.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(version.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); restoreVersion(version); }}
                      className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                      title={t('editor.versions.restore')}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => deleteVersion(version.id, e)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title={t('editor.versions.remove')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewVersion && (
        <div className="border-t border-border" style={{ background: 'hsl(var(--ide-editor-bg))' }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
            <span className="text-[10px] text-muted-foreground font-medium truncate">{t('editor.versions.preview')}: {previewVersion.label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => restoreVersion(previewVersion)}
                className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
              >
                {t('editor.versions.restoreShort')}
              </button>
              <button onClick={() => setPreviewId(null)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <pre className="p-2.5 text-[10px] font-mono text-muted-foreground overflow-auto max-h-32 leading-relaxed">
            {previewVersion.ngc_code.slice(0, 500)}{previewVersion.ngc_code.length > 500 ? '...' : ''}
          </pre>
        </div>
      )}
    </div>
  );
}
