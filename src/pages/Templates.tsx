import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Download, Plus, Trash2, Eye, EyeOff, Sparkles, LayoutGrid, Code, Gamepad2, ShoppingCart, BookOpen, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  ngc_code: string;
  author_id: string;
  category: string;
  downloads: number;
  is_published: boolean;
  visibility: string;
  created_at: string;
}

interface CategoryRow {
  id: string;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
}

// Fallback if DB categories haven't loaded yet
const FALLBACK_CATEGORIES = [
  { value: 'alle', label: 'Alle', icon: 'layout-grid' },
  { value: 'algemeen', label: 'Algemeen', icon: 'sparkles' },
  { value: 'game', label: 'Games', icon: 'gamepad-2' },
  { value: 'tool', label: 'Tools', icon: 'code' },
  { value: 'shop', label: 'Shops', icon: 'shopping-cart' },
  { value: 'educatie', label: 'Educatie', icon: 'book-open' },
];

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[pascalName];
  if (!IconComponent || typeof IconComponent !== 'function') return <Sparkles className={className} />;
  return <IconComponent className={className} />;
}

export default function Templates() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('alle');
  const [showMine, setShowMine] = useState(false);
  const [friends, setFriends] = useState<string[]>([]);
  const [userOrgs, setUserOrgs] = useState<string[]>([]);
  const [dbCategories, setDbCategories] = useState<CategoryRow[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createCategory, setCreateCategory] = useState('algemeen');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createVisibility, setCreateVisibility] = useState('public');
  const [creating, setCreating] = useState(false);

  const CATEGORIES = useMemo(() => {
    if (dbCategories.length === 0) return FALLBACK_CATEGORIES;
    return [
      { value: 'alle', label: 'Alle', icon: 'layout-grid' },
      ...dbCategories.map(c => ({ value: c.value, label: c.label, icon: c.icon })),
    ];
  }, [dbCategories]);

  useEffect(() => { loadTemplates(); loadRelations(); loadCategories(); }, [session?.user?.id]);

  async function loadCategories() {
    const { data } = await supabase.from('categories' as any).select('*').order('sort_order', { ascending: true });
    if (data) setDbCategories(data as any);
  }

  async function loadTemplates() {
    setLoading(true);
    const { data } = await supabase
      .from('templates' as any)
      .select('*')
      .order('downloads', { ascending: false });
    setTemplates((data as unknown as Template[]) || []);
    setLoading(false);
  }

  async function loadRelations() {
    if (!session?.user?.id) return;
    // Load friends
    const { data: friendData } = await supabase.from('friendships').select('sender_id, receiver_id').eq('status', 'accepted');
    const friendIds = (friendData || []).map(f => f.sender_id === session.user.id ? f.receiver_id : f.sender_id);
    setFriends(friendIds);
    // Load user's org author IDs
    const { data: orgMembers } = await supabase.from('organization_members').select('organization_id').eq('user_id', session.user.id);
    if (orgMembers && orgMembers.length > 0) {
      const orgIds = orgMembers.map(m => m.organization_id);
      const { data: coMembers } = await supabase.from('organization_members').select('user_id, organization_id').in('organization_id', orgIds);
      const orgUserIds = [...new Set((coMembers || []).map(m => m.user_id))];
      setUserOrgs(orgUserIds);
    }
  }

  const filtered = useMemo(() => {
    let result = templates;
    if (showMine && session?.user?.id) {
      result = result.filter(t => t.author_id === session.user.id);
    } else {
      result = result.filter(t => {
        // Own templates always visible
        if (t.author_id === session?.user?.id) return true;
        // Must be published
        if (!t.is_published) return false;
        // Visibility check
        const vis = (t as any).visibility || 'public';
        if (vis === 'public') return true;
        if (vis === 'friends' && friends.includes(t.author_id)) return true;
        if (vis === 'org' && userOrgs.includes(t.author_id)) return true;
        return false;
      });
    }
    if (category !== 'alle') {
      result = result.filter(t => t.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return result;
  }, [templates, search, category, showMine, session?.user?.id, friends, userOrgs]);

  async function useTemplate(template: Template) {
    if (!session?.user?.id) { navigate('/auth'); return; }
    // Create app from template
    const { data, error } = await supabase.from('apps').insert({
      owner_id: session.user.id,
      name: `${template.name} (kopie)`,
      ngc_code: template.ngc_code,
    }).select().single();

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }

    // Increment downloads
    await (supabase as any).rpc('increment_template_downloads', { template_id: template.id });
    toast({ title: 'Template geladen!', description: `"${template.name}" is aangemaakt als nieuwe app.` });
    navigate(`/editor/${data.id}`);
  }

  async function togglePublished(template: Template) {
    await supabase.from('templates' as any).update({ is_published: !template.is_published } as any).eq('id', template.id);
    setTemplates(ts => ts.map(t => t.id === template.id ? { ...t, is_published: !t.is_published } : t));
    toast({ title: template.is_published ? 'Template verborgen' : 'Template gepubliceerd' });
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return;
    await supabase.from('templates' as any).delete().eq('id', id);
    setTemplates(ts => ts.filter(t => t.id !== id));
    toast({ title: 'Template verwijderd' });
  }

  async function createTemplate() {
    if (!session?.user?.id) { navigate('/auth'); return; }
    if (!createName.trim()) { toast({ title: 'Vul een naam in', variant: 'destructive' }); return; }
    setCreating(true);
    const { error } = await supabase.from('templates' as any).insert({
      author_id: session.user.id,
      name: createName.trim(),
      description: createDescription.trim(),
      ngc_code: createCode,
      category: createCategory,
      visibility: createVisibility,
      is_published: false,
    } as any);
    setCreating(false);
    if (error) { toast({ title: 'Fout', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Template aangemaakt!', description: 'Je kunt hem nu bewerken en publiceren.' });
    setShowCreateDialog(false);
    setCreateName(''); setCreateDescription(''); setCreateCode('');
    loadTemplates();
  }

  function openCreateForCategory(catValue: string) {
    if (!session?.user?.id) { navigate('/auth'); return; }
    setCreateCategory(catValue === 'alle' ? 'algemeen' : catValue);
    setShowCreateDialog(true);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Create Template Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateDialog(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Nieuwe template</h2>
              <button onClick={() => setShowCreateDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Naam *</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Mijn template" className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Beschrijving</label>
                <textarea value={createDescription} onChange={e => setCreateDescription(e.target.value)} placeholder="Wat doet deze template?" rows={2} className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categorie</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter(c => c.value !== 'alle').map(cat => (
                    <button key={cat.value} onClick={() => setCreateCategory(cat.value)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${createCategory === cat.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}>
                      <LucideIcon name={cat.icon} className="h-3 w-3" />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Zichtbaarheid</label>
                <div className="flex gap-1.5">
                  {[{ v: 'public', l: '🌍 Publiek' }, { v: 'friends', l: '👥 Vrienden' }, { v: 'org', l: '🏢 Bedrijf' }].map(opt => (
                    <button key={opt.v} onClick={() => setCreateVisibility(opt.v)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${createVisibility === opt.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">NGC Code</label>
                <textarea value={createCode} onChange={e => setCreateCode(e.target.value)} placeholder="Plak hier je NGC code..." rows={4} className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <button onClick={createTemplate} disabled={creating} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {creating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/20 border-t-primary-foreground" /> : <Plus className="h-4 w-4" />}
                Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="lg:hidden border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground">Template Marketplace</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Ontdek en deel NGC templates</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Zoek templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/40 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {session?.user?.id && (
            <button
              onClick={() => setShowMine(!showMine)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                showMine ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              Mijn templates
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  category === cat.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <LucideIcon name={cat.icon} className="h-3.5 w-3.5" />
                {cat.label}
              </button>
              {session?.user?.id && (
                <button
                  onClick={() => openCreateForCategory(cat.value)}
                  className="p-1 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
                  title={`Nieuwe ${cat.label} template`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Templates grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm text-muted-foreground">Geen templates gevonden.</p>
            {showMine && (
              <p className="text-xs text-muted-foreground/60 mt-1">Publiceer een app als template vanuit het dashboard.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(template => (
              <div
                key={template.id}
                className="group rounded-2xl border border-border/40 p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: 'hsl(var(--card))' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{template.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{template.description || 'Geen beschrijving'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0 capitalize">
                      {template.category}
                    </span>
                    {(template as any).visibility && (template as any).visibility !== 'public' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                        {(template as any).visibility === 'friends' ? '👥' : '🏢'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {template.downloads}
                    </span>
                    {!template.is_published && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Concept</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {template.author_id === session?.user?.id && (
                      <>
                        <button
                          onClick={() => togglePublished(template)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                          title={template.is_published ? 'Verbergen' : 'Publiceren'}
                        >
                          {template.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => useTemplate(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Gebruik
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
