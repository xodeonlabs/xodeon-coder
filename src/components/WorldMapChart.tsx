import { useRef, useState, useCallback, useEffect } from 'react';
import WorldMap from 'react-svg-worldmap';
import { ZoomIn, ZoomOut, Maximize2, Expand, Shrink } from 'lucide-react';

interface WorldMapChartProps {
  countryCounts: Record<string, number>;
  selectedCountry?: string;
  onCountryClick?: (code: string) => void;
}

export function WorldMapChart({ countryCounts, selectedCountry, onCountryClick }: WorldMapChartProps) {
  const data = Object.entries(countryCounts).map(([country, value]) => ({
    country: country.toLowerCase() as any,
    value,
  }));

  const maxCount = Math.max(...Object.values(countryCounts), 1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const clampTranslate = useCallback((x: number, y: number, s: number) => {
    const maxOffset = (s - 1) * 200;
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, y)),
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => {
      const next = Math.max(1, Math.min(6, prev - e.deltaY * 0.002));
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [scale, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTranslate(clampTranslate(panStart.current.tx + dx, panStart.current.ty + dy, scale));
  }, [isPanning, scale, clampTranslate]);

  const handlePointerUp = useCallback(() => setIsPanning(false), []);

  const zoomIn = () => setScale(prev => Math.min(6, prev + 0.5));
  const zoomOut = () => {
    setScale(prev => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  };
  const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-background p-4 flex flex-col" : "relative w-full"}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button onClick={() => setIsFullscreen(f => !f)} className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors backdrop-blur-sm" title={isFullscreen ? "Sluit fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
        </button>
        <button onClick={zoomIn} className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors backdrop-blur-sm" title="Inzoomen">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={zoomOut} disabled={scale <= 1} className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors backdrop-blur-sm disabled:opacity-30" title="Uitzoomen">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        {scale > 1 && (
          <button onClick={resetZoom} className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors backdrop-blur-sm" title="Reset zoom">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Zoom level indicator */}
      {scale > 1 && (
        <div className="absolute top-2 left-2 z-10 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm border border-border/50 rounded-md px-1.5 py-0.5">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg"
        style={{ cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <WorldMap
            color="hsl(var(--primary))"
            valueSuffix="gebruikers"
            size="responsive"
            data={data}
            backgroundColor="transparent"
            strokeOpacity={0.3}
            frame={false}
            styleFunction={({ countryCode, countryValue }) => {
              const code = countryCode?.toUpperCase();
              const isSelected = selectedCountry === code;
              const hasValue = countryValue !== undefined && countryValue > 0;
              const intensity = hasValue ? Math.max(0.3, (countryValue as number) / maxCount) : 0;

              return {
                fill: hasValue
                  ? isSelected
                    ? 'hsl(var(--primary))'
                    : `hsl(var(--primary) / ${intensity})`
                  : 'hsl(var(--muted))',
                stroke: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                strokeWidth: isSelected ? 2 : 0.5,
                strokeOpacity: isSelected ? 1 : 0.3,
                cursor: hasValue ? 'pointer' : 'default',
                opacity: 1,
              };
            }}
            onClickFunction={({ countryCode }) => {
              const code = countryCode?.toUpperCase();
              if (code && countryCounts[code]) {
                onCountryClick?.(code);
              }
            }}
            tooltipTextFunction={({ countryValue, countryName }) => {
              return `${countryName}: ${countryValue ?? 0} gebruiker${countryValue !== 1 ? 's' : ''}`;
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 px-1">
        <span className="text-[10px] text-muted-foreground">Minder</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden flex max-w-[180px]">
          {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((opacity, i) => (
            <div key={i} className="flex-1 h-full" style={{ background: `hsl(var(--primary) / ${opacity})` }} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Meer</span>
        <span className="text-[10px] text-muted-foreground ml-1">(max: {maxCount})</span>
      </div>
    </div>
  );
}
