import { useState } from 'react';

// Approximate lat/lng → Mercator projection coordinates for country codes
const COUNTRY_COORDS: Record<string, [number, number]> = {
  AF:[65,33],AL:[20,41],DZ:[3,28],AD:[1.5,42.5],AO:[18.5,-12.5],AR:[-64,-34],AM:[45,40],AU:[134,-25],AT:[14,47.3],AZ:[50,40.5],
  BS:[-77,24],BH:[50.5,26],BD:[90,24],BB:[-59.5,13],BY:[28,53],BE:[4.5,50.8],BZ:[-88.5,17],BJ:[2.3,9.3],BT:[90.5,27.5],BO:[-65,-17],
  BA:[18,44],BW:[24,-22],BR:[-51,-10],BN:[115,4.5],BG:[25,43],BF:[-1.5,12],BI:[29.5,-3.5],KH:[105,12.5],CM:[12,6],CA:[-106,56],
  CV:[-24,15],CF:[21,7],TD:[19,15],CL:[-71,-30],CN:[105,35],CO:[-74,4],KM:[44,-12],CG:[15,-1],CD:[24,-3],CR:[-84,10],
  CI:[-5.5,7.5],HR:[16,45.2],CU:[-80,22],CY:[33,35],CZ:[15.5,49.8],DK:[10,56],DJ:[43,11.5],DM:[-61,15.4],DO:[-70,19],
  EC:[-78,-2],EG:[30,27],SV:[-89,13.8],GQ:[10,2],ER:[39,15],EE:[26,59],SZ:[31.5,-26.5],ET:[40,9],FJ:[178,-18],FI:[26,64],
  FR:[2,46],GA:[11.5,-1],GM:[-16,13.5],GE:[43.5,42],DE:[10,51],GH:[-1.5,8],GR:[22,39],GT:[-90.5,15.5],GN:[-12,11],GW:[-15,12],
  GY:[-59,5],HT:[-72,19],HN:[-87,15],HU:[20,47],IS:[-19,65],IN:[79,21],ID:[120,-5],IR:[53,32],IQ:[44,33],IE:[-8,53],
  IL:[35,31.5],IT:[12.5,42.8],JM:[-77.5,18],JP:[138,36],JO:[36,31],KZ:[67,48],KE:[38,1],KI:[173,1.5],KP:[127,40],KR:[127.5,37],
  KW:[48,29.5],KG:[75,41],LA:[103,18],LV:[25,57],LB:[35.8,34],LS:[28.5,-29.5],LR:[-9.5,6.5],LY:[17,27],LI:[9.5,47.2],LT:[24,56],
  LU:[6.1,49.8],MG:[47,-20],MW:[34,-13.5],MY:[110,4],MV:[73,3.2],ML:[-4,17],MT:[14.4,35.9],MR:[-12,20],MU:[57.5,-20.3],MX:[-102,23],
  MD:[29,47],MC:[7.4,43.7],MN:[105,46],ME:[19.3,42.5],MA:[-5,32],MZ:[35,-18],MM:[96,22],NA:[17,-22],NP:[84,28],NL:[5.5,52.5],
  NZ:[174,-41],NI:[-85,13],NE:[8,16],NG:[8,10],MK:[21.4,41.5],NO:[8,62],OM:[57,21],PK:[70,30],PA:[-80,9],PG:[147,-6],
  PY:[-58,-23],PE:[-76,-10],PH:[122,13],PL:[20,52],PT:[-8,39.5],QA:[51.2,25.3],RO:[25,46],RU:[100,60],RW:[29.9,-2],SA:[45,25],
  SN:[-14.5,14.5],RS:[21,44],SL:[-11.8,8.5],SG:[104,1.3],SK:[19.5,48.7],SI:[15,46],SO:[46,6],ZA:[25,-29],SS:[30,7],ES:[-4,40],
  LK:[81,7.9],SD:[30,16],SR:[-56,4],SE:[15,62],CH:[8,47],SY:[38,35],TW:[121,24],TJ:[69,39],TZ:[35,-6],TH:[101,15],
  TL:[126,-9],TG:[1.2,8],TT:[-61,10.5],TN:[9,34],TR:[35,39],TM:[59,40],UG:[32,1.5],UA:[32,49],AE:[54,24],GB:[-2,54],
  US:[-98,39],UY:[-56,-33],UZ:[65,41],VE:[-66,8],VN:[108,16],YE:[48,15.5],ZM:[28,-15],ZW:[30,-20],
  XK:[21,42.6],CW:[-69,12.2],SX:[-63,18],BQ:[-68.3,12.2],AW:[-70,12.5],
};

interface WorldMapChartProps {
  countryCounts: Record<string, number>;
  selectedCountry?: string;
  onCountryClick?: (code: string) => void;
}

export function WorldMapChart({ countryCounts, selectedCountry, onCountryClick }: WorldMapChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const maxCount = Math.max(...Object.values(countryCounts), 1);

  // Convert lat/lng to SVG x/y using simple equirectangular projection
  const toSvg = (lng: number, lat: number): [number, number] => {
    const x = ((lng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return [x, y];
  };

  const dots = Object.entries(countryCounts)
    .filter(([code]) => COUNTRY_COORDS[code])
    .map(([code, count]) => {
      const [lng, lat] = COUNTRY_COORDS[code];
      const [x, y] = toSvg(lng, lat);
      const intensity = Math.max(0.3, count / maxCount);
      const radius = Math.max(4, Math.min(14, 4 + (count / maxCount) * 10));
      return { code, count, x, y, intensity, radius };
    });

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 800 400" className="w-full h-auto" style={{ minHeight: 200 }}>
        {/* Background grid lines for reference */}
        {[0, 100, 200, 300, 400].map(y => (
          <line key={`h${y}`} x1={0} y1={y} x2={800} y2={y} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.3} />
        ))}
        {[0, 200, 400, 600, 800].map(x => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={400} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.3} />
        ))}

        {/* Simplified continent outlines */}
        {/* These are rough polylines to give geographic context */}
        <g opacity={0.15} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1}>
          {/* North America */}
          <path d="M80,80 L130,60 L180,55 L220,70 L250,90 L230,120 L210,150 L190,170 L160,180 L140,200 L120,190 L100,170 L80,150 L70,120 Z" fill="hsl(var(--muted-foreground))" />
          {/* South America */}
          <path d="M170,210 L200,200 L220,220 L230,250 L225,280 L210,310 L190,340 L170,360 L160,330 L155,290 L160,250 Z" fill="hsl(var(--muted-foreground))" />
          {/* Europe */}
          <path d="M370,60 L420,55 L450,65 L460,80 L440,100 L410,110 L390,100 L380,85 Z" fill="hsl(var(--muted-foreground))" />
          {/* Africa */}
          <path d="M380,140 L420,130 L450,150 L460,190 L450,240 L440,280 L420,310 L400,300 L390,270 L385,230 L380,190 Z" fill="hsl(var(--muted-foreground))" />
          {/* Asia */}
          <path d="M460,50 L550,40 L630,55 L680,80 L700,100 L690,130 L660,150 L620,160 L580,150 L540,130 L500,110 L470,90 Z" fill="hsl(var(--muted-foreground))" />
          {/* Australia */}
          <path d="M640,260 L700,250 L730,270 L720,300 L690,310 L660,300 L640,280 Z" fill="hsl(var(--muted-foreground))" />
        </g>

        {/* Country dots */}
        {dots.map(d => (
          <g key={d.code} onMouseEnter={() => setHovered(d.code)} onMouseLeave={() => setHovered(null)} className="cursor-pointer" onClick={() => onCountryClick?.(d.code)}>
            {/* Selection ring */}
            {selectedCountry === d.code && (
              <circle cx={d.x} cy={d.y} r={d.radius + 6} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.8} />
            )}
            {/* Glow effect */}
            <circle cx={d.x} cy={d.y} r={d.radius + 4} fill="hsl(var(--primary))" opacity={d.intensity * 0.15} />
            {/* Pulse animation for hovered */}
            {hovered === d.code && (
              <circle cx={d.x} cy={d.y} r={d.radius + 8} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} opacity={0.5}>
                <animate attributeName="r" from={String(d.radius + 4)} to={String(d.radius + 16)} dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Main dot */}
            <circle cx={d.x} cy={d.y} r={d.radius} fill="hsl(var(--primary))" opacity={selectedCountry === d.code ? 1 : d.intensity} stroke="hsl(var(--primary-foreground))" strokeWidth={1.5} />
            {/* Label */}
            <text x={d.x} y={d.y + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary-foreground))" fontSize={d.radius > 6 ? 8 : 6} fontWeight="bold">
              {d.count}
            </text>
          </g>
        ))}

        {/* Tooltip */}
        {hovered && (() => {
          const d = dots.find(d => d.code === hovered);
          if (!d) return null;
          const tooltipX = Math.min(Math.max(d.x, 60), 740);
          const tooltipY = d.y - d.radius - 14;
          return (
            <g>
              <rect x={tooltipX - 50} y={tooltipY - 16} width={100} height={22} rx={6} fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth={1} />
              <text x={tooltipX} y={tooltipY - 3} textAnchor="middle" fill="hsl(var(--popover-foreground))" fontSize={10} fontWeight="600">
                {d.code} — {d.count} gebruiker{d.count !== 1 ? 's' : ''}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
