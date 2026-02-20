import { NGCNode } from '@/lib/ngc-ast';
import { astToHTML } from '@/lib/ngc-to-html';

interface PreviewProps {
  ast: NGCNode | null;
}

export function NGCPreview({ ast }: PreviewProps) {
  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No preview available</p>
      </div>
    );
  }

  const html = astToHTML(ast);

  return (
    <div className="h-full w-full overflow-auto" style={{ background: '#0f172a' }}>
      <div
        className="relative h-full w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
