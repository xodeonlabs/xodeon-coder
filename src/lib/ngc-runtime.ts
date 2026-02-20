// NGC Runtime - manages variables, lists, and textbox bindings

export interface NGCRuntime {
  variables: Record<string, string>;
  lists: Record<string, string[]>;
  getVar: (name: string) => string;
  setVar: (name: string, value: string) => void;
  getList: (name: string) => string[];
  listAdd: (name: string, value: string) => void;
  listRemove: (name: string, index: number) => void;
  listClear: (name: string) => void;
}

export function createRuntime(): NGCRuntime {
  const variables: Record<string, string> = {};
  const lists: Record<string, string[]> = {};

  return {
    variables,
    lists,
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
  // List(myList)="item1,item2,item3" or just List myList:
  if (name.includes('=')) {
    const eqIdx = name.indexOf('=');
    const listName = name.substring(0, eqIdx);
    const itemsStr = name.substring(eqIdx + 1).replace(/^"|"$/g, '');
    return { listName, items: itemsStr ? itemsStr.split(',').map(s => s.trim()) : [] };
  }
  return { listName: name, items: [] };
}
