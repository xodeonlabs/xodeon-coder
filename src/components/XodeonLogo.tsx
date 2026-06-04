import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import lightLogo from "@/assets/xodeon-light.png.asset.json";
import darkLogo from "@/assets/xodeon-dark.png.asset.json";

interface XodeonLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Xodeon "X" logo that swaps between light/dark variants based on theme.
 * - Dark mode → vibrant light variant
 * - Light mode → muted dark variant
 */
export function XodeonLogo({ className = "h-full w-full object-contain", alt = "Xodeon Labs" }: XodeonLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const src = mounted && resolvedTheme === "light" ? darkLogo.url : lightLogo.url;
  return <img src={src} alt={alt} className={className} draggable={false} />;
}

/**
 * Animated Xodeon logo loader (replaces Tetris loading game).
 */
export function XodeonLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl animate-pulse" />
        <div className="relative h-full w-full animate-[xodeon-float_2.4s_ease-in-out_infinite]">
          <XodeonLogo className="h-full w-full object-contain drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
        </div>
      </div>
      {label && <p className="text-xs text-muted-foreground animate-pulse">{label}</p>}
      <style>{`
        @keyframes xodeon-float {
          0%, 100% { transform: translateY(0) rotate(-3deg) scale(1); }
          50% { transform: translateY(-8px) rotate(3deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
