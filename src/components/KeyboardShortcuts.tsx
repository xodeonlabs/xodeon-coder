import { X, Keyboard } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export function KeyboardShortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  if (!open) return null;

  const SHORTCUT_GROUPS = [
    {
      title: `📁 ${t('editor.groupFiles')}`,
      shortcuts: [
        { keys: ['Ctrl', 'S'], description: t('editor.scSave') },
        { keys: ['Ctrl', 'N'], description: t('editor.scNewApp') },
      ],
    },
    {
      title: `🔍 ${t('editor.groupSearch')}`,
      shortcuts: [
        { keys: ['Ctrl', 'K'], description: t('editor.scPalette') },
        { keys: ['Ctrl', 'F'], description: t('editor.scFind') },
        { keys: ['Ctrl', 'H'], description: t('editor.scReplace') },
      ],
    },
    {
      title: `✏️ ${t('editor.groupEdit')}`,
      shortcuts: [
        { keys: ['Ctrl', 'Z'], description: t('editor.scUndo') },
        { keys: ['Tab'], description: t('editor.scIndent') },
        { keys: ['Delete'], description: t('editor.scDelete') },
      ],
    },
    {
      title: `🖥️ ${t('editor.groupView')}`,
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'L'], description: t('editor.scTheme') },
        { keys: ['Ctrl', '?'], description: t('editor.scShortcuts') },
        { keys: ['Esc'], description: t('editor.scZenClose') },
      ],
    },
    {
      title: `📌 ${t('editor.groupPanels')}`,
      shortcuts: [
        { keys: ['Ctrl', '1'], description: t('editor.scExplorer') },
        { keys: ['Ctrl', '2'], description: t('editor.scVersions') },
        { keys: ['Ctrl', '3'], description: t('editor.scData') },
        { keys: ['Ctrl', '4'], description: t('editor.scChat') },
        { keys: ['Ctrl', '5'], description: t('editor.scComponents') },
        { keys: ['Ctrl', '6'], description: t('editor.scAI') },
        { keys: ['Ctrl', '7'], description: t('editor.scProperties') },
        { keys: ['Ctrl', '8'], description: t('editor.scPreview') },
      ],
    },
  ];

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
            <h2 className="text-lg font-bold text-foreground">{t('editor.shortcuts')}</h2>
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
            {t('editor.pressEscToClose')}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
