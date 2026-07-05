import { supabase } from '@/integrations/supabase/client';

const BACKUP_KEY = 'impersonation_backup_v1';
const INFO_KEY = 'impersonation_info_v1';

export interface ImpersonationInfo {
  target_user_id: string;
  target_email: string;
  admin_email: string | null;
  started_at: number;
}

export function getImpersonationInfo(): ImpersonationInfo | null {
  try {
    const raw = localStorage.getItem(INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function isImpersonating(): boolean {
  return !!localStorage.getItem(BACKUP_KEY);
}

export async function startImpersonation(target_user_id: string) {
  // 1) Backup current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Geen actieve sessie');
  const adminEmail = session.user.email ?? null;

  // 2) Ask edge function for a magic link token
  const { data, error } = await supabase.functions.invoke('admin-impersonate', {
    body: { target_user_id },
  });
  if (error) throw error;
  if (!data?.token_hash) throw new Error(data?.error || 'Geen token ontvangen');

  // 3) Store backup BEFORE switching sessions
  localStorage.setItem(BACKUP_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }));

  // 4) Verify the OTP → establishes new session as target user
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'magiclink',
  });
  if (verifyErr) {
    localStorage.removeItem(BACKUP_KEY);
    throw verifyErr;
  }

  localStorage.setItem(INFO_KEY, JSON.stringify({
    target_user_id,
    target_email: data.email,
    admin_email: adminEmail,
    started_at: Date.now(),
  } satisfies ImpersonationInfo));
}

export async function stopImpersonation() {
  const raw = localStorage.getItem(BACKUP_KEY);
  if (!raw) return;
  const backup = JSON.parse(raw) as { access_token: string; refresh_token: string };
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(INFO_KEY);
  const { error } = await supabase.auth.setSession(backup);
  if (error) throw error;
}
