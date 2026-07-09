import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppMode, type AppMode } from '@/hooks/useAppMode';
import { useLocation } from 'react-router-dom';

const RERENDER_EVENT = 'site-customization-changed';

export type ColorMap = Record<string, string>; // CSS var name (without --) -> HSL triple "H S% L%"
export type WordMap = Record<string, string>;  // source -> replacement (case-insensitive whole word)

export interface SiteCustomization {
  mode: AppMode;
  colors: ColorMap;
  word_overrides: WordMap;
}

// Editable CSS design tokens (HSL H S% L%). Keep this list short & meaningful.
export const CUSTOMIZABLE_TOKENS: Array<{ key: string; label: string }> = [
  { key: 'background', label: 'Achtergrond' },
  { key: 'foreground', label: 'Tekst' },
  { key: 'primary', label: 'Primair' },
  { key: 'primary-foreground', label: 'Primair tekst' },
  { key: 'secondary', label: 'Secundair' },
  { key: 'accent', label: 'Accent' },
  { key: 'muted', label: 'Gedempt' },
  { key: 'card', label: 'Kaart' },
  { key: 'border', label: 'Rand' },
  { key: 'destructive', label: 'Destructief' },
];

const cache: Record<AppMode, SiteCustomization | null> = {
  default: null, developer: null, gamer: null,
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach(fn => fn());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RERENDER_EVENT));
  }
}

let loaded = false;
let loading: Promise<void> | null = null;

async function loadAll() {
  if (loaded) return;
  if (loading) return loading;
  loading = (async () => {
    const { data } = await supabase.from('site_customizations').select('*');
    if (data) {
      for (const row of data as any[]) {
        cache[row.mode as AppMode] = {
          mode: row.mode,
          colors: row.colors || {},
          word_overrides: row.word_overrides || {},
        };
      }
    }
    loaded = true;
    emit();
  })();
  return loading;
}

// Realtime updates
let subscribed = false;
function subscribe() {
  if (subscribed) return;
  subscribed = true;
  supabase
    .channel('site_customizations_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_customizations' }, (payload: any) => {
      const row = payload.new || payload.old;
      if (!row?.mode) return;
      if (payload.eventType === 'DELETE') {
        cache[row.mode as AppMode] = null;
      } else {
        cache[row.mode as AppMode] = {
          mode: row.mode,
          colors: row.colors || {},
          word_overrides: row.word_overrides || {},
        };
      }
      emit();
    })
    .subscribe();
}

const EDITOR_ROUTES = ['/editor', '/preview'];

function applyColors(colors: ColorMap) {
  const root = document.documentElement;
  // Remove previously injected style
  const existing = document.getElementById('site-custom-colors');
  if (existing) existing.remove();
  if (!colors || Object.keys(colors).length === 0) return;
  const style = document.createElement('style');
  style.id = 'site-custom-colors';
  const lines = Object.entries(colors)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([k, v]) => `--${k}: ${v};`)
    .join(' ');
  style.textContent = `:root { ${lines} } .dark { ${lines} }`;
  document.head.appendChild(style);
  void root.offsetHeight;
}

export function useSiteCustomization() {
  const [mode] = useAppMode();
  const [, force] = useState(0);
  const location = useLocation();

  useEffect(() => {
    loadAll();
    subscribe();
    const fn = () => force(x => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const inEditor = EDITOR_ROUTES.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    if (inEditor) {
      applyColors({}); // reset in editor
      return;
    }
    const c = cache[mode]?.colors || {};
    applyColors(c);
  }, [mode, inEditor, loaded]);

  return { data: cache[mode], allLoaded: loaded };
}

/** Apply word overrides to a translated string. No-op in editor routes. */
export function applyWordOverrides(text: string, mode: AppMode): string {
  if (!text) return text;
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (EDITOR_ROUTES.some(r => path.startsWith(r))) return text;
  const map = cache[mode]?.word_overrides;
  if (!map) return text;
  let out = text;
  for (const [src, dst] of Object.entries(map)) {
    if (!src || !dst) continue;
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), dst);
  }
  return out;
}

export function getCustomizationCache() { return cache; }
export async function ensureCustomizationLoaded() { await loadAll(); }
