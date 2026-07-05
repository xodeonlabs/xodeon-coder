import { useMemo, useState } from "react";
import { Play, RotateCcw, Copy, Check } from "lucide-react";
import { parseNGC } from "@/lib/ngc-parser";
import { NGCPreview } from "@/components/NGCPreview";
import { Button } from "@/components/ui/button";

interface TryItBlockProps {
  initialCode: string;
  height?: number;
}

export function TryItBlock({ initialCode, height = 320 }: TryItBlockProps) {
  const [code, setCode] = useState(initialCode);
  const [runCode, setRunCode] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => (runCode ? parseNGC(runCode) : null), [runCode, runKey]);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/40 bg-secondary/30 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Probeer het zelf</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => {
              setCode(initialCode);
              setRunCode(null);
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <Button
            size="sm"
            onClick={() => {
              setRunCode(code);
              setRunKey((k) => k + 1);
            }}
            className="h-7 gap-1 bg-gradient-to-r from-primary to-accent px-2.5 text-xs text-white"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="min-h-[220px] w-full resize-y bg-background/40 p-3 font-mono text-xs leading-relaxed text-foreground/90 outline-none md:border-r md:border-border/40"
          style={{ height }}
        />
        <div
          className="relative overflow-auto bg-background/20"
          style={{ height }}
          key={runKey}
        >
          {parsed?.ast ? (
            <NGCPreview ast={parsed.ast} organizationId={null} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
              Druk op <span className="mx-1 inline-flex items-center gap-1 rounded bg-secondary/60 px-1.5 py-0.5 font-medium text-foreground"><Play className="h-3 w-3" />Run</span> om je code uit te voeren.
            </div>
          )}
          {parsed && parsed.errors.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 border-t border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              {parsed.errors.slice(0, 3).map((e, i) => (
                <div key={i}>Regel {e.line}: {e.message}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
