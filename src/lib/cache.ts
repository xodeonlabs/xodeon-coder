/**
 * Simple localStorage cache with TTL to reduce cloud/database calls.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  try {
    const raw = localStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(`cache:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable, silently fail
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(`cache:${key}`);
  } catch {}
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}

// Cache keys
export const CACHE_KEYS = {
  apps: (userId: string) => `apps:${userId}`,
  coins: (userId: string) => `coins:${userId}`,
  orgs: (userId: string) => `orgs:${userId}`,
  orgMemberships: (userId: string) => `org-memberships:${userId}`,
  contracts: (userId: string) => `contracts:${userId}`,
  adminRole: (userId: string) => `admin-role:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  displayName: (userId: string) => `display-name:${userId}`,
  ads: (page: string) => `ads:${page}`,
  profiles: 'profiles',
  unreadCount: (userId: string) => `unread:${userId}`,
} as const;

// TTLs
export const CACHE_TTL = {
  short: 60 * 1000,        // 1 minute - for frequently changing data
  medium: 5 * 60 * 1000,   // 5 minutes - default
  long: 30 * 60 * 1000,    // 30 minutes - for rarely changing data
  ads: 15 * 60 * 1000,     // 15 minutes - ads
} as const;
