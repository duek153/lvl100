// Reminders: Web Notifications while the app is open, an in-app banner
// otherwise, and an .ics calendar file for reminders that work even when the
// site is closed (a browser can't schedule notifications without a push server).
import { useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { useUI } from '../store/UIContext';
import { dayKey } from '../domain/util';
import type { Settings } from '../domain/types';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission;
  return Notification.requestPermission();
}

/** Is a reminder due right now (today is a reminder day and time has passed)? */
export function reminderDue(settings: Settings, studiedToday: boolean, now = new Date()): boolean {
  const r = settings.reminders;
  if (!r.enabled || studiedToday) return false;
  if (!r.days.includes(now.getDay())) return false;
  const [h, m] = r.time.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

const FIRED_KEY = 'lvl100:reminder-fired';

export function useReminders() {
  const { state } = useGame();
  const ui = useUI();
  useEffect(() => {
    const check = () => {
      const today = dayKey();
      const studied = (state.progress.days[today]?.questions ?? 0) > 0;
      if (!reminderDue(state.settings, studied)) return;
      let fired: string | null = null;
      try {
        fired = localStorage.getItem(FIRED_KEY);
      } catch {
        /* ignore */
      }
      if (fired === today) return;
      try {
        localStorage.setItem(FIRED_KEY, today);
      } catch {
        /* ignore */
      }
      const text = 'הגיע הזמן לאימון היומי שלך 🔥 כמה דקות היום = עוד צעד ל-100';
      if (notificationsSupported() && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        try {
          new Notification('LVL100', { body: text, icon: './icon.svg', tag: 'lvl100-daily' });
        } catch {
          ui.toast('⏰ ' + text);
        }
      } else {
        ui.toast('⏰ ' + text);
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [state.settings, state.progress.days, ui]);
}

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Weekly recurring calendar reminder (works on phones even when the site is closed). */
export function buildIcs(settings: Settings, url: string): string {
  const [h, m] = settings.reminders.time.split(':');
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const byday = settings.reminders.days.map((x) => ICS_DAYS[x]).join(',');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LVL100//Reminders//HE',
    'BEGIN:VEVENT',
    `UID:lvl100-daily-${date}@lvl100`,
    `DTSTAMP:${date}T000000Z`,
    `DTSTART:${date}T${h}${m}00`,
    'DURATION:PT20M',
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    'SUMMARY:LVL100 — אימון אנגלית יומי 🔥',
    `DESCRIPTION:הדרך ל-100 מחכה לך: ${url}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:LVL100',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
