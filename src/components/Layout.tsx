import { NavLink, Outlet, Link } from 'react-router-dom';
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
  { to: '/achievements', ico: '🎖️', label: 'הישגים' },
  { to: '/friends', ico: '👥', label: 'חברים' },
  { to: '/exam', ico: 'ℹ️', label: 'על המבחן' },
  { to: '/settings', ico: '⚙️', label: 'הגדרות' },
  { to: '/admin', ico: '🛠️', label: 'Admin' },
];

export default function Layout() {
  const { state } = useGame();
  const lv = levelFromXp(state.progress.xp);
  const streak = effectiveStreak(state.progress.streak, dayKey());
  useReminders();
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
        {MAIN.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico" aria-hidden>
              {l.ico}
            </span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
