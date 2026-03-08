import { ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface Ad {
  emoji: string;
  title: string;
  description: string;
  url: string;
  gradient: string;
}

const ADS: Ad[] = [
  {
    emoji: '🐍',
    title: 'The Big Snake Game',
    description: 'Speel nu het klassieke slangenspel – gratis!',
    url: 'https://the-big-snake-game.lovable.app/',
    gradient: 'linear-gradient(135deg, hsl(145 40% 14%), hsl(var(--secondary)))',
  },
  {
    emoji: '🚀',
    title: 'NGC Explorer',
    description: 'Bouw je eigen apps met de kracht van NGC-code!',
    url: 'https://ngc-explorer.lovable.app/',
    gradient: 'linear-gradient(135deg, hsl(200 40% 14%), hsl(var(--secondary)))',
  },
  {
    emoji: '🎮',
    title: 'Maak je eigen game',
    description: 'Gebruik NGC om in minuten een game te bouwen.',
    url: 'https://ngc-explorer.lovable.app/',
    gradient: 'linear-gradient(135deg, hsl(280 40% 14%), hsl(var(--secondary)))',
  },
  {
    emoji: '💡',
    title: 'Deel je creatie',
    description: 'Publiceer en deel je app met de wereld!',
    url: 'https://ngc-explorer.lovable.app/',
    gradient: 'linear-gradient(135deg, hsl(40 40% 14%), hsl(var(--secondary)))',
  },
];

const ROTATE_INTERVAL = 6000;

interface AdBannerProps {
  className?: string;
}

export function AdBanner({ className = '' }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 300);
    }, 150);
  }, [isAnimating]);

  const next = useCallback(() => goTo((currentIndex + 1) % ADS.length), [currentIndex, goTo]);
  const prev = useCallback(() => goTo((currentIndex - 1 + ADS.length) % ADS.length), [currentIndex, goTo]);

  useEffect(() => {
    const timer = setInterval(next, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [next]);

  if (dismissed) return null;

  const ad = ADS[currentIndex];

  return (
    <div
      className={`relative rounded-xl border border-border/50 overflow-hidden group ${className}`}
      style={{ background: ad.gradient }}
    >
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100 z-10"
        title="Sluiten"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Nav arrows */}
      <button
        onClick={prev}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Ad content */}
      <a
        href={ad.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
      >
        <div className="w-9 h-9 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
          <span className="text-lg">{ad.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{ad.description}</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </a>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-2">
        {ADS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
