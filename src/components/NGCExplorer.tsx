import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { NGCNode, NODE_ICONS, VALID_CHILDREN, NGCNodeType } from '@/lib/ngc-ast';
import { ChevronRight, ChevronDown, Search, X } from 'lucide-react';

interface ExplorerProps {
  ast: NGCNode | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
}

// Check if a node or any descendant matches the search query
function nodeMatchesSearch(node: NGCNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q) || node.type.toLowerCase().includes(q)) return true;
  return node.children.some(c => nodeMatchesSearch(c, q));
}

function ExplorerNode({
  node,
  depth,
  selectedId,
  onSelect,
  onContextMenu,
  onRename,
  onDelete,
  searchQuery,
}: {
  node: NGCNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSearch = searchQuery.length > 0;
  const filteredChildren = hasSearch
    ? node.children.filter(c => nodeMatchesSearch(c, searchQuery))
    : node.children;
  const hasChildren = filteredChildren.length > 0;
  const isExpanded = hasSearch ? true : expanded;
  const isSelected = selectedId === node.id;
  const isMatch = hasSearch && (node.name.toLowerCase().includes(searchQuery.toLowerCase()) || node.type.toLowerCase().includes(searchQuery.toLowerCase()));

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
        className={`explorer-node ${isSelected ? 'active' : ''} ${isMatch ? 'bg-primary/10' : ''}`}
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
          isExpanded ? (
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
      {isExpanded && hasChildren && (
        <div>
          {filteredChildren.map((child) => (
            <ExplorerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onRename={onRename}
              onDelete={onDelete}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NGCExplorer({ ast, selectedId, onSelect, onContextMenu, onRename, onDelete }: ExplorerProps) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">No valid AST</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek element..."
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="overflow-auto flex-1 py-1">
        <ExplorerNode
          node={ast}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onRename={onRename}
          onDelete={onDelete}
          searchQuery={search}
        />
      </div>
    </div>
  );
}