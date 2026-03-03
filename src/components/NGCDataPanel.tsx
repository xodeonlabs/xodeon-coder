import { useMemo } from 'react';
import { NGCNode } from '@/lib/ngc-ast';
import { Database, Table, Trash2 } from 'lucide-react';

interface DataPanelProps {
  ast: NGCNode | null;
}

interface ExtractedList {
  name: string;
  items: string[];
}

interface ExtractedVar {
  name: string;
  value: string;
}

interface DataOperation {
  type: 'Add' | 'Delete' | 'Clear' | 'Get';
  table: string;
  details?: string;
}

function extractDataFromAST(node: NGCNode, vars: ExtractedVar[], lists: ExtractedList[], operations: DataOperation[]) {
  if (node.type === 'Var') {
    const raw = node.name;
    // Check for Data operations
    if (raw.startsWith('Data.')) {
      const addMatch = raw.match(/^Data\.Add\((\w+)\s*,/);
      if (addMatch) {
        operations.push({ type: 'Add', table: addMatch[1], details: raw });
      }
      const getMatch = raw.match(/^Data\.Get\((\w+)\)/);
      if (getMatch) {
        operations.push({ type: 'Get', table: getMatch[1], details: raw });
      }
      const delMatch = raw.match(/^Data\.Delete\((\w+)\s*,/);
      if (delMatch) {
        operations.push({ type: 'Delete', table: delMatch[1], details: raw });
      }
      const clearMatch = raw.match(/^Data\.Clear\((\w+)\)/);
      if (clearMatch) {
        operations.push({ type: 'Clear', table: clearMatch[1], details: raw });
      }
      return;
    }
    if (raw.includes('(') && raw.includes(')')) {
      const inner = raw.match(/\(([^)]+)\)/)?.[1] || '';
      if (inner.includes('=')) {
        const eqIdx = inner.indexOf('=');
        vars.push({ name: inner.substring(0, eqIdx), value: inner.substring(eqIdx + 1).replace(/^"|"$/g, '') });
      } else {
        vars.push({ name: inner, value: '' });
      }
    } else {
      // Properties-based Var
      const varName = raw;
      const val = Object.values(node.properties)[0] || '';
      vars.push({ name: varName, value: val.replace(/^"|"$/g, '') });
    }
  }
  if (node.type === 'List') {
    const raw = node.name;
    if (raw.includes('(') && raw.includes(')')) {
      const inner = raw.match(/\(([^)]+)\)/)?.[1] || '';
      if (inner.includes('=')) {
        const eqIdx = inner.indexOf('=');
        const name = inner.substring(0, eqIdx);
        const itemsStr = inner.substring(eqIdx + 1).replace(/^"|"$/g, '');
        lists.push({ name, items: itemsStr ? itemsStr.split(',').map(s => s.trim()) : [] });
      } else {
        lists.push({ name: inner, items: [] });
      }
    } else {
      const val = Object.values(node.properties)[0] || '';
      lists.push({ name: raw, items: val ? val.replace(/^"|"$/g, '').split(',').map(s => s.trim()) : [] });
    }
  }
  for (const child of node.children) {
    extractDataFromAST(child, vars, lists, operations);
  }
}

export function NGCDataPanel({ ast }: DataPanelProps) {
  const { vars, lists, operations } = useMemo(() => {
    const vars: ExtractedVar[] = [];
    const lists: ExtractedList[] = [];
    const operations: DataOperation[] = [];
    if (ast) extractDataFromAST(ast, vars, lists, operations);
    return { vars, lists, operations };
  }, [ast]);

  const hasData = vars.length > 0 || lists.length > 0 || operations.length > 0;

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <Database className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Geen data gevonden</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Voeg Var() of List() toe aan je code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full p-2 space-y-4">
      {/* Variables */}
      {vars.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            Variabelen
          </h3>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'hsl(var(--ide-panel-header))' }}>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Naam</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Waarde</th>
                </tr>
              </thead>
              <tbody>
                {vars.map((v, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/50 transition-colors">
                    <td className="px-2 py-1.5 font-mono text-primary">{v.name}</td>
                    <td className="px-2 py-1.5 font-mono text-foreground">{v.value || <span className="text-muted-foreground italic">leeg</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lists */}
      {lists.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            Lijsten
          </h3>
          {lists.map((list, i) => (
            <div key={i} className="mb-3">
              <div className="text-xs font-mono text-primary mb-1">{list.name}</div>
              {list.items.length > 0 ? (
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'hsl(var(--ide-panel-header))' }}>
                        <th className="text-left px-2 py-1 text-muted-foreground font-medium w-8">#</th>
                        <th className="text-left px-2 py-1 text-muted-foreground font-medium">Waarde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.items.map((item, j) => (
                        <tr key={j} className="border-t border-border hover:bg-secondary/50 transition-colors">
                          <td className="px-2 py-1 text-muted-foreground">{j}</td>
                          <td className="px-2 py-1 font-mono text-foreground">{item}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic pl-1">Lege lijst</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Data Operations */}
      {operations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            Data Operaties
          </h3>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'hsl(var(--ide-panel-header))' }}>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Tabel</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/50 transition-colors">
                    <td className="px-2 py-1.5 font-mono text-primary">
                      {op.type === 'Get' && 'Ophalen'}
                      {op.type === 'Add' && 'Toevoegen'}
                      {op.type === 'Delete' && 'Verwijderen'}
                      {op.type === 'Clear' && 'Wissen'}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-foreground">{op.table}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
