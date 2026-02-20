import { useState, useCallback } from 'react';
import { NGCNode, NODE_ICONS, VALID_CHILDREN, NGCNodeType } from '@/lib/ngc-ast';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ExplorerProps {
  ast: NGCNode | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
}

function ExplorerNode({
  node,
  depth,
  selectedId,
  onSelect,
  onContextMenu,
}: {
  node: NGCNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`explorer-node ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(!expanded);
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
        <span className="text-xs">{NODE_ICONS[node.type] || '📁'}</span>
        <span className="truncate text-sm">{node.name}</span>
        <span className="ml-auto text-xs text-muted-foreground opacity-60">{node.type}</span>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NGCExplorer({ ast, selectedId, onSelect, onContextMenu }: ExplorerProps) {
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
      />
    </div>
  );
}
