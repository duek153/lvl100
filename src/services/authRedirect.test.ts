import { describe, it, expect } from 'vitest';
import { parseAuthHash } from './authRedirect';

describe('email link redirect parsing', () => {
  it('extracts tokens from the Supabase redirect fragment', () => {
    const r = parseAuthHash('#access_token=aaa.bbb.ccc&expires_at=1&expires_in=3600&refresh_token=rrr&token_type=bearer&type=signup');
    expect(r?.tokens).toEqual({ access_token: 'aaa.bbb.ccc', refresh_token: 'rrr' });
  });
  it('reports link errors', () => {
    const r = parseAuthHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(r?.tokens).toBeNull();
    expect(r?.error).toBe('otp_expired');
  });
  it('ignores normal app routes', () => {
    expect(parseAuthHash('#/play/friend?c=abc')).toBeNull();
    expect(parseAuthHash('#/')).toBeNull();
    expect(parseAuthHash('')).toBeNull();
  });
});
