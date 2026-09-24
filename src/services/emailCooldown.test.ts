import { describe, it, expect } from 'vitest';
import { startCooldown, loadCooldown, remainingMs, formatCountdown, RESEND_MS, RATE_LIMIT_MS } from './emailCooldown';

class Mem implements Storage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('email cooldown timer', () => {
  it('persists and counts down', () => {
    const st = new Mem();
    const until = startCooldown(RESEND_MS, 1_000, st);
    expect(loadCooldown(st)).toBe(until);
    expect(remainingMs(until, 1_000)).toBe(60_000);
    expect(remainingMs(until, 31_000)).toBe(30_000);
    expect(remainingMs(until, 999_999)).toBe(0);
  });
  it('formats as m:ss, rounding up', () => {
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(41_200)).toBe('0:42');
    expect(formatCountdown(RATE_LIMIT_MS)).toBe('60:00');
    expect(formatCountdown(0)).toBe('0:00');
  });
  it('empty storage means no cooldown', () => {
    expect(loadCooldown(new Mem())).toBe(0);
  });
});
