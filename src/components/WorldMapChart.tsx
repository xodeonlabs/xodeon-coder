import { useState } from 'react';

// Approximate lat/lng for country codes
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

// Simplified but recognizable continent SVG paths (Equirectangular projection, viewBox 0 0 1000 500)
const CONTINENT_PATHS = [
  // North America
  "M65,45 L80,38 L95,32 L115,28 L140,30 L160,28 L175,32 L195,38 L210,38 L225,42 L240,48 L250,55 L258,62 L268,72 L275,80 L278,90 L275,98 L268,105 L262,112 L255,118 L248,125 L240,130 L232,136 L225,142 L218,148 L210,155 L202,162 L195,168 L188,172 L180,178 L172,182 L165,188 L158,192 L150,195 L142,198 L135,195 L128,188 L120,182 L112,178 L105,172 L98,168 L92,162 L85,155 L80,148 L75,140 L70,132 L65,122 L62,112 L60,102 L58,92 L55,82 L55,72 L58,62 L62,52 Z",
  // Greenland
  "M265,22 L280,18 L295,20 L305,25 L310,32 L308,40 L300,48 L290,52 L278,50 L268,45 L262,38 L260,30 Z",
  // South America
  "M195,210 L208,205 L218,208 L228,215 L235,225 L240,238 L242,252 L240,268 L235,282 L228,295 L222,308 L215,320 L208,332 L200,342 L192,352 L185,362 L180,370 L175,375 L172,368 L170,358 L168,345 L165,332 L162,318 L160,305 L158,292 L158,278 L160,265 L162,252 L165,240 L170,228 L178,218 Z",
  // Europe
  "M418,48 L425,42 L435,38 L448,35 L460,38 L470,42 L478,48 L485,55 L490,62 L492,70 L488,78 L482,85 L475,90 L468,95 L460,98 L452,102 L445,105 L438,108 L432,112 L425,108 L420,102 L415,95 L412,88 L410,80 L412,72 L415,62 L418,55 Z",
  // Scandinavia
  "M440,22 L448,18 L455,22 L460,28 L462,35 L458,42 L452,48 L445,52 L438,48 L435,42 L432,35 L435,28 Z",
  // UK/Ireland
  "M402,52 L408,48 L415,50 L418,55 L415,60 L408,62 L402,60 L400,55 Z",
  // Africa
  "M420,120 L432,115 L445,112 L458,115 L468,120 L478,128 L485,138 L490,148 L492,160 L490,172 L488,185 L485,198 L480,210 L475,222 L468,232 L462,242 L455,252 L448,262 L440,272 L432,280 L425,288 L418,295 L412,300 L408,295 L405,285 L402,275 L400,262 L398,248 L398,235 L400,222 L402,208 L405,195 L408,182 L410,168 L412,155 L415,142 L418,130 Z",
  // Madagascar
  "M500,262 L505,258 L508,265 L505,275 L500,280 L498,272 Z",
  // Asia (mainland)
  "M492,30 L510,25 L530,22 L550,20 L572,22 L595,25 L618,30 L638,35 L655,42 L670,50 L682,58 L690,68 L695,78 L698,88 L695,98 L690,108 L682,118 L672,125 L660,132 L648,138 L635,142 L622,145 L608,148 L595,150 L580,152 L565,150 L552,148 L540,145 L528,140 L518,135 L508,128 L500,120 L495,110 L492,100 L490,88 L490,75 L490,62 L490,48 L492,38 Z",
  // Middle East / Arabian Peninsula
  "M495,110 L508,105 L518,108 L525,115 L528,125 L525,135 L518,142 L510,148 L502,145 L495,138 L492,128 L492,118 Z",
  // India
  "M560,115 L572,108 L582,112 L590,120 L595,130 L592,142 L585,152 L578,162 L572,170 L565,175 L558,170 L552,162 L548,152 L545,140 L548,130 L552,122 Z",
  // Southeast Asia
  "M618,130 L630,125 L640,130 L648,138 L650,148 L645,158 L638,165 L628,168 L620,165 L612,158 L610,148 L612,138 Z",
  // Japan
  "M690,58 L698,52 L705,55 L708,62 L705,70 L698,75 L690,72 L688,65 Z",
  // Indonesia / Maritime SE Asia
  "M628,178 L640,175 L655,178 L668,182 L678,185 L685,190 L680,195 L670,198 L658,200 L645,198 L635,195 L628,190 L625,185 Z",
  // Australia
  "M668,242 L688,235 L708,232 L728,235 L742,242 L750,252 L752,265 L748,278 L740,288 L728,295 L715,298 L702,295 L690,290 L680,282 L672,272 L668,260 L665,250 Z",
  // New Zealand
  "M768,292 L772,285 L778,288 L780,295 L778,305 L772,310 L768,305 L766,298 Z",
  // Philippines
  "M660,148 L665,142 L670,145 L672,152 L668,158 L662,155 Z",
  // Sri Lanka
  "M575,175 L580,172 L582,178 L578,182 L575,180 Z",
  // Taiwan
  "M668,115 L672,112 L675,118 L672,122 L668,120 Z",
  // Papua New Guinea
  "M710,202 L722,198 L730,202 L728,210 L720,215 L712,212 L708,208 Z",
  // Central America
  "M148,172 L158,168 L168,172 L175,178 L180,185 L178,192 L172,198 L165,202 L158,200 L152,195 L148,188 L145,180 Z",
  // Caribbean
  "M198,168 L208,165 L218,168 L222,175 L218,180 L208,178 L200,175 Z",
];

interface WorldMapChartProps {
  countryCounts: Record<string, number>;
  selectedCountry?: string;
  onCountryClick?: (code: string) => void;
}

export function WorldMapChart({ countryCounts, selectedCountry, onCountryClick }: WorldMapChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const maxCount = Math.max(...Object.values(countryCounts), 1);

  const toSvg = (lng: number, lat: number): [number, number] => {
    const x = ((lng + 180) / 360) * 1000;
    const y = ((90 - lat) / 180) * 500;
    return [x, y];
  };

  const dots = Object.entries(countryCounts)
    .filter(([code]) => COUNTRY_COORDS[code])
    .map(([code, count]) => {
      const [lng, lat] = COUNTRY_COORDS[code];
      const [x, y] = toSvg(lng, lat);
      const intensity = Math.max(0.4, count / maxCount);
      const radius = Math.max(5, Math.min(16, 5 + (count / maxCount) * 11));
      return { code, count, x, y, intensity, radius };
    });

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 1000 500" className="w-full h-auto" style={{ minHeight: 200 }}>
        <defs>
          <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Continent silhouettes */}
        {CONTINENT_PATHS.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="hsl(var(--muted-foreground))"
            opacity={0.15}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={0.5}
            strokeOpacity={0.25}
          />
        ))}

        {/* Country dots */}
        {dots.map(d => (
          <g
            key={d.code}
            onMouseEnter={() => setHovered(d.code)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onCountryClick?.(d.code)}
            className="cursor-pointer"
          >
            {/* Selection ring */}
            {selectedCountry === d.code && (
              <circle cx={d.x} cy={d.y} r={d.radius + 7} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.8} />
            )}
            {/* Outer glow */}
            <circle cx={d.x} cy={d.y} r={d.radius + 5} fill="url(#dotGlow)" opacity={d.intensity * 0.5} />
            {/* Pulse on hover */}
            {hovered === d.code && (
              <circle cx={d.x} cy={d.y} r={d.radius + 10} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} opacity={0.5}>
                <animate attributeName="r" from={String(d.radius + 5)} to={String(d.radius + 20)} dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Main dot */}
            <circle
              cx={d.x}
              cy={d.y}
              r={d.radius}
              fill="hsl(var(--primary))"
              opacity={selectedCountry === d.code ? 1 : d.intensity}
              stroke="hsl(var(--primary-foreground))"
              strokeWidth={1.5}
            />
            {/* Count label */}
            <text
              x={d.x}
              y={d.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(var(--primary-foreground))"
              fontSize={d.radius > 7 ? 9 : 7}
              fontWeight="bold"
            >
              {d.count}
            </text>
          </g>
        ))}

        {/* Tooltip */}
        {hovered && (() => {
          const d = dots.find(dot => dot.code === hovered);
          if (!d) return null;
          const tooltipX = Math.min(Math.max(d.x, 70), 930);
          const tooltipY = d.y - d.radius - 16;
          return (
            <g>
              <rect x={tooltipX - 55} y={tooltipY - 18} width={110} height={24} rx={6} fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth={1} />
              <text x={tooltipX} y={tooltipY - 4} textAnchor="middle" fill="hsl(var(--popover-foreground))" fontSize={11} fontWeight="600">
                {d.code} — {d.count} gebruiker{d.count !== 1 ? 's' : ''}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
