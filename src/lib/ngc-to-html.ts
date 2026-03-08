// NGC to HTML export — converts NGC AST into a standalone HTML file
import { NGCNode } from './ngc-ast';

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

function nodeToHtml(node: NGCNode): string {
  const pos = node.properties.Positie ? parsePosition(node.properties.Positie) : { x: 0, y: 0 };
  const size = node.properties.Grootte ? parseSize(node.properties.Grootte) : null;
  const color = node.properties.Kleur ? cleanStr(node.properties.Kleur) : null;
  const text = node.properties.Tekst ? cleanStr(node.properties.Tekst) : '';
  const radius = node.properties.Hoekrond ? cleanStr(node.properties.Hoekrond) : (node.properties.Hoekradius ? cleanStr(node.properties.Hoekradius) : '0');
  const fontSize = node.properties.Lettergrootte ? parseInt(cleanStr(node.properties.Lettergrootte)) : null;

  const sizeStyle = size ? `width:${size.w}px;height:${size.h}px;` : '';
  const baseStyle = `position:absolute;left:${pos.x}px;top:${pos.y}px;${sizeStyle}`;

  switch (node.type) {
    case 'Text':
      return `<div style="${baseStyle}color:${color || '#fff'};font-size:${fontSize || 16}px;display:flex;align-items:center;">${escHtml(text)}</div>`;

    case 'Button':
      return `<button style="${baseStyle}background:${color || '#3b82f6'};color:#fff;border:none;border-radius:${radius}px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;font-family:inherit;">${escHtml(text)}</button>`;

    case 'TextBox': {
      const placeholder = node.properties.Placeholder ? cleanStr(node.properties.Placeholder) : '';
      return `<input style="${baseStyle}background:#1e293b;color:#fff;border:1px solid #334155;border-radius:4px;padding:4px 8px;font-size:14px;" placeholder="${escAttr(placeholder)}" value="${escAttr(text)}" />`;
    }

    case 'Image': {
      const src = node.properties.Bron ? cleanStr(node.properties.Bron) : '';
      return `<img style="${baseStyle}object-fit:cover;" src="${escAttr(src)}" alt="${escAttr(node.name)}" />`;
    }

    case 'Frame': {
      const children = node.children
        .filter(c => c.type !== 'Event' && c.type !== 'Var')
        .map(c => nodeToHtml(c)).join('\n');
      return `<div style="${baseStyle}background:${color || '#1e293b'};border-radius:${radius}px;overflow:hidden;">\n${children}\n</div>`;
    }

    default:
      return '';
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function exportToHtml(ast: NGCNode, appName: string): string {
  // Find all pages
  const pages = ast.children.filter(c => c.type === 'Page');
  if (pages.length === 0) return '<html><body><p>Geen pagina\'s gevonden</p></body></html>';

  const pageSections = pages.map((page, i) => {
    const bg = page.properties.Achtergrond ? cleanStr(page.properties.Achtergrond) : '#0f172a';
    const children = page.children
      .filter(c => c.type !== 'Event' && c.type !== 'Var' && c.type !== 'List')
      .map(c => nodeToHtml(c)).join('\n      ');

    return `
    <div id="page-${i}" class="page" style="background:${bg};position:relative;width:100%;min-height:100vh;${i > 0 ? 'display:none;' : ''}">
      ${children}
    </div>`;
  });

  // Navigation tabs if multiple pages
  const tabs = pages.length > 1
    ? `<div style="position:fixed;bottom:0;left:0;right:0;display:flex;background:#1e293b;border-top:1px solid #334155;z-index:100;">
${pages.map((p, i) => `      <button onclick="showPage(${i})" style="flex:1;padding:10px;color:#94a3b8;background:none;border:none;cursor:pointer;font-size:13px;">${escHtml(p.name)}</button>`).join('\n')}
    </div>`
    : '';

  const script = pages.length > 1
    ? `<script>
function showPage(idx) {
  document.querySelectorAll('.page').forEach((el, i) => {
    el.style.display = i === idx ? '' : 'none';
  });
}
</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(appName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; overflow-x: hidden; }
    button:hover { opacity: 0.9; }
    input:focus { outline: 2px solid #3b82f6; }
  </style>
</head>
<body>
  ${pageSections.join('\n')}
  ${tabs}
  ${script}
</body>
</html>`;
}
