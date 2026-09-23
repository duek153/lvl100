import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useUI } from '../store/UIContext';
import type { Settings, ThemeSetting } from '../domain/types';
import { buildIcs, notificationsSupported, requestNotificationPermission } from '../services/reminders';
import { buyFreeze } from '../services/game';
import { XP } from '../domain/xp';
import { MAX_FREEZES } from '../domain/streak';
import { En, PageHeader, Tabs } from '../components/ui';

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function SettingsPage() {
  const { state, update, resetAll, exportState, importState } = useGame();
  const ui = useUI();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const s = state.settings;
  const profile = state.profile!;
  const [confirmReset, setConfirmReset] = useState(false);
  const [perm, setPerm] = useState<string>(notificationsSupported() ? Notification.permission : 'unsupported');

  const set = (patch: Partial<Settings>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const setRem = (patch: Partial<Settings['reminders']>) => set({ reminders: { ...s.reminders, ...patch } });
  const setProfile = (patch: Partial<typeof profile>) => update((st) => ({ ...st, profile: { ...st.profile!, ...patch } }));

  const download = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const wallet = state.progress.xp - state.progress.xpSpent;

  return (
    <div className="stack q-wrap">
      <PageHeader title="הגדרות ⚙️" />

      <div className="card stack">
        <h2>הפרופיל שלי</h2>
        <label className="field">
          שם
          <input type="text" value={profile.name} maxLength={24} onChange={(e) => setProfile({ name: e.target.value })} />
        </label>
        <div className="grid-2">
          <label className="field">
            ציון יעד: <b className="num">{profile.targetScore}</b>
            <input type="range" min={60} max={150} value={profile.targetScore} onChange={(e) => setProfile({ targetScore: Number(e.target.value) })} />
          </label>
          <label className="field">
            תאריך מבחן
            <input type="date" value={profile.examDate ?? ''} onChange={(e) => setProfile({ examDate: e.target.value || null })} />
          </label>
          <label className="field">
            דקות ביום
            <select value={profile.minutesPerDay} onChange={(e) => setProfile({ minutesPerDay: Number(e.target.value) })}>
              {[10, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} דקות
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            ימים בשבוע
            <select value={profile.daysPerWeek} onChange={(e) => setProfile({ daysPerWeek: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="switch">
          <span>🌍 פרופיל ציבורי (מופיע בשם ב-Leaderboard)</span>
          <input type="checkbox" checked={profile.publicProfile} onChange={(e) => setProfile({ publicProfile: e.target.checked })} />
        </label>
        <button className="btn ghost" onClick={() => nav('/placement')}>
          🧭 מבחן מיקום חוזר
        </button>
      </div>

      <div className="card stack">
        <h2>תצוגה</h2>
        <Tabs<ThemeSetting>
          value={s.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: 'light', label: '☀️ Light' },
            { value: 'dark', label: '🌙 Dark' },
            { value: 'system', label: '💻 System' },
          ]}
        />
        <label className="switch">
          <span>תנועה מופחתת (Reduced motion)</span>
          <input type="checkbox" checked={s.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} />
        </label>
      </div>

      <div className="card stack">
        <h2>⏰ תזכורות</h2>
        <label className="switch">
          <span>הפעל תזכורת יומית</span>
          <input
            type="checkbox"
            checked={s.reminders.enabled}
            onChange={async (e) => {
              setRem({ enabled: e.target.checked });
              if (e.target.checked) setPerm(await requestNotificationPermission());
            }}
          />
        </label>
        {s.reminders.enabled && (
          <>
            <label className="field">
              שעה
              <input type="time" value={s.reminders.time} onChange={(e) => setRem({ time: e.target.value })} />
            </label>
            <div>
              <div className="small bold" style={{ marginBottom: 6 }}>
                ימים ({s.reminders.days.length} בשבוע)
              </div>
              <div className="day-toggle">
                {DAY_NAMES.map((n, i) => (
                  <button key={i} className={s.reminders.days.includes(i) ? 'on' : ''} aria-pressed={s.reminders.days.includes(i)} onClick={() => setRem({ days: s.reminders.days.includes(i) ? s.reminders.days.filter((d) => d !== i) : [...s.reminders.days, i].sort() })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              <En>Remind me at {s.reminders.time}</En> · {s.reminders.days.map((d) => DAY_NAMES[d]).join(', ')}
            </p>
            <div className="notice">
              {perm === 'granted'
                ? '✅ התראות דפדפן מאושרות. הן יופיעו כשהאתר פתוח ברקע.'
                : perm === 'denied'
                  ? '🚫 הדפדפן חוסם התראות. התזכורת תופיע בתוך האתר.'
                  : perm === 'unsupported'
                    ? 'הדפדפן לא תומך בהתראות. התזכורת תופיע בתוך האתר.'
                    : 'התראות עוד לא אושרו.'}{' '}
              דפדפן לא יכול לשלוח התראה כשהאתר סגור לגמרי בלי שרת Push, ולכן הדרך הכי אמינה היא להוסיף תזכורת קבועה ליומן 👇
            </div>
            <div className="row wrap">
              {perm !== 'granted' && perm !== 'unsupported' && (
                <button className="btn ghost" onClick={async () => setPerm(await requestNotificationPermission())}>
                  🔔 אשר התראות
                </button>
              )}
              <button className="btn" onClick={() => download('lvl100-reminder.ics', buildIcs(s, location.href.split('#')[0]), 'text/calendar')}>
                📅 הוסף ליומן (.ics)
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card stack">
        <h2>❄️ Streak Freeze</h2>
        <p className="muted" style={{ margin: 0 }}>
          פספסת יום? הקפאה שמורה מגינה על הרצף אוטומטית. יש לך <b>{state.progress.streak.freezes}</b>/{MAX_FREEZES}. ‏XP פנוי: <b className="num">{wallet}</b> (קנייה לא מורידה Level)
        </p>
        <button
          className="btn ghost"
          onClick={() => {
            let msg = '';
            update((st) => {
              const r = buyFreeze(st);
              msg = r.ok ? '❄️ נקנתה הקפאת רצף' : r.reason ?? '';
              return r.state;
            });
            ui.toast(msg);
          }}
        >
          קנה הקפאה · {XP.streakFreezeCost} XP
        </button>
      </div>

      <div className="card stack">
        <h2>💾 נתונים</h2>
        <p className="faint" style={{ margin: 0 }}>
          ב-MVP הנתונים נשמרים בדפדפן הזה בלבד. גבה אותם לקובץ כדי להעביר למכשיר אחר.
        </p>
        <div className="row wrap">
          <button className="btn ghost" onClick={() => download(`lvl100-backup-${new Date().toISOString().slice(0, 10)}.json`, exportState(), 'application/json')}>
            ⬇️ ייצוא גיבוי
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            ⬆️ ייבוא גיבוי
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importState(await f.text());
                ui.toast('✅ הגיבוי יובא');
              } catch {
                ui.toast('❌ קובץ לא תקין');
              }
            }}
          />
          {!confirmReset ? (
            <button className="btn danger" onClick={() => setConfirmReset(true)}>
              🗑️ איפוס מלא
            </button>
          ) : (
            <span className="row wrap">
              <span className="small bold">למחוק את כל ההתקדמות? אי אפשר לבטל.</span>
              <button
                className="btn danger sm"
                onClick={() => {
                  resetAll();
                  nav('/welcome');
                }}
              >
                כן, למחוק
              </button>
              <button className="btn ghost sm" onClick={() => setConfirmReset(false)}>
                ביטול
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
