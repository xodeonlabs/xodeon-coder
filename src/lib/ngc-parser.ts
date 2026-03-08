import { NGCNode, ParseError, ParseResult, generateId } from './ngc-ast';

interface LineInfo {
  indent: number;
  content: string;
  lineNumber: number;
  isEmpty: boolean;
  isComment: boolean;
}

function analyzeLine(line: string, lineNumber: number): LineInfo {
  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;
  return {
    indent,
    content: trimmed,
    lineNumber,
    isEmpty: trimmed === '',
    isComment: trimmed.startsWith('#'),
  };
}

function parseNodeHeader(content: string): { type: string; name: string } | null {
  // Match patterns like "App:", "Page Home:", "Button Play:", "Click:", "Var(x)=5"
  const eventTypes = ['Click', 'Hover', 'Start', 'Changed'];

  // Event type (no name needed)
  for (const evt of eventTypes) {
    if (content === `${evt}:` || content.startsWith(`${evt}:`)) {
      return { type: 'Event', name: evt };
    }
  }

  // Var assignment: Var(name)=value
  const varMatch = content.match(/^Var\((\w+)\)\s*=\s*(.+)$/);
  if (varMatch) {
    return { type: 'Var', name: `${varMatch[1]}=${varMatch[2]}` };
  }

  // Var operation: Var(name)+1, etc
  const varOpMatch = content.match(/^Var\((\w+)\)\s*([+\-*/])\s*(.+)$/);
  if (varOpMatch) {
    return { type: 'Var', name: `${varOpMatch[1]}${varOpMatch[2]}${varOpMatch[3]}` };
  }

  // List assignment: List(name)="item1,item2"
  const listMatch = content.match(/^List\((\w+)\)\s*=\s*(.+)$/);
  if (listMatch) {
    return { type: 'List', name: `${listMatch[1]}=${listMatch[2]}` };
  }

  // List declaration: List(name)
  const listDeclMatch = content.match(/^List\((\w+)\)$/);
  if (listDeclMatch) {
    return { type: 'List', name: listDeclMatch[1] };
  }

  // Data commands: Data.Add(...), Data.Delete(...), Data.Clear(...)
  const dataMatch = content.match(/^Data\.(Add|Delete|Clear|Get)\(.+\)$/);
  if (dataMatch) {
    return { type: 'Var', name: content };
  }

  // Coins definition: Coins(name)=100
  const coinsDefMatch = content.match(/^Coins\((\w+)\)\s*=\s*(\d+)$/);
  if (coinsDefMatch) {
    return { type: 'Var', name: content };
  }

  // Coins commands: Coins.Add(...), Coins.Remove(...), Coins.Code(...), Coins.Redeem(...)
  const coinsMatch = content.match(/^Coins\.(Add|Remove|Code|Redeem)\(.+\)$/);
  if (coinsMatch) {
    return { type: 'Var', name: content };
  }

  // GaNaar command: GaNaar "PageName" or GaNaar PageName
  const gaNaarMatch = content.match(/^GaNaar\s*=?\s*"?(\w+)"?\s*$/);
  if (gaNaarMatch) {
    return { type: 'Var', name: `GaNaar ${gaNaarMatch[1]}` };
  }

  // Standard node: Type Name:
  const nodeMatch = content.match(/^(\w+)\s+(\w+)\s*:$/);
  if (nodeMatch) {
    return { type: nodeMatch[1], name: nodeMatch[2] };
  }

  // Node without name: Type:
  const simpleMatch = content.match(/^(\w+)\s*:$/);
  if (simpleMatch) {
    return { type: simpleMatch[1], name: simpleMatch[1] };
  }

  return null;
}

function parseProperty(content: string): { key: string; value: string } | null {
  const match = content.match(/^(\w+)\s*=\s*(.+)$/);
  if (match) {
    return { key: match[1], value: match[2] };
  }
  return null;
}

export function parseNGC(code: string): ParseResult {
  const lines = code.split('\n');
  const lineInfos = lines.map((line, i) => analyzeLine(line, i + 1));
  const errors: ParseError[] = [];

  // Find the root App node
  const rootLineIdx = lineInfos.findIndex(l => !l.isEmpty && !l.isComment && l.content.startsWith('App'));
  if (rootLineIdx === -1) {
    errors.push({ line: 1, message: 'No App root node found' });
    return { ast: null, errors };
  }

  let nodeCounter = 0;

  function parseNode(startIdx: number, parentIndent: number, parentPath: string = ''): { node: NGCNode; endIdx: number } | null {
    if (startIdx >= lineInfos.length) return null;

    const headerLine = lineInfos[startIdx];
    if (headerLine.isEmpty || headerLine.isComment) return null;

    const header = parseNodeHeader(headerLine.content);
    if (!header) return null;

    // Generate a stable ID based on type, name, and position in the tree
    const nodePath = `${parentPath}/${header.type}_${header.name}_${nodeCounter++}`;
    const stableId = `ngc_${nodePath.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const node: NGCNode = {
      id: stableId,
      type: header.type as NGCNode['type'],
      name: header.name,
      properties: {},
      children: [],
      line: headerLine.lineNumber,
      endLine: headerLine.lineNumber,
      indent: headerLine.indent,
    };

    let idx = startIdx + 1;
    const childIndent = headerLine.indent + 4; // expect 4-space indent

    while (idx < lineInfos.length) {
      const info = lineInfos[idx];

      if (info.isEmpty || info.isComment) {
        idx++;
        continue;
      }

      // If indent is <= parent indent, this line belongs to a sibling/parent
      if (info.indent <= headerLine.indent) {
        break;
      }

      // Try to parse as property
      const prop = parseProperty(info.content);
      if (prop && !parseNodeHeader(info.content)) {
        node.properties[prop.key] = prop.value;
        node.endLine = info.lineNumber;
        idx++;
        continue;
      }

      // Try to parse as child node
      const childResult = parseNode(idx, headerLine.indent, nodePath);
      if (childResult) {
        node.children.push(childResult.node);
        node.endLine = childResult.node.endLine;
        idx = childResult.endIdx;
        continue;
      }

      // Script line or unknown - store as raw
      node.endLine = info.lineNumber;
      idx++;
    }

    return { node, endIdx: idx };
  }

  const result = parseNode(rootLineIdx, -1, 'root');
  if (!result) {
    errors.push({ line: lineInfos[rootLineIdx].lineNumber, message: 'Failed to parse App node' });
    return { ast: null, errors };
  }

  return { ast: result.node, errors };
}

// Generate NGC code from AST
export function astToNGC(node: NGCNode, indent: number = 0): string {
  const prefix = ' '.repeat(indent);
  let result = '';

  if (node.type === 'Var') {
    // GaNaar command
    if (node.name.startsWith('GaNaar ')) {
      result += `${prefix}${node.name}\n`;
      return result;
    }
    // Data commands stored as Var nodes
    if (node.name.startsWith('Data.')) {
      result += `${prefix}${node.name}\n`;
      return result;
    }
    // Var operations: score+1, score-1, etc.
    const opMatch = node.name.match(/^(\w+)([+\-*/])(.+)$/);
    if (opMatch) {
      result += `${prefix}Var(${opMatch[1]})${opMatch[2]}${opMatch[3]}\n`;
      return result;
    }
    // Var assignment: name=value
    if (node.name.includes('=')) {
      const eqIdx = node.name.indexOf('=');
      result += `${prefix}Var(${node.name.substring(0, eqIdx)})=${node.name.substring(eqIdx + 1)}\n`;
    } else {
      result += `${prefix}Var(${node.name})\n`;
    }
    return result;
  }

  if (node.type === 'List') {
    if (node.name.includes('=')) {
      const [listName, value] = node.name.split('=');
      result += `${prefix}List(${listName})=${value}\n`;
    } else {
      result += `${prefix}List(${node.name})\n`;
    }
    return result;
  }

  if (node.type === 'Event') {
    result += `${prefix}${node.name}:\n`;
  } else if (node.type === 'App') {
    result += `${prefix}App:\n`;
  } else {
    result += `${prefix}${node.type} ${node.name}:\n`;
  }

  // Properties
  for (const [key, value] of Object.entries(node.properties)) {
    result += `${prefix}    ${key}=${value}\n`;
  }

  // Children
  for (const child of node.children) {
    result += astToNGC(child, indent + 4);
  }

  return result;
}
