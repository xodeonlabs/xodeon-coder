// ISO 3166-1 alpha-2 → Dutch country name lookup with Intl fallback
const FALLBACK: Record<string, string> = {
  BE: 'België', NL: 'Nederland', DE: 'Duitsland', FR: 'Frankrijk', GB: 'Verenigd Koninkrijk',
  US: 'Verenigde Staten', ES: 'Spanje', IT: 'Italië', PT: 'Portugal', LU: 'Luxemburg',
};

let displayNames: Intl.DisplayNames | null = null;
try {
  displayNames = new Intl.DisplayNames(['nl'], { type: 'region' });
} catch {
  displayNames = null;
}

export function countryName(code: string | null | undefined): string {
  if (!code) return 'Onbekend';
  const c = code.toUpperCase();
  if (c === '??') return 'Onbekend';
  if (displayNames) {
    try {
      const name = displayNames.of(c);
      if (name && name !== c) return name;
    } catch {}
  }
  return FALLBACK[c] ?? c;
}
