import { useState, useCallback, useEffect, useMemo } from 'react';
import { NGCNode } from '@/lib/ngc-ast';
import { createRuntime, NGCRuntime, resolveVarRefs, parseVarDefinition, parseListDefinition } from '@/lib/ngc-runtime';

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

// Initialize runtime from AST
function initRuntime(ast: NGCNode, runtime: NGCRuntime) {
  if (ast.type === 'Var') {
    const def = parseVarDefinition(ast.name);
    if (def) {
      runtime.setVar(def.varName, cleanStr(def.value));
    }
  }
  if (ast.type === 'List') {
    const def = parseListDefinition(ast.name);
    def.items.forEach(item => runtime.listAdd(def.listName, item));
  }
  ast.children.forEach(child => initRuntime(child, runtime));
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

  // Find event handlers in children
  const getEventAction = (eventName: string) => {
    return node.children.find(c => c.type === 'Event' && c.name === eventName);
  };

  const executeAction = (eventNode: NGCNode) => {
    // Parse action from event's raw content or properties
    // For now support Var operations in event children
    // e.g., Var(score)+1 or Var(name)=Var(input)
    for (const child of eventNode.children) {
      if (child.type === 'Var') {
        const def = parseVarDefinition(child.name);
        if (def) {
          // Check for increment/decrement patterns
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
    }
    onRuntimeChange();
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
      const clickEvent = getEventAction('Click');
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
          onClick={() => clickEvent && executeAction(clickEvent)}
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

export function NGCPreview({ ast }: PreviewProps) {
  const [, forceUpdate] = useState(0);
  
  const runtime = useMemo(() => {
    const rt = createRuntime();
    if (ast) initRuntime(ast, rt);
    return rt;
  }, [ast]);

  const handleRuntimeChange = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No preview available</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto" style={{ background: '#0f172a' }}>
      <div className="relative h-full w-full">
        <NGCNodeRenderer node={ast} runtime={runtime} onRuntimeChange={handleRuntimeChange} />
      </div>
    </div>
  );
}
