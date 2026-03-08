import { ExternalLink, X } from 'lucide-react';
import { useState } from 'react';

interface AdBannerProps {
  className?: string;
}

export function AdBanner({ className = '' }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={`relative rounded-xl border border-border/50 overflow-hidden group ${className}`} style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--secondary)))' }}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100 z-10"
        title="Sluiten"
      >
        <X className="h-3 w-3" />
      </button>
      <a
        href="https://the-big-snake-game.lovable.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--ide-success))]/20 flex items-center justify-center shrink-0">
          <span className="text-lg">🐍</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">The Big Snake Game</p>
          <p className="text-[11px] text-muted-foreground truncate">Speel nu het klassieke slangenspel – gratis!</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </a>
    </div>
  );
}
