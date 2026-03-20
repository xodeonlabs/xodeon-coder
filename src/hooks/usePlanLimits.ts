import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger, handleSupabaseError } from '@/lib/error-handling';

export type PlanTier = 'free' | 'pro' | 'plus' | 'enterprise';

export interface UserPlan {
  id: string;
  user_id: string;
  plan_tier: PlanTier;
  ai_messages_used: number;
  ai_messages_limit: number;
  ai_lines_used: number;
  ai_lines_limit: number;
  apps_limit: number;
  created_at: string;
  updated_at: string;
  plan_started_at: string;
  plan_ends_at?: string;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  description: string;
  price_monthly: number | null;
  ai_messages_limit: number;
  ai_lines_limit: number;
  apps_limit: number;
  features: string[];
}

interface UsePlanLimitsState {
  userPlan: UserPlan | null;
  planDef: PlanDefinition | null;
  loading: boolean;
  error: string | null;
  canUseAI: boolean;
  canCreateApp: boolean;
  aiUsagePercent: number;
  linesUsagePercent: number;
}

/**
 * Hook to check plan limits and usage
 */
export function usePlanLimits(userId: string | undefined): UsePlanLimitsState {
  const [state, setState] = useState<UsePlanLimitsState>({
    userPlan: null,
    planDef: null,
    loading: true,
    error: null,
    canUseAI: true,
    canCreateApp: true,
    aiUsagePercent: 0,
    linesUsagePercent: 0,
  });

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Get user plan
        const { data: planData, error: planError } = await (supabase
          .from('user_plans' as any)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle() as any);

        if (planError) throw planError;

        // Get plan definitions
        const { data: planDefs, error: defsError } = await (supabase
          .from('plan_definitions' as any)
          .select('*') as any);

        if (defsError) throw defsError;

        const userPlan = planData as UserPlan | null;
        const planDef = planDefs?.find(p => p.tier === userPlan?.plan_tier) as PlanDefinition | null;

        const aiUsagePercent = userPlan
          ? Math.round((userPlan.ai_messages_used / userPlan.ai_messages_limit) * 100)
          : 0;
        const linesUsagePercent = userPlan
          ? Math.round((userPlan.ai_lines_used / userPlan.ai_lines_limit) * 100)
          : 0;

        const canUseAI =
          !userPlan ||
          (userPlan.ai_messages_used < userPlan.ai_messages_limit &&
            userPlan.ai_lines_used < userPlan.ai_lines_limit);

        const canCreateApp = !userPlan || userPlan.apps_limit > 0;

        setState(prev => ({
          ...prev,
          userPlan,
          planDef,
          loading: false,
          canUseAI,
          canCreateApp,
          aiUsagePercent,
          linesUsagePercent,
        }));
      } catch (err) {
        const userMessage = handleSupabaseError('usePlanLimits', err, { userId });
        setState(prev => ({
          ...prev,
          loading: false,
          error: userMessage,
        }));
      }
    })();
  }, [userId]);

  return state;
}

/**
 * Record AI usage
 */
export async function logAIUsage(
  userId: string,
  conversationId: string | null,
  messagesUsed: number,
  linesAdded: number,
  costCoins: number
): Promise<boolean> {
  try {
    const { data: plan, error: planError } = await supabase
      .from('user_plans')
      .select('id, ai_messages_used, ai_lines_used')
      .eq('user_id', userId)
      .maybeSingle();

    if (planError) throw planError;

    if (!plan) return false;

    // Update usage
    const { error: updateError } = await supabase
      .from('user_plans')
      .update({
        ai_messages_used: (plan.ai_messages_used || 0) + messagesUsed,
        ai_lines_used: (plan.ai_lines_used || 0) + linesAdded,
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Log usage
    await supabase.from('ai_usage_log').insert({
      user_id: userId,
      conversation_id: conversationId,
      message_count: messagesUsed,
      lines_added: linesAdded,
      cost_coins: costCoins,
    });

    errorLogger.info('logAIUsage', 'Logged AI usage', {
      userId,
      messagesUsed,
      linesAdded,
      costCoins,
    });

    return true;
  } catch (err) {
    errorLogger.error('logAIUsage', 'Failed to log AI usage', err, {
      userId,
      messagesUsed,
      linesAdded,
    });
    return false;
  }
}

/**
 * Get plan info for display
 */
export function getPlanBadge(tier: PlanTier): { label: string; color: string } {
  const badges: Record<PlanTier, { label: string; color: string }> = {
    free: { label: 'Free', color: 'bg-gray-500' },
    pro: { label: 'Pro', color: 'bg-blue-500' },
    plus: { label: 'Plus', color: 'bg-purple-500' },
    enterprise: { label: 'Enterprise', color: 'bg-amber-600' },
  };
  return badges[tier];
}
