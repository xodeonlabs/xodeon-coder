import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

const GRID = 20;
const CELL = 15;
const SIZE = GRID * CELL;
const TICK_MS = 120;
const COLORS = {
  me: 'hsl(var(--primary))',
  other: 'hsl(var(--accent, 150 60% 50%))',
  food: '#ef4444',
  bg: 'hsl(var(--secondary))',
  grid: 'hsl(var(--border))',
};

type Dir = 'up' | 'down' | 'left' | 'right';
type Pos = [number, number];

interface SnakeState {
  body: Pos[];
  dir: Dir;
  score: number;
  alive: boolean;
}

interface GameProps {
  channelName: string;
  userId: string;
  userName: string;
  onClose: () => void;
}

function randomPos(): Pos {
  return [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)];
}

function posEq(a: Pos, b: Pos) { return a[0] === b[0] && a[1] === b[1]; }

export function SnakeGame({ channelName, userId, userName, onClose }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [mySnake, setMySnake] = useState<SnakeState>({ body: [[10, 10]], dir: 'right', score: 0, alive: true });
  const [otherSnakes, setOtherSnakes] = useState<Record<string, { body: Pos[]; name: string; score: number; alive: boolean }>>({});
  const [food, setFood] = useState<Pos>(randomPos());
  const [highScores, setHighScores] = useState<{ name: string; score: number }[]>([]);
  const [gameOver, setGameOver] = useState(false);

  const mySnakeRef = useRef(mySnake);
  const foodRef = useRef(food);
  const otherSnakesRef = useRef(otherSnakes);
  const dirQueueRef = useRef<Dir[]>([]);

  mySnakeRef.current = mySnake;
  foodRef.current = food;
  otherSnakesRef.current = otherSnakes;

  // Realtime channel
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const ch = supabase.channel(`snake-${channelName}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'snake-move' }, ({ payload }) => {
      if (payload.userId !== userId) {
        setOtherSnakes(prev => ({
          ...prev,
          [payload.userId]: { body: payload.body, name: payload.name, score: payload.score, alive: payload.alive },
        }));
      }
    });

    ch.on('broadcast', { event: 'food-eaten' }, ({ payload }) => {
      setFood(payload.newFood);
      foodRef.current = payload.newFood;
    });

    ch.on('broadcast', { event: 'snake-leave' }, ({ payload }) => {
      setOtherSnakes(prev => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      ch.send({ type: 'broadcast', event: 'snake-leave', payload: { userId } });
      supabase.removeChannel(ch);
    };
  }, [channelName, userId]);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        dirQueueRef.current.push(dir);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Touch controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      dirQueueRef.current.push(dx > 0 ? 'right' : 'left');
    } else {
      dirQueueRef.current.push(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  }, []);

  const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setMySnake(prev => {
        if (!prev.alive) return prev;

        let dir = prev.dir;
        while (dirQueueRef.current.length > 0) {
          const next = dirQueueRef.current.shift()!;
          if (next !== opposite[dir]) { dir = next; break; }
        }

        const head = prev.body[0];
        const moves: Record<Dir, Pos> = {
          up: [head[0], head[1] - 1],
          down: [head[0], head[1] + 1],
          left: [head[0] - 1, head[1]],
          right: [head[0] + 1, head[1]],
        };
        const newHead = moves[dir];

        // Wall collision
        if (newHead[0] < 0 || newHead[0] >= GRID || newHead[1] < 0 || newHead[1] >= GRID) {
          const dead = { ...prev, dir, alive: false };
          setGameOver(true);
          setHighScores(hs => [...hs, { name: userName, score: prev.score }].sort((a, b) => b.score - a.score).slice(0, 5));
          channelRef.current?.send({ type: 'broadcast', event: 'snake-move', payload: { userId, body: prev.body, name: userName, score: prev.score, alive: false } });
          return dead;
        }

        // Self collision
        if (prev.body.some(p => posEq(p, newHead))) {
          const dead = { ...prev, dir, alive: false };
          setGameOver(true);
          setHighScores(hs => [...hs, { name: userName, score: prev.score }].sort((a, b) => b.score - a.score).slice(0, 5));
          channelRef.current?.send({ type: 'broadcast', event: 'snake-move', payload: { userId, body: prev.body, name: userName, score: prev.score, alive: false } });
          return dead;
        }

        // Other snake collision
        for (const other of Object.values(otherSnakesRef.current)) {
          if (other.alive && other.body.some(p => posEq(p, newHead))) {
            const dead = { ...prev, dir, alive: false };
            setGameOver(true);
            setHighScores(hs => [...hs, { name: userName, score: prev.score }].sort((a, b) => b.score - a.score).slice(0, 5));
            channelRef.current?.send({ type: 'broadcast', event: 'snake-move', payload: { userId, body: prev.body, name: userName, score: prev.score, alive: false } });
            return dead;
          }
        }

        let newBody = [newHead, ...prev.body];
        let newScore = prev.score;

        // Food
        if (posEq(newHead, foodRef.current)) {
          newScore += 10;
          const newFood = randomPos();
          setFood(newFood);
          foodRef.current = newFood;
          channelRef.current?.send({ type: 'broadcast', event: 'food-eaten', payload: { newFood } });
        } else {
          newBody = newBody.slice(0, -1);
        }

        const state = { body: newBody, dir, score: newScore, alive: true };
        channelRef.current?.send({ type: 'broadcast', event: 'snake-move', payload: { userId, body: newBody, name: userName, score: newScore, alive: true } });
        return state;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, userId, userName]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.3;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
    }

    // Food
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.arc(food[0] * CELL + CELL / 2, food[1] * CELL + CELL / 2, CELL / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Other snakes
    Object.values(otherSnakes).forEach(s => {
      ctx.fillStyle = s.alive ? COLORS.other : 'hsl(var(--muted-foreground))';
      s.body.forEach(([x, y], i) => {
        const r = i === 0 ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, r);
        ctx.fill();
      });
    });

    // My snake
    ctx.fillStyle = mySnake.alive ? COLORS.me : 'hsl(var(--destructive))';
    mySnake.body.forEach(([x, y], i) => {
      const r = i === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, r);
      ctx.fill();
    });
  }, [mySnake, otherSnakes, food]);

  function restart() {
    setMySnake({ body: [[10, 10]], dir: 'right', score: 0, alive: true });
    setFood(randomPos());
    dirQueueRef.current = [];
    setGameOver(false);
    setGameStarted(true);
  }

  const otherPlayers = Object.entries(otherSnakes);

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between w-full">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">🐍 Snake Multiplayer</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scoreboard */}
      <div className="flex gap-3 text-[11px] w-full flex-wrap">
        <span className="font-semibold text-foreground" style={{ color: COLORS.me }}>
          {userName}: {mySnake.score}
        </span>
        {otherPlayers.map(([id, s]) => (
          <span key={id} className="font-semibold" style={{ color: s.alive ? COLORS.other : 'hsl(var(--muted-foreground))' }}>
            {s.name}: {s.score} {!s.alive && '💀'}
          </span>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="rounded-lg border border-border/30"
        style={{ touchAction: 'none', maxWidth: '100%', height: 'auto', aspectRatio: '1' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {!gameStarted && !gameOver && (
        <button onClick={() => setGameStarted(true)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          🎮 Start Game
        </button>
      )}

      {gameOver && (
        <div className="text-center space-y-2">
          <p className="text-sm font-bold text-destructive">Game Over! Score: {mySnake.score}</p>
          {highScores.length > 0 && (
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              {highScores.map((hs, i) => (
                <div key={i} className="flex items-center gap-2 justify-center">
                  <span className="font-bold">{i + 1}.</span> {hs.name} — {hs.score}
                </div>
              ))}
            </div>
          )}
          <button onClick={restart} className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            🔄 Opnieuw
          </button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">Pijltjestoetsen of WASD · Swipe op mobiel · Andere spelers zien je live!</p>
    </div>
  );
}
