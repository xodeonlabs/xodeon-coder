import { RemoteCursor } from '@/hooks/useLiveCursors';

interface LiveCursorsProps {
  cursors: RemoteCursor[];
  containerRef: React.RefObject<HTMLDivElement>;
}

export function LiveCursors({ cursors }: LiveCursorsProps) {
  if (cursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-150 ease-out"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-1px, -1px)',
          }}
        >
          {/* Cursor arrow SVG */}
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            className="drop-shadow-md"
          >
            <path
              d="M0.5 0.5L15 11H7.5L4 19.5L0.5 0.5Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          {/* Name label */}
          <div
            className="absolute left-4 top-3 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.email.split('@')[0]}
          </div>
        </div>
      ))}
    </div>
  );
}
