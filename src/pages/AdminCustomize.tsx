import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Save, Plus, Trash2, RotateCcw, Palette, Type } from 'lucide-react';
import { CUSTOMIZABLE_TOKENS, type ColorMap, type WordMap } from '@/hooks/useSiteCustomization';
import { GAMER_WORD_MAP, type AppMode } from '@/hooks/useAppMode';

type Row = { mode: AppMode; colors: ColorMap; word_overrides: WordMap };

const MODES: AppMode[] = ['default', 'developer', 'gamer'];
const MODE_LABELS: Record<AppMode, string> = {
  default: 'Standaard',
  developer: 'Developer',
  gamer: 'Gamer',
};

// HSL "H S% L%" <-> hex
function hslToHex(hsl: string): string {
  const m = hsl.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return '#000000';
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const mm = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  const hp = h * 6;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  const m = hex.replace('#', '').match(/^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return '0 0% 0%';
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function readCssVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return v || '0 0% 0%';
}

export default function AdminCustomize() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Record<AppMode, Row>>({
    default: { mode: 'default', colors: {}, word_overrides: {} },
    developer: { mode: 'developer', colors: {}, word_overrides: {} },
    gamer: { mode: 'gamer', colors: {}, word_overrides: {} },
  });
  const [saving, setSaving] = useState<AppMode | null>(null);
  const [activeMode, setActiveMode] = useState<AppMode>('default');

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('user_roles').select('role').eq('user_id', session.user.id).in('role', ['admin', 'owner']).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session?.user?.id]);

  useEffect(() => {
    supabase.from('site_customizations').select('*').then(({ data }) => {
      if (!data) return;
      const next = { ...rows };
      for (const r of data as any[]) {
        next[r.mode as AppMode] = {
          mode: r.mode,
          colors: r.colors || {},
          word_overrides: r.word_overrides || {},
        };
      }
      setRows(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = rows[activeMode];

  function setColor(key: string, hex: string) {
    const hsl = hexToHsl(hex);
    setRows(prev => ({
      ...prev,
      [activeMode]: { ...prev[activeMode], colors: { ...prev[activeMode].colors, [key]: hsl } },
    }));
  }

  function resetColor(key: string) {
    setRows(prev => {
      const c = { ...prev[activeMode].colors };
      delete c[key];
      return { ...prev, [activeMode]: { ...prev[activeMode], colors: c } };
    });
  }

  function addWord() {
    setRows(prev => ({
      ...prev,
      [activeMode]: { ...prev[activeMode], word_overrides: { ...prev[activeMode].word_overrides, '': '' } },
    }));
  }

  function setWord(oldKey: string, newKey: string, value: string) {
    setRows(prev => {
      const w: WordMap = {};
      for (const [k, v] of Object.entries(prev[activeMode].word_overrides)) {
        if (k === oldKey) w[newKey] = value;
        else w[k] = v;
      }
      if (!(newKey in w)) w[newKey] = value;
      return { ...prev, [activeMode]: { ...prev[activeMode], word_overrides: w } };
    });
  }

  function removeWord(key: string) {
    setRows(prev => {
      const w = { ...prev[activeMode].word_overrides };
      delete w[key];
      return { ...prev, [activeMode]: { ...prev[activeMode], word_overrides: w } };
    });
  }

  async function save() {
    setSaving(activeMode);
    // Strip empty word keys
    const cleanWords: WordMap = {};
    for (const [k, v] of Object.entries(current.word_overrides)) {
      if (k.trim() && v.trim()) cleanWords[k.trim()] = v.trim();
    }
    const { error } = await supabase.from('site_customizations').upsert({
      mode: activeMode,
      colors: current.colors,
      word_overrides: cleanWords,
      updated_by: session?.user?.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'mode' });
    setSaving(null);
    if (error) {
      toast({ title: 'Opslaan mislukt', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Opgeslagen', description: `Aanpassingen voor ${MODE_LABELS[activeMode]} zijn live.` });
    }
  }

  if (isAdmin === null) return <div className="p-6 text-sm text-muted-foreground">Laden…</div>;
  if (!isAdmin) return <div className="p-6 text-sm">Geen toegang.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Site aanpassen</h1>
          <p className="text-sm text-muted-foreground">Kleuren en woorden per modus — geldt overal behalve de editor.</p>
        </div>
      </div>

      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as AppMode)}>
        <TabsList>
          {MODES.map(m => <TabsTrigger key={m} value={m}>{MODE_LABELS[m]}</TabsTrigger>)}
        </TabsList>

        {MODES.map(m => (
          <TabsContent key={m} value={m} className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Kleuren</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {CUSTOMIZABLE_TOKENS.map(tok => {
                  const override = rows[m].colors[tok.key];
                  const effective = override || readCssVar(tok.key);
                  const hex = hslToHex(effective);
                  return (
                    <div key={tok.key} className="flex items-center gap-3 p-2 rounded-lg border border-border/40">
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => setColor(tok.key, e.target.value)}
                        className="h-10 w-14 rounded cursor-pointer bg-transparent"
                        aria-label={tok.label}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{tok.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate font-mono">--{tok.key}: {override || '(default)'}</div>
                      </div>
                      {override && (
                        <Button size="icon" variant="ghost" onClick={() => resetColor(tok.key)} title="Terug naar standaard">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Type className="h-4 w-4" /> Woorden vervangen</CardTitle>
                <Button size="sm" variant="outline" onClick={addWord}><Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Vervangt hele woorden (hoofdletterongevoelig) in álle UI-teksten van deze modus. Bv: "Dashboard" → "Startpagina".
                </p>
                {Object.entries(rows[m].word_overrides).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nog geen vervangingen.</p>
                )}
                {Object.entries(rows[m].word_overrides).map(([k, v], i) => (
                  <div key={`${i}-${k}`} className="flex items-center gap-2">
                    <Input
                      placeholder="origineel woord"
                      defaultValue={k}
                      onBlur={(e) => setWord(k, e.target.value, v)}
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      placeholder="vervanging"
                      value={v}
                      onChange={(e) => setWord(k, k, e.target.value)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeWord(k)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {m === 'gamer' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Type className="h-4 w-4" /> Standaard gamer-woordenlijst</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Ingebouwde mappings die automatisch toegepast worden in Gamer-modus. Alles wat níet in deze lijst of in jouw overrides staat, blijft zijn originele tekst (fallback). Overrides hierboven winnen altijd van deze lijst.
                  </p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-1 max-h-72 overflow-auto rounded-lg border border-border/40 p-2">
                    {Object.entries(GAMER_WORD_MAP).map(([src, dst]) => {
                      const overridden = Object.keys(rows.gamer.word_overrides).some(k => k.toLowerCase() === src.toLowerCase());
                      return (
                        <div key={src} className={`text-[11px] font-mono flex items-center gap-1 px-2 py-1 rounded ${overridden ? 'opacity-40 line-through' : ''}`}>
                          <span className="truncate">{src}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="truncate text-primary">{dst}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {Object.keys(GAMER_WORD_MAP).length} ingebouwde termen. Doorgestreept = door jouw override vervangen.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving === m}>
                <Save className="h-4 w-4 mr-1.5" />
                {saving === m ? 'Opslaan…' : `Opslaan (${MODE_LABELS[m]})`}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
