import { NGCNode } from '@/lib/ngc-ast';

interface PropertiesProps {
  node: NGCNode | null;
  onPropertyChange: (nodeId: string, key: string, value: string) => void;
}

export function NGCProperties({ node, onPropertyChange }: PropertiesProps) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Select an element</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full p-2 space-y-1">
      {/* Node info */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Type</span>
          <span className="text-xs font-medium text-foreground">{node.type}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Name</span>
          <span className="text-xs font-medium text-foreground">{node.name}</span>
        </div>
      </div>

      {Object.keys(node.properties).length > 0 && (
        <div className="border-t border-border pt-2 space-y-1.5">
          {Object.entries(node.properties).map(([key, value]) => (
            <div key={key} className="space-y-0.5">
              <label className="text-xs text-muted-foreground">{key}</label>
              <input
                className="w-full rounded-sm border border-border bg-secondary px-2 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                value={value}
                onChange={(e) => onPropertyChange(node.id, key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {Object.keys(node.properties).length === 0 && node.type !== 'App' && (
        <p className="text-xs text-muted-foreground italic">No properties</p>
      )}
    </div>
  );
}
