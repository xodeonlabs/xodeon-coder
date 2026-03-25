import { useMemo } from 'react';
import { Clock, FileCode, Hash, Type, Lightbulb } from 'lucide-react';

const TIPS = [
  '💡 Tip: Gebruik Ctrl+K om het commandopalet te openen',
  '💡 Tip: Swipe om panelen in/uit te klappen',
  '💡 Tip: Gebruik Coins() in tekst om saldo te tonen',
  '💡 Tip: Ctrl+S om direct op te slaan',
  '💡 Tip: Klik op Zen mode voor afleiding-vrij coderen',
  '💡 Tip: Var(naam) in tekst wordt automatisch vervangen',
  '💡 Tip: Gebruik Data.Add() om records op te slaan',
  '💡 Tip: Deel je app als template via de toolbar',
];

interface StatusBarProps {
  code: string;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  lastSaved: Date | null;
  typingUsers?: { id: string; email: string }[];
}

export function StatusBar({ code, saveStatus, lastSaved, typingUsers = [] }: StatusBarProps) {
  const lines = code.split('\n').length;
  const chars = code.length;

  const componentCount = useMemo(() => {
    const matches = code.match(/^\s*(Button|Text|TextBox|Image|Frame)\s/gm);
    return matches?.length ?? 0;
  }, [code]);

  const pageCount = useMemo(() => {
    const matches = code.match(/^\s*Page\s/gm);
    return matches?.length ?? 0;
  }, [code]);

  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  const saveLabel = saveStatus === 'saved'
    ? `✓ Opgeslagen${lastSaved ? ` ${lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : ''}`
    : saveStatus === 'saving' ? '⏳ Opslaan...' : '● Niet opgeslagen';

  return (
    <div
      className="flex items-center justify-between px-3 h-7 text-[10px] font-mono shrink-0 select-none mx-1.5 mb-1.5 rounded-lg border border-border/30 backdrop-blur-xl shadow-sm shadow-black/5"
      style={{ background: 'hsl(var(--ide-toolbar) / 0.4)' }}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>{lines} regels</span>
        <span>{chars} tekens</span>
        <span>{pageCount} pagina's</span>
        <span>{componentCount} componenten</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        {typingUsers.length > 0 && (
          <span className="flex items-center gap-1 text-primary animate-pulse">
            <span className="inline-flex gap-[2px]">
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {typingUsers.length === 1
              ? `${typingUsers[0].email.split('@')[0]} typt...`
              : `${typingUsers.length} gebruikers typen...`}
          </span>
        )}
        <span className="hidden md:inline truncate max-w-[200px]">{tip}</span>
        <span className={saveStatus === 'saved' ? 'text-[hsl(var(--ide-success))]' : saveStatus === 'saving' ? 'text-primary' : 'text-destructive'}>
          {saveLabel}
        </span>
      </div>
    </div>
  );
}
