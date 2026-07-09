import { useEffect, useState } from 'react';
import { useAppMode } from '@/hooks/useAppMode';
import { XodeonLogo } from '@/components/XodeonLogo';

const SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export function KonamiEasterEgg() {
  const [mode] = useAppMode();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (mode !== 'gamer') return;
    let buf: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buf.push(k);
      if (buf.length > SEQUENCE.length) buf = buf.slice(-SEQUENCE.length);
      if (buf.length === SEQUENCE.length && buf.every((v, i) => v === SEQUENCE[i])) {
        buf = [];
        setPlaying(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(false), 4200);
    return () => clearTimeout(t);
  }, [playing]);

  if (!playing || mode !== 'gamer') return null;

  // Try to locate the sidebar/nav menu element for the "eating" target
  const targetRect =
    (document.querySelector('[data-sidebar="sidebar"]') as HTMLElement | null)?.getBoundingClientRect() ||
    (document.querySelector('aside') as HTMLElement | null)?.getBoundingClientRect() ||
    (document.querySelector('nav') as HTMLElement | null)?.getBoundingClientRect();

  const tx = targetRect ? targetRect.left + targetRect.width / 2 : 200;
  const ty = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Menu shrink-and-vanish effect */}
      {targetRect && (
        <div
          className="absolute bg-primary/10 border-2 border-primary/40 rounded-xl animate-[konami-eaten_2.4s_ease-in_1.2s_forwards]"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Xodeon logo with eyes flying to the menu and chomping */}
      <div
        className="absolute animate-[konami-fly_3.6s_cubic-bezier(0.4,0,0.2,1)_forwards]"
        style={{
          left: -160,
          top: window.innerHeight / 2 - 80,
          // custom props consumed by the keyframes
          ['--tx' as string]: `${tx + 80}px`,
          ['--ty' as string]: `${ty - (window.innerHeight / 2 - 80)}px`,
        }}
      >
        <div className="relative w-40 h-40 animate-[konami-chomp_0.4s_ease-in-out_infinite]">
          <XodeonLogo className="w-full h-full object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.8)]" />
          {/* Eyes */}
          <div className="absolute top-[38%] left-[28%] w-4 h-4 rounded-full bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black animate-[konami-eye_0.6s_ease-in-out_infinite]" />
          </div>
          <div className="absolute top-[38%] right-[28%] w-4 h-4 rounded-full bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black animate-[konami-eye_0.6s_ease-in-out_infinite]" />
          </div>
          {/* Mouth */}
          <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-10 h-3 bg-black rounded-b-full animate-[konami-mouth_0.4s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Cheat banner */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-black/80 border border-primary/60 text-primary font-mono text-sm tracking-widest animate-[konami-banner_3.6s_ease-out_forwards]">
        ↑ ↑ ↓ ↓ ← → ← → B A — CHEAT ACTIVATED
      </div>

      <style>{`
        @keyframes konami-fly {
          0%   { transform: translate(0, 0) rotate(-10deg) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          60%  { transform: translate(calc(var(--tx) * 0.9), calc(var(--ty) * 0.9)) rotate(10deg) scale(1); }
          80%  { transform: translate(var(--tx), var(--ty)) rotate(0deg) scale(1.15); }
          100% { transform: translate(calc(var(--tx) + 400px), var(--ty)) rotate(20deg) scale(0.4); opacity: 0; }
        }
        @keyframes konami-chomp {
          0%, 100% { transform: scaleY(1); }
          50%      { transform: scaleY(0.85); }
        }
        @keyframes konami-mouth {
          0%, 100% { height: 4px; }
          50%      { height: 14px; }
        }
        @keyframes konami-eye {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(2px); }
        }
        @keyframes konami-eaten {
          0%   { transform: scale(1); opacity: 1; }
          60%  { transform: scale(0.6) rotate(-4deg); opacity: 0.6; }
          100% { transform: scale(0) rotate(-20deg); opacity: 0; }
        }
        @keyframes konami-banner {
          0%   { opacity: 0; transform: translate(-50%, -20px); }
          15%  { opacity: 1; transform: translate(-50%, 0); }
          85%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `}</style>
    </div>
  );
}
