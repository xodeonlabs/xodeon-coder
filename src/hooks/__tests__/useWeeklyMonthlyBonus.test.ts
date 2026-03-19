import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeklyMonthlyBonus } from '@/hooks/useWeeklyMonthlyBonus';
import * as supabase from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client');

describe('useWeeklyMonthlyBonus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
          })),
        })),
      })),
    };

    vi.mocked(supabase.supabase).mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useWeeklyMonthlyBonus('test-user'));

    expect(result.current.loading).toBe(true);
  });

  it('should claim daily bonus if not claimed today', async () => {
    const mockSupabase = {
      from: vi.fn((table) => {
        if (table === 'user_coins') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: '1',
                      balance: 100,
                      last_daily_bonus: '2025-01-01',
                      last_weekly_bonus: null,
                      last_monthly_bonus: null,
                    },
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabase.supabase).mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useWeeklyMonthlyBonus('test-user'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonuses.daily.claimed).toBe(true);
  });

  it('should not claim bonus if already claimed today', async () => {
    const today = new Date().toISOString().slice(0, 10);

    const mockSupabase = {
      from: vi.fn((table) => {
        if (table === 'user_coins') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: '1',
                      balance: 100,
                      last_daily_bonus: today,
                      last_weekly_bonus: null,
                      last_monthly_bonus: null,
                    },
                  })
                ),
              })),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(supabase.supabase).mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useWeeklyMonthlyBonus('test-user'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bonuses.daily.alreadyClaimed).toBe(true);
    expect(result.current.bonuses.daily.claimed).toBe(false);
  });

  it('should have correct bonus amounts', () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
          })),
        })),
      })),
    };

    vi.mocked(supabase.supabase).mockReturnValue(mockSupabase as any);

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
