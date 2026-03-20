import { ExternalLink, X, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getCached, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

interface Ad {
  id: string;
  emoji: string;
  title: string;
  description: string;
  url: string;
  gradient: string;
  pages: string[];
  organization_id?: string | null;
  org_name?: string;
}

const ROTATE_INTERVAL = 6000;

interface AdBannerProps {
  className?: string;
  page?: string;
  organizationId?: string;
}

export function AdBanner({ className = '', page, organizationId }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const cacheKey = CACHE_KEYS.ads((page || 'all') + '_v2');
    const cached = getCached<Ad[]>(cacheKey, CACHE_TTL.ads);
    if (cached && cached.length > 0 && cached.some(a => !a.organization_id || a.org_name)) { setAds(cached); return; }

    let query = supabase
      .from('ads')
      .select('id, emoji, title, description, url, gradient, pages, organization_id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    query.then(async ({ data }) => {
      if (data && data.length > 0) {
        const filtered = page
          ? (data as any[]).filter((ad: any) => ad.pages && ad.pages.includes(page))
          : (data as any[]);

        // Fetch org names for ads with organization_id
        const orgIds = [...new Set(filtered.filter((a: any) => a.organization_id).map((a: any) => a.organization_id))];
        let orgMap = new Map<string, string>();
        if (orgIds.length > 0) {
          const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
          if (orgs) orgMap = new Map(orgs.map(o => [o.id, o.name]));
        }

        const enriched = filtered.map((ad: any) => ({
          ...ad,
          org_name: ad.organization_id ? orgMap.get(ad.organization_id) : undefined,
        }));

        setAds(enriched as Ad[]);
        setCache(cacheKey, enriched as Ad[]);
      }
    });
  }, [page, organizationId]);

  const goTo = useCallback((index: number) => {
    if (isAnimating || ads.length === 0) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 300);
    }, 150);
  }, [isAnimating, ads.length]);

  const next = useCallback(() => {
    if (ads.length === 0) return;
    goTo((currentIndex + 1) % ads.length);
  }, [currentIndex, goTo, ads.length]);

  const prev = useCallback(() => {
    if (ads.length === 0) return;
    goTo((currentIndex - 1 + ads.length) % ads.length);
  }, [currentIndex, goTo, ads.length]);

  useEffect(() => {
    if (ads.length === 0) return;
    const timer = setInterval(next, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [next, ads.length]);

  if (dismissed || ads.length === 0) return null;

  const ad = ads[currentIndex % ads.length];
  const hasExternalUrl = ad.url && ad.url.trim().length > 0;
  const adHref = hasExternalUrl ? ad.url : (ad.organization_id ? `/bedrijf/${ad.organization_id}` : '#');
  const isExternal = hasExternalUrl;

  // Enhanced censuur
  const { censorText } = require('@/lib/profanity-filter-enhanced');
  const censoredTitle = censorText(ad.title);
  const censoredDescription = censorText(ad.description);

  const handleClick = (e: React.MouseEvent) => {
    if (!isExternal) {
      e.preventDefault();
      if (ad.organization_id) navigate(`/bedrijf/${ad.organization_id}`);
    }
  };

  return (
    <div
      className={`relative rounded-xl border border-border/50 overflow-hidden group ${className}`}
      style={{ background: ad.gradient }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100 z-10"
        title="Sluiten"
      >
        <X className="h-3 w-3" />
      </button>

      <button
        onClick={prev}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <a
        href={adHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        onClick={handleClick}
        className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
      >
        <div className="w-9 h-9 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
          <span className="text-lg">{ad.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded shrink-0">Ad</span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-muted-foreground truncate">{ad.description}</p>
            {ad.org_name && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 shrink-0">
                <Building2 className="h-2.5 w-2.5" />
                {ad.org_name}
              </span>
            )}
          </div>
        </div>
        {isExternal ? (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </a>

      <div className="flex items-center justify-center gap-1.5 pb-2">
        {ads.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
