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
      className="flex items-center justify-between px-4 border-b border-border/50 h-12 shrink-0 backdrop-blur-sm"
      style={{ background: 'hsl(var(--ide-toolbar) / 0.85)' }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => handleNavigate('/')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" title="Terug naar dashboard">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-xs">N</div>
          <span className="text-sm font-bold text-foreground font-mono">NGC</span>
        </div>
        <div className="h-4 w-px bg-border/30"></div>
        {editing ? (
          <input
            autoFocus
            className="text-sm text-foreground bg-background border border-primary/30 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          appName && (
            <button onClick={startEditing} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group" title="Naam wijzigen">
              {appName}
              <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )
        )}
      </div>

      <div className="flex items-center gap-3">
        {errors.length > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ide-success/10 text-ide-success">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Ready</span>
          </div>
        )}
        <button
          onClick={() => handleNavigate(window.location.pathname.replace('/editor/', '/preview/'))}
          className="px-4 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Preview
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title="Uitloggen"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
