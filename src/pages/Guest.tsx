import { useState, useCallback, useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NGCCodeEditor } from '@/components/NGCCodeEditor';
import { NGCPreview } from '@/components/NGCPreview';
import { parseNGC } from '@/lib/ngc-parser';

const GUEST_CODE = `App:
    Page Home:
        Text Welkom:
            Tekst="Welkom bij NGC!"
            Positie="50,50"
            Grootte="300,40"
            Kleur="#ffffff"
        Button Start:
            Tekst="Ga naar Demo"
            Positie="50,120"
            Grootte="160,40"
            Kleur="#3b82f6"
            Hoekradius="8"
            Event Click:
                GaNaar "Demo"
    Page Demo:
        Text Info:
            Tekst="Dit is de demo pagina!"
            Positie="50,50"
            Grootte="300,30"
            Kleur="#4ade80"
        TextBox Invoer:
            Positie="50,100"
            Grootte="250,36"
            Placeholder="Type iets..."
            Variabele="tekst"
        Text Output:
            Tekst="{tekst}"
            Positie="50,150"
            Grootte="300,30"
            Kleur="#ffffff"
`;

const Guest = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(GUEST_CODE);
  const [showPreview, setShowPreview] = useState(true);

  const { ast, errors } = useMemo(() => parseNGC(code), [code]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#0a0e1a' }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border"
        style={{ background: 'hsl(var(--ide-toolbar))' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-foreground">NGC Editor</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
            GUEST
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="text-xs px-3 py-1 rounded text-muted-foreground hover:text-foreground bg-secondary transition-colors"
          >
            {showPreview ? 'Code Only' : 'Show Preview'}
          </button>
          <button
            onClick={() => {
              // Save current guest code so it can be restored after signup/login
              localStorage.setItem('ngc_guest_code', code);
              navigate('/auth');
            }}
            className="text-xs px-3 py-1 rounded font-medium text-white transition-colors"
            style={{ background: '#3b82f6' }}
          >
            Inloggen om op te slaan
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Guest warning banner */}
        <Alert variant="destructive" className="absolute bottom-4 left-4 z-50 w-auto max-w-sm border-yellow-500/50 bg-yellow-500/10 text-yellow-400">
          <AlertTriangle className="h-4 w-4 !text-yellow-400" />
          <AlertDescription className="text-xs text-yellow-300">
            Je code wordt <strong>niet opgeslagen</strong>. Log in om je werk te bewaren.
          </AlertDescription>
        </Alert>
        {/* Code editor */}
        <div className={`flex flex-col min-w-0 ${showPreview ? 'w-1/2' : 'flex-1'}`}>
          <div className="ide-panel-header">
            <span>Code</span>
            {errors.length > 0 && (
              <span className="ml-2 text-[10px] text-destructive">{errors.length} error(s)</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <NGCCodeEditor code={code} onChange={handleCodeChange} errors={errors} />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 flex flex-col border-l border-border">
            <div className="ide-panel-header">
              <span>Preview</span>
            </div>
            <div className="flex-1 overflow-auto" style={{ background: '#0f172a' }}>
              <NGCPreview ast={ast} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Guest;
