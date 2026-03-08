import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSwipe } from '@/hooks/useSwipe';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, Code, MousePointer, History, Maximize, Minimize, Eye, Copy, Undo2, FileCode, Search, Replace, Sparkles, Blocks } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCCodeEditor } from '@/components/NGCCodeEditor';
import { NGCExplorer } from '@/components/NGCExplorer';
import { NGCComponentLibrary } from '@/components/NGCComponentLibrary';
import { NGCDataPanel } from '@/components/NGCDataPanel';
import { NGCChat } from '@/components/NGCChat';
import { NGCAIAssistant } from '@/components/NGCAIAssistant';
import { NGCContextMenu } from '@/components/NGCContextMenu';
import { NGCToolbar } from '@/components/NGCToolbar';
import { NGCDesigner } from '@/components/NGCDesigner';
import { NGCVersionPanel } from '@/components/NGCVersionPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { SearchReplace } from '@/components/SearchReplace';
import { StatusBar } from '@/components/StatusBar';
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
  const [appIcon, setAppIcon] = useState('file-code');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;
  const [leftOpen, setLeftOpen] = useState(!isMobileInit);
  const [rightOpen, setRightOpen] = useState(!isMobileInit);
  const [activeTab, setActiveTab] = useState<string>('global');
  const [editorMode, setEditorMode] = useState<'code' | 'design'>('code');
  const [leftTab, setLeftTab] = useState<'explorer' | 'versions'>('explorer');
  const [rightTab, setRightTab] = useState<'components' | 'ai'>('components');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { cursors, updateCursor } = useLiveCursors(appId);

  const isRemoteUpdate = useRef(false);

  // Feature states
  const [zenMode, setZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const undoRef = useRef<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchShowReplace, setSearchShowReplace] = useState(false);

  // Swipe gestures for mobile panel toggling
  const leftPanelSwipe = useSwipe(
    () => setLeftOpen(false),  // swipe left → close left panel
    undefined
  );
  const rightPanelSwipe = useSwipe(
    undefined,
    () => setRightOpen(false)  // swipe right → close right panel
  );
  const editorSwipe = useSwipe(
    () => setRightOpen(true),  // swipe left on editor → open right panel
    () => setLeftOpen(true)    // swipe right on editor → open left panel
  );

  // Load app from database
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    if (!appId) {
      setLoadError('Geen app-id opgegeven. Ga terug naar het dashboard om een app te openen.');
      setLoading(false);
      return;
    }

    supabase.from('apps').select('ngc_code, name, icon').eq('id', appId).single().then(({ data, error }) => {
      if (error || !data) {
        const msg = error ? error.message : 'App niet gevonden';
        setLoadError(msg);
        setLoading(false);
      } else {
        setCode(data.ngc_code || FALLBACK_CODE);
        setAppName(data.name);
        setAppIcon((data as any).icon || 'file-code');
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
    setSaveStatus('saving');
    await supabase.from('apps').update({ ngc_code: code }).eq('id', appId);
    setSaveStatus('saved');
    setLastSaved(new Date());
    toast({ title: '✓ Opgeslagen', description: 'Je code is opgeslagen', duration: 1500 });
  }, [code, appId, toast]);

  // Auto-save to database with debounce (skip remote updates)
  useEffect(() => {
    if (loading || !appId || isRemoteUpdate.current) return;
    setSaveStatus('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      await supabase.from('apps').update({ ngc_code: code }).eq('id', appId);
      setSaveStatus('saved');
      setLastSaved(new Date());
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [code, appId, loading]);

  // Undo tracking — push to stack on code changes (debounced)
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const stack = undoRef.current;
      if (stack.length === 0 || stack[stack.length - 1] !== code) {
        const newStack = [...stack.slice(-50), code];
        undoRef.current = newStack;
        setUndoStack(newStack);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [code, loading]);

  const handleUndo = useCallback(() => {
    const stack = undoRef.current;
    if (stack.length < 2) return;
    const prev = stack[stack.length - 2];
    undoRef.current = stack.slice(0, -1);
    setUndoStack(undoRef.current);
    setCode(prev);
  }, []);

  // Copy code to clipboard
  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    toast({ title: '📋 Gekopieerd', description: 'Code naar klembord gekopieerd', duration: 1500 });
  }, [code, toast]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Zen mode — hide all panels
  const toggleZenMode = useCallback(() => {
    setZenMode(z => {
      if (!z) {
        setLeftOpen(false);
        setRightOpen(false);
      } else {
        setLeftOpen(true);
        setRightOpen(true);
      }
      return !z;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S — save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
      // Ctrl+K — command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(o => !o);
      }
      // Ctrl+F — search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchShowReplace(false);
        setSearchOpen(true);
      }
      // Ctrl+H — search & replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setSearchShowReplace(true);
        setSearchOpen(true);
      }
      // Ctrl+Z — undo (only when not in textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleUndo();
      }
      // Escape — close zen mode
      if (e.key === 'Escape' && zenMode) {
        toggleZenMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveNow, handleUndo, zenMode, toggleZenMode]);


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

  // Command palette items
  const commandItems = useMemo(() => {
    const items: { id: string; label: string; category: string; icon: JSX.Element; action: () => void }[] = [];
    const pageNodes = ast?.children.filter(c => c.type === 'Page') ?? [];
    pageNodes.forEach((p, i) => {
      items.push({
        id: `page-${i}`,
        label: `Ga naar ${p.name}`,
        category: 'Pagina',
        icon: <FileCode className="h-4 w-4" />,
        action: () => {
          const section = sections.find(s => s.label === p.name);
          if (section) setActiveTab(section.id);
        },
      });
    });
    items.push(
      { id: 'search', label: 'Zoeken in code', category: 'Zoeken', icon: <Search className="h-4 w-4" />, action: () => { setSearchShowReplace(false); setSearchOpen(true); } },
      { id: 'replace', label: 'Zoeken en vervangen', category: 'Zoeken', icon: <Replace className="h-4 w-4" />, action: () => { setSearchShowReplace(true); setSearchOpen(true); } },
      { id: 'zen', label: zenMode ? 'Zen mode uit' : 'Zen mode aan', category: 'Weergave', icon: <Eye className="h-4 w-4" />, action: toggleZenMode },
      { id: 'fullscreen', label: isFullscreen ? 'Volledig scherm uit' : 'Volledig scherm', category: 'Weergave', icon: <Maximize className="h-4 w-4" />, action: toggleFullscreen },
      { id: 'copy', label: 'Kopieer alle code', category: 'Bewerken', icon: <Copy className="h-4 w-4" />, action: handleCopyCode },
      { id: 'undo', label: 'Ongedaan maken', category: 'Bewerken', icon: <Undo2 className="h-4 w-4" />, action: handleUndo },
      { id: 'save', label: 'Nu opslaan', category: 'Bestand', icon: <FileCode className="h-4 w-4" />, action: () => { saveNow(); } },
      { id: 'code-mode', label: 'Code modus', category: 'Modus', icon: <Code className="h-4 w-4" />, action: () => setEditorMode('code') },
      { id: 'design-mode', label: 'Ontwerp modus', category: 'Modus', icon: <MousePointer className="h-4 w-4" />, action: () => setEditorMode('design') },
      { id: 'new-page', label: 'Nieuwe pagina toevoegen', category: 'Bewerken', icon: <Plus className="h-4 w-4" />, action: handleAddPage },
      { id: 'left-panel', label: leftOpen ? 'Linkerpaneel inklappen' : 'Linkerpaneel uitklappen', category: 'Weergave', icon: <PanelLeftClose className="h-4 w-4" />, action: () => setLeftOpen(o => !o) },
      { id: 'right-panel', label: rightOpen ? 'Rechterpaneel inklappen' : 'Rechterpaneel uitklappen', category: 'Weergave', icon: <PanelRightClose className="h-4 w-4" />, action: () => setRightOpen(o => !o) },
    );
    return items;
  }, [ast, sections, zenMode, isFullscreen, leftOpen, rightOpen, toggleZenMode, toggleFullscreen, handleCopyCode, handleUndo, saveNow, handleAddPage]);

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
        appIcon={appIcon}
        appCode={code}
        onSignOut={signOut}
        onSave={saveNow}
        onRename={async (newName) => {
          setAppName(newName);
          if (appId) await supabase.from('apps').update({ name: newName }).eq('id', appId);
        }}
        onChangeIcon={async (icon) => {
          setAppIcon(icon);
          if (appId) await supabase.from('apps').update({ icon }).eq('id', appId);
        }}
        onShareTemplate={handleShareTemplate}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden" autoSaveId="ngc-main-panels">
        {/* Left Panel */}
        {leftOpen && (
          <>
            <ResizablePanel defaultSize={15} minSize={10} maxSize={35} order={1}>
              <div
                className="h-full flex flex-col"
                style={{ background: 'hsl(var(--ide-explorer-bg))' }}
                {...leftPanelSwipe}
              >
                {/* Left panel tab switcher */}
                <div className="flex border-b border-border shrink-0">
                  <button
                    onClick={() => setLeftTab('explorer')}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      leftTab === 'explorer' ? 'text-foreground bg-background border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📂 Explorer
                  </button>
                  <button
                    onClick={() => setLeftTab('versions')}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
                      leftTab === 'versions' ? 'text-foreground bg-background border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <History className="h-3 w-3" /> Versies
                  </button>
                </div>

                {leftTab === 'explorer' ? (
                  <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0" autoSaveId="ngc-explorer-panels">
                    <ResizablePanel defaultSize={33} minSize={15}>
                      <div className="h-full overflow-y-auto">
                        <NGCExplorer
                          ast={ast}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          onContextMenu={handleContextMenu}
                          onRename={handleRename}
                          onDelete={handleDelete}
                        />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={33} minSize={10}>
                      <div className="h-full flex flex-col">
                        <div className="ide-panel-header shrink-0">
                          <span>💾 Data</span>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          <NGCDataPanel ast={ast} appId={appId} />
                        </div>
                      </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={34} minSize={10}>
                      <div className="h-full flex flex-col">
                        <div className="ide-panel-header shrink-0">
                          <span>🗣️ Chat</span>
                        </div>
                        <div className="flex-1 overflow-hidden min-h-0">
                          {appId && <NGCChat appId={appId} />}
                        </div>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <div className="flex-1 overflow-hidden min-h-0">
                    {appId && (
                      <NGCVersionPanel
                        appId={appId}
                        currentCode={code}
                        onRestore={(restoredCode) => setCode(restoredCode)}
                      />
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Toggle left */}
        <button
          onClick={() => setLeftOpen(p => !p)}
          className="shrink-0 items-center justify-center w-5 hover:bg-secondary/60 transition-colors border-r border-border flex"
          title={leftOpen ? 'Paneel inklappen' : 'Paneel uitklappen'}
          style={{ flexGrow: 0, flexShrink: 0, flexBasis: '20px' }}
        >
          {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" /> : <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Code Editor / Designer (center) */}
        <ResizablePanel defaultSize={leftOpen && rightOpen ? 55 : leftOpen || rightOpen ? 70 : 90} minSize={30} order={2}>
          <div
            ref={editorContainerRef}
            className="h-full flex flex-col min-w-0 relative"
            {...editorSwipe}
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

              {/* Quick action buttons */}
              <div className="flex items-center border-r border-border shrink-0 gap-0.5 px-1">
                <button onClick={toggleZenMode} className={`p-1.5 rounded text-[10px] transition-colors ${zenMode ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`} title="Zen mode (Esc)">
                  <Eye className="h-3 w-3" />
                </button>
                <button onClick={toggleFullscreen} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Volledig scherm">
                  {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                </button>
                <button onClick={handleCopyCode} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Kopieer code">
                  <Copy className="h-3 w-3" />
                </button>
                <button onClick={handleUndo} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30" title="Ongedaan maken (Ctrl+Z)" disabled={undoStack.length < 2}>
                  <Undo2 className="h-3 w-3" />
                </button>
                <button onClick={() => setCommandPaletteOpen(true)} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Commandopalet (Ctrl+K)">
                  <span className="text-[10px] font-mono">⌘K</span>
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
                <div className="flex-1 overflow-hidden relative">
                  <SearchReplace
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    code={code}
                    onCodeChange={setCode}
                    showReplace={searchShowReplace}
                  />
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
                  onDelete={handleDelete}
                />
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Toggle right */}
        <button
          onClick={() => setRightOpen(p => !p)}
          className="shrink-0 items-center justify-center w-5 hover:bg-secondary/60 transition-colors border-l border-border flex"
          title={rightOpen ? 'Paneel inklappen' : 'Paneel uitklappen'}
          style={{ flexGrow: 0, flexShrink: 0, flexBasis: '20px' }}
        >
          {rightOpen ? <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" /> : <PanelRightOpen className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Right Panel */}
        {rightOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={20} minSize={12} maxSize={40} order={3}>
              <div className="h-full flex flex-col" {...rightPanelSwipe}>
                {/* Right panel tab switcher */}
                <div className="flex border-b border-border shrink-0">
                  <button
                    onClick={() => setRightTab('components')}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
                      rightTab === 'components' ? 'text-foreground bg-background border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Blocks className="h-3 w-3" /> Componenten
                  </button>
                  <button
                    onClick={() => setRightTab('ai')}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${
                      rightTab === 'ai' ? 'text-foreground bg-background border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" /> AI
                  </button>
                </div>

                {rightTab === 'components' ? (
                  <div className="flex-1 overflow-auto">
                    <NGCComponentLibrary onInsert={handleInsertCode} />
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden min-h-0">
                    <NGCAIAssistant appId={appId!} currentCode={code} onApplyCode={(newCode) => setCode(newCode)} />
                  </div>
                )}
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Status Bar */}
      <StatusBar code={code} saveStatus={saveStatus} lastSaved={lastSaved} />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} items={commandItems} />

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
