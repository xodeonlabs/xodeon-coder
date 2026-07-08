import { useEffect, useState, useCallback } from 'react';

export type AppMode = 'default' | 'developer' | 'gamer';

const KEY = 'app_mode_v1';
const EVENT = 'app-mode-changed';

export function getAppMode(): AppMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'developer' || v === 'gamer') return v;
  } catch { /* noop */ }
  return 'default';
}

export function setAppMode(mode: AppMode) {
  try {
    if (mode === 'default') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
  applyModeToDom(mode);
}

export function applyModeToDom(mode: AppMode) {
  const root = document.documentElement;
  root.classList.toggle('gamer-mode', mode === 'gamer');
  root.classList.toggle('developer-mode', mode === 'developer');
}

export function useAppMode(): [AppMode, (m: AppMode) => void] {
  const [mode, setMode] = useState<AppMode>(() => getAppMode());

  useEffect(() => {
    applyModeToDom(mode);
  }, [mode]);

  useEffect(() => {
    const onChange = () => setMode(getAppMode());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const update = useCallback((m: AppMode) => {
    setAppMode(m);
    setMode(m);
  }, []);

  return [mode, update];
}

/** Word swap for gamer mode. Applies only when mode === 'gamer'. */
const GAMER_WORDS_NL: Array<[RegExp, string]> = [
  [/\bDashboard\b/gi, 'Base'],
  [/\bBerichten\b/gi, 'Party Chat'],
  [/\bGroepen\b/gi, 'Squads'],
  [/\bBedrijf\b/gi, 'Guild'],
  [/\bOrganisatie\b/gi, 'Guild'],
  [/\bAllianties\b/gi, 'Clans'],
  [/\bAnalytics\b/gi, 'Stats'],
  [/\bTemplates\b/gi, 'Loadouts'],
  [/\bUpgrades\b/gi, 'Power-ups'],
  [/\bTutorial\b/gi, 'Training'],
  [/\bDevelopers\b/gi, 'Modders'],
  [/\bInstellingen\b/gi, 'Config'],
  [/\bProfiel\b/gi, 'Player Card'],
  [/\bcoins\b/gi, 'XP'],
  [/\bLaden\b/gi, 'Loading'],
];

export function gamerize(text: string, mode: AppMode): string {
  if (mode !== 'gamer' || !text) return text;
  let out = text;
  for (const [re, rep] of GAMER_WORDS_NL) out = out.replace(re, rep);
  return out;
}
