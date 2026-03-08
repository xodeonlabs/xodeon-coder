// NGC Runtime - manages variables, lists, data storage, coins, and textbox bindings

export interface DataRecord {
  id: string;
  [key: string]: string;
}

export interface DataTable {
  name: string;
  records: DataRecord[];
}

export interface CoinCode {
  code: string;
  amount: number;
  used: boolean;
}

export interface NGCRuntime {
  variables: Record<string, string>;
  lists: Record<string, string[]>;
  data: Record<string, DataRecord[]>;
  coins: Record<string, number>;
  ownerCoins: Record<string, number>;
  coinCodes: Record<string, CoinCode[]>;
  getVar: (name: string) => string;
  setVar: (name: string, value: string) => void;
  getList: (name: string) => string[];
  listAdd: (name: string, value: string) => void;
  listRemove: (name: string, index: number) => void;
  listClear: (name: string) => void;
  dataAdd: (table: string, record: Record<string, string>) => void;
  dataDelete: (table: string, id: string) => void;
  dataGet: (table: string) => DataRecord[];
  dataFind: (table: string, key: string, value: string) => DataRecord | undefined;
  dataClear: (table: string) => void;
  dataUpdate: (table: string, id: string, key: string, value: string) => void;
  // Coins API — trade-based: coins transfer between owner pool and user
  coinsGet: (name: string) => number;
  coinsOwnerGet: (name: string) => number;
  coinsSet: (name: string, amount: number) => void;
  coinsOwnerSet: (name: string, amount: number) => void;
  coinsAdd: (name: string, amount: number) => boolean; // owner→user transfer
  coinsRemove: (name: string, amount: number) => boolean; // user→owner transfer
  coinsRegisterCode: (name: string, code: string, amount: number) => void;
  coinsRedeemCode: (name: string, code: string) => { success: boolean; amount: number };
}

const STORAGE_KEY = 'ngc_runtime_state';

let dataIdCounter = 0;
function generateDataId(): string {
  return `rec_${Date.now()}_${dataIdCounter++}`;
}

function saveState(
  variables: Record<string, string>,
  lists: Record<string, string[]>,
  data: Record<string, DataRecord[]>,
  coins: Record<string, number>,
  ownerCoins: Record<string, number>,
  coinCodes: Record<string, CoinCode[]>
) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ variables, lists, data, coins, ownerCoins, coinCodes }));
  } catch { /* ignore quota errors */ }
}

function loadState(): {
  variables: Record<string, string>;
  lists: Record<string, string[]>;
  data: Record<string, DataRecord[]>;
  coins: Record<string, number>;
  ownerCoins: Record<string, number>;
  coinCodes: Record<string, CoinCode[]>;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createRuntime(): NGCRuntime {
  const saved = loadState();
  const variables: Record<string, string> = saved?.variables ?? {};
  const lists: Record<string, string[]> = saved?.lists ?? {};
  const data: Record<string, DataRecord[]> = saved?.data ?? {};
  const coins: Record<string, number> = saved?.coins ?? {};
  const ownerCoins: Record<string, number> = saved?.ownerCoins ?? {};
  const coinCodes: Record<string, CoinCode[]> = saved?.coinCodes ?? {};

  const save = () => saveState(variables, lists, data, coins, ownerCoins, coinCodes);

  return {
    variables,
    lists,
    data,
    coins,
    ownerCoins,
    coinCodes,
    getVar(name: string) {
      return variables[name] ?? '';
    },
    setVar(name: string, value: string) {
      variables[name] = value;
      save();
    },
    getList(name: string) {
      if (!lists[name]) lists[name] = [];
      return lists[name];
    },
    listAdd(name: string, value: string) {
      if (!lists[name]) lists[name] = [];
      lists[name].push(value);
      save();
    },
    listRemove(name: string, index: number) {
      if (lists[name]) {
        lists[name].splice(index, 1);
        save();
      }
    },
    listClear(name: string) {
      lists[name] = [];
      save();
    },
    dataAdd(table: string, record: Record<string, string>) {
      if (!data[table]) data[table] = [];
      data[table].push({ id: generateDataId(), ...record });
      save();
    },
    dataDelete(table: string, id: string) {
      if (data[table]) {
        data[table] = data[table].filter(r => r.id !== id);
        save();
      }
    },
    dataGet(table: string) {
      if (!data[table]) data[table] = [];
      return data[table];
    },
    dataFind(table: string, key: string, value: string) {
      if (!data[table]) return undefined;
      return data[table].find(r => r[key] === value);
    },
    dataClear(table: string) {
      data[table] = [];
      save();
    },
    dataUpdate(table: string, id: string, key: string, value: string) {
      if (data[table]) {
        const rec = data[table].find(r => r.id === id);
        if (rec) {
          rec[key] = value;
          save();
        }
      }
    },

    // Coins API — trade-based: transfers between owner pool and user
    coinsGet(name: string) {
      return coins[name] ?? 0;
    },
    coinsOwnerGet(name: string) {
      return ownerCoins[name] ?? 0;
    },
    coinsSet(name: string, amount: number) {
      coins[name] = Math.max(0, amount);
      save();
    },
    coinsOwnerSet(name: string, amount: number) {
      ownerCoins[name] = Math.max(0, amount);
      save();
    },
    // Coins.Add: transfer from owner → user
    coinsAdd(name: string, amount: number) {
      const ownerCurrent = ownerCoins[name] ?? 0;
      if (ownerCurrent < amount) return false;
      ownerCoins[name] = ownerCurrent - amount;
      coins[name] = (coins[name] ?? 0) + amount;
      save();
      return true;
    },
    // Coins.Remove: transfer from user → owner
    coinsRemove(name: string, amount: number) {
      const current = coins[name] ?? 0;
      if (current < amount) return false;
      coins[name] = current - amount;
      ownerCoins[name] = (ownerCoins[name] ?? 0) + amount;
      save();
      return true;
    },
    coinsRegisterCode(name: string, code: string, amount: number) {
      if (!coinCodes[name]) coinCodes[name] = [];
      // Don't register duplicate codes
      if (!coinCodes[name].find(c => c.code === code)) {
        coinCodes[name].push({ code, amount, used: false });
        save();
      }
    },
    coinsRedeemCode(name: string, code: string) {
      if (!coinCodes[name]) return { success: false, amount: 0 };
      const entry = coinCodes[name].find(c => c.code === code && !c.used);
      if (!entry) return { success: false, amount: 0 };
      entry.used = true;
      coins[name] = (coins[name] ?? 0) + entry.amount;
      save();
      return { success: true, amount: entry.amount };
    },
  };
}

// Resolve variable references in text like Var(name) or {name}
// Also resolves Coins(name) to the current coin balance
export function resolveVarRefs(text: string, runtime: NGCRuntime): string {
  return text
    .replace(/Var\((\w+)\)/g, (_, name) => runtime.getVar(name))
    .replace(/Coins\((\w+)\)/g, (_, name) => String(runtime.coinsGet(name)))
    .replace(/OwnerCoins\((\w+)\)/g, (_, name) => String(runtime.coinsOwnerGet(name)))
    .replace(/\{(\w+)\}/g, (_, name) => runtime.getVar(name));
}

// Parse Var node name to extract variable name and initial value
export function parseVarDefinition(name: string): { varName: string; value: string } | null {
  if (name.includes('=')) {
    const eqIdx = name.indexOf('=');
    return { varName: name.substring(0, eqIdx), value: name.substring(eqIdx + 1) };
  }
  return { varName: name, value: '' };
}

// Parse List node name to extract list name and initial items  
export function parseListDefinition(name: string): { listName: string; items: string[] } {
  if (name.includes('=')) {
    const eqIdx = name.indexOf('=');
    const listName = name.substring(0, eqIdx);
    const itemsStr = name.substring(eqIdx + 1).replace(/^"|"$/g, '');
    return { listName, items: itemsStr ? itemsStr.split(',').map(s => s.trim()) : [] };
  }
  return { listName: name, items: [] };
}

// Parse Coins commands
export interface CoinsCommand {
  operation: 'Set' | 'Add' | 'Remove' | 'Code' | 'RegisterCode';
  name: string;
  amount?: number;
  code?: string;
  varName?: string; // variable name for code input
}

export function parseCoinsCommand(content: string): CoinsCommand | null {
  // Coins(name)=100  →  Set initial value
  const setMatch = content.match(/^Coins\((\w+)\)\s*=\s*(\d+)$/);
  if (setMatch) return { operation: 'Set', name: setMatch[1], amount: parseInt(setMatch[2]) };

  // Coins.Add(name, 50)  →  Add coins
  const addMatch = content.match(/^Coins\.Add\((\w+)\s*,\s*(\d+)\)$/);
  if (addMatch) return { operation: 'Add', name: addMatch[1], amount: parseInt(addMatch[2]) };

  // Coins.Remove(name, 10)  →  Remove coins
  const removeMatch = content.match(/^Coins\.Remove\((\w+)\s*,\s*(\d+)\)$/);
  if (removeMatch) return { operation: 'Remove', name: removeMatch[1], amount: parseInt(removeMatch[2]) };

  // Coins.Code(name, "BUY100", 100)  →  Register a redeemable code
  const codeMatch = content.match(/^Coins\.Code\((\w+)\s*,\s*"([^"]+)"\s*,\s*(\d+)\)$/);
  if (codeMatch) return { operation: 'RegisterCode', name: codeMatch[1], code: codeMatch[2], amount: parseInt(codeMatch[3]) };

  // Coins.Redeem(name, varName)  →  Redeem code from variable
  const redeemMatch = content.match(/^Coins\.Redeem\((\w+)\s*,\s*(\w+)\)$/);
  if (redeemMatch) return { operation: 'Code', name: redeemMatch[1], varName: redeemMatch[2] };

  return null;
}

// Parse Data commands like Data.Add(table, key=value, key2=value2)
// Data.Delete(table, id) / Data.Clear(table)
export interface DataCommand {
  operation: 'Add' | 'Delete' | 'Clear' | 'Get';
  table: string;
  fields?: Record<string, string>;
  id?: string;
}

export function parseDataCommand(content: string): DataCommand | null {
  const addMatch = content.match(/^Data\.Add\((\w+)\s*,\s*(.+)\)$/);
  if (addMatch) {
    const table = addMatch[1];
    const fieldsStr = addMatch[2];
    const fields: Record<string, string> = {};
    const pairs = fieldsStr.match(/(\w+)\s*=\s*("[^"]*"|Var\(\w+\)|\w+)/g);
    if (pairs) {
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
        const k = pair.substring(0, eqIdx).trim();
        const v = pair.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
        fields[k] = v;
      }
    }
    return { operation: 'Add', table, fields };
  }

  const delMatch = content.match(/^Data\.Delete\((\w+)\s*,\s*(.+)\)$/);
  if (delMatch) {
    return { operation: 'Delete', table: delMatch[1], id: delMatch[2].replace(/^"|"$/g, '') };
  }

  const clearMatch = content.match(/^Data\.Clear\((\w+)\)$/);
  if (clearMatch) {
    return { operation: 'Clear', table: clearMatch[1] };
  }

  const getMatch = content.match(/^Data\.Get\((\w+)\)$/);
  if (getMatch) {
    return { operation: 'Get', table: getMatch[1] };
  }

  return null;
}
