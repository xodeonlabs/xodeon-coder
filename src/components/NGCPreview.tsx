import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { NGCNode } from '@/lib/ngc-ast';
import { createRuntime, NGCRuntime, resolveVarRefs, parseVarDefinition, parseListDefinition, parseDataCommand, parseCoinsCommand, clearPersistedState } from '@/lib/ngc-runtime';
import { supabase } from '@/integrations/supabase/client';
import { CoinConfirmDialog } from '@/components/CoinConfirmDialog';
import * as LucideIcons from 'lucide-react';

function LucideIcon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  if (!name) return null;
  // Convert kebab-case "arrow-left" to PascalCase "ArrowLeft"
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[pascalName];
  if (!IconComponent || typeof IconComponent !== 'function') return null;
  return <IconComponent size={size} color={color} />;
}

interface PreviewProps {
  ast: NGCNode | null;
  organizationId?: string | null;
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
    // Check for coins definition
    const coinsDef = parseCoinsCommand(ast.name);
    if (coinsDef && coinsDef.operation === 'Set') {
      // Initialize coins with the defined amount if not already set
      if (!(coinsDef.name in runtime.coins)) {
        runtime.coinsSet(coinsDef.name, coinsDef.amount ?? 100);
      }
    }
    // Check for coins code registration
    if (coinsDef && coinsDef.operation === 'RegisterCode') {
      runtime.coinsRegisterCode(coinsDef.name, coinsDef.code!, coinsDef.amount!);
    }

    const def = parseVarDefinition(ast.name);
    if (def && !(def.varName in runtime.variables) && !coinsDef) {
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

/** Evaluate a Zichtbaar expression like Var(pagina)=="login" or "true"/"false" */
function evaluateVisibility(expr: string, runtime: NGCRuntime): boolean {
  if (expr === 'false' || expr === '0') return false;
  if (expr === 'true' || expr === '1') return true;

  // Resolve variable references first
  const resolved = resolveVarRefs(expr, runtime);

  // Handle == comparison
  const eqMatch = resolved.match(/^(.+)==(.+)$/);
  if (eqMatch) {
    const left = eqMatch[1].replace(/^"|"$/g, '').trim();
    const right = eqMatch[2].replace(/^"|"$/g, '').trim();
    return left === right;
  }

  // Handle != comparison
  const neqMatch = resolved.match(/^(.+)!=(.+)$/);
  if (neqMatch) {
    const left = neqMatch[1].replace(/^"|"$/g, '').trim();
    const right = neqMatch[2].replace(/^"|"$/g, '').trim();
    return left !== right;
  }

  // Handle > < >= <=
  const cmpMatch = resolved.match(/^(.+?)(>=|<=|>|<)(.+)$/);
  if (cmpMatch) {
    const left = parseFloat(cmpMatch[1].trim());
    const right = parseFloat(cmpMatch[3].trim());
    switch (cmpMatch[2]) {
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
    }
  }

  return resolved !== '' && resolved !== '0' && resolved !== 'false';
}

interface CoinHandlers {
  add: (name: string, amount: number) => Promise<boolean> | boolean;
  remove: (name: string, amount: number) => Promise<boolean> | boolean;
}

/** Execute actions; returns a page name if GaNaar is encountered */
function executeActions(eventNode: NGCNode, runtime: NGCRuntime, coinHandlers?: CoinHandlers): string | null {
  let navigateTo: string | null = null;

  for (const child of eventNode.children) {
    // Check for GaNaar navigation command (parsed as Var node with name "GaNaar PageName")
    if (child.name.startsWith('GaNaar ')) {
      const target = child.name.replace(/^GaNaar\s+/, '').replace(/"/g, '').trim();
      navigateTo = target;
      continue;
    }

    if (child.type === 'Var') {
      // Handle coins commands
      const coinsCmd = parseCoinsCommand(child.name);
      if (coinsCmd) {
        switch (coinsCmd.operation) {
          case 'Add':
            if (coinHandlers) {
              coinHandlers.add(coinsCmd.name, coinsCmd.amount!);
            } else {
              runtime.coinsAdd(coinsCmd.name, coinsCmd.amount!);
            }
            break;
          case 'Remove':
            if (coinHandlers) {
              coinHandlers.remove(coinsCmd.name, coinsCmd.amount!);
            } else {
              runtime.coinsRemove(coinsCmd.name, coinsCmd.amount!);
            }
            break;
          case 'Code':
            if (coinsCmd.varName) {
              const codeValue = runtime.getVar(coinsCmd.varName);
              const result = runtime.coinsRedeemCode(coinsCmd.name, codeValue);
              runtime.setVar('_coins_result', result.success ? 'success' : 'invalid');
              runtime.setVar('_coins_amount', String(result.amount));
            }
            break;
          case 'RegisterCode':
            runtime.coinsRegisterCode(coinsCmd.name, coinsCmd.code!, coinsCmd.amount!);
            break;
        }
        continue;
      }

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
  coinHandlers,
}: {
  node: NGCNode;
  runtime: NGCRuntime;
  onRuntimeChange: () => void;
  onNavigate: (pageName: string) => void;
  coinHandlers?: CoinHandlers;
}) {
  const pos = node.properties.Positie ? parsePosition(node.properties.Positie) : { x: 0, y: 0 };
  const size = node.properties.Grootte ? parseSize(node.properties.Grootte) : null;
  const color = node.properties.Kleur ? cleanStr(node.properties.Kleur) : null;
  const bg = node.properties.Achtergrond ? cleanStr(node.properties.Achtergrond) : null;
  const rawText = node.properties.Tekst ? cleanStr(node.properties.Tekst) : '';
  const text = resolveVarRefs(rawText, runtime);
  const radius = node.properties.Hoekrond ? cleanStr(node.properties.Hoekrond) : (node.properties.Hoekradius ? cleanStr(node.properties.Hoekradius) : '0');
  const fontSize = node.properties.Lettergrootte ? parseInt(cleanStr(node.properties.Lettergrootte)) : null;
  const border = node.properties.Rand ? cleanStr(node.properties.Rand) : null;
  const visible = node.properties.Zichtbaar ? evaluateVisibility(cleanStr(node.properties.Zichtbaar), runtime) : true;

  const iconName = node.properties.Icoon ? cleanStr(node.properties.Icoon) : '';

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: pos.x,
    top: pos.y,
    ...(size ? { width: size.w, height: size.h } : {}),
  };

  const handleEvent = (eventName: string) => {
    const eventNode = node.children.find(c => c.type === 'Event' && c.name === eventName);
    if (eventNode) {
      const target = executeActions(eventNode, runtime, coinHandlers);
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
          {iconName && <div style={{ padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LucideIcon name={iconName} size={24} color={color || '#fff'} /></div>}
          {node.children.map(child => (
            <NGCNodeRenderer key={child.id} node={child} runtime={runtime} onRuntimeChange={onRuntimeChange} onNavigate={onNavigate} coinHandlers={coinHandlers} />
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
          {iconName && <LucideIcon name={iconName} size={16} color="#fff" />}
          {text && <span style={{ marginLeft: iconName ? 6 : 0 }}>{text}</span>}
        </button>
      );

    case 'Text':
      return (
        <div style={{ ...baseStyle, color: color || '#fff', fontSize: 16, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          {iconName && <LucideIcon name={iconName} size={18} color={color || '#fff'} />}
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
              coinHandlers={coinHandlers}
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

export function NGCPreview({ ast, organizationId }: PreviewProps) {
  const [updateCount, forceUpdate] = useState(0);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [orgBalance, setOrgBalance] = useState<number | null>(null);
  const [coinConfirm, setCoinConfirm] = useState<{ open: boolean; amount: number; description: string; onConfirm: () => void }>({ open: false, amount: 0, description: '', onConfirm: () => {} });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runtime = useMemo(() => {
    const rt = createRuntime();
    if (ast) initRuntime(ast, rt);
    return rt;
  }, [ast, updateCount]);

  // Load org coin balance if app belongs to an org
  useEffect(() => {
    if (!organizationId) return;
    supabase.from('org_coins').select('balance').eq('organization_id', organizationId).eq('name', 'coins').single()
      .then(({ data }) => {
        if (data) setOrgBalance((data as any).balance);
      });
  }, [organizationId, updateCount]);

  // DB-synced coin operations with 10% platform fee
  const PLATFORM_FEE_RATE = 0.10;

  const dbCoinsAdd = useCallback(async (name: string, amount: number): Promise<boolean> => {
    const fee = Math.floor(amount * PLATFORM_FEE_RATE);
    const netAmount = amount - fee;

    // Split coins with collaborators based on accepted contracts
    let collaboratorShare = 0;
    try {
      const { data: contractData } = await supabase.from('collaborator_contracts' as any).select('collaborator_id, percentage').eq('app_id', ast?.id || '').eq('status', 'accepted');
      if (contractData && (contractData as any[]).length > 0) {
        for (const contract of contractData as any[]) {
          const share = Math.floor(netAmount * (contract.percentage / 100));
          collaboratorShare += share;
          // Credit collaborator's coins
          const { data: collabCoin } = await supabase.from('user_coins').select('id, balance').eq('user_id', contract.collaborator_id).maybeSingle();
          if (collabCoin) {
            await supabase.from('user_coins').update({ balance: (collabCoin as any).balance + share, updated_at: new Date().toISOString() } as any).eq('id', (collabCoin as any).id);
          }
        }
      }
    } catch { /* no contracts table or no contracts */ }

    const ownerAmount = netAmount - collaboratorShare;

    if (organizationId) {
      const { data } = await supabase.from('org_coins').select('id, balance').eq('organization_id', organizationId).eq('name', 'coins').single();
      if (!data || (data as any).balance < amount) return false;
      const newOrgBalance = (data as any).balance - amount;
      await supabase.from('org_coins').update({ balance: newOrgBalance, updated_at: new Date().toISOString() } as any).eq('id', (data as any).id);
      runtime.coins[name] = (runtime.coins[name] ?? 0) + ownerAmount;
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase.from('org_coin_transactions').insert({
          organization_id: organizationId, coin_name: 'coins', amount: ownerAmount, type: 'withdraw',
          user_id: authData.user.id, note: `App: Coins.Add(${name}, ${amount}) → ${ownerAmount} na fee+contracts`,
        } as any);
      }
      setOrgBalance(newOrgBalance);
      return true;
    }
    // Personal path
    runtime.coinsAdd(name, ownerAmount);
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: coinRow } = await supabase.from('user_coins').select('id, balance').eq('user_id', authData.user.id).maybeSingle();
      if (coinRow) {
        await supabase.from('user_coins').update({ balance: (coinRow as any).balance + ownerAmount, updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);
      } else {
        await supabase.from('user_coins').insert({ user_id: authData.user.id, balance: 100 + ownerAmount } as any);
      }
    }
    return true;
  }, [organizationId, runtime, ast]);

  const dbCoinsRemoveInternal = useCallback(async (name: string, amount: number): Promise<boolean> => {
    const fee = Math.floor(amount * PLATFORM_FEE_RATE);
    const netReturn = amount - fee;

    if (organizationId) {
      const current = runtime.coins[name] ?? 0;
      if (current < amount) return false;
      runtime.coins[name] = current - amount;
      const { data } = await supabase.from('org_coins').select('id, balance').eq('organization_id', organizationId).eq('name', 'coins').single();
      if (data) {
        const newOrgBalance = (data as any).balance + netReturn;
        await supabase.from('org_coins').update({ balance: newOrgBalance, updated_at: new Date().toISOString() } as any).eq('id', (data as any).id);
        setOrgBalance(newOrgBalance);
      }
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase.from('org_coin_transactions').insert({
          organization_id: organizationId, coin_name: 'coins', amount: netReturn, type: 'deposit',
          user_id: authData.user.id, note: `App: Coins.Remove(${name}, ${amount}) → ${netReturn} na 10% fee`,
        } as any);
        if (fee > 0) {
          await supabase.from('org_coin_transactions').insert({
            organization_id: organizationId, coin_name: 'coins', amount: fee, type: 'platform_fee',
            user_id: authData.user.id, note: `Platformkosten 10% van ${amount}`,
          } as any);
        }
      }
      return true;
    }
    const success = runtime.coinsRemove(name, amount);
    if (!success) return false;
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: coinRow } = await supabase.from('user_coins').select('id, balance').eq('user_id', authData.user.id).maybeSingle();
      if (coinRow) {
        await supabase.from('user_coins').update({ balance: Math.max(0, (coinRow as any).balance - amount), updated_at: new Date().toISOString() } as any).eq('id', (coinRow as any).id);
      }
    }
    return true;
  }, [organizationId, runtime]);

  const dbCoinsRemove = useCallback((name: string, amount: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setCoinConfirm({
        open: true,
        amount,
        description: `${amount} coins worden afgeschreven via Coins.Remove`,
        onConfirm: async () => {
          const result = await dbCoinsRemoveInternal(name, amount);
          resolve(result);
          forceUpdate(c => c + 1);
        },
      });
      // If dialog is cancelled, resolve false
      const checkClosed = setInterval(() => {
        setCoinConfirm(prev => {
          if (!prev.open) {
            clearInterval(checkClosed);
            resolve(false);
          }
          return prev;
        });
      }, 200);
    });
  }, [dbCoinsRemoveInternal]);

  const coinHandlers: CoinHandlers = {
    add: dbCoinsAdd,
    remove: dbCoinsRemove,
  };

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
    return pages[0];
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

      {/* Coins display */}
      {Object.keys(runtime.coins).length > 0 && (
        <div style={{
          position: 'sticky',
          top: pages.length > 1 ? 34 : 0,
          zIndex: 49,
          display: 'flex',
          gap: 8,
          padding: '6px 12px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '1px solid #334155',
          alignItems: 'center',
        }}>
          {Object.entries(runtime.coins).map(([name, balance]) => (
            <div key={name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#fbbf2420',
              border: '1px solid #fbbf2440',
              borderRadius: 20,
              padding: '3px 10px 3px 6px',
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                color: '#78350f',
              }}>¢</div>
              <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>{balance}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{name}</span>
            </div>
          ))}
          {orgBalance !== null && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#3b82f620',
              border: '1px solid #3b82f640',
              borderRadius: 20,
              padding: '3px 10px 3px 6px',
              marginLeft: 'auto',
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                color: '#fff',
              }}>🏢</div>
              <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>{orgBalance}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>kluis</span>
            </div>
          )}
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
                coinHandlers={coinHandlers}
              />
            ))}
          </div>
        )}
      </div>

      <CoinConfirmDialog
        open={coinConfirm.open}
        onOpenChange={(open) => { if (!open) setCoinConfirm(prev => ({ ...prev, open: false })); }}
        amount={coinConfirm.amount}
        description={coinConfirm.description}
        onConfirm={() => { coinConfirm.onConfirm(); setCoinConfirm(prev => ({ ...prev, open: false })); }}
      />
    </div>
  );
}
