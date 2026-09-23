import { useGame } from '../store/GameContext';
import { ACHIEVEMENTS } from '../domain/achievements';
import { LEVELS, levelFromXp, totalXpForLevel } from '../domain/levels';
import { STREAK_MILESTONES } from '../domain/streak';
import { En, PageHeader } from '../components/ui';

export default function Achievements() {
  const { state } = useGame();
  const lv = levelFromXp(state.progress.xp);
  const unlocked = Object.keys(state.achievements).length;
  return (
    <div className="stack">
      <PageHeader title={<><En>Achievements</En> 🎖️</>} sub={`${unlocked}/${ACHIEVEMENTS.length} נפתחו`} />
      <div className="grid-3">
        {ACHIEVEMENTS.map((a) => {
          const at = state.achievements[a.id];
          return (
            <div key={a.id} className={`card center ${at ? '' : 'locked'}`}>
              <div style={{ fontSize: '2.2rem' }}>{at ? a.emoji : '🔒'}</div>
              <b className="en" style={{ display: 'block', textAlign: 'center' }}>
                {a.title}
              </b>
              <div className="faint">{a.desc}</div>
              {at && <div className="xs muted">{new Date(at).toLocaleDateString('he-IL')}</div>}
            </div>
          );
        })}
      </div>
      <h2 style={{ marginTop: 10 }}>🔥 Streak Milestones</h2>
      <div className="row wrap">
        {STREAK_MILESTONES.map((m) => (
          <span key={m} className={`chip ${state.progress.streak.longest >= m ? 'accent' : ''}`}>
            🔥 {m} {m === 1 ? 'Day' : 'Days'}
          </span>
        ))}
      </div>
      <h2 style={{ marginTop: 10 }}>⭐ Levels</h2>
      <div className="card">
        <div className="list">
          {LEVELS.map((l) => (
            <div key={l.level} className={`list-item ${l.level === lv.level ? 'me' : ''}`} style={{ opacity: l.level > lv.level ? 0.55 : 1 }}>
              <span className="avatar">{l.emoji}</span>
              <div style={{ flex: 1 }}>
                <b className="en-inline">
                  Level {l.level} – {l.name}
                </b>
                <div className="faint">{l.nameHe}</div>
              </div>
              <span className="num faint en-inline">{totalXpForLevel(l.level).toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
