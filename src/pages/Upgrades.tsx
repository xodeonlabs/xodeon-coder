import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2 } from 'lucide-react';
import { OrgUpgrades } from '@/components/OrgUpgrades';

interface Org {
  id: string;
  name: string;
  owner_id: string;
  level: number;
  level_paid_until: string | null;
  auto_pay: boolean;
  icon?: string;
}

export default function Upgrades() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [orgBalance, setOrgBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const preselectedOrgId = searchParams.get('org');

  useEffect(() => {
    if (session?.user?.id) loadOrgs();
  }, [session?.user?.id]);

  async function loadOrgs() {
    setLoading(true);
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session!.user.id);

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const orgIds = memberships.map(m => m.organization_id);
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds);

    const mapped = (orgData || []).map((o: any) => ({
      id: o.id,
      name: o.name,
      owner_id: o.owner_id,
      level: o.level ?? 1,
      level_paid_until: o.level_paid_until,
      auto_pay: o.auto_pay ?? false,
      icon: o.icon,
    }));
    setOrgs(mapped);

    // Auto-select from query param or first org
    const target = preselectedOrgId
      ? mapped.find(o => o.id === preselectedOrgId)
      : mapped[0];
    if (target) selectOrg(target);
    setLoading(false);
  }

  async function selectOrg(org: Org) {
    setSelectedOrg(org);
    const { data: coins } = await supabase
      .from('org_coins')
      .select('balance')
      .eq('organization_id', org.id)
      .eq('name', 'coins')
      .single();
    setOrgBalance((coins as any)?.balance ?? 0);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="lg:hidden border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3" style={{ background: 'hsl(var(--ide-toolbar) / 0.8)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground">Upgrades</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Beheer je bedrijfslevels</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Desktop header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <button onClick={() => navigate('/organization')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="p-2 rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Upgrades</h1>
            <p className="text-xs text-muted-foreground">Kies en beheer het level van je bedrijf</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-sm text-muted-foreground">Je bent nog geen lid van een bedrijf.</p>
            <button onClick={() => navigate('/organization')} className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Ga naar bedrijven
            </button>
          </div>
        ) : (
          <>
            {/* Org selector */}
            {orgs.length > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1">
                {orgs.map(org => (
                  <button
                    key={org.id}
                    onClick={() => selectOrg(org)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-medium whitespace-nowrap border transition-all shrink-0 ${
                      selectedOrg?.id === org.id
                        ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                        : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{org.icon || '🏢'}</span>
                    <span className="max-w-[80px] sm:max-w-none truncate">{org.name}</span>
                    <span className="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground font-mono">L{org.level}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Upgrades panel */}
            {selectedOrg && (
              <div className="rounded-2xl border border-border/50 p-4 sm:p-6" style={{ background: 'hsl(var(--card))' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{selectedOrg.icon || '🏢'}</span>
                  <div>
                    <h2 className="text-base font-bold text-foreground">{selectedOrg.name}</h2>
                    <p className="text-[11px] text-muted-foreground">Kluis: <span className="font-mono font-bold text-foreground">{orgBalance}</span> coins</p>
                  </div>
                </div>

                <OrgUpgrades
                  orgId={selectedOrg.id}
                  orgName={selectedOrg.name}
                  currentLevel={selectedOrg.level}
                  orgBalance={orgBalance}
                  isOwner={selectedOrg.owner_id === session?.user?.id}
                  levelPaidUntil={selectedOrg.level_paid_until}
                  autoPay={selectedOrg.auto_pay}
                  onUpgrade={(newLevel) => {
                    setSelectedOrg({ ...selectedOrg, level: newLevel });
                    loadOrgs();
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
