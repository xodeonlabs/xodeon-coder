import { useEffect, useRef } from 'react';
import { NGCNode, VALID_CHILDREN, NGCNodeType, NODE_ICONS } from '@/lib/ngc-ast';
import { useTranslation } from 'react-i18next';

interface ContextMenuProps {
  x: number;
  y: number;
  node: NGCNode;
  onClose: () => void;
  onAddChild: (parentId: string, type: NGCNodeType) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
}

export function NGCContextMenu({
  x,
  y,
  node,
  onClose,
  onAddChild,
  onDelete,
  onDuplicate,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const validChildren = VALID_CHILDREN[node.type] || [];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] rounded border border-border shadow-xl"
      style={{
        left: x,
        top: y,
        background: 'hsl(var(--ide-context-menu))',
      }}
    >
      {validChildren.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-semibold">
            {t('editor.addObject')}
          </div>
          {validChildren.map((type) => (
            <button
              key={type}
              className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 transition-colors"
              onClick={() => {
                onAddChild(node.id, type);
                onClose();
              }}
            >
              <span className="text-xs">{NODE_ICONS[type]}</span>
              {type}
            </button>
          ))}
          <div className="border-t border-border my-1" />
        </>
      )}
      {node.type !== 'App' && (
        <>
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-secondary transition-colors"
            onClick={() => {
              onDuplicate(node.id);
              onClose();
            }}
          >
            {t('editor.duplicate')}
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-secondary transition-colors"
            onClick={() => {
              onDelete(node.id);
              onClose();
            }}
          >
            {t('editor.delete')}
          </button>
        </>
      )}
    </div>
  );
}
