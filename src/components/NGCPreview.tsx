import { useState, useCallback, useMemo } from 'react';
import { NGCNode } from '@/lib/ngc-ast';
import { createRuntime, NGCRuntime, resolveVarRefs, parseVarDefinition, parseListDefinition, parseDataCommand, clearPersistedState } from '@/lib/ngc-runtime';

interface PreviewProps {
  ast: NGCNode | null;
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

function executeDataCommand(cmd: ReturnType<typeof parseDataCommand>, runtime: NGCRuntime) {
  if (!cmd) return;
  switch (cmd.operation) {
    case 'Add':
      if (cmd.fields) {
        const resolved: Record<string, string> = {};
        for (const [k, v] of Object.entries(cmd.fields)) {
          resolved[k] = resolveVarRefs(v, runtime);
        }
        runtime.dataAdd(cmd.table, resolved);
      }
      break;
    case 'Delete':
      if (cmd.id) {
        runtime.dataDelete(cmd.table, resolveVarRefs(cmd.id, runtime));
      }
      break;
    case 'Clear':
      runtime.dataClear(cmd.table);
      break;
    case 'Get': {
      // Convert table records to list: Data.Get(tableName)
      const records = runtime.dataGet(cmd.table);
      if (records.length > 0) {
        // Create a list with comma-separated values from first record's values
        const listName = `${cmd.table}_list`;
        runtime.listClear(listName);
        records.forEach(record => {
          const values = Object.values(record).filter(v => typeof v === 'string').join(', ');
          runtime.listAdd(listName, values);
        });
      }
      break;
    }
  }
}

/** Execute actions; returns a page name if GaNaar is encountered */
function executeActions(eventNode: NGCNode, runtime: NGCRuntime): string | null {
  let navigateTo: string | null = null;

  for (const child of eventNode.children) {
    // Check for GaNaar navigation command (parsed as Var node with name "GaNaar PageName")
    if (child.name.startsWith('GaNaar ')) {
      const target = child.name.replace(/^GaNaar\s+/, '').replace(/"/g, '').trim();
      navigateTo = target;
      continue;
    }

    if (child.type === 'Var') {
      const def = parseVarDefinition(child.name);
      if (def) {
        const opMatch = child.name.match(/^(\w+)([+\-*/])(.+)$/);
        if (opMatch) {
          const [, varName, op, operand] = opMatch;
          const current = parseFloat(runtime.getVar(varName)) || 0;
          const val = parseFloat(resolveVarRefs(operand, runtime)) || 0;
          let result = current;
          switch (op) {
            case '+': result = current + val; break;
            case '-': result = current - val; break;
            case '*': result = current * val; break;
            case '/': result = val !== 0 ? current / val : 0; break;
          }
          runtime.setVar(varName, String(result));
        } else {
          runtime.setVar(def.varName, resolveVarRefs(cleanStr(def.value), runtime));
        }
      }
    }
    if (child.raw) {
      const dataCmd = parseDataCommand(child.raw.trim());
      if (dataCmd) executeDataCommand(dataCmd, runtime);
    }
    const dataCmd = parseDataCommand(child.name);
    if (dataCmd) executeDataCommand(dataCmd, runtime);
  }

  // Also check event node properties for GaNaar
  if (eventNode.properties.GaNaar) {
    navigateTo = cleanStr(eventNode.properties.GaNaar);
  }

  return navigateTo;
}

function NGCNodeRenderer({
  node,
  runtime,
  onRuntimeChange,
  onNavigate,
}: {
  node: NGCNode;
  runtime: NGCRuntime;
  onRuntimeChange: () => void;
  onNavigate: (pageName: string) => void;
}) {
  const pos = node.properties.Positie ? parsePosition(node.properties.Positie) : { x: 0, y: 0 };
  const size = node.properties.Grootte ? parseSize(node.properties.Grootte) : null;
  const color = node.properties.Kleur ? cleanStr(node.properties.Kleur) : null;
  const rawText = node.properties.Tekst ? cleanStr(node.properties.Tekst) : '';
  const text = resolveVarRefs(rawText, runtime);
  const radius = node.properties.Hoekradius ? cleanStr(node.properties.Hoekradius) : '0';

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    ...(size ? { width: size.w, height: size.h } : {}),
  };

  const handleEvent = (eventName: string) => {
    const eventNode = node.children.find(c => c.type === 'Event' && c.name === eventName);
    if (eventNode) {
      const target = executeActions(eventNode, runtime);
      if (target) {
        onNavigate(target);
      }
      onRuntimeChange();
    }
  };

  switch (node.type) {
    case 'Frame':
      return (
        <div style={{ ...baseStyle, background: color || '#1e293b', borderRadius: `${radius}px`, overflow: 'hidden' }}>
          {node.children.map(child => (
            <NGCNodeRenderer key={child.id} node={child} runtime={runtime} onRuntimeChange={onRuntimeChange} onNavigate={onNavigate} />
          ))}
        </div>
      );

    case 'Button':
      return (
        <button
          style={{
            ...baseStyle,
            background: color || '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: `${radius}px`,
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => handleEvent('Click')}
        >
          {text}
        </button>
      );

    case 'Text':
      return (
        <div style={{ ...baseStyle, color: color || '#fff', fontSize: 16, fontFamily: 'inherit' }}>
          {text}
        </div>
      );

    case 'TextBox': {
      const varName = node.properties.Variabele ? cleanStr(node.properties.Variabele) : '';
      const placeholder = node.properties.Placeholder ? cleanStr(node.properties.Placeholder) : '';
      const currentValue = varName ? runtime.getVar(varName) : text;

      return (
        <input
          style={{
            ...baseStyle,
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
          placeholder={placeholder}
          value={currentValue}
          onChange={(e) => {
            if (varName) {
              runtime.setVar(varName, e.target.value);
              onRuntimeChange();
            }
          }}
        />
      );
    }

    case 'Image': {
      const src = node.properties.Bron ? cleanStr(node.properties.Bron) : '';
      return <img style={{ ...baseStyle, objectFit: 'cover' }} src={src} alt={node.name} />;
    }

    case 'List': {
      const def = parseListDefinition(node.name);
      const items = runtime.getList(def.listName);
      return (
        <div style={{ ...baseStyle, color: '#fff', fontSize: 14, fontFamily: 'inherit' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{def.listName}</div>
          {items.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>(leeg)</div>}
          {items.map((item, i) => (
            <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #334155' }}>
              {resolveVarRefs(item, runtime)}
            </div>
          ))}
        </div>
      );
    }

    case 'If':
    case 'Repeat':
    case 'While': {
      // Render children of control flow nodes
      // In a full implementation, these would evaluate conditions
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {node.children.map(child => (
            <NGCNodeRenderer
              key={child.id}
              node={child}
              runtime={runtime}
              onRuntimeChange={onRuntimeChange}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      );
    }

    case 'Var':
    case 'Function':
    case 'Event':
      return null;

    default:
      return null;
  }
}

function DataTableView({ tableName, records }: { tableName: string; records: Array<Record<string, string>> }) {
  if (records.length === 0) return null;
  const keys = Object.keys(records[0]).filter(k => k !== 'id');

  return (
    <div style={{ margin: '8px 0', background: '#1e293b', borderRadius: 6, padding: 8, fontSize: 12 }}>
      <div style={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: 4 }}>{tableName}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} style={{ textAlign: 'left', padding: '2px 6px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => (
            <tr key={rec.id || i}>
              {keys.map(k => (
                <td key={k} style={{ padding: '2px 6px', borderBottom: '1px solid #334155' }}>{rec[k]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NGCPreview({ ast }: PreviewProps) {
  const [updateCount, forceUpdate] = useState(0);
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  const runtime = useMemo(() => {
    const rt = createRuntime();
    if (ast) initRuntime(ast, rt);
    return rt;
  }, [ast]);

  // Get all pages from AST
  const pages = useMemo(() => {
    if (!ast) return [];
    return ast.children.filter(c => c.type === 'Page');
  }, [ast]);

  // Determine active page
  const activePage = useMemo(() => {
    if (pages.length === 0) return null;
    if (currentPage) {
      const found = pages.find(p => p.name === currentPage);
      if (found) return found;
    }
    return pages[0]; // default to first page
  }, [pages, currentPage]);

  const handleRuntimeChange = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  const handleNavigate = useCallback((pageName: string) => {
    setCurrentPage(pageName);
  }, []);

  const handleReset = useCallback(() => {
    clearPersistedState();
    forceUpdate(n => n + 1);
    window.location.reload();
  }, []);

  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No preview available</p>
      </div>
    );
  }

  const dataTables = Object.entries(runtime.data).filter(([, records]) => records.length > 0);

  return (
    <div className="h-full w-full overflow-auto" style={{ background: '#0f172a' }}>
      {/* Page tabs */}
      {pages.length > 1 && (
        <div style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid #334155',
          background: '#0f172a',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.name)}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontFamily: 'inherit',
                border: 'none',
                borderBottom: activePage?.id === page.id ? '2px solid #3b82f6' : '2px solid transparent',
                background: activePage?.id === page.id ? '#1e293b' : 'transparent',
                color: activePage?.id === page.id ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {page.name}
            </button>
          ))}
        </div>
      )}

      {/* Active page content */}
      <div className="relative w-full" style={{ minHeight: '300px' }}>
        {activePage && (
          <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0f172a' }}>
            {activePage.children.map(child => (
              <NGCNodeRenderer
                key={child.id}
                node={child}
                runtime={runtime}
                onRuntimeChange={handleRuntimeChange}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
