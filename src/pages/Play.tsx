import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGame } from '../store/GameContext';
import { useBank } from '../store/useBank';
import SessionPlayer, { type SessionSummary } from '../components/SessionPlayer';
import { En, Loading } from '../components/ui';
import type { Passage, Question, Skill } from '../domain/types';
import { findBoss, PROGRESS_TESTS } from '../domain/road';
import { chooseDifficulty } from '../domain/adaptive';
import { pickQuestions } from '../domain/engine';
import { formatMs, uid } from '../domain/util';
import { useUI } from '../store/UIContext';
import { bossSet, challengeWinner, decodeChallenge, encodeChallenge, practiceNext, questionsByIds, srsSession, testSet, weakSession } from '../services/sessions';
import { GRAMMAR_LABELS, SKILL_EN } from '../components/labels';

const SKILLS: Skill[] = ['vocabulary', 'grammar', 'restatement'];

export default function Play() {
  const { mode = 'practice' } = useParams();
  const [params] = useSearchParams();
  const bank = useBank();
  const { getState, update } = useGame();
  const ui = useUI();
  const nav = useNavigate();
  const [shareLink, setShareLink] = useState<string | null>(null);

  const cfg = useMemo(() => {
    if (!bank) return null;
    const s = getState();
    const passages = new Map<string, Passage>(bank.passages.map((p) => [p.id, p]));
    switch (mode) {
      case 'practice': {
        const skillParam = params.get('skill') ?? 'mixed';
        const topic = params.get('topic') ?? undefined;
        const challenge = params.get('challenge') === '1';
        const skills: Skill[] = skillParam === 'mixed' ? SKILLS : [skillParam as Skill];
        const title = topic ? `${GRAMMAR_LABELS[topic] ?? topic}${challenge ? ' · Challenge' : ''}` : skillParam === 'mixed' ? 'Mixed Practice' : `${SKILL_EN[skills[0]]} Practice`;
        return { title, mode: 'practice' as const, next: practiceNext(bank, getState, skills, { topic, challenge }), count: challenge ? 8 : 10, passages, exitTo: topic ? `/grammar/${topic}` : '/practice' };
      }
      case 'review': {
        const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
        return { title: 'Practice Mistakes', mode: 'mistakes' as const, questions: questionsByIds(bank, ids), passages, exitTo: '/' };
      }
      case 'srs': {
        return { title: 'Vocabulary Review', mode: 'review' as const, questions: srsSession(bank, s), passages, exitTo: '/vocab' };
      }
      case 'weak': {
        return { title: 'Weak Words', mode: 'weak' as const, questions: weakSession(bank, s), passages, exitTo: '/vocab/weak' };
      }
      case 'boss': {
        const spec = findBoss(params.get('id') ?? '');
        if (!spec) return null;
        const set = bossSet(bank, s, spec);
        return {
          title: `${spec.emoji} BOSS: ${spec.name}`,
          mode: 'boss' as const,
          questions: set.questions,
          passages,
          timeLimitSec: spec.seconds,
          exitTo: '/road',
          finish: (sum: SessionSummary) => ({ kind: 'boss' as const, refId: spec.id, total: sum.total, correct: sum.correct, ms: sum.ms }),
        };
      }
      case 'test': {
        const spec = PROGRESS_TESTS.find((t) => t.id === params.get('id'));
        if (!spec) return null;
        const set = testSet(bank, s, spec);
        return {
          title: `Level ${spec.level} Progress Test`,
          mode: 'test' as const,
          questions: set.questions,
          passages,
          timeLimitSec: spec.seconds,
          feedback: 'end' as const,
          exitTo: '/road',
          finish: (sum: SessionSummary) => ({ kind: 'test' as const, refId: spec.id, total: sum.total, correct: sum.correct, ms: sum.ms }),
        };
      }
      case 'friend': {
        const code = params.get('c');
        if (code) {
          const ch = decodeChallenge(code);
          if (!ch) return null;
          return {
            title: `⚔️ Challenge from ${ch.n}`,
            mode: 'friend' as const,
            questions: questionsByIds(bank, ch.ids),
            passages,
            timeLimitSec: 300,
            exitTo: '/friends',
            challenge: ch,
            finish: (sum: SessionSummary) => ({ kind: 'friend' as const, total: sum.total, correct: sum.correct, ms: sum.ms, meta: { won: challengeWinner({ c: sum.correct, t: sum.ms }, { c: ch.c, t: ch.t }) === 'me', from: ch.n } }),
          };
        }
        // create a new challenge: 10 questions at the user's level
        const d = chooseDifficulty(s.progress.ability.vocabulary, s.progress.practiceLevel.vocabulary);
        const qs: Question[] = pickQuestions(bank, { skills: ['vocabulary', 'grammar', 'restatement'], count: 10, difficulties: [d], history: [], includeGenerated: false });
        return {
          title: '⚔️ New Friend Challenge',
          mode: 'friend' as const,
          questions: qs,
          passages,
          timeLimitSec: 300,
          exitTo: '/friends',
          finish: (sum: SessionSummary) => ({ kind: 'friend' as const, total: sum.total, correct: sum.correct, ms: sum.ms, meta: { created: true } }),
        };
      }
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, mode, params.toString()]);

  if (!bank) return <Loading />;
  if (!cfg)
    return (
      <div className="empty">
        <div className="e">🤔</div>
        <h3>הסשן לא נמצא</h3>
        <button className="btn" onClick={() => nav('/')}>
          לדף הבית
        </button>
      </div>
    );

  const challenge = 'challenge' in cfg ? cfg.challenge : undefined;

  const onDone = (sum: SessionSummary) => {
    if (mode !== 'friend') return;
    const profile = getState().profile;
    if (!challenge) {
      const code = encodeChallenge({ n: profile?.name ?? 'Friend', a: profile?.avatar ?? '🙂', ids: sum.items.map((i) => i.q.id), c: sum.correct, t: sum.ms });
      setShareLink(`${location.origin}${location.pathname}#/play/friend?c=${code}`);
    } else {
      const w = challengeWinner({ c: sum.correct, t: sum.ms }, { c: challenge.c, t: challenge.t });
      update((s) => {
        const existing = s.friends.find((f) => f.name === challenge.n);
        const entry = { mine: sum.correct, theirs: challenge.c, date: new Date().toISOString() };
        const friends = existing ? s.friends.map((f) => (f === existing ? { ...f, lastChallenge: entry } : f)) : [...s.friends, { id: uid('f'), name: challenge.n, addedAt: new Date().toISOString(), lastChallenge: entry }];
        return { ...s, friends };
      });
      if (w === 'me') ui.toast(`🏆 ניצחת את ${challenge.n}!`, 'success');
    }
  };

  const resultExtra = (sum: SessionSummary) => {
    if (mode !== 'friend') return null;
    if (challenge) {
      const w = challengeWinner({ c: sum.correct, t: sum.ms }, { c: challenge.c, t: challenge.t });
      return (
        <div className="card center">
          <h2>{w === 'me' ? `🏆 ניצחת את ${challenge.n}!` : w === 'them' ? `${challenge.n} ניצח הפעם` : 'תיקו מושלם! 🤝'}</h2>
          <div className="grid-2">
            <div className="stat">
              <div className="v num">
                {sum.correct}/{sum.total}
              </div>
              <div className="l">אתה · {formatMs(sum.ms)}</div>
            </div>
            <div className="stat">
              <div className="v num">
                {challenge.c}/{challenge.ids.length}
              </div>
              <div className="l">
                {challenge.a} {challenge.n} · {formatMs(challenge.t)}
              </div>
            </div>
          </div>
          <p className="faint">המנצח: יותר תשובות נכונות. בתיקו, מי שמהיר יותר.</p>
        </div>
      );
    }
    return (
      <div className="card">
        <h2>
          ⚔️ <En>Beat your friend</En>
        </h2>
        <p className="muted">שלח את הקישור לחבר. הוא יקבל בדיוק את אותן 10 שאלות, ונראה מי מנצח.</p>
        {shareLink && (
          <div className="stack" style={{ gap: 8 }}>
            <input type="text" readOnly value={shareLink} onFocus={(e) => e.target.select()} aria-label="קישור לאתגר" dir="ltr" />
            <div className="row">
              <button
                className="btn block"
                onClick={async () => {
                  try {
                    if (navigator.share) await navigator.share({ title: 'LVL100 Challenge', text: `${sum.correct}/10. תצליח לנצח אותי?`, url: shareLink });
                    else {
                      await navigator.clipboard.writeText(shareLink);
                      ui.toast('📋 הקישור הועתק');
                    }
                  } catch {
                    /* user cancelled */
                  }
                }}
              >
                📤 שתף אתגר
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return <SessionPlayer key={mode + params.toString()} {...cfg} onDone={onDone} resultExtra={resultExtra} />;
}
