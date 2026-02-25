import { useState } from 'react';
import { ExternalLink, LogOut, AlertCircle, CheckCircle, ArrowLeft, Pencil } from 'lucide-react';
import { ParseError } from '@/lib/ngc-ast';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  errors: ParseError[];
  appName?: string;
  onSignOut?: () => void;
  onSave?: () => Promise<void> | void;
  onRename?: (newName: string) => void;
}

export function NGCToolbar({ errors, appName, onSignOut, onSave, onRename }: ToolbarProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const handleNavigate = async (path: string) => {
    if (onSave) await onSave();
    navigate(path);
  };

  const startEditing = () => {
    setNameValue(appName || '');
    setEditing(true);
  };

  const commitName = () => {
    if (nameValue.trim() && onRename) onRename(nameValue.trim());
    setEditing(false);
  };

  return (
    <div
      className="flex items-center justify-between px-3 border-b border-border h-10 shrink-0"
      style={{ background: 'hsl(var(--ide-toolbar))' }}
    >
      <div className="flex items-center gap-1">
        <button onClick={() => handleNavigate('/')} className="text-muted-foreground hover:text-foreground transition-colors mr-2" title="Terug naar dashboard">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-primary font-mono mr-2">NGC</span>
        {editing ? (
          <input
            autoFocus
            className="text-xs text-foreground bg-background border border-border rounded px-1.5 py-0.5"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          appName && (
            <button onClick={startEditing} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Naam wijzigen">
              {appName}
              <Pencil className="h-2.5 w-2.5" />
            </button>
          )
        )}
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
          onClick={() => handleNavigate(window.location.pathname.replace('/editor/', '/preview/'))}
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
