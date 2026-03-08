import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, Code, MousePointer, History } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCCodeEditor } from '@/components/NGCCodeEditor';
import { NGCExplorer } from '@/components/NGCExplorer';
import { NGCComponentLibrary } from '@/components/NGCComponentLibrary';
import { NGCDataPanel } from '@/components/NGCDataPanel';
import { NGCChat } from '@/components/NGCChat';
import { NGCContextMenu } from '@/components/NGCContextMenu';
import { NGCToolbar } from '@/components/NGCToolbar';
import { NGCDesigner } from '@/components/NGCDesigner';
import { parseNGC, astToNGC } from '@/lib/ngc-parser';
import { NGCNode, NGCNodeType, DEFAULT_PROPERTIES, generateId } from '@/lib/ngc-ast';
import { splitCodeIntoSections, mergeSections, CodeSection } from '@/lib/ngc-code-sections';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLiveCursors } from '@/hooks/useLiveCursors';
import { LiveCursors } from '@/components/LiveCursors';
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
  const [editorMode, setEditorMode] = useState<'code' | 'design'>('code');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { cursors, updateCursor } = useLiveCursors(appId);

  const isRemoteUpdate = useRef(false);

  // Load app from database
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    if (!appId) {
      setLoadError('Geen app-id opgegeven. Ga terug naar het dashboard om een app te openen.');
      setLoading(false);
      return;
    }

    supabase.from('apps').select('ngc_code, name').eq('id', appId).single().then(({ data, error }) => {
      if (error || !data) {
        const msg = error ? error.message : 'App niet gevonden';
        setLoadError(msg);
        setLoading(false);
      } else {
        setCode(data.ngc_code || FALLBACK_CODE);
        setAppName(data.name);
        setLoading(false);
      }
    });
  }, [appId]);

  // Realtime collaboration: listen for changes from other users
  useEffect(() => {
    if (!appId) return;
    const channel = supabase
      .channel(`app-collab-${appId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'apps', filter: `id=eq.${appId}` },
        (payload) => {
          const newRecord = payload.new as { ngc_code: string; name: string };
          // Only apply if it's a remote change (not our own save)
          isRemoteUpdate.current = true;
          setCode(prev => {
            if (prev !== newRecord.ngc_code) return newRecord.ngc_code;
            return prev;
          });
          setAppName(prev => {
            if (prev !== newRecord.name) return newRecord.name;
            return prev;
          });
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appId]);

  // Save to database
  const saveNow = useCallback(async () => {
    if (!appId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await supabase.from('apps').update({ ngc_code: code }).eq('id', appId);
  }, [code, appId]);

  // Auto-save to database with debounce (skip remote updates)
  useEffect(() => {
    if (loading || !appId || isRemoteUpdate.current) return;
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

  // Add a new page with a unique name
  const handleAddPage = useCallback(() => {
    const existingNames = sections.filter(s => s.id !== 'global').map(s => s.label);
    let idx = existingNames.length + 1;
    let newPageName = `Pagina${idx}`;
    while (existingNames.includes(newPageName)) {
      idx++;
      newPageName = `Pagina${idx}`;
    }
    const newPageCode = `    Page ${newPageName}:\n        Text Welkom:\n            Tekst="Welkom op ${newPageName}"\n            Positie="50,50"\n            Grootte="300,30"\n            Kleur="#ffffff"\n`;
    setCode(prev => prev + newPageCode);
    // Set active tab after code updates (will match new section id)
    setTimeout(() => {
      setActiveTab(`page_${existingNames.length}_${newPageName}`);
    }, 50);
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


  const handleShareTemplate = useCallback(async (templateName: string, templateDescription: string, templateCode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Fout', description: 'Je moet ingelogd zijn', variant: 'destructive' });
        return;
      }

      let resultError: any = null;
      // Try inserting into the dedicated templates table first
      const { error } = await (supabase
        .from('templates' as any) as any)
        .insert({
          name: templateName,
          description: templateDescription,
          ngc_code: templateCode,
          creator_id: user.id,
          is_public: true,
        });

      if (error) {
        // table might not exist, fallback to apps
        if (error.code === 'PGRST205' || error.message?.includes('templates')) {
          console.warn('templates table missing – falling back to apps');
          const { error: appsErr } = await supabase.from('apps').insert({
            name: templateName,
            ngc_code: templateCode,
            owner_id: user.id,
            is_public: true,
            is_remixable: true,
          });
          resultError = appsErr;
        } else {
          resultError = error;
        }
      }

      if (resultError) {
        toast({ title: 'Fout', description: resultError.message, variant: 'destructive' });
      } else {
        toast({ title: 'Succes', description: 'Template gedeeld!', variant: 'default' });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Onbekende fout';
      toast({ title: 'Fout bij delen template', description: errorMessage, variant: 'destructive' });
    }
  }, [toast]);

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

  // Designer handlers
  const handlePositionChange = useCallback((nodeId: string, x: number, y: number) => {
    if (!ast) return;
    function updatePos(node: NGCNode): NGCNode {
      if (node.id === nodeId) {
        return { ...node, properties: { ...node.properties, Positie: `"${x},${y}"` } };
      }
      return { ...node, children: node.children.map(updatePos) };
    }
    setCode(astToNGC(updatePos(ast)));
  }, [ast]);

  const handleSizeChange = useCallback((nodeId: string, w: number, h: number) => {
    if (!ast) return;
    function updateSize(node: NGCNode): NGCNode {
      if (node.id === nodeId) {
        return { ...node, properties: { ...node.properties, Grootte: `"${w},${h}"` } };
      }
      return { ...node, children: node.children.map(updateSize) };
    }
    setCode(astToNGC(updateSize(ast)));
  }, [ast]);

  const handleDropNew = useCallback((parentId: string, type: NGCNodeType, x: number, y: number) => {
    if (!ast) return;
    const newNode: NGCNode = {
      id: generateId(),
      type,
      name: `Nieuw${type}`,
      properties: {
        ...(DEFAULT_PROPERTIES[type] || {}),
        Positie: `"${x},${y}"`,
      },
      children: [],
      line: 0,
      endLine: 0,
      indent: 8,
    };
    function addToParent(node: NGCNode): NGCNode {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
      }
      return { ...node, children: node.children.map(addToParent) };
    }
    setCode(astToNGC(addToParent(ast)));
    setSelectedId(newNode.id);
  }, [ast]);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const contextNode = useMemo(() => {
    if (!ast || !contextMenu) return null;
    return findNodeById(ast, contextMenu.nodeId);
  }, [ast, contextMenu]);


  if (loading) return <div className="flex h-screen items-center justify-center" style={{ background: '#0a0e1a' }}><span className="text-sm text-muted-foreground">Laden...</span></div>;

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center p-4" style={{ background: '#0a0e1a' }}>
        <div className="text-center">
          <p className="text-lg font-semibold text-white mb-2">Fout bij laden editor</p>
          <p className="text-sm text-red-400 mb-4">{loadError}</p>
          <button
            className="px-4 py-2 bg-primary rounded text-white"
            onClick={() => navigate('/')}
          >
            Ga terug naar dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <NGCToolbar
        errors={errors}
        appName={appName}
        appCode={code}
        onSignOut={signOut}
        onSave={saveNow}
        onRename={async (newName) => {
          setAppName(newName);
          if (appId) await supabase.from('apps').update({ name: newName }).eq('id', appId);
        }}
        onShareTemplate={handleShareTemplate}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Explorer + Data (hidden on mobile) */}
        <div
          className={`shrink-0 border-r border-border flex-col transition-all duration-200 hidden sm:flex ${leftOpen ? 'w-56' : 'w-0 overflow-hidden border-r-0'}`}
          style={{ background: 'hsl(var(--ide-explorer-bg))' }}
        >
          {leftOpen && (
            <>
              {/* Explorer */}
              <div className="flex flex-col min-h-0" style={{ flex: '1 1 33%' }}>
                <div className="ide-panel-header">
                  <span>📂 Explorer</span>
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
                  <span>💾 Data</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <NGCDataPanel ast={ast} />
                </div>
              </div>
              {/* Chat Panel */}
              <div className="flex flex-col min-h-0 border-t border-border" style={{ flex: '1 1 34%' }}>
                <div className="ide-panel-header">
                  <span>🗣️ Chat</span>
                </div>
                <div className="flex-1 overflow-hidden min-h-0">
                  {appId && <NGCChat appId={appId} />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Collapse toggle for left panel (hidden on mobile) */}
        <button
          onClick={() => setLeftOpen(p => !p)}
          className="shrink-0 items-center justify-center w-5 hover:bg-secondary/60 transition-colors border-r border-border hidden sm:flex"
          title={leftOpen ? 'Paneel inklappen' : 'Paneel uitklappen'}
        >
          {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" /> : <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Code Editor / Designer */}
        <div
          ref={editorContainerRef}
          className="flex-1 flex flex-col min-w-0 relative"
          onMouseMove={(e) => {
            const rect = editorContainerRef.current?.getBoundingClientRect();
            if (rect) {
              updateCursor(e.clientX - rect.left, e.clientY - rect.top, activeTab);
            }
          }}
        >
          <LiveCursors cursors={cursors.filter(c => c.section === activeTab)} containerRef={editorContainerRef} />
          {/* Mode toggle + Page Tabs */}
          <div className="flex items-center border-b border-border shrink-0 overflow-x-auto scrollbar-none" style={{ background: 'hsl(var(--ide-explorer-bg))' }}>
            {/* Mode toggle */}
            <div className="flex items-center border-r border-border shrink-0">
              <button
                onClick={() => setEditorMode('code')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors ${
                  editorMode === 'code'
                    ? 'text-foreground bg-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
                title="Code modus"
              >
                <Code className="h-3 w-3" />
                Code
              </button>
              <button
                onClick={() => setEditorMode('design')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors ${
                  editorMode === 'design'
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
                title="Ontwerp modus"
              >
                <MousePointer className="h-3 w-3" />
                Ontwerp
              </button>
            </div>

            {editorMode === 'code' && (
              <>
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                      activeTab === section.id
                        ? 'border-primary text-foreground bg-background'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                    }`}
                  >
                    {section.id === 'global' ? '🌍 Globaal' : `📄 ${section.label}`}
                  </button>
                ))}
                <button
                  onClick={handleAddPage}
                  className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Nieuwe pagina toevoegen"
                >
                  ➕
                </button>
                <span className="ml-auto pr-2 text-muted-foreground opacity-60 text-[10px] sm:text-xs normal-case tracking-normal hidden sm:inline shrink-0">
                  {activeSection ? (activeTab === 'global' ? 'app.ngc' : `${activeSection.label.toLowerCase()}.ngc`) : 'main.ngc'}
                </span>
              </>
            )}
          </div>

          {editorMode === 'code' ? (
            <>
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
            </>
          ) : (
            <div className="flex-1 overflow-hidden">
              <NGCDesigner
                ast={ast}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onPositionChange={handlePositionChange}
                onSizeChange={handleSizeChange}
                onDropNew={handleDropNew}
              />
            </div>
          )}
        </div>

        {/* Collapse toggle for right panel (hidden on mobile) */}
        <button
          onClick={() => setRightOpen(p => !p)}
          className="shrink-0 items-center justify-center w-5 hover:bg-secondary/60 transition-colors border-l border-border hidden sm:flex"
          title={rightOpen ? 'Paneel inklappen' : 'Paneel uitklappen'}
        >
          {rightOpen ? <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" /> : <PanelRightOpen className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Right Panel: Component Library (hidden on mobile) */}
        <div
          className={`shrink-0 flex-col transition-all duration-200 hidden sm:flex ${rightOpen ? 'w-72' : 'w-0 overflow-hidden'}`}
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
