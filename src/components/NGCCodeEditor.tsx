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
  kind: 'keyword' | 'property' | 'event' | 'value' | 'command' | 'template';
  description?: string;
}

// Pre-programmed slash templates — insert ready-made code blocks
const SLASH_TEMPLATES: Suggestion[] = [
  {
    label: '/login',
    kind: 'template',
    description: 'Login frame met velden en knop',
    insert: `Frame LoginFrame:
    Positie="0,0"
    Grootte="320,260"
    Kleur="rgb(30,30,40)"
    Hoekradius="12"
    Text Titel:
        Tekst="Inloggen"
        Positie="20,20"
    TextBox Email:
        Placeholder="E-mail"
        Positie="20,60"
        Grootte="280,36"
        Variabele="email"
    TextBox Wachtwoord:
        Placeholder="Wachtwoord"
        Positie="20,110"
        Grootte="280,36"
        Variabele="wachtwoord"
    Button Inloggen:
        Tekst="Inloggen"
        Positie="20,170"
        Grootte="280,40"
        Kleur="rgb(59,130,246)"
        Hoekradius="8"
        Event Click:
            /nav "Home"`,
  },
  {
    label: '/signup',
    kind: 'template',
    description: 'Registratie frame',
    insert: `Frame SignupFrame:
    Positie="0,0"
    Grootte="320,320"
    Kleur="rgb(30,30,40)"
    Hoekradius="12"
    Text Titel:
        Tekst="Account aanmaken"
        Positie="20,20"
    TextBox Naam:
        Placeholder="Naam"
        Positie="20,60"
        Grootte="280,36"
        Variabele="naam"
    TextBox Email:
        Placeholder="E-mail"
        Positie="20,110"
        Grootte="280,36"
        Variabele="email"
    TextBox Wachtwoord:
        Placeholder="Wachtwoord"
        Positie="20,160"
        Grootte="280,36"
        Variabele="wachtwoord"
    Button Registreer:
        Tekst="Registreer"
        Positie="20,220"
        Grootte="280,40"
        Kleur="rgb(34,197,94)"
        Hoekradius="8"
        Event Click:
            /nav "Home"`,
  },
  {
    label: '/navbar',
    kind: 'template',
    description: 'Navigatiebalk met knoppen',
    insert: `Frame NavBar:
    Positie="0,0"
    Grootte="800,56"
    Kleur="rgb(20,20,30)"
    Button HomeKnop:
        Tekst="Home"
        Positie="16,12"
        Grootte="80,32"
        Event Click:
            /nav "Home"
    Button OverKnop:
        Tekst="Over"
        Positie="104,12"
        Grootte="80,32"
        Event Click:
            /nav "Over"`,
  },
  {
    label: '/card',
    kind: 'template',
    description: 'Kaart met titel en tekst',
    insert: `Frame Kaart:
    Positie="0,0"
    Grootte="240,160"
    Kleur="rgb(40,40,55)"
    Hoekradius="12"
    Text Titel:
        Tekst="Titel"
        Positie="16,16"
    Text Beschrijving:
        Tekst="Beschrijving hier"
        Positie="16,48"`,
  },
  {
    label: '/counter',
    kind: 'template',
    description: 'Teller met +/- knoppen',
    insert: `Var(teller="0")
Frame Counter:
    Positie="0,0"
    Grootte="200,100"
    Kleur="rgb(30,30,40)"
    Hoekradius="12"
    Text Waarde:
        Tekst="{teller}"
        Positie="90,30"
    Button Min:
        Tekst="-"
        Positie="16,50"
        Grootte="40,32"
        Event Click:
            /sub teller 1
    Button Plus:
        Tekst="+"
        Positie="144,50"
        Grootte="40,32"
        Event Click:
            /add teller 1`,
  },
  {
    label: '/page',
    kind: 'template',
    description: 'Lege pagina',
    insert: `Page NieuwePagina:
    Text Welkom:
        Tekst="Welkom"
        Positie="20,20"`,
  },
  {
    label: '/nav',
    kind: 'template',
    description: 'Navigeer naar pagina',
    insert: '/nav "PaginaNaam"',
  },
  {
    label: '/back',
    kind: 'template',
    description: 'Ga terug naar vorige pagina',
    insert: '/back',
  },
  {
    label: '/set',
    kind: 'template',
    description: 'Zet variabele waarde',
    insert: '/set naam=waarde',
  },
  {
    label: '/add',
    kind: 'template',
    description: 'Tel op bij variabele',
    insert: '/add naam 1',
  },
  {
    label: '/sub',
    kind: 'template',
    description: 'Trek af van variabele',
    insert: '/sub naam 1',
  },
  {
    label: '/coin+',
    kind: 'template',
    description: 'Voeg munten toe',
    insert: '/coin+ wallet 10',
  },
  {
    label: '/coin-',
    kind: 'template',
    description: 'Verwijder munten',
    insert: '/coin- wallet 5',
  },
];

const ALL_SUGGESTIONS: Suggestion[] = [
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
  { label: 'Event Click', insert: 'Event Click:', kind: 'event' },
  { label: 'Event Hover', insert: 'Event Hover:', kind: 'event' },
  { label: 'Event Start', insert: 'Event Start:', kind: 'event' },
  { label: 'Event Changed', insert: 'Event Changed:', kind: 'event' },
  { label: 'Tekst', insert: 'Tekst=""', kind: 'property' },
  { label: 'Positie', insert: 'Positie="0,0"', kind: 'property' },
  { label: 'Grootte', insert: 'Grootte="100,40"', kind: 'property' },
  { label: 'Kleur', insert: 'Kleur="rgb(59,130,246)"', kind: 'property' },
  { label: 'Hoekradius', insert: 'Hoekradius="6"', kind: 'property' },
  { label: 'Bron', insert: 'Bron=""', kind: 'property' },
  { label: 'Placeholder', insert: 'Placeholder="Type hier..."', kind: 'property' },
  { label: 'Variabele', insert: 'Variabele=""', kind: 'property' },
  { label: 'GaNaar', insert: 'GaNaar "PaginaNaam"', kind: 'command' },
  { label: 'Data.Add', insert: 'Data.Add(Tabel, veld=waarde)', kind: 'command' },
  { label: 'Data.Delete', insert: 'Data.Delete(Tabel, id)', kind: 'command' },
  { label: 'Data.Clear', insert: 'Data.Clear(Tabel)', kind: 'command' },
  { label: 'If', insert: 'If(conditie):', kind: 'command' },
  { label: 'Repeat', insert: 'Repeat(5):', kind: 'command' },
  { label: 'Wait', insert: 'Wait(1000)', kind: 'command' },
  // Coins
  { label: 'Coins', insert: 'Coins(munten)=100', kind: 'keyword' },
  { label: 'Coins.Add', insert: 'Coins.Add(munten, 10)', kind: 'command' },
  { label: 'Coins.Remove', insert: 'Coins.Remove(munten, 5)', kind: 'command' },
  { label: 'Coins.Code', insert: 'Coins.Code(munten, "BUY100", 100)', kind: 'command' },
  { label: 'Coins.Redeem', insert: 'Coins.Redeem(munten, codeVar)', kind: 'command' },
];

const KIND_COLORS: Record<string, string> = {
  keyword: '#c084fc',
  property: '#38bdf8',
  event: '#fb923c',
  value: '#4ade80',
  command: '#f472b6',
  template: '#facc15',
};

// Shared style constants — must be identical on textarea and highlight layer
const FONT_FAMILY = "'JetBrains Mono', 'Fira Code', monospace";
const FONT_SIZE = 14; // px  (text-sm = 0.875rem ≈ 14px)
const LINE_HEIGHT = 20; // px
const PAD_TOP = 8;   // pt-2
const PAD_LEFT = 12;  // pl-3
const PAD_RIGHT = 12; // pr-3
const PAD_BOTTOM = 8; // pb-2
const GUTTER_WIDTH = 48; // w-12

function highlightLine(line: string): JSX.Element[] {
  if (line.trimStart().startsWith('#')) {
    return [<span key={0} className="syntax-comment">{line || ' '}</span>];
  }

  const keywords = ['App', 'Page', 'Frame', 'Button', 'Text', 'TextBox', 'Image', 'Var', 'Function', 'List', 'Data', 'Coins'];
  const events = ['Click', 'Hover', 'Start', 'Changed'];
  const controlFlow = ['If', 'Repeat', 'Wait', 'until', 'while', 'Add', 'Delete', 'Clear', 'Get', 'GaNaar'];

  const tokens = line.match(/(\s+|"[^"]*"|\w+|[=:+\-*/().,])/g) || [line || ' '];

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
  const gutterRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [currentWord, setCurrentWord] = useState('');
  const [wordStart, setWordStart] = useState(0);
  const cursorPos = useRef<number | null>(null);

  const lines = code.split('\n');
  const errorLines = new Set(errors.map(e => e.line));

  // Restore cursor position after code prop updates
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta && cursorPos.current !== null) {
      const pos = Math.min(cursorPos.current, code.length);
      ta.selectionStart = ta.selectionEnd = pos;
      cursorPos.current = null;
    }
  }, [code]);

  // Sync scroll between textarea, highlight layer, and gutter
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightRef.current) {
      const inner = highlightRef.current.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      }
    }
    if (gutterRef.current) {
      const gInner = gutterRef.current.firstElementChild as HTMLElement | null;
      if (gInner) {
        gInner.style.transform = `translateY(${-ta.scrollTop}px)`;
      }
    }
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

    // For multiline templates, re-indent each new line to match the indent of the line where it's inserted
    let insertText = suggestion.insert;
    if (suggestion.kind === 'template' && insertText.includes('\n')) {
      const lineStart = before.lastIndexOf('\n') + 1;
      const indent = before.substring(lineStart).match(/^[ \t]*/)?.[0] ?? '';
      if (indent) {
        insertText = insertText.split('\n').map((l, i) => (i === 0 ? l : indent + l)).join('\n');
      }
    }

    const newCode = before + insertText + after;
    onChange(newCode);
    closeSuggestions();
    const newPos = wordStart + insertText.length;
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

    // Slash template trigger: match /word at cursor
    const slashMatch = textBefore.match(/\/(\w*)$/);
    if (slashMatch) {
      const query = '/' + slashMatch[1];
      const wStart = cursor - query.length;
      const filtered = SLASH_TEMPLATES.filter(s =>
        s.label.toLowerCase().startsWith(query.toLowerCase())
      );
      if (filtered.length === 0) {
        closeSuggestions();
        return;
      }
      setCurrentWord(query);
      setWordStart(wStart);
      setSuggestions(filtered.slice(0, 10));
      setSelectedIdx(0);
      const linesBefore = textBefore.split('\n');
      const lineNum = linesBefore.length - 1;
      const colNum = linesBefore[linesBefore.length - 1].length;
      const charWidth = 8.4;
      const top = PAD_TOP + (lineNum + 1) * LINE_HEIGHT - ta.scrollTop;
      const left = GUTTER_WIDTH + PAD_LEFT + colNum * charWidth - ta.scrollLeft;
      setMenuPos({ top, left });
      return;
    }

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

    // Calculate menu position using same metrics as the layout
    const linesBefore = textBefore.split('\n');
    const lineNum = linesBefore.length - 1;
    const colNum = linesBefore[linesBefore.length - 1].length;
    const charWidth = 8.4;
    const top = PAD_TOP + (lineNum + 1) * LINE_HEIGHT - ta.scrollTop;
    const left = GUTTER_WIDTH + PAD_LEFT + colNum * charWidth - ta.scrollLeft;
    setMenuPos({ top, left });
  }, [code, closeSuggestions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    cursorPos.current = e.target.selectionStart;
    onChange(e.target.value);
  }, [onChange]);

  useEffect(() => {
    const id = setTimeout(() => updateSuggestions(), 10);
    return () => clearTimeout(id);
  }, [code, updateSuggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (suggestions.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => (i + 1) % suggestions.length); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => (i - 1 + suggestions.length) % suggestions.length); return; }
        if (e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestions[selectedIdx]); return; }
        if (e.key === 'Enter') { closeSuggestions(); return; }
        if (e.key === 'Escape') { e.preventDefault(); closeSuggestions(); return; }
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCode = code.substring(0, start) + '    ' + code.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
      }
    },
    [code, onChange, suggestions, selectedIdx, applySuggestion, closeSuggestions]
  );

  // Shared text style object for both layers
  const textStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    lineHeight: `${LINE_HEIGHT}px`,
    tabSize: 4,
    WebkitTextSizeAdjust: '100%',
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'hsl(var(--ide-editor-bg))' }}>
      {/* Line numbers — scrolls vertically with textarea */}
      <div
        ref={gutterRef}
        className="absolute left-0 top-0 bottom-0 select-none overflow-hidden border-r border-border"
        style={{ width: GUTTER_WIDTH, background: 'hsl(var(--ide-gutter))' }}
      >
        <div style={{ paddingTop: PAD_TOP }}>
          {lines.map((_, i) => (
            <div
              key={i}
              className="px-2 text-right font-mono"
              style={{
                fontSize: 12,
                lineHeight: `${LINE_HEIGHT}px`,
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

      {/* Syntax highlight layer — exact same box model as textarea, scrolls via JS sync */}
      <div
        ref={highlightRef}
        className="absolute top-0 right-0 bottom-0 pointer-events-none"
        style={{
          left: GUTTER_WIDTH,
          overflow: 'hidden',
          width: `calc(100% - ${GUTTER_WIDTH}px)`,
        }}
      >
        <div
          style={{
            paddingTop: PAD_TOP,
            paddingLeft: PAD_LEFT,
            paddingRight: PAD_RIGHT,
            paddingBottom: PAD_BOTTOM,
            willChange: 'transform',
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className="whitespace-pre"
              style={{
                ...textStyle,
                background: errorLines.has(i + 1) ? 'hsla(0, 65%, 50%, 0.1)' : 'transparent',
                height: LINE_HEIGHT,
              }}
            >
              {highlightLine(line)}
            </div>
          ))}
        </div>
      </div>

      {/* Textarea — the actual editable element; text is transparent so syntax colors show through */}
      <textarea
        ref={textareaRef}
        className="absolute top-0 right-0 bottom-0 resize-none bg-transparent text-transparent caret-foreground outline-none"
        style={{
          left: GUTTER_WIDTH,
          width: `calc(100% - ${GUTTER_WIDTH}px)`,
          height: '100%',
          ...textStyle,
          paddingTop: PAD_TOP,
          paddingLeft: PAD_LEFT,
          paddingRight: PAD_RIGHT,
          paddingBottom: PAD_BOTTOM,
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitTextFillColor: 'transparent',
          caretColor: 'hsl(var(--foreground))',
        }}
        value={code}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closeSuggestions, 150)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
      />

      {/* Autocomplete menu */}
      {suggestions.length > 0 && menuPos && (
        <div
          className="absolute z-50 rounded-xl border border-border/30 shadow-xl shadow-black/20 overflow-hidden backdrop-blur-xl"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            background: 'hsl(var(--ide-explorer-bg) / 0.85)',
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
              onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KIND_COLORS[s.kind] }} />
              <span className="font-mono text-foreground">{s.label}</span>
              <span className="ml-auto text-muted-foreground/50 text-[10px] truncate">{s.description ?? s.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
