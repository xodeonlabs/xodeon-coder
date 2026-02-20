import { NGCNode } from './ngc-ast';

interface JSONNode {
  type: string;
  name: string;
  properties: Record<string, string>;
  children: JSONNode[];
}

function nodeToJSON(node: NGCNode): JSONNode {
  return {
    type: node.type,
    name: node.name,
    properties: { ...node.properties },
    children: node.children.map(nodeToJSON),
  };
}

export function astToJSON(node: NGCNode): string {
  return JSON.stringify(nodeToJSON(node), null, 2);
}
