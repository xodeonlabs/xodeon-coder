import { useMemo } from 'react';
import { X } from 'lucide-react';

interface NGCDiffViewProps {
  oldCode: string;
  newCode: string;
  oldLabel: string;
  newLabel: string;
  onClose: () => void;
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
  lineOld?: number;
  lineNew?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const actions: Array<{ type: 'same' | 'added' | 'removed'; oldIdx?: number; newIdx?: number }> = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      actions.unshift({ type: 'same', oldIdx: i - 1, newIdx: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      actions.unshift({ type: 'added', newIdx: j - 1 });
      j--;
    } else {
      actions.unshift({ type: 'removed', oldIdx: i - 1 });
      i--;
    }
  }

  for (const a of actions) {
    if (a.type === 'same') {
      result.push({ type: 'same', text: oldLines[a.oldIdx!], lineOld: a.oldIdx! + 1, lineNew: a.newIdx! + 1 });
    } else if (a.type === 'removed') {
      result.push({ type: 'removed', text: oldLines[a.oldIdx!], lineOld: a.oldIdx! + 1 });
    } else {
      result.push({ type: 'added', text: newLines[a.newIdx!], lineNew: a.newIdx! + 1 });
    }
  }

  return result;
}

export function NGCDiffView({ oldCode, newCode, oldLabel, newLabel, onClose }: NGCDiffViewProps) {
  const diff = useMemo(() => computeDiff(oldCode, newCode), [oldCode, newCode]);

  const stats = useMemo(() => {
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    return { added, removed };
  }, [diff]);

  return (
    <div className="flex flex-col h-full border-t border-border" style={{ background: 'hsl(var(--ide-editor-bg))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-semibold text-foreground">Diff View</span>
          <span className="text-[10px] text-muted-foreground truncate">{oldLabel} → {newLabel}</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-green-400">+{stats.added}</span>
            <span className="text-red-400">-{stats.removed}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto min-h-0">
        <pre className="text-[11px] font-mono leading-5">
          {diff.map((line, i) => (
            <div
              key={i}
              className={`flex ${
                line.type === 'added' ? 'bg-green-500/10' : line.type === 'removed' ? 'bg-red-500/10' : ''
              }`}
            >
              <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
                {line.lineOld ?? ''}
              </span>
              <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
                {line.lineNew ?? ''}
              </span>
              <span className={`w-4 shrink-0 text-center select-none ${
                line.type === 'added' ? 'text-green-400' : line.type === 'removed' ? 'text-red-400' : 'text-muted-foreground/30'
              }`}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
              </span>
              <span className={`flex-1 pl-1 pr-4 ${
                line.type === 'added' ? 'text-green-300' : line.type === 'removed' ? 'text-red-300' : 'text-foreground/80'
              }`}>
                {line.text || ' '}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
