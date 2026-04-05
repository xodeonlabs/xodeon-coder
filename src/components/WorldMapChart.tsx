import WorldMap from 'react-svg-worldmap';
import type { CountryContext } from 'react-svg-worldmap';

interface WorldMapChartProps {
  countryCounts: Record<string, number>;
  selectedCountry?: string;
  onCountryClick?: (code: string) => void;
}

export function WorldMapChart({ countryCounts, selectedCountry, onCountryClick }: WorldMapChartProps) {
  const data = Object.entries(countryCounts).map(([country, value]) => ({
    country: country.toLowerCase(),
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
    </div>
  );
}
