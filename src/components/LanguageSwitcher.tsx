import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type Language } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'compact' | 'full';
  align?: 'start' | 'center' | 'end';
}

export function LanguageSwitcher({ variant = 'icon', align = 'end' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = (SUPPORTED_LANGUAGES.includes(i18n.resolvedLanguage as Language)
    ? i18n.resolvedLanguage
    : 'nl') as Language;
  const label = LANGUAGE_LABELS[current];

  const change = (lng: Language) => {
    i18n.changeLanguage(lng);
    try { localStorage.setItem('lang', lng); } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('common.language')}>
            <span className="text-base leading-none">{label.flag}</span>
          </Button>
        ) : variant === 'compact' ? (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5">
            <span className="text-base leading-none">{label.flag}</span>
            <span className="text-xs font-medium uppercase">{current}</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Languages className="h-4 w-4" />
            <span>{label.flag} {label.name}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[160px]">
        <DropdownMenuLabel>{t('common.language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => change(lng)}
            className={current === lng ? 'bg-accent/40 font-semibold' : ''}
          >
            <span className="mr-2">{LANGUAGE_LABELS[lng].flag}</span>
            {LANGUAGE_LABELS[lng].name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
