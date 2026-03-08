import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp, CaseSensitive, Regex } from 'lucide-react';

interface SearchReplaceProps {
  open: boolean;
  onClose: () => void;
  code: string;
  onCodeChange: (code: string) => void;
  /** If true, show replace fields */
  showReplace?: boolean;
}

export function SearchReplace({ open, onClose, code, onCodeChange, showReplace: initialShowReplace }: SearchReplaceProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(initialShowReplace ?? false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchIdx, setMatchIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setShowReplace(initialShowReplace ?? false);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, initialShowReplace]);

  const getMatches = useCallback((): { index: number; length: number }[] => {
    if (!query) return [];
    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const re = new RegExp(query, flags);
        const matches: { index: number; length: number }[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(code)) !== null) {
          matches.push({ index: m.index, length: m[0].length });
          if (m[0].length === 0) re.lastIndex++; // prevent infinite loop
        }
        return matches;
      } else {
        const searchText = caseSensitive ? query : query.toLowerCase();
        const codeText = caseSensitive ? code : code.toLowerCase();
        const matches: { index: number; length: number }[] = [];
        let pos = 0;
        while (pos < codeText.length) {
          const idx = codeText.indexOf(searchText, pos);
          if (idx === -1) break;
          matches.push({ index: idx, length: query.length });
          pos = idx + 1;
        }
        return matches;
      }
    } catch {
      return [];
    }
  }, [query, code, caseSensitive, useRegex]);

  const matches = getMatches();
  const total = matches.length;

  useEffect(() => {
    if (matchIdx >= total) setMatchIdx(Math.max(0, total - 1));
  }, [total, matchIdx]);

  const goNext = () => setMatchIdx(i => (i + 1) % Math.max(total, 1));
  const goPrev = () => setMatchIdx(i => (i - 1 + total) % Math.max(total, 1));

  const replaceOne = useCallback(() => {
    if (total === 0) return;
    const match = matches[matchIdx];
    const newCode = code.substring(0, match.index) + replacement + code.substring(match.index + match.length);
    onCodeChange(newCode);
  }, [code, matches, matchIdx, replacement, total, onCodeChange]);

  const replaceAll = useCallback(() => {
    if (total === 0) return;
    try {
      let newCode: string;
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        newCode = code.replace(new RegExp(query, flags), replacement);
      } else {
        // Simple string replace all
        const parts: string[] = [];
        let pos = 0;
        for (const match of matches) {
          parts.push(code.substring(pos, match.index));
          parts.push(replacement);
          pos = match.index + match.length;
        }
        parts.push(code.substring(pos));
        newCode = parts.join('');
      }
      onCodeChange(newCode);
    } catch { /* ignore regex errors */ }
  }, [code, query, replacement, matches, total, caseSensitive, useRegex, onCodeChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext(); }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); goPrev(); }
  };

  if (!open) return null;

  return (
    <div
      className="absolute top-1 right-4 z-40 rounded-lg border border-border shadow-xl overflow-hidden"
      style={{ background: 'hsl(var(--card))', minWidth: 340 }}
    >
      {/* Search row */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={() => setShowReplace(!showReplace)}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={showReplace ? 'Verberg vervangen' : 'Toon vervangen'}
        >
          {showReplace ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-1 flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setMatchIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Zoeken..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`p-0.5 rounded transition-colors ${caseSensitive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            title="Hoofdlettergevoelig"
          >
            <CaseSensitive className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`p-0.5 rounded transition-colors ${useRegex ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            title="Reguliere expressie"
          >
            <Regex className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono w-14 text-center shrink-0">
          {total > 0 ? `${matchIdx + 1}/${total}` : 'Geen'}
        </span>
        <button onClick={goPrev} disabled={total === 0} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" title="Vorige (Shift+Enter)">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button onClick={goNext} disabled={total === 0} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" title="Volgende (Enter)">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Sluiten (Esc)">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border">
          <div className="w-6" /> {/* spacer to align with search */}
          <div className="flex-1 flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
            <Replace className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
              placeholder="Vervangen door..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
            />
          </div>
          <button
            onClick={replaceOne}
            disabled={total === 0}
            className="px-2 py-1 text-[10px] font-medium rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 transition-colors shrink-0"
            title="Vervang huidige"
          >
            Vervang
          </button>
          <button
            onClick={replaceAll}
            disabled={total === 0}
            className="px-2 py-1 text-[10px] font-medium rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 transition-colors shrink-0"
            title="Vervang alles"
          >
            Alles
          </button>
        </div>
      )}
    </div>
  );
}
