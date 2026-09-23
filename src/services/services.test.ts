import { describe, it, expect } from 'vitest';
import { encodeChallenge, decodeChallenge, challengeWinner } from './sessions';
import { reminderDue, buildIcs } from './reminders';
import { DEFAULT_SETTINGS } from './game';

describe('friend challenges', () => {
  it('round-trips a challenge code (Hebrew names included)', () => {
    const c = { n: 'נועה', a: '🦊', ids: ['sc-001', 'wm-abandon'], c: 7, t: 95_000 };
    expect(decodeChallenge(encodeChallenge(c))).toEqual(c);
    expect(encodeChallenge(c)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('rejects garbage', () => {
    expect(decodeChallenge('not-a-code')).toBeNull();
  });
  it('more correct wins, then faster', () => {
    expect(challengeWinner({ c: 8, t: 100 }, { c: 7, t: 10 })).toBe('me');
    expect(challengeWinner({ c: 7, t: 100 }, { c: 7, t: 90 })).toBe('them');
    expect(challengeWinner({ c: 7, t: 90 }, { c: 7, t: 90 })).toBe('tie');
  });
});

describe('reminders', () => {
  const s = { ...DEFAULT_SETTINGS, reminders: { enabled: true, time: '19:00', days: [0, 1, 2, 3, 4] } };
  it('fires after the time on a reminder day when not studied', () => {
    expect(reminderDue(s, false, new Date('2026-09-20T19:30:00'))).toBe(true); // Sunday
    expect(reminderDue(s, false, new Date('2026-09-20T18:59:00'))).toBe(false);
    expect(reminderDue(s, true, new Date('2026-09-20T19:30:00'))).toBe(false);
    expect(reminderDue(s, false, new Date('2026-09-25T19:30:00'))).toBe(false); // Friday
    expect(reminderDue({ ...s, reminders: { ...s.reminders, enabled: false } }, false, new Date('2026-09-20T19:30:00'))).toBe(false);
  });
  it('builds a weekly recurring calendar event', () => {
    const ics = buildIcs(s, 'https://example.com');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH');
    expect(ics).toContain('T190000');
  });
});
