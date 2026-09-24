import { useState } from 'react';
import { useGame } from '../store/GameContext';
import { achievementViews, CATEGORIES, nextUp, TIER_NAMES, type AchievementView, type Tier } from '../domain/achievements';
import { LEVELS, levelFromXp, totalXpForLevel } from '../domain/levels';
import { Bar, En, PageHeader, Ring, Tabs } from '../components/ui';

type Filter = 'all' | 'got' | 'missing';

const TIER_EMOJI: Record<Tier, string> = { 1: '🥉', 2: '🥈', 3: '🥇', 4: '💎' };

function Trophy({ v }: { v: AchievementView }) {
  const got = !!v.unlockedAt;
  const hidden = v.def.secret && !got;
  return (
    <div className={`trophy tier-${v.def.tier} ${got ? 'got' : ''}`} aria-label={`${v.def.title}: ${got ? 'נאסף' : 'עוד לא'}`}>
      <div className="medal" aria-hidden>
        <span>{hidden ? '❔' : v.def.emoji}</span>
      </div>
      <b className="en trophy-title">{hidden ? '???' : v.def.title}</b>
      <div className="xs muted trophy-desc">{hidden ? 'הישג סודי. תגלה אותו במקרה 😉' : v.def.desc}</div>
      <div className="trophy-foot">
        {got ? (
          <span className="chip success">✓ {new Date(v.unlockedAt!).toLocaleDateString('he-IL')}</span>
        ) : hidden ? (
          <span className="chip">🔒</span>
        ) : (
          <>
            <Bar pct={v.pct} className="thin" label={`התקדמות ל-${v.def.title}`} />
            <span className="xs muted num en-inline">
              {Math.min(v.value, v.def.target).toLocaleString()}/{v.def.target.toLocaleString()}
            </span>
          </>
        )}
      </div>
      <span className="tier-tag xs">{TIER_NAMES[v.def.tier]}</span>
    </div>
  );
}

export default function Achievements() {
  const { state } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const views = achievementViews(state);
  const got = views.filter((v) => v.unlockedAt).length;
  const pct = Math.round((got / views.length) * 100);
  const lv = levelFromXp(state.progress.xp);
  const next = nextUp(views);
  const shown = views.filter((v) => (filter === 'all' ? true : filter === 'got' ? !!v.unlockedAt : !v.unlockedAt));

  return (
    <div className="stack">
      <PageHeader title="גלריית הפרסים 🏆" sub="המטרה: לאסוף את כולם" />

      <div className="card hero pad-lg">
        <div className="row" style={{ gap: 20, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <Ring pct={pct} size={120} stroke={12} color="#fff" track="rgba(255,255,255,.25)" label="אחוז איסוף">
            <div className="bold num" style={{ fontSize: '1.6rem' }}>
              {pct}%
            </div>
          </Ring>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="big-num num" style={{ fontSize: '2.4rem' }}>
              {got}
              <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>/{views.length}</span>
            </div>
            <div className="muted">פרסים נאספו</div>
            <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
              {([1, 2, 3, 4] as Tier[]).map((t) => {
                const all = views.filter((v) => v.def.tier === t);
                return (
                  <span key={t} className="chip" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>
                    {TIER_EMOJI[t]} <span className="num">{all.filter((v) => v.unlockedAt).length}/{all.length}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {next.length > 0 && (
        <div className="card">
          <h2>🎯 הכי קרוב לאיסוף</h2>
          <div className="stack" style={{ gap: 12 }}>
            {next.map((v) => (
              <div key={v.def.id} className="row">
                <span className={`mini-medal tier-${v.def.tier}`} aria-hidden>
                  {v.def.emoji}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="spread small">
                    <b className="en-inline">{v.def.title}</b>
                    <span className="num muted en-inline">
                      {v.value.toLocaleString()}/{v.def.target.toLocaleString()}
                    </span>
                  </div>
                  <Bar pct={v.pct} className="thin" label={v.def.title} />
                  <div className="xs muted">{v.def.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `הכול (${views.length})` },
          { value: 'got', label: `נאספו (${got})` },
          { value: 'missing', label: `חסרים (${views.length - got})` },
        ]}
      />

      {CATEGORIES.map((c) => {
        const items = shown.filter((v) => v.def.category === c.id);
        if (!items.length) return null;
        const all = views.filter((v) => v.def.category === c.id);
        return (
          <section key={c.id} aria-label={c.title}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>
                {c.emoji} {c.title}
              </h2>
              <span className="chip num">
                {all.filter((v) => v.unlockedAt).length}/{all.length}
              </span>
            </div>
            <div className="trophy-grid">
              {items.map((v) => (
                <Trophy key={v.def.id} v={v} />
              ))}
            </div>
          </section>
        );
      })}

      <details className="card">
        <summary className="bold" style={{ cursor: 'pointer' }}>
          ⭐ כל 20 הרמות · אתה ב-<En>Level {lv.level}</En>
        </summary>
        <div className="list" style={{ marginTop: 10 }}>
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
      </details>
    </div>
  );
}
