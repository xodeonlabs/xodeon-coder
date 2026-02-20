import { useState, useCallback, useMemo } from 'react';
import { NGCCodeEditor } from '@/components/NGCCodeEditor';
import { NGCExplorer } from '@/components/NGCExplorer';
import { NGCProperties } from '@/components/NGCProperties';
import { NGCPreview } from '@/components/NGCPreview';
import { NGCContextMenu } from '@/components/NGCContextMenu';
import { NGCToolbar } from '@/components/NGCToolbar';
import { parseNGC, astToNGC } from '@/lib/ngc-parser';
import { astToJSON } from '@/lib/ngc-to-json';
import { astToHTML } from '@/lib/ngc-to-html';
import { NGCNode, NGCNodeType, DEFAULT_PROPERTIES, generateId } from '@/lib/ngc-ast';

const DEFAULT_CODE = `App:
    Var(naam)="Wereld"
    Var(score)=0
    Var(item)=""
    List(items)="Appel,Banaan,Kers"
    Page Home:
        Frame Header:
            Positie="0,0"
            Grootte="400,60"
            Kleur="#1e293b"
            Text Title:
                Tekst="Hallo Var(naam)!"
                Positie="20,15"
                Grootte="300,30"
                Kleur="#ffffff"
        TextBox NameInput:
            Positie="50,80"
            Grootte="200,35"
            Placeholder="Type je naam..."
            Variabele="naam"
        Text ScoreLabel:
            Tekst="Score: Var(score)"
            Positie="50,130"
            Grootte="200,30"
            Kleur="#94a3b8"
        Button PlusOne:
            Tekst="+1 Score"
            Positie="50,170"
            Grootte="120,40"
            Kleur="#3b82f6"
            Hoekradius="8"
            Click:
                Var(score)+1
        Button Reset:
            Tekst="Reset"
            Positie="180,170"
            Grootte="100,40"
            Kleur="#64748b"
            Hoekradius="8"
            Click:
                Var(score)=0
        TextBox ItemInput:
            Positie="50,230"
            Grootte="200,35"
            Placeholder="Nieuw item..."
            Variabele="item"
        Button AddData:
            Tekst="Opslaan"
            Positie="260,230"
            Grootte="100,35"
            Kleur="#22c55e"
            Hoekradius="6"
            Click:
                Data.Add(items, naam=Var(naam), waarde=Var(item))
        Button ClearData:
            Tekst="Wis data"
            Positie="260,275"
            Grootte="100,35"
            Kleur="#ef4444"
            Hoekradius="6"
            Click:
                Data.Clear(items)
`;

function findNodeById(node: NGCNode, id: string): NGCNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function updateNodeProperty(node: NGCNode, nodeId: string, key: string, value: string): NGCNode {
  if (node.id === nodeId) {
    return { ...node, properties: { ...node.properties, [key]: value } };
  }
  return { ...node, children: node.children.map(c => updateNodeProperty(c, nodeId, key, value)) };
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
  const [code, setCode] = useState(DEFAULT_CODE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'json' | 'html'>('preview');

  const parseResult = useMemo(() => parseNGC(code), [code]);
  const { ast, errors } = parseResult;

  const selectedNode = useMemo(() => {
    if (!ast || !selectedId) return null;
    return findNodeById(ast, selectedId);
  }, [ast, selectedId]);

  const handlePropertyChange = useCallback((nodeId: string, key: string, value: string) => {
    if (!ast) return;
    const updated = updateNodeProperty(ast, nodeId, key, value);
    setCode(astToNGC(updated));
  }, [ast]);

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

  const jsonOutput = useMemo(() => {
    if (!ast) return '// No valid AST';
    return astToJSON(ast);
  }, [ast]);

  const htmlOutput = useMemo(() => {
    if (!ast) return '<!-- No valid AST -->';
    return astToHTML(ast);
  }, [ast]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <NGCToolbar
        errors={errors}
        onExportJSON={() => {}}
        onExportHTML={() => {}}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Explorer */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col" style={{ background: 'hsl(var(--ide-explorer-bg))' }}>
          <div className="ide-panel-header">
            <span>Explorer</span>
          </div>
          <div className="flex-1 overflow-auto">
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

        {/* Right Panel: Preview/JSON/HTML + Properties */}
        <div className="w-96 shrink-0 flex flex-col">
          {/* Output area */}
          <div className="flex-1 flex flex-col border-b border-border min-h-0">
            <div className="ide-panel-header">
              <span>{activeTab === 'preview' ? 'Preview' : activeTab === 'json' ? 'JSON Output' : 'HTML Output'}</span>
            </div>
            <div className="flex-1 overflow-auto">
              {activeTab === 'preview' && <NGCPreview ast={ast} />}
              {activeTab === 'json' && (
                <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap" style={{ background: 'hsl(var(--ide-editor-bg))' }}>
                  {jsonOutput}
                </pre>
              )}
              {activeTab === 'html' && (
                <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap" style={{ background: 'hsl(var(--ide-editor-bg))' }}>
                  {htmlOutput}
                </pre>
              )}
            </div>
          </div>

          {/* Properties */}
          <div className="h-64 shrink-0 flex flex-col">
            <div className="ide-panel-header">
              <span>Properties</span>
              {selectedNode && (
                <span className="ml-auto text-primary normal-case tracking-normal">{selectedNode.name}</span>
              )}
            </div>
            <div className="flex-1 overflow-auto">
              <NGCProperties node={selectedNode} onPropertyChange={handlePropertyChange} />
            </div>
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
