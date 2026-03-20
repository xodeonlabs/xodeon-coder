import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeeklyMonthlyBonus } from '@/hooks/useWeeklyMonthlyBonus';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('useWeeklyMonthlyBonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useWeeklyMonthlyBonus('test-user'));
    expect(result.current.loading).toBe(true);
  });

  it('should have correct bonus amounts', () => {
    const { result } = renderHook(() => useWeeklyMonthlyBonus('test-user'));

    expect(result.current.bonuses.daily.amount).toBe(5);
    expect(result.current.bonuses.weekly.amount).toBe(20);
    expect(result.current.bonuses.monthly.amount).toBe(100);
  });

  it('should handle missing userId gracefully', () => {
    const { result } = renderHook(() => useWeeklyMonthlyBonus(undefined));
    expect(result.current.loading).toBe(true);
  });
});
