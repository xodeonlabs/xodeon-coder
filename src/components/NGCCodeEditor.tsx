import { useRef, useCallback, useEffect } from 'react';
import { ParseError } from '@/lib/ngc-ast';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  errors: ParseError[];
}

function highlightLine(line: string): JSX.Element[] {
  const parts: JSX.Element[] = [];
  let remaining = line;
  let key = 0;

  // Comment
  if (remaining.trimStart().startsWith('#')) {
    return [<span key={0} className="syntax-comment">{line}</span>];
  }

  // Keywords
  const keywords = ['App', 'Page', 'Frame', 'Button', 'Text', 'TextBox', 'Image', 'Var', 'Function'];
  const events = ['Click', 'Hover', 'Start', 'Changed'];
  const controlFlow = ['If', 'Repeat', 'Wait', 'until', 'while'];

  // Simple token-based highlighting
  const tokens = line.match(/(\s+|"[^"]*"|\w+|[=:+\-*/().,])/g) || [line];

  return tokens.map((token, i) => {
    if (token.startsWith('"')) {
      return <span key={i} className="syntax-string">{token}</span>;
    }
    if (keywords.includes(token)) {
      return <span key={i} className="syntax-keyword">{token}</span>;
    }
    if (events.includes(token)) {
      return <span key={i} className="syntax-event">{token}</span>;
    }
    if (controlFlow.includes(token)) {
      return <span key={i} className="syntax-type">{token}</span>;
    }
    if (/^\d+$/.test(token)) {
      return <span key={i} className="syntax-number">{token}</span>;
    }
    if (token === '=' || token === ':') {
      return <span key={i} className="text-muted-foreground">{token}</span>;
    }
    return <span key={i}>{token}</span>;
  });
}

export function NGCCodeEditor({ code, onChange, errors }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const errorLines = new Set(errors.map(e => e.line));

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    [code, onChange]
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

      {/* Textarea (invisible text, captures input) */}
      <textarea
        ref={textareaRef}
        className="absolute left-12 top-0 right-0 bottom-0 w-[calc(100%-48px)] h-full resize-none bg-transparent p-2 pl-3 font-mono text-sm leading-[20px] text-transparent caret-foreground outline-none"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}
