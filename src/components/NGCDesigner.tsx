import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { NGCNode, NGCNodeType, DEFAULT_PROPERTIES, generateId } from '@/lib/ngc-ast';
import { createRuntime, NGCRuntime, resolveVarRefs, parseVarDefinition, parseListDefinition, parseDataCommand, clearPersistedState } from '@/lib/ngc-runtime';
import { Move, MousePointer, Plus, Trash2 } from 'lucide-react';

interface DesignerProps {
  ast: NGCNode | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange: (nodeId: string, x: number, y: number) => void;
  onSizeChange: (nodeId: string, w: number, h: number) => void;
  onDropNew: (parentId: string, type: NGCNodeType, x: number, y: number) => void;
  onDelete?: (nodeId: string) => void;
  onPropertyChange?: (nodeId: string, key: string, value: string) => void;
}

function cleanStr(val: string): string {
  return val.replace(/^"|"$/g, '');
}

function parsePosition(pos: string): { x: number; y: number } {
  const clean = pos.replace(/"/g, '');
  const [x, y] = clean.split(',').map(Number);
  return { x: x || 0, y: y || 0 };
}

function parseSize(size: string): { w: number; h: number } {
  const clean = size.replace(/"/g, '');
  const [w, h] = clean.split(',').map(Number);
  return { w: w || 100, h: h || 40 };
}

function initRuntime(ast: NGCNode, runtime: NGCRuntime) {
  if (ast.type === 'Var') {
    const def = parseVarDefinition(ast.name);
    if (def && !(def.varName in runtime.variables)) {
      runtime.setVar(def.varName, cleanStr(def.value));
    }
  }
  if (ast.type === 'List') {
    const def = parseListDefinition(ast.name);
    if (!runtime.lists[def.listName]) {
      def.items.forEach(item => runtime.listAdd(def.listName, item));
    }
  }
  ast.children.forEach(child => initRuntime(child, runtime));
}

// Draggable wrapper for designer components
function DraggableNode({
  node,
  runtime,
  selectedId,
  onSelect,
  onPositionChange,
  onSizeChange,
  onDelete,
  onPropertyChange,
  children,
}: {
  node: NGCNode;
  runtime: NGCRuntime;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange: (nodeId: string, x: number, y: number) => void;
  onSizeChange: (nodeId: string, w: number, h: number) => void;
  onDelete?: (nodeId: string) => void;
  onPropertyChange?: (nodeId: string, key: string, value: string) => void;
  children: React.ReactNode;
}) {
  const pos = node.properties.Positie ? parsePosition(node.properties.Positie) : { x: 0, y: 0 };
  const size = node.properties.Grootte ? parseSize(node.properties.Grootte) : null;
  const isSelected = selectedId === node.id;
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(node.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const newX = Math.max(0, Math.round(dragRef.current.origX + dx));
      const newY = Math.max(0, Math.round(dragRef.current.origY + dy));
      onPositionChange(node.id, newX, newY);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, pos.x, pos.y, onSelect, onPositionChange]);

  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!size) return;
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      const newW = Math.max(20, Math.round(resizeRef.current.origW + dx));
      const newH = Math.max(20, Math.round(resizeRef.current.origH + dy));
      onSizeChange(node.id, newW, newH);
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, size, onSizeChange]);

  const isImageNode = node.type === 'Image';

  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    if (!isImageNode) return;
    if (e.dataTransfer.types.includes('ngc/image-url')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isImageNode]);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    if (!isImageNode) return;
    const url = e.dataTransfer.getData('ngc/image-url');
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    onPropertyChange?.(node.id, 'Bron', `"${url}"`);
  }, [isImageNode, node.id, onPropertyChange]);

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        ...(size ? { width: size.w, height: size.h } : {}),
        outline: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(59,130,246,0.3)',
        outlineOffset: 2,
        cursor: 'move',
        zIndex: isSelected ? 100 : 1,
      }}
      onMouseDown={handleMouseDown}
      onClick={e => { e.stopPropagation(); onSelect(node.id); }}
      onDragOver={handleImageDragOver}
      onDrop={handleImageDrop}
    >
      {children}

      {/* Component label */}
      <div
        style={{
          position: 'absolute',
          top: -18,
          left: 0,
          fontSize: 9,
          color: isSelected ? '#3b82f6' : '#64748b',
          background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(15,23,42,0.8)',
          padding: '1px 4px',
          borderRadius: 2,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {node.type}: {node.name}
      </div>

      {/* Delete button */}
      {isSelected && onDelete && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          style={{
            position: 'absolute',
            top: -18,
            right: 0,
            width: 16,
            height: 16,
            background: '#ef4444',
            border: 'none',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 200,
          }}
          title="Verwijderen"
        >
          <Trash2 size={10} color="#fff" />
        </button>
      )}

      {/* Resize handle */}
      {isSelected && size && (
        <div
          onMouseDown={handleResizeDown}
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 8,
            height: 8,
            background: '#3b82f6',
            borderRadius: 2,
            cursor: 'nwse-resize',
            zIndex: 200,
          }}
        />
      )}
    </div>
  );
}

// Render a node visually (non-interactive content)
function DesignerNodeContent({ node, runtime }: { node: NGCNode; runtime: NGCRuntime }) {
  const size = node.properties.Grootte ? parseSize(node.properties.Grootte) : null;
  const color = node.properties.Kleur ? cleanStr(node.properties.Kleur) : null;
  const rawText = node.properties.Tekst ? cleanStr(node.properties.Tekst) : '';
  const text = resolveVarRefs(rawText, runtime);
  const radius = node.properties.Hoekradius ? cleanStr(node.properties.Hoekradius) : '0';

  switch (node.type) {
    case 'Frame':
      return (
        <div style={{ width: '100%', height: '100%', background: color || 'rgb(30,41,59)', borderRadius: `${radius}px`, overflow: 'hidden', position: 'relative' }}>
        </div>
      );
    case 'Button':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: color || 'rgb(59,130,246)', color: '#fff',
          borderRadius: `${radius}px`,
          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      );
    case 'Text':
      return (
        <div style={{ width: '100%', height: '100%', color: color || '#fff', fontSize: 16, pointerEvents: 'none' }}>
          {text}
        </div>
      );
    case 'TextBox': {
      const placeholder = node.properties.Placeholder ? cleanStr(node.properties.Placeholder) : '';
      return (
        <input
          style={{
            width: '100%', height: '100%',
            background: '#1e293b', color: '#fff',
            border: '1px solid #334155', borderRadius: 4,
            padding: '4px 8px', fontSize: 14,
            pointerEvents: 'none',
          }}
          placeholder={placeholder}
          value={text}
          readOnly
        />
      );
    }
    case 'Image': {
      const src = node.properties.Bron ? cleanStr(node.properties.Bron) : '';
      return <img style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} src={src} alt={node.name} />;
    }
    default:
      return null;
  }
}

// Draggable component palette item
const PALETTE_ITEMS: { type: NGCNodeType; label: string; icon: string }[] = [
  { type: 'Button', label: 'Knop', icon: '🔘' },
  { type: 'Text', label: 'Tekst', icon: '📝' },
  { type: 'TextBox', label: 'Invoer', icon: '✏️' },
  { type: 'Image', label: 'Afbeelding', icon: '🖼️' },
  { type: 'Frame', label: 'Frame', icon: '📦' },
];

export function NGCDesigner({ ast, selectedId, onSelect, onPositionChange, onSizeChange, onDropNew, onDelete, onPropertyChange }: DesignerProps) {
  const [updateCount, forceUpdate] = useState(0);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const runtime = useMemo(() => {
    const rt = createRuntime();
    if (ast) initRuntime(ast, rt);
    return rt;
  }, [ast]);

  const pages = useMemo(() => {
    if (!ast) return [];
    return ast.children.filter(c => c.type === 'Page');
  }, [ast]);

  const activePage = useMemo(() => {
    if (pages.length === 0) return null;
    if (currentPage) {
      const found = pages.find(p => p.name === currentPage);
      if (found) return found;
    }
    return pages[0];
  }, [pages, currentPage]);

  // Get draggable children (visual components only)
  const visualChildren = useMemo(() => {
    if (!activePage) return [];
    return activePage.children.filter(c =>
      ['Frame', 'Button', 'Text', 'TextBox', 'Image'].includes(c.type)
    );
  }, [activePage]);

  // Collect all draggable nodes recursively (including inside frames)
  function collectDraggableNodes(nodes: NGCNode[], parentId: string): { node: NGCNode; parentId: string }[] {
    const result: { node: NGCNode; parentId: string }[] = [];
    for (const node of nodes) {
      if (['Frame', 'Button', 'Text', 'TextBox', 'Image'].includes(node.type)) {
        result.push({ node, parentId });
        if (node.type === 'Frame') {
          result.push(...collectDraggableNodes(node.children, node.id));
        }
      }
    }
    return result;
  }

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('ngc/component-type') as NGCNodeType;
    if (!type || !activePage || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    onDropNew(activePage.id, type, x, y);
  }, [activePage, onDropNew]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Keyboard delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && onDelete) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        onDelete(selectedId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, onDelete]);

  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">Geen preview beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#0f172a' }}>
      {/* Designer toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/30 shrink-0" style={{ background: 'hsl(var(--ide-toolbar))' }}>
        <MousePointer className="h-3 w-3 text-primary mr-1" />
        <span className="text-[10px] text-primary font-medium mr-3">ONTWERP MODUS</span>

        {/* Draggable palette */}
        <div className="flex items-center gap-0.5">
          {PALETTE_ITEMS.map(item => (
            <div
              key={item.type}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('ngc/component-type', item.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded cursor-grab active:cursor-grabbing hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
              title={`Sleep ${item.label} naar het canvas`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Page tabs */}
      {pages.length > 1 && (
        <div className="flex border-b border-border/30 shrink-0" style={{ background: '#0f172a' }}>
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.name)}
              className="px-3 py-1 text-[11px] transition-colors"
              style={{
                borderBottom: activePage?.id === page.id ? '2px solid #3b82f6' : '2px solid transparent',
                background: activePage?.id === page.id ? '#1e293b' : 'transparent',
                color: activePage?.id === page.id ? '#e2e8f0' : '#64748b',
              }}
            >
              {page.name}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto"
        style={{ background: '#0f172a', minHeight: 400 }}
        onClick={() => onSelect(null)}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
          }}
        />

        {visualChildren.map(child => (
          <DraggableNode
            key={child.id}
            node={child}
            runtime={runtime}
            selectedId={selectedId}
            onSelect={onSelect}
            onPositionChange={onPositionChange}
            onSizeChange={onSizeChange}
            onDelete={onDelete}
            onPropertyChange={onPropertyChange}
          >
            <DesignerNodeContent node={child} runtime={runtime} />
          </DraggableNode>
        ))}
      </div>
    </div>
  );
}
