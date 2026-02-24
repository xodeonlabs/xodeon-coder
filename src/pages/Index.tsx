import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NGCCodeEditor } from '@/components/NGCCodeEditor';
import { NGCExplorer } from '@/components/NGCExplorer';
import { NGCComponentLibrary } from '@/components/NGCComponentLibrary';
import { NGCDataPanel } from '@/components/NGCDataPanel';
import { NGCContextMenu } from '@/components/NGCContextMenu';
import { NGCToolbar } from '@/components/NGCToolbar';
import { parseNGC, astToNGC } from '@/lib/ngc-parser';
import { NGCNode, NGCNodeType, DEFAULT_PROPERTIES, generateId } from '@/lib/ngc-ast';
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

  const selectedNode = useMemo(() => {
    if (!ast || !selectedId) return null;
    return findNodeById(ast, selectedId);
  }, [ast, selectedId]);

  const handleInsertCode = useCallback((snippet: string) => {
    setCode(prev => prev + '\n' + snippet);
  }, []);

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
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Explorer + Data */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col" style={{ background: 'hsl(var(--ide-explorer-bg))' }}>
          {/* Explorer */}
          <div className="flex flex-col min-h-0" style={{ flex: '1 1 50%' }}>
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
          <div className="flex flex-col min-h-0 border-t border-border" style={{ flex: '1 1 50%' }}>
            <div className="ide-panel-header">
              <span>Data</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <NGCDataPanel ast={ast} />
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="ide-panel-header">
            <span>Code Editor</span>
            <span className="ml-auto text-muted-foreground opacity-60 normal-case tracking-normal">main.ngc</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <NGCCodeEditor code={code} onChange={setCode} errors={errors} />
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

        {/* Right Panel: Component Library */}
        <div className="w-72 shrink-0 flex flex-col">
          <div className="ide-panel-header">
            <span>Componenten</span>
          </div>
          <div className="flex-1 overflow-auto">
            <NGCComponentLibrary onInsert={handleInsertCode} />
          </div>
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
