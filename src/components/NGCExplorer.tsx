import { useState, useCallback, useRef, useEffect } from 'react';
import { NGCNode, NODE_ICONS, VALID_CHILDREN, NGCNodeType } from '@/lib/ngc-ast';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ExplorerProps {
  ast: NGCNode | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
}

function ExplorerNode({
  node,
  depth,
  selectedId,
  onSelect,
  onContextMenu,
  onRename,
  onDelete,
}: {
  node: NGCNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.name) {
      onRename(node.id, trimmed);
    } else {
      setEditValue(node.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editing && isSelected && e.key === 'Delete' && node.type !== 'App') {
      e.preventDefault();
      onDelete(node.id);
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <div
        className={`explorer-node ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        tabIndex={0}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (node.type !== 'App') {
            setEditing(true);
            setEditValue(node.name);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onSelect(node.id);
          onContextMenu(e, node.id);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="text-xs">{NODE_ICONS[node.type] || ''}</span>
        {editing ? (
          <input
            ref={inputRef}
            className="bg-transparent border border-primary text-sm text-foreground outline-none px-1 rounded w-full min-w-0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setEditing(false);
                setEditValue(node.name);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-sm">{node.name}</span>
        )}
        {!editing && (
          <span className="ml-auto text-xs text-muted-foreground opacity-60">{node.type}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ExplorerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NGCExplorer({ ast, selectedId, onSelect, onContextMenu, onRename, onDelete }: ExplorerProps) {
  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">No valid AST</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full py-1">
      <ExplorerNode
        node={ast}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
        onRename={onRename}
        onDelete={onDelete}
      />
    </div>
  );
}