import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';

const COLS = 10;
const ROWS = 20;
const CELL = 18;
const TICK_START = 500;
const TICK_MIN = 100;

const PIECES = [
  { shape: [[1,1,1,1]], color: 'hsl(var(--primary))' },           // I
  { shape: [[1,1],[1,1]], color: 'hsl(var(--accent))' },           // O
  { shape: [[0,1,0],[1,1,1]], color: 'hsl(180 60% 50%)' },        // T
  { shape: [[1,0],[1,0],[1,1]], color: 'hsl(220 70% 55%)' },      // L
  { shape: [[0,1],[0,1],[1,1]], color: 'hsl(30 80% 55%)' },       // J
  { shape: [[0,1,1],[1,1,0]], color: 'hsl(120 60% 45%)' },        // S
  { shape: [[1,1,0],[0,1,1]], color: 'hsl(0 70% 55%)' },          // Z
];

type Board = (string | null)[][];

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  );
}

function collides(board: Board, shape: number[][], row: number, col: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const nr = row + r, nc = col + c;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return true;
      if (board[nr][nc]) return true;
    }
  }
  return false;
}

function place(board: Board, shape: number[][], row: number, col: number, color: string): Board {
  const b = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c]) b[row + r][col + c] = color;
    }
  }
  return b;
}

function clearRows(board: Board): { board: Board; cleared: number } {
  const kept = board.filter(row => row.some(c => !c));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

interface TetrisGameProps {
  onClose?: () => void;
}

export function TetrisGame({ onClose }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const boardRef = useRef<Board>(createBoard());
  const pieceRef = useRef(spawnPiece());
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const [, forceRender] = useState(0);

  function spawnPiece() {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    return { shape: p.shape, color: p.color, row: 0, col: Math.floor((COLS - p.shape[0].length) / 2) };
  }

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const w = COLS * CELL, h = ROWS * CELL;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.fillStyle = 'hsl(var(--secondary))';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(w, r * CELL); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, h); ctx.stroke(); }

    // Placed blocks
    const board = boardRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          ctx.fillStyle = board[r][c]!;
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 3);
        }
      }
    }

    // Current piece
    const p = pieceRef.current;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[0].length; c++) {
        if (p.shape[r][c]) {
          ctx.fillStyle = p.color;
          ctx.fillRect((p.col + c) * CELL + 1, (p.row + r) * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect((p.col + c) * CELL + 1, (p.row + r) * CELL + 1, CELL - 2, 3);
        }
      }
    }
  }, []);

  const tick = useCallback(() => {
    const p = pieceRef.current;
    if (!collides(boardRef.current, p.shape, p.row + 1, p.col)) {
      pieceRef.current = { ...p, row: p.row + 1 };
    } else {
      boardRef.current = place(boardRef.current, p.shape, p.row, p.col, p.color);
      const { board, cleared } = clearRows(boardRef.current);
      boardRef.current = board;
      if (cleared > 0) setScore(s => s + cleared * 100);
      const next = spawnPiece();
      if (collides(boardRef.current, next.shape, next.row, next.col)) {
        setGameOver(true);
        return;
      }
      pieceRef.current = next;
    }
    draw();
    forceRender(n => n + 1);
  }, [draw]);

  const restart = () => {
    boardRef.current = createBoard();
    pieceRef.current = spawnPiece();
    setScore(0);
    setGameOver(false);
    draw();
  };

  useEffect(() => {
    draw();
    const speed = Math.max(TICK_MIN, TICK_START - Math.floor(score / 200) * 30);
    tickRef.current = setInterval(() => { if (!gameOver) tick(); }, speed);
    return () => clearInterval(tickRef.current);
  }, [tick, gameOver, score, draw]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameOver) return;
      const p = pieceRef.current;
      if (e.key === 'ArrowLeft' && !collides(boardRef.current, p.shape, p.row, p.col - 1)) {
        pieceRef.current = { ...p, col: p.col - 1 };
      } else if (e.key === 'ArrowRight' && !collides(boardRef.current, p.shape, p.row, p.col + 1)) {
        pieceRef.current = { ...p, col: p.col + 1 };
      } else if (e.key === 'ArrowDown') {
        tick();
      } else if (e.key === 'ArrowUp') {
        const rotated = rotate(p.shape);
        if (!collides(boardRef.current, rotated, p.row, p.col)) {
          pieceRef.current = { ...p, shape: rotated };
        }
      } else if (e.key === ' ') {
        // Hard drop
        let nr = p.row;
        while (!collides(boardRef.current, p.shape, nr + 1, p.col)) nr++;
        pieceRef.current = { ...p, row: nr };
        tick();
      }
      draw();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameOver, tick, draw]);

  return (
    <div className="relative inline-flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      {onClose && (
        <button onClick={onClose} className="absolute top-1 right-1 p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-center gap-3 w-full px-1">
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Tetris</span>
        <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{score} pts</span>
      </div>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <p className="text-sm font-bold text-foreground mb-1">Game Over</p>
          <p className="text-xs text-muted-foreground mb-3">{score} punten</p>
          <button onClick={restart} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <RotateCcw className="h-3 w-3" /> Opnieuw
          </button>
        </div>
      )}
      <p className="text-[9px] text-muted-foreground/50">← → ↓ draaien: ↑ • drop: spatie</p>
    </div>
  );
}
