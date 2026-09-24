// Email sign-in links (Supabase default templates) come back as
//   https://…/lvl100/#access_token=…&refresh_token=…&type=signup
// The app uses hash routing, so these tokens must be taken out of the URL
// before the router sees them. Called once in main.tsx before rendering.

export const PENDING_KEY = 'lvl100:pending-auth';
export const PENDING_ERROR_KEY = 'lvl100:pending-auth-error';

export interface PendingAuth {
  access_token: string;
  refresh_token: string;
}

export function parseAuthHash(hash: string): { tokens: PendingAuth | null; error: string | null } | null {
  const h = hash.replace(/^#\/?/, '');
  if (!/(^|&)(access_token|error_code|error)=/.test(h)) return null;
  const p = new URLSearchParams(h);
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (access_token && refresh_token) return { tokens: { access_token, refresh_token }, error: null };
  return { tokens: null, error: p.get('error_code') || p.get('error_description') || p.get('error') || 'unknown' };
}

export function captureAuthRedirect(loc: Location = window.location, storage: Storage = sessionStorage): boolean {
  const parsed = parseAuthHash(loc.hash);
  if (!parsed) return false;
  try {
    if (parsed.tokens) storage.setItem(PENDING_KEY, JSON.stringify(parsed.tokens));
    else storage.setItem(PENDING_ERROR_KEY, parsed.error ?? 'unknown');
  } catch {
    /* storage blocked */
  }
  history.replaceState(null, '', loc.pathname + loc.search + '#/account');
  return true;
}

export function takePendingAuth(storage: Storage = sessionStorage): { tokens: PendingAuth | null; error: string | null } {
  let tokens: PendingAuth | null = null;
  let error: string | null = null;
  try {
    const t = storage.getItem(PENDING_KEY);
    if (t) tokens = JSON.parse(t);
    error = storage.getItem(PENDING_ERROR_KEY);
    storage.removeItem(PENDING_KEY);
    storage.removeItem(PENDING_ERROR_KEY);
  } catch {
    /* ignore */
  }
  return { tokens, error };
}

export function hasPendingAuth(storage: Storage = sessionStorage): boolean {
  try {
    return !!storage.getItem(PENDING_KEY) || !!storage.getItem(PENDING_ERROR_KEY);
  } catch {
    return false;
  }
}
