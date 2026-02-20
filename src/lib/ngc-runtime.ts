// NGC Runtime - manages variables, lists, data storage, and textbox bindings

export interface DataRecord {
  id: string;
  [key: string]: string;
}

export interface DataTable {
  name: string;
  records: DataRecord[];
}

export interface NGCRuntime {
  variables: Record<string, string>;
  lists: Record<string, string[]>;
  data: Record<string, DataRecord[]>;
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
}

let dataIdCounter = 0;
function generateDataId(): string {
  return `rec_${Date.now()}_${dataIdCounter++}`;
}

export function createRuntime(): NGCRuntime {
  const variables: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  const data: Record<string, DataRecord[]> = {};

  return {
    variables,
    lists,
    data,
    getVar(name: string) {
      return variables[name] ?? '';
    },
    setVar(name: string, value: string) {
      variables[name] = value;
    },
    getList(name: string) {
      if (!lists[name]) lists[name] = [];
      return lists[name];
    },
    listAdd(name: string, value: string) {
      if (!lists[name]) lists[name] = [];
      lists[name].push(value);
    },
    listRemove(name: string, index: number) {
      if (lists[name]) {
        lists[name].splice(index, 1);
      }
    },
    listClear(name: string) {
      lists[name] = [];
    },
    dataAdd(table: string, record: Record<string, string>) {
      if (!data[table]) data[table] = [];
      data[table].push({ id: generateDataId(), ...record });
    },
    dataDelete(table: string, id: string) {
      if (data[table]) {
        data[table] = data[table].filter(r => r.id !== id);
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
    },
    dataUpdate(table: string, id: string, key: string, value: string) {
      if (data[table]) {
        const rec = data[table].find(r => r.id === id);
        if (rec) rec[key] = value;
      }
    },
  };
}

// Resolve variable references in text like Var(name)
export function resolveVarRefs(text: string, runtime: NGCRuntime): string {
  return text.replace(/Var\((\w+)\)/g, (_, name) => runtime.getVar(name));
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

// Parse Data commands like Data.Add(table, key=value, key2=value2)
// Data.Delete(table, id) / Data.Clear(table)
export interface DataCommand {
  operation: 'Add' | 'Delete' | 'Clear' | 'Get';
  table: string;
  fields?: Record<string, string>;
  id?: string;
}

export function parseDataCommand(content: string): DataCommand | null {
  // Data.Add(tableName, key="value", key2="value2")
  const addMatch = content.match(/^Data\.Add\((\w+)\s*,\s*(.+)\)$/);
  if (addMatch) {
    const table = addMatch[1];
    const fieldsStr = addMatch[2];
    const fields: Record<string, string> = {};
    // Parse key=value pairs (value can be "string", word, or Var(name))
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

  // Data.Delete(tableName, id)
  const delMatch = content.match(/^Data\.Delete\((\w+)\s*,\s*(.+)\)$/);
  if (delMatch) {
    return { operation: 'Delete', table: delMatch[1], id: delMatch[2].replace(/^"|"$/g, '') };
  }

  // Data.Clear(tableName)
  const clearMatch = content.match(/^Data\.Clear\((\w+)\)$/);
  if (clearMatch) {
    return { operation: 'Clear', table: clearMatch[1] };
  }

  return null;
}
