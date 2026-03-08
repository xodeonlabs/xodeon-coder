import { useState } from 'react';
import { icons } from 'lucide-react';
import { X } from 'lucide-react';

// Curated list of common app icons
const ICON_LIST = [
  'file-code', 'app-window', 'layout-dashboard', 'gamepad-2', 'music', 'image',
  'video', 'camera', 'shopping-cart', 'store', 'calculator', 'calendar',
  'clock', 'map', 'globe', 'heart', 'star', 'zap', 'rocket', 'flame',
  'book-open', 'graduation-cap', 'briefcase', 'building-2', 'home', 'users',
  'message-circle', 'mail', 'phone', 'bell', 'shield', 'lock', 'key',
  'settings', 'wrench', 'palette', 'brush', 'pen-tool', 'type',
  'code', 'terminal', 'database', 'server', 'cloud', 'wifi',
  'smartphone', 'monitor', 'cpu', 'hard-drive', 'battery', 'bluetooth',
  'truck', 'car', 'bike', 'plane', 'ship', 'train-front',
  'pizza', 'coffee', 'utensils', 'wine', 'apple', 'leaf',
  'sun', 'moon', 'cloud-rain', 'snowflake', 'mountain', 'tree-pine',
  'dog', 'cat', 'fish', 'bug', 'bird', 'squirrel',
  'trophy', 'medal', 'target', 'flag', 'crown', 'gem',
  'music-2', 'headphones', 'mic', 'radio', 'tv', 'film',
  'scissors', 'ruler', 'compass', 'magnifying-glass', 'lightbulb', 'lamp',
];

// Convert kebab-case to PascalCase for lucide icons lookup
function kebabToPascal(str: string): string {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function getIconComponent(name: string) {
  const pascal = kebabToPascal(name);
  return (icons as any)[pascal] || null;
}

interface AppIconProps {
  iconName: string;
  size?: number;
  className?: string;
}

export function AppIcon({ iconName, size = 20, className = '' }: AppIconProps) {
  const IconComp = getIconComponent(iconName || 'file-code');
  if (!IconComp) {
    const Fallback = getIconComponent('file-code');
    return Fallback ? <Fallback size={size} className={className} /> : null;
  }
  return <IconComp size={size} className={className} />;
}

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  onClose: () => void;
}

export function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = ICON_LIST.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl border border-border/50 w-full max-w-md shadow-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h3 className="text-base font-bold text-foreground">Kies een icoon</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-border/50">
          <input
            type="text"
            placeholder="Zoek icoon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="p-4 grid grid-cols-8 gap-1.5 max-h-[320px] overflow-y-auto">
          {filtered.map(name => {
            const isSelected = value === name;
            return (
              <button
                key={name}
                onClick={() => { onChange(name); onClose(); }}
                className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
                title={name}
              >
                <AppIcon iconName={name} size={18} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-8 text-center text-sm text-muted-foreground py-8">Geen iconen gevonden</p>
          )}
        </div>
      </div>
    </div>
  );
}
