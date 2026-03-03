import { useState } from 'react';
import { ExternalLink, LogOut, AlertCircle, CheckCircle, ArrowLeft, Pencil, Share2, X } from 'lucide-react';
import { ParseError } from '@/lib/ngc-ast';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  errors: ParseError[];
  appName?: string;
  appCode?: string;
  onSignOut?: () => void;
  onSave?: () => Promise<void> | void;
  onRename?: (newName: string) => void;
  onShareTemplate?: (name: string, description: string, code: string) => Promise<void>;
}

export function NGCToolbar({ errors, appName, appCode, onSignOut, onSave, onRename, onShareTemplate }: ToolbarProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [sharing, setSharing] = useState(false);

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

  const handleShareTemplate = async () => {
    if (!templateName.trim() || !onShareTemplate || !appCode) return;
    setSharing(true);
    try {
      await onShareTemplate(templateName, templateDescription, appCode);
      setShowShareDialog(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (e) {
      console.error('Share error:', e);
    } finally {
      setSharing(false);
    }
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
        {onShareTemplate && (
          <button
            onClick={() => setShowShareDialog(true)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-2"
            title="Deel als template"
          >
            <Share2 className="h-4 w-4" />
            Template
          </button>
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

      {/* Share Template Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowShareDialog(false)}>
          <div className="rounded-2xl border border-border/50 p-8 w-full max-w-md shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Share2 className="h-5 w-5 text-primary" /></div>
                Deel als template
              </h3>
              <button onClick={() => setShowShareDialog(false)} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg p-1.5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-base text-muted-foreground mb-6">Deel je app zodat anderen het als template kunnen gebruiken.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Template naam</label>
                <input
                  type="text"
                  placeholder="Bv. Todo App Pro"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Beschrijving (optioneel)</label>
                <textarea
                  placeholder="Wat doet deze template? Welke features heeft het?"
                  value={templateDescription}
                  onChange={e => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-2 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowShareDialog(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Annuleren
              </button>
              <button 
                onClick={handleShareTemplate} 
                disabled={sharing || !templateName.trim()}
                className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
              >
                {sharing ? 'Delen...' : 'Delen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
