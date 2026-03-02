// Splits NGC code into sections: global (App-level vars/lists) + per-page code

export interface CodeSection {
  id: string;       // 'global' or page name
  label: string;    // Display label
  code: string;     // The code for this section
  startLine: number;
  endLine: number;
}

/**
 * Split full NGC code into editable sections:
 * - "Globaal" section: App: line + all top-level Var/List/Function before first Page
 * - One section per Page
 */
export function splitCodeIntoSections(fullCode: string): CodeSection[] {
  const lines = fullCode.split('\n');
  const sections: CodeSection[] = [];

  // Find App: line
  let appLineIdx = lines.findIndex(l => l.trimStart().startsWith('App'));
  if (appLineIdx === -1) appLineIdx = 0;

  // Find all page start lines (indented under App, so typically 4 spaces)
  const pageStarts: { name: string; lineIdx: number }[] = [];
  for (let i = appLineIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    const indent = lines[i].length - trimmed.length;
    if (indent === 4 && trimmed.match(/^Page\s+(\w+)\s*:$/)) {
      const name = trimmed.match(/^Page\s+(\w+)\s*:$/)![1];
      pageStarts.push({ name, lineIdx: i });
    }
  }

  if (pageStarts.length === 0) {
    // No pages found, return entire code as one section
    sections.push({
      id: 'global',
      label: 'App',
      code: fullCode,
      startLine: 1,
      endLine: lines.length,
    });
    return sections;
  }

  // Global section: from App: to just before first Page
  const globalEndIdx = pageStarts[0].lineIdx;
  const globalLines = lines.slice(appLineIdx, globalEndIdx);
  sections.push({
    id: 'global',
    label: 'Globaal',
    code: globalLines.join('\n'),
    startLine: appLineIdx + 1,
    endLine: globalEndIdx,
  });

  // Page sections
  for (let i = 0; i < pageStarts.length; i++) {
    const start = pageStarts[i].lineIdx;
    const end = i + 1 < pageStarts.length ? pageStarts[i + 1].lineIdx : lines.length;
    const pageLines = lines.slice(start, end);
    sections.push({
      id: pageStarts[i].name,
      label: pageStarts[i].name,
      code: pageLines.join('\n'),
      startLine: start + 1,
      endLine: end,
    });
  }

  return sections;
}

/**
 * Merge sections back into full NGC code
 */
export function mergeSections(sections: CodeSection[]): string {
  const globalSection = sections.find(s => s.id === 'global');
  const pageSections = sections.filter(s => s.id !== 'global');

  let result = globalSection?.code || 'App:';
  // Ensure it ends with newline
  if (!result.endsWith('\n')) result += '\n';

  for (const page of pageSections) {
    result += page.code;
    if (!result.endsWith('\n')) result += '\n';
  }

  return result;
}
