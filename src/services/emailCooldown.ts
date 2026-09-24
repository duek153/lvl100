// Cooldown before another sign-in email can be requested.
// Supabase allows one email per address per 60 s, and its built-in mail
// service only ~2 per hour — so after a rate-limit error we wait an hour.

export const RESEND_MS = 60_000;
export const RATE_LIMIT_MS = 60 * 60_000;
const KEY = 'lvl100:email-cooldown-until';

export function loadCooldown(storage: Storage = localStorage): number {
  try {
    return Number(storage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function startCooldown(ms: number, now = Date.now(), storage: Storage = localStorage): number {
  const until = now + ms;
  try {
    storage.setItem(KEY, String(until));
  } catch {
    /* ignore */
  }
  return until;
}

export function remainingMs(until: number, now = Date.now()): number {
  return Math.max(0, until - now);
}

/** "0:42" / "59:10" */
export function formatCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
