import { X, Keyboard } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '📁 Bestanden',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Opslaan' },
      { keys: ['Ctrl', 'N'], description: 'Nieuwe app' },
    ],
  },
  {
    title: '🔍 Zoeken',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Commandopalet' },
      { keys: ['Ctrl', 'F'], description: 'Zoeken' },
      { keys: ['Ctrl', 'H'], description: 'Zoeken & vervangen' },
    ],
  },
  {
    title: '✏️ Bewerken',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Ongedaan maken' },
      { keys: ['Tab'], description: 'Inspringen' },
      { keys: ['Delete'], description: 'Element verwijderen' },
    ],
  },
  {
    title: '🖥️ Weergave',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'L'], description: 'Light/Dark mode wisselen' },
      { keys: ['Ctrl', '?'], description: 'Sneltoetsen tonen' },
      { keys: ['Esc'], description: 'Zen mode sluiten' },
    ],
  },
];

export function KeyboardShortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-scale-in"
        style={{ background: 'hsl(var(--card))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Sneltoetsen</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.title}</h3>
              <div className="space-y-2">
                {group.shortcuts.map(s => (
                  <div key={s.description} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map(key => (
                        <kbd
                          key={key}
                          className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md border border-border/50 text-muted-foreground"
                          style={{ background: 'hsl(var(--muted))' }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-border/30 text-center">
          <span className="text-[11px] text-muted-foreground">
            Druk op <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-border/50" style={{ background: 'hsl(var(--muted))' }}>Esc</kbd> om te sluiten
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
