import { NGCNode } from './ngc-ast';

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

function cleanStr(val: string): string {
  return val.replace(/^"|"$/g, '');
}

function nodeToHTML(node: NGCNode): string {
  const pos = node.properties.Positie ? parsePosition(node.properties.Positie) : { x: 0, y: 0 };
  const size = node.properties.Grootte ? parseSize(node.properties.Grootte) : null;
  const color = node.properties.Kleur ? cleanStr(node.properties.Kleur) : null;
  const text = node.properties.Tekst ? cleanStr(node.properties.Tekst) : '';
  const radius = node.properties.Hoekradius ? cleanStr(node.properties.Hoekradius) : '0';

  const baseStyle = `position:absolute;left:${pos.x}px;top:${pos.y}px;${size ? `width:${size.w}px;height:${size.h}px;` : ''}`;

  switch (node.type) {
    case 'App':
      return `<div style="width:100%;height:100%;position:relative;">${node.children.map(nodeToHTML).join('')}</div>`;

    case 'Page':
      return `<div data-page="${node.name}" style="width:100%;height:100%;position:relative;background:#0f172a;">${node.children.map(nodeToHTML).join('')}</div>`;

    case 'Frame':
      return `<div style="${baseStyle}${color ? `background:${color};` : 'background:#1e293b;'}border-radius:${radius}px;overflow:hidden;">${node.children.map(nodeToHTML).join('')}</div>`;

    case 'Button':
      return `<button style="${baseStyle}${color ? `background:${color};` : 'background:#3b82f6;'}color:#fff;border:none;border-radius:${radius}px;cursor:pointer;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:center;">${text}</button>`;

    case 'Text':
      return `<div style="${baseStyle}${color ? `color:${color};` : 'color:#fff;'}font-size:16px;font-family:inherit;">${text}</div>`;

    case 'TextBox':
      return `<input style="${baseStyle}background:#1e293b;color:#fff;border:1px solid #334155;border-radius:4px;padding:4px 8px;font-size:14px;font-family:inherit;" placeholder="${cleanStr(node.properties.Placeholder || '""')}" value="${text}" />`;

    case 'Image':
      const src = node.properties.Bron ? cleanStr(node.properties.Bron) : '';
      return `<img style="${baseStyle}object-fit:cover;" src="${src}" alt="${node.name}" />`;

    default:
      return '';
  }
}

export function astToHTML(ast: NGCNode): string {
  return nodeToHTML(ast);
}
