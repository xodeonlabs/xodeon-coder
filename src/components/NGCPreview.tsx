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

// Initialize runtime from AST - only set defaults if not already persisted
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

// Execute actions from event children (Var ops, Data ops, List ops)
function executeActions(eventNode: NGCNode, runtime: NGCRuntime) {
  for (const child of eventNode.children) {
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
    // Data commands stored as raw in node name
    if (child.raw) {
      const dataCmd = parseDataCommand(child.raw.trim());
      if (dataCmd) {
        executeDataCommand(dataCmd, runtime);
      }
    }
    // Also check node name for data commands
    const dataCmd = parseDataCommand(child.name);
    if (dataCmd) {
      executeDataCommand(dataCmd, runtime);
    }
  }
}

function executeDataCommand(cmd: ReturnType<typeof parseDataCommand>, runtime: NGCRuntime) {
  if (!cmd) return;
  switch (cmd.operation) {
    case 'Add':
      if (cmd.fields) {
        // Resolve variable references in field values
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
  }
}

function NGCNodeRenderer({ 
  node, 
  runtime, 
  onRuntimeChange 
}: { 
  node: NGCNode; 
  runtime: NGCRuntime;
  onRuntimeChange: () => void;
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

  const getEventAction = (eventName: string) => {
    return node.children.find(c => c.type === 'Event' && c.name === eventName);
  };

  const handleEvent = (eventName: string) => {
    const eventNode = getEventAction(eventName);
    if (eventNode) {
      executeActions(eventNode, runtime);
      onRuntimeChange();
    }
  };

  switch (node.type) {
    case 'App':
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {node.children.map(child => (
            <NGCNodeRenderer key={child.id} node={child} runtime={runtime} onRuntimeChange={onRuntimeChange} />
          ))}
        </div>
      );

    case 'Page':
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0f172a' }}>
          {node.children.map(child => (
            <NGCNodeRenderer key={child.id} node={child} runtime={runtime} onRuntimeChange={onRuntimeChange} />
          ))}
        </div>
      );

    case 'Frame':
      return (
        <div style={{ ...baseStyle, background: color || '#1e293b', borderRadius: `${radius}px`, overflow: 'hidden' }}>
          {node.children.map(child => (
            <NGCNodeRenderer key={child.id} node={child} runtime={runtime} onRuntimeChange={onRuntimeChange} />
          ))}
        </div>
      );

    case 'Button': {
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
    }

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

    case 'Var':
    case 'Function':
    case 'Event':
      return null;

    default:
      return null;
  }
}

// Component to show data tables in preview
function DataTableView({ tableName, records }: { tableName: string; records: Array<Record<string, string>> }) {
  if (records.length === 0) return null;
  const keys = Object.keys(records[0]).filter(k => k !== 'id');
  
  return (
    <div style={{ margin: '8px 0', background: '#1e293b', borderRadius: 6, padding: 8, fontSize: 12 }}>
      <div style={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: 4 }}>📊 {tableName}</div>
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
  
  const runtime = useMemo(() => {
    const rt = createRuntime();
    if (ast) initRuntime(ast, rt);
    return rt;
  }, [ast]);

  const handleRuntimeChange = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  const handleReset = useCallback(() => {
    clearPersistedState();
    forceUpdate(n => n + 1);
    // Force full re-render by reloading
    window.location.reload();
  }, []);

  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No preview available</p>
      </div>
    );
  }

  // Collect data tables for display
  const dataTables = Object.entries(runtime.data).filter(([, records]) => records.length > 0);

  return (
    <div className="h-full w-full overflow-auto" style={{ background: '#0f172a' }}>
      <div className="relative w-full" style={{ minHeight: '300px' }}>
        <NGCNodeRenderer node={ast} runtime={runtime} onRuntimeChange={handleRuntimeChange} />
      </div>
      {dataTables.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #334155' }}>
          {dataTables.map(([name, records]) => (
            <DataTableView key={name} tableName={name} records={records} />
          ))}
        </div>
      )}
      <div style={{ padding: '4px 12px', borderTop: '1px solid #334155' }}>
        <button
          onClick={handleReset}
          style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Reset opgeslagen data
        </button>
      </div>
    </div>
  );
}
