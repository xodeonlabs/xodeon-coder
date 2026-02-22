import { ExternalLink, LogOut, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { ParseError } from '@/lib/ngc-ast';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  errors: ParseError[];
  appName?: string;
  onSignOut?: () => void;
}

export function NGCToolbar({ errors, appName, onSignOut }: ToolbarProps) {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center justify-between px-3 border-b border-border h-10 shrink-0"
      style={{ background: 'hsl(var(--ide-toolbar))' }}
    >
      <div className="flex items-center gap-1">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors mr-2" title="Terug naar dashboard">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-primary font-mono mr-2">NGC</span>
        {appName && <span className="text-xs text-muted-foreground">{appName}</span>}
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
        <button
          onClick={() => navigate('/preview')}
          className="px-3 py-1 text-xs rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ExternalLink className="h-3 w-3 inline mr-1" />
          Preview
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="px-2 py-1 text-xs rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Uitloggen"
          >
            <LogOut className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
