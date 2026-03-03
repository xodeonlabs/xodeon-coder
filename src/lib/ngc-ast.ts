// NGC AST Types

export type NGCNodeType =
  | 'App'
  | 'Page'
  | 'Frame'
  | 'Button'
  | 'Text'
  | 'TextBox'
  | 'Image'
  | 'Var'
  | 'Function'
  | 'Event'
  | 'List';

export type EventType = 'Click' | 'Hover' | 'Start' | 'Changed';

export interface NGCNode {
  id: string;
  type: NGCNodeType;
  name: string;
  properties: Record<string, string>;
  children: NGCNode[];
  line: number;
  endLine: number;
  indent: number;
  raw?: string;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  ast: NGCNode | null;
  errors: ParseError[];
}

// Valid children per type
export const VALID_CHILDREN: Record<string, NGCNodeType[]> = {
  App: ['Page', 'Var', 'Function', 'List'],
  Page: ['Frame', 'Button', 'Text', 'TextBox', 'Image', 'Var', 'Function', 'List'],
  Frame: ['Frame', 'Button', 'Text', 'TextBox', 'Image'],
  Button: ['Event'],
  Text: [],
  TextBox: [],
  Image: [],
  Var: [],
  Function: [],
  Event: [],
  List: [],
};

export const DEFAULT_PROPERTIES: Record<string, Record<string, string>> = {
  Button: { Tekst: '"Button"', Positie: '"0,0"', Grootte: '"100,40"', Kleur: '"#3b82f6"', Hoekradius: '"6"' },
  Text: { Tekst: '"Text"', Positie: '"0,0"', Grootte: '"200,30"', Kleur: '"#ffffff"' },
  TextBox: { Tekst: '""', Positie: '"0,0"', Grootte: '"200,30"', Placeholder: '"Type here..."', Variabele: '""' },
  Image: { Bron: '""', Positie: '"0,0"', Grootte: '"100,100"' },
  Frame: { Positie: '"0,0"', Grootte: '"300,200"', Kleur: '"#1e293b"' },
  Page: {},
  Var: {},
  Function: {},
  Event: {},
  List: {},
};

export const NODE_ICONS: Record<string, string> = {
  App: '',
  Page: '',
  Frame: '',
  Button: '',
  Text: '',
  TextBox: '',
  Image: '',
  Var: '',
  Function: '',
  Event: '',
  List: '',
};

let idCounter = 0;
export function generateId(): string {
  return `ngc_${Date.now()}_${idCounter++}`;
}
