import { useRef, useCallback, useState, useEffect } from 'react';
import { ParseError } from '@/lib/ngc-ast';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  errors: ParseError[];
}

interface Suggestion {
  label: string;
  insert: string;
  kind: 'keyword' | 'property' | 'event' | 'value' | 'command';
}

const ALL_SUGGESTIONS: Suggestion[] = [
  // Keywords / elements
  { label: 'App', insert: 'App:', kind: 'keyword' },
  { label: 'Page', insert: 'Page NieuwePagina:', kind: 'keyword' },
  { label: 'Frame', insert: 'Frame NieuwFrame:', kind: 'keyword' },
  { label: 'Button', insert: 'Button NieuweKnop:', kind: 'keyword' },
  { label: 'Text', insert: 'Text NieuweTekst:', kind: 'keyword' },
  { label: 'TextBox', insert: 'TextBox NieuweInvoer:', kind: 'keyword' },
  { label: 'Image', insert: 'Image NieuweAfbeelding:', kind: 'keyword' },
  { label: 'Var', insert: 'Var(naam="waarde")', kind: 'keyword' },
  { label: 'List', insert: 'List(naam="item1,item2")', kind: 'keyword' },
  { label: 'Function', insert: 'Function NieuweFunctie:', kind: 'keyword' },
  // Events
  { label: 'Event Click', insert: 'Event Click:', kind: 'event' },
  { label: 'Event Hover', insert: 'Event Hover:', kind: 'event' },
  { label: 'Event Start', insert: 'Event Start:', kind: 'event' },
  { label: 'Event Changed', insert: 'Event Changed:', kind: 'event' },
  // Properties
  { label: 'Tekst', insert: 'Tekst=""', kind: 'property' },
  { label: 'Positie', insert: 'Positie="0,0"', kind: 'property' },
  { label: 'Grootte', insert: 'Grootte="100,40"', kind: 'property' },
  { label: 'Kleur', insert: 'Kleur="#3b82f6"', kind: 'property' },
  { label: 'Hoekradius', insert: 'Hoekradius="6"', kind: 'property' },
  { label: 'Bron', insert: 'Bron=""', kind: 'property' },
  { label: 'Placeholder', insert: 'Placeholder="Type hier..."', kind: 'property' },
  { label: 'Variabele', insert: 'Variabele=""', kind: 'property' },
  // Commands
  { label: 'GaNaar', insert: 'GaNaar "PaginaNaam"', kind: 'command' },
  { label: 'Data.Add', insert: 'Data.Add(Tabel, veld=waarde)', kind: 'command' },
  { label: 'Data.Delete', insert: 'Data.Delete(Tabel, id)', kind: 'command' },
  { label: 'Data.Clear', insert: 'Data.Clear(Tabel)', kind: 'command' },
  { label: 'If', insert: 'If(conditie):', kind: 'command' },
  { label: 'Repeat', insert: 'Repeat(5):', kind: 'command' },
  { label: 'Wait', insert: 'Wait(1000)', kind: 'command' },
];

const KIND_COLORS: Record<string, string> = {
  keyword: '#c084fc',
  property: '#38bdf8',
  event: '#fb923c',
  value: '#4ade80',
  command: '#f472b6',
};

function highlightLine(line: string): JSX.Element[] {
  if (line.trimStart().startsWith('#')) {
    return [<span key={0} className="syntax-comment">{line}</span>];
  }

  const keywords = ['App', 'Page', 'Frame', 'Button', 'Text', 'TextBox', 'Image', 'Var', 'Function', 'List', 'Data'];
  const events = ['Click', 'Hover', 'Start', 'Changed'];
  const controlFlow = ['If', 'Repeat', 'Wait', 'until', 'while', 'Add', 'Delete', 'Clear', 'Get', 'GaNaar'];

  const tokens = line.match(/(\s+|"[^"]*"|\w+|[=:+\-*/().,])/g) || [line];

  return tokens.map((token, i) => {
    if (token.startsWith('"')) return <span key={i} className="syntax-string">{token}</span>;
    if (keywords.includes(token)) return <span key={i} className="syntax-keyword">{token}</span>;
    if (events.includes(token)) return <span key={i} className="syntax-event">{token}</span>;
    if (controlFlow.includes(token)) return <span key={i} className="syntax-type">{token}</span>;
    if (/^\d+$/.test(token)) return <span key={i} className="syntax-number">{token}</span>;
    if (token === '=' || token === ':') return <span key={i} className="text-muted-foreground">{token}</span>;
    return <span key={i}>{token}</span>;
  });
}

export function NGCCodeEditor({ code, onChange, errors }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [currentWord, setCurrentWord] = useState('');
  const [wordStart, setWordStart] = useState(0);

  const lines = code.split('\n');
  const errorLines = new Set(errors.map(e => e.line));

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    // Close menu on scroll
    setSuggestions([]);
  }, []);

  const closeSuggestions = useCallback(() => {
    setSuggestions([]);
    setMenuPos(null);
    setCurrentWord('');
  }, []);

  const applySuggestion = useCallback((suggestion: Suggestion) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = code.substring(0, wordStart);
    const after = code.substring(ta.selectionStart);
    const newCode = before + suggestion.insert + after;
    onChange(newCode);
    closeSuggestions();
    const newPos = wordStart + suggestion.insert.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = newPos;
    });
  }, [code, onChange, wordStart, closeSuggestions]);

  const updateSuggestions = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const cursor = ta.selectionStart;
    const textBefore = code.substring(0, cursor);

    // Find current word
    const wordMatch = textBefore.match(/(\w+)$/);
    if (!wordMatch || wordMatch[1].length < 2) {
      closeSuggestions();
      return;
    }

    const word = wordMatch[1];
    const wStart = cursor - word.length;
    const filtered = ALL_SUGGESTIONS.filter(s =>
      s.label.toLowerCase().startsWith(word.toLowerCase()) && s.label.toLowerCase() !== word.toLowerCase()
    );

    if (filtered.length === 0) {
      closeSuggestions();
      return;
    }

    setCurrentWord(word);
    setWordStart(wStart);
    setSuggestions(filtered.slice(0, 8));
    setSelectedIdx(0);

    // Calculate position
    const linesBefore = textBefore.split('\n');
    const lineNum = linesBefore.length - 1;
    const colNum = linesBefore[linesBefore.length - 1].length;
    const lineHeight = 20;
    const charWidth = 8.4;
    const top = (lineNum + 1) * lineHeight + 8 - ta.scrollTop;
    const left = colNum * charWidth + 12 - ta.scrollLeft;
    setMenuPos({ top, left });
  }, [code, closeSuggestions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Update suggestions after code changes
  useEffect(() => {
    // Small delay to ensure cursor position is updated
    const id = setTimeout(() => updateSuggestions(), 10);
    return () => clearTimeout(id);
  }, [code, updateSuggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle autocomplete navigation
      if (suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIdx(i => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIdx(i => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          applySuggestion(suggestions[selectedIdx]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSuggestions();
          return;
        }
      }

      // Tab indent
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCode = code.substring(0, start) + '    ' + code.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        });
      }
    },
    [code, onChange, suggestions, selectedIdx, applySuggestion, closeSuggestions]
  );

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'hsl(var(--ide-editor-bg))' }}>
      {/* Line numbers */}
      <div
        className="absolute left-0 top-0 bottom-0 w-12 select-none overflow-hidden border-r border-border"
        style={{ background: 'hsl(var(--ide-gutter))' }}
      >
        <div className="pt-2">
          {lines.map((_, i) => (
            <div
              key={i}
              className="px-2 text-right font-mono text-xs leading-[20px]"
              style={{
                color: errorLines.has(i + 1)
                  ? 'hsl(var(--ide-error))'
                  : 'hsl(var(--ide-gutter-text))',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Syntax highlight layer */}
      <div
        ref={highlightRef}
        className="absolute left-12 top-0 right-0 bottom-0 overflow-hidden pointer-events-none"
      >
        <div className="pt-2 pl-3 pr-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="font-mono text-sm leading-[20px] whitespace-pre"
              style={{
                background: errorLines.has(i + 1)
                  ? 'hsla(0, 65%, 50%, 0.1)'
                  : 'transparent',
              }}
            >
              {highlightLine(line)}
            </div>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="absolute left-12 top-0 right-0 bottom-0 w-[calc(100%-48px)] h-full resize-none bg-transparent p-2 pl-3 font-mono text-sm leading-[20px] text-transparent caret-foreground outline-none"
        value={code}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closeSuggestions, 150)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />

      {/* Autocomplete menu */}
      {suggestions.length > 0 && menuPos && (
        <div
          className="absolute z-50 rounded-md border border-border shadow-lg overflow-hidden"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            background: 'hsl(var(--ide-explorer-bg))',
            minWidth: 200,
            maxWidth: 320,
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.label}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors ${
                i === selectedIdx ? 'bg-primary/20' : 'hover:bg-secondary/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s);
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: KIND_COLORS[s.kind] }}
              />
              <span className="font-mono text-foreground">{s.label}</span>
              <span className="ml-auto text-muted-foreground/50 text-[10px] truncate">{s.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
