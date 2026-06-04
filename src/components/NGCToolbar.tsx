import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, LogOut, AlertCircle, CheckCircle, ArrowLeft, Pencil, Share2, X, Menu, Download } from 'lucide-react';
import { parseNGC } from '@/lib/ngc-parser';
import { exportToHtml } from '@/lib/ngc-to-html';
import { ParseError } from '@/lib/ngc-ast';
import { AppIcon, IconPicker } from '@/components/IconPicker';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ToolbarProps {
  errors: ParseError[];
  appName?: string;
  appIcon?: string;
  appCode?: string;
  onSignOut?: () => void;
  onSave?: () => Promise<void> | void;
  onRename?: (newName: string) => void;
  onChangeIcon?: (icon: string) => void;
  onShareTemplate?: (name: string, description: string, code: string) => Promise<void>;
}

export function NGCToolbar({ errors, appName, appIcon, appCode, onSignOut, onSave, onRename, onChangeIcon, onShareTemplate }: ToolbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [sharing, setSharing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

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

  const handleExportHtml = () => {
    if (!appCode) return;
    const { ast } = parseNGC(appCode);
    if (!ast) return;
    const html = exportToHtml(ast, appName || 'App');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(appName || 'app').replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="relative flex items-center justify-between px-2 sm:px-4 border-b border-border/20 h-11 sm:h-12 shrink-0 backdrop-blur-xl overflow-visible shadow-sm shadow-black/5"
      style={{ background: 'hsl(var(--ide-toolbar) / 0.6)' }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button onClick={() => handleNavigate('/')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0" title={t('editor.backToDashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={() => onChangeIcon && setShowIconPicker(true)}
            className={`w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white ${onChangeIcon ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
            title={onChangeIcon ? t('editor.changeIcon') : undefined}
            disabled={!onChangeIcon}
          >
            <AppIcon iconName={appIcon || 'file-code'} size={14} />
          </button>
          <div className="h-5 w-5 shrink-0"><XodeonLogo className="h-full w-full object-contain" /></div>
        </div>
        <div className="hidden sm:block h-4 w-px bg-border/30"></div>
        {editing ? (
          <input
            autoFocus
            className="text-sm text-foreground bg-background border border-primary/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50 w-32 sm:w-auto"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          appName && (
            <button onClick={startEditing} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors group truncate min-w-0" title={t('editor.renameApp')}>
              <span className="truncate">{appName}</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )
        )}
      </div>

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-2 sm:gap-3">
        {errors.length > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{t('editor.errors', { count: errors.length })}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--ide-success))]/10 text-[hsl(var(--ide-success))]">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{t('editor.ready')}</span>
          </div>
        )}
        {onShareTemplate && (
          <button
            onClick={() => setShowShareDialog(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-1.5"
            title={t('editor.shareAsTemplate')}
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('editor.template')}
          </button>
        )}
        <button
          onClick={handleExportHtml}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-1.5"
          title={t('editor.exportHtml')}
        >
          <Download className="h-3.5 w-3.5" />
          {t('editor.export')}
        </button>
        <button
          onClick={() => handleNavigate(window.location.pathname.replace('/editor/', '/preview/'))}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('editor.preview')}
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title={t('editor.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mobile actions */}
      <div className="flex sm:hidden items-center gap-2">
        {errors.length > 0 ? (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium">{errors.length}</span>
          </span>
        ) : (
          <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--ide-success))]" />
        )}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-11 right-2 z-[9999] rounded-lg border border-border shadow-xl py-1 min-w-[160px]" style={{ background: 'hsl(var(--card))' }}>
            <button
              onClick={() => {
                const appIdMatch = window.location.pathname.match(/\/editor\/([^/]+)/);
                if (appIdMatch) navigate(`/preview/${appIdMatch[1]}`);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> {t('editor.preview')}
            </button>
            <button
              onClick={() => { handleExportHtml(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Download className="h-4 w-4" /> {t('editor.exportHtml')}
            </button>
            {onShareTemplate && (
              <button
                onClick={() => { setShowShareDialog(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Share2 className="h-4 w-4" /> {t('editor.template')}
              </button>
            )}
            {onSignOut && (
              <button
                onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-secondary/50 transition-colors"
              >
                <LogOut className="h-4 w-4" /> {t('editor.signOut')}
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Share Template Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowShareDialog(false)}>
          <div className="rounded-2xl border border-border/50 p-5 sm:p-6 w-full max-w-md shadow-2xl" style={{ background: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Share2 className="h-5 w-5 text-primary" /></div>
                {t('editor.shareAsTemplate')}
              </h3>
              <button onClick={() => setShowShareDialog(false)} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg p-1.5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t('editor.shareDesc')}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">{t('editor.templateName')}</label>
                <input
                  type="text"
                  placeholder={t('editor.templateNamePlaceholder')}
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground uppercase tracking-wide">{t('editor.description')}</label>
                <textarea
                  placeholder={t('editor.descriptionPlaceholder')}
                  value={templateDescription}
                  onChange={e => setTemplateDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1.5 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowShareDialog(false)} className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleShareTemplate}
                disabled={sharing || !templateName.trim()}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
              >
                {sharing ? t('editor.sharing') : t('editor.share')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showIconPicker && onChangeIcon && (
        <IconPicker
          value={appIcon || 'file-code'}
          onChange={(icon) => onChangeIcon(icon)}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
