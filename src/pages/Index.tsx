import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCCodeEditor } from '@/components/NGCCodeEditor';
import { NGCExplorer } from '@/components/NGCExplorer';
import { NGCComponentLibrary } from '@/components/NGCComponentLibrary';
import { NGCDataPanel } from '@/components/NGCDataPanel';
import { NGCChat } from '@/components/NGCChat';
import { NGCContextMenu } from '@/components/NGCContextMenu';
import { NGCToolbar } from '@/components/NGCToolbar';
import { parseNGC, astToNGC } from '@/lib/ngc-parser';
import { NGCNode, NGCNodeType, DEFAULT_PROPERTIES, generateId } from '@/lib/ngc-ast';
import { splitCodeIntoSections, mergeSections, CodeSection } from '@/lib/ngc-code-sections';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
const FALLBACK_CODE = 'App:\n    Page Home:\n        Text Hello:\n            Tekst="Hallo!"\n            Positie="50,50"\n            Grootte="200,30"\n            Kleur="#ffffff"\n';
function findNodeById(node: NGCNode, id: string): NGCNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}


function addChildNode(node: NGCNode, parentId: string, childType: NGCNodeType): NGCNode {
  if (node.id === parentId) {
    const newChild: NGCNode = {
      id: generateId(),
      type: childType,
      name: childType === 'Event' ? 'Click' : `New${childType}`,
      properties: { ...(DEFAULT_PROPERTIES[childType] || {}) },
      children: [],
      line: 0,
      endLine: 0,
      indent: node.indent + 4,
    };
    return { ...node, children: [...node.children, newChild] };
  }
  return { ...node, children: node.children.map(c => addChildNode(c, parentId, childType)) };
}

function deleteNode(node: NGCNode, nodeId: string): NGCNode {
  return {
    ...node,
    children: node.children
      .filter(c => c.id !== nodeId)
      .map(c => deleteNode(c, nodeId)),
  };
}

function renameNode(node: NGCNode, nodeId: string, newName: string): NGCNode {
  if (node.id === nodeId) {
    return { ...node, name: newName };
  }
  return { ...node, children: node.children.map(c => renameNode(c, nodeId, newName)) };
}

function duplicateNode(node: NGCNode, nodeId: string): NGCNode {
  const newChildren: NGCNode[] = [];
  for (const child of node.children) {
    newChildren.push(duplicateNode(child, nodeId));
    if (child.id === nodeId) {
      const clone = JSON.parse(JSON.stringify(child));
      // Assign new IDs
      function reassignIds(n: NGCNode) {
        n.id = generateId();
        n.name = n.name + 'Copy';
        n.children.forEach(reassignIds);
      }
      reassignIds(clone);
      newChildren.push(clone);
    }
  }
  return { ...node, children: newChildren };
}

const Index = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState(FALLBACK_CODE);
  const [appName, setAppName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('global');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load app from database
  useEffect(() => {
    if (!appId) return;
    supabase.from('apps').select('ngc_code, name').eq('id', appId).single().then(({ data, error }) => {
      if (error || !data) {
        toast({ title: 'App niet gevonden', variant: 'destructive' });
        navigate('/');
      } else {
        setCode(data.ngc_code || FALLBACK_CODE);
        setAppName(data.name);
      }
      setLoading(false);
    });
  }, [appId]);

  // Save to database
  const saveNow = useCallback(async () => {
    if (!appId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await supabase.from('apps').update({ ngc_code: code }).eq('id', appId);
  }, [code, appId]);

  // Auto-save to database with debounce
  useEffect(() => {
    if (loading || !appId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from('apps').update({ ngc_code: code }).eq('id', appId);
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [code, appId, loading]);

  const parseResult = useMemo(() => parseNGC(code), [code]);
  const { ast, errors } = parseResult;

  // Split code into sections for per-page editing
  const sections = useMemo(() => splitCodeIntoSections(code), [code]);

  // Get active section's code
  const activeSection = useMemo(() => {
    return sections.find(s => s.id === activeTab) || sections[0];
  }, [sections, activeTab]);

  // Handle section code change
  const handleSectionCodeChange = useCallback((newSectionCode: string) => {
    const updatedSections = sections.map(s =>
      s.id === activeTab ? { ...s, code: newSectionCode } : s
    );
    setCode(mergeSections(updatedSections));
  }, [sections, activeTab]);

  // Add a new page
  const handleAddPage = useCallback(() => {
    const pageCount = sections.filter(s => s.id !== 'global').length;
    const newPageName = `Pagina${pageCount + 1}`;
    const newPageCode = `    Page ${newPageName}:\n        Text Welkom:\n            Tekst="Welkom op ${newPageName}"\n            Positie="50,50"\n            Grootte="300,30"\n            Kleur="#ffffff"\n`;
    setCode(prev => prev + newPageCode);
    setActiveTab(newPageName);
  }, [sections]);

  const selectedNode = useMemo(() => {
    if (!ast || !selectedId) return null;
    return findNodeById(ast, selectedId);
  }, [ast, selectedId]);

  const handleInsertCode = useCallback((snippet: string) => {
    // Insert into active section
    if (activeTab === 'global') {
      setCode(prev => prev + '\n' + snippet);
    } else {
      const updatedSections = sections.map(s =>
        s.id === activeTab ? { ...s, code: s.code + '\n' + snippet } : s
      );
      setCode(mergeSections(updatedSections));
    }
  }, [activeTab, sections]);

  const handleAddChild = useCallback((parentId: string, type: NGCNodeType) => {
    if (!ast) return;
    const updated = addChildNode(ast, parentId, type);
    setCode(astToNGC(updated));
  }, [ast]);

  const handleDelete = useCallback((nodeId: string) => {
    if (!ast) return;
    const updated = deleteNode(ast, nodeId);
    setCode(astToNGC(updated));
    setSelectedId(null);
  }, [ast]);

  const handleDuplicate = useCallback((nodeId: string) => {
    if (!ast) return;
    const updated = duplicateNode(ast, nodeId);
    setCode(astToNGC(updated));
  }, [ast]);

  const handleRename = useCallback((nodeId: string, newName: string) => {
    if (!ast) return;
    const updated = renameNode(ast, nodeId, newName);
    setCode(astToNGC(updated));
  }, [ast]);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const contextNode = useMemo(() => {
    if (!ast || !contextMenu) return null;
    return findNodeById(ast, contextMenu.nodeId);
  }, [ast, contextMenu]);


  if (loading) return <div className="flex h-screen items-center justify-center" style={{ background: '#0a0e1a' }}><span className="text-sm text-muted-foreground">Laden...</span></div>;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <NGCToolbar
        errors={errors}
        appName={appName}
        onSignOut={signOut}
        onSave={saveNow}
        onRename={async (newName) => {
          setAppName(newName);
          if (appId) await supabase.from('apps').update({ name: newName }).eq('id', appId);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Explorer + Data */}
        <div
          className={`shrink-0 border-r border-border flex flex-col transition-all duration-200 ${leftOpen ? 'w-56' : 'w-0 overflow-hidden border-r-0'}`}
          style={{ background: 'hsl(var(--ide-explorer-bg))' }}
        >
          {leftOpen && (
            <>
              {/* Explorer */}
              <div className="flex flex-col min-h-0" style={{ flex: '1 1 33%' }}>
                <div className="ide-panel-header">
                  <span>Explorer</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <NGCExplorer
                    ast={ast}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onContextMenu={handleContextMenu}
                    onRename={handleRename}
                    onDelete={handleDelete}
                  />
                </div>
              </div>
              {/* Data Panel */}
              <div className="flex flex-col min-h-0 border-t border-border" style={{ flex: '1 1 33%' }}>
                <div className="ide-panel-header">
                  <span>Data</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <NGCDataPanel ast={ast} />
                </div>
              </div>
              {/* Chat Panel */}
              <div className="flex flex-col min-h-0 border-t border-border" style={{ flex: '1 1 34%' }}>
                <div className="ide-panel-header">
                  <span>Chat</span>
                </div>
                <div className="flex-1 overflow-hidden min-h-0">
                  {appId && <NGCChat appId={appId} />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Collapse toggle for left panel */}
        <button
          onClick={() => setLeftOpen(p => !p)}
          className="shrink-0 flex items-center justify-center w-5 hover:bg-secondary/60 transition-colors border-r border-border"
          title={leftOpen ? 'Paneel inklappen' : 'Paneel uitklappen'}
        >
          {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" /> : <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page Tabs */}
          <div className="flex items-center border-b border-border shrink-0" style={{ background: 'hsl(var(--ide-explorer-bg))' }}>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === section.id
                    ? 'border-primary text-foreground bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                {section.id === 'global' ? '⚙ Globaal' : `📄 ${section.label}`}
              </button>
            ))}
            <button
              onClick={handleAddPage}
              className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Nieuwe pagina toevoegen"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="ml-auto pr-2 text-muted-foreground opacity-60 text-xs normal-case tracking-normal">
              {activeSection ? (activeTab === 'global' ? 'app.ngc' : `${activeTab.toLowerCase()}.ngc`) : 'main.ngc'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <NGCCodeEditor code={activeSection?.code || ''} onChange={handleSectionCodeChange} errors={errors} />
          </div>

          {/* Error bar */}
          {errors.length > 0 && (
            <div className="border-t border-border p-2 space-y-1" style={{ background: 'hsla(0, 65%, 50%, 0.08)' }}>
              {errors.map((err, i) => (
                <div key={i} className="text-xs text-destructive flex items-center gap-1">
                  <span className="font-mono">Line {err.line}:</span>
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapse toggle for right panel */}
        <button
          onClick={() => setRightOpen(p => !p)}
          className="shrink-0 flex items-center justify-center w-5 hover:bg-secondary/60 transition-colors border-l border-border"
          title={rightOpen ? 'Paneel inklappen' : 'Paneel uitklappen'}
        >
          {rightOpen ? <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" /> : <PanelRightOpen className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Right Panel: Component Library */}
        <div
          className={`shrink-0 flex flex-col transition-all duration-200 ${rightOpen ? 'w-72' : 'w-0 overflow-hidden'}`}
        >
          {rightOpen && (
            <>
              <div className="ide-panel-header">
                <span>Componenten</span>
              </div>
              <div className="flex-1 overflow-auto">
                <NGCComponentLibrary onInsert={handleInsertCode} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && contextNode && (
        <NGCContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextNode}
          onClose={() => setContextMenu(null)}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
};

export default Index;
