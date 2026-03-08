import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileCode, MousePointer, Code, Zap } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: JSX.Element;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => (i + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => (i - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      filtered[selectedIdx].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIdx, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Zoek commando's, pagina's..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">ESC</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Geen resultaten</div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                i === selectedIdx ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
              onClick={() => { item.action(); onClose(); }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="shrink-0 opacity-70">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              <span className="text-[10px] text-muted-foreground/60">{item.category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
