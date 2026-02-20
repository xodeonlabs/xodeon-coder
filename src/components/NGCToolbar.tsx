import { Play, FileJson, Code2, AlertCircle, CheckCircle } from 'lucide-react';
import { ParseError } from '@/lib/ngc-ast';

interface ToolbarProps {
  errors: ParseError[];
  onExportJSON: () => void;
  onExportHTML: () => void;
  activeTab: 'preview' | 'json' | 'html';
  onTabChange: (tab: 'preview' | 'json' | 'html') => void;
}

export function NGCToolbar({ errors, onExportJSON, onExportHTML, activeTab, onTabChange }: ToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-3 border-b border-border h-10 shrink-0"
      style={{ background: 'hsl(var(--ide-toolbar))' }}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-primary font-mono mr-2">NGC</span>
        <span className="text-xs text-muted-foreground">Workspace</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Output tabs */}
        <button
          className={`px-3 py-1 text-xs rounded-sm transition-colors ${
            activeTab === 'preview'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          onClick={() => onTabChange('preview')}
        >
          <Play className="h-3 w-3 inline mr-1" />
          Preview
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-sm transition-colors ${
            activeTab === 'json'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          onClick={() => onTabChange('json')}
        >
          <FileJson className="h-3 w-3 inline mr-1" />
          JSON
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-sm transition-colors ${
            activeTab === 'html'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          onClick={() => onTabChange('html')}
        >
          <Code2 className="h-3 w-3 inline mr-1" />
          HTML
        </button>
      </div>

      <div className="flex items-center gap-2">
        {errors.length > 0 ? (
          <div className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-ide-success">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs">Ready</span>
          </div>
        )}
      </div>
    </div>
  );
}
