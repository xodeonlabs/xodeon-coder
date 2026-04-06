import WorldMap from 'react-svg-worldmap';
import type { CountryContext } from 'react-svg-worldmap';

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

  return (
    <div className="relative w-full">
      <WorldMap
        color="hsl(var(--primary))"
        valueSuffix="gebruikers"
        size="responsive"
        data={data}
        backgroundColor="transparent"
        strokeOpacity={0.3}
        frame={false}
        styleFunction={({ countryCode, color, minValue, maxValue, countryValue }) => {
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
        tooltipTextFunction={({ countryCode, countryValue, countryName }) => {
          return `${countryName}: ${countryValue ?? 0} gebruiker${countryValue !== 1 ? 's' : ''}`;
        }}
      />
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
