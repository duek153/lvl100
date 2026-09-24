import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { levelFromXp } from '../domain/levels';
import { effectiveStreak } from '../domain/streak';
import { dayKey } from '../domain/util';
import { useReminders } from '../services/reminders';

const MAIN = [
  { to: '/', ico: '🏠', label: 'בית', end: true },
  { to: '/road', ico: '🗺️', label: 'הדרך ל-100' },
  { to: '/practice', ico: '🎯', label: 'תרגול' },
  { to: '/progress', ico: '📈', label: 'התקדמות' },
  { to: '/leaderboard', ico: '🏆', label: 'דירוג' },
];

const MORE = [
  { to: '/daily', ico: '⚡', label: 'אתגר יומי' },
  { to: '/vocab', ico: '📚', label: 'אוצר מילים' },
  { to: '/grammar', ico: '🧩', label: 'דקדוק' },
  { to: '/reading', ico: '📖', label: 'אנסינים' },
  { to: '/simulation', ico: '🎓', label: 'סימולציה' },
  { to: '/ready', ico: '🏅', label: 'מוכנות' },
  { to: '/achievements', ico: '🏆', label: 'גלריית פרסים' },
  { to: '/friends', ico: '👥', label: 'חברים' },
  { to: '/exam', ico: 'ℹ️', label: 'על המבחן' },
  { to: '/account', ico: '☁️', label: 'חשבון' },
  { to: '/settings', ico: '⚙️', label: 'הגדרות' },
  { to: '/admin', ico: '🛠️', label: 'Admin' },
];

// Mobile bottom bar: 4 main tabs + "More"; everything else lives in the sheet.
const MOBILE_TABS = MAIN.filter((l) => l.to !== '/leaderboard');
const SHEET = [
  { to: '/leaderboard', ico: '🏆', label: 'דירוג' },
  { to: '/achievements', ico: '🎖️', label: 'גלריית פרסים' },
  // Admin stays desktop-only (content management)
  ...MORE.filter((l) => l.to !== '/achievements' && l.to !== '/admin'),
];

function MoreSheet({ onClose }: { onClose: () => void }) {
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="כל המסכים" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden />
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>כל המסכים</h2>
          <button className="icon-btn" aria-label="סגירה" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sheet-grid">
          {SHEET.map((l, i) => (
            <NavLink key={l.to} to={l.to} ref={i === 0 ? first : undefined} className={({ isActive }) => `sheet-tile ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="ico" aria-hidden>
                {l.ico}
              </span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { state } = useGame();
  const lv = levelFromXp(state.progress.xp);
  const streak = effectiveStreak(state.progress.streak, dayKey());
  useReminders();
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMoreOpen(false), [pathname]);
  const inSheet = SHEET.some((l) => pathname === l.to || pathname.startsWith(l.to + '/'));
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        דלג לתוכן
      </a>
      <nav className="sidebar" aria-label="ניווט ראשי">
        <Link to="/" className="brand">
          <span className="brand-logo">100</span> LVL100
        </Link>
        {MAIN.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <span className="ico" aria-hidden>
              {l.ico}
            </span>
            {l.label}
          </NavLink>
        ))}
        <div className="side-sep" />
        {MORE.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <span className="ico" aria-hidden>
              {l.ico}
            </span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div>
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-logo">100</span> LVL100
          </Link>
          <div className="top-stats">
            <Link to="/progress" className="pill fire" aria-label={`רצף ${streak} ימים`}>
              🔥 <span className="num">{streak}</span>
            </Link>
            <Link to="/achievements" className="pill xp" aria-label={`רמה ${lv.level}`}>
              ⭐ <span className="en-inline">Lv {lv.level}</span>
            </Link>
            <Link to="/settings" className="pill" aria-label="הגדרות ועוד" style={{ padding: '6px 10px' }}>
              {state.profile?.avatar ?? '🙂'}
            </Link>
          </div>
        </header>
        <main id="main" className="main">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="ניווט תחתון">
        {MOBILE_TABS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico" aria-hidden>
              {l.ico}
            </span>
            {l.label}
          </NavLink>
        ))}
        <button type="button" className={`more-tab ${inSheet || moreOpen ? 'active' : ''}`} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
          <span className="ico" aria-hidden>
            ☰
          </span>
          עוד
        </button>
      </nav>
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
    </div>
  );
}
