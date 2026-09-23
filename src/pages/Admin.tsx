import { useMemo, useState } from 'react';
import { useGame } from '../store/GameContext';
import { useUI } from '../store/UIContext';
import { useBank } from '../store/useBank';
import { loadCustomContent, saveCustomContent, type CustomContent } from '../store/customContent';
import { invalidateBank } from '../data/content';
import { parseQuestions } from '../data/questions/parse';
import { parsePassages } from '../data/reading/parse';
import { parseWords } from '../data/words';
import type { QuestionType, Skill } from '../domain/types';
import { En, Loading, PageHeader, Stars, Tabs } from '../components/ui';

type Tab = 'stats' | 'questions' | 'words' | 'reading';

const TYPES: { t: QuestionType; skill: Skill; prefix: string }[] = [
  { t: 'sentence_completion', skill: 'vocabulary', prefix: 'csc' },
  { t: 'closest_meaning', skill: 'vocabulary', prefix: 'ccm' },
  { t: 'restatement', skill: 'restatement', prefix: 'crs' },
  { t: 'grammar', skill: 'grammar', prefix: 'cgr' },
];

/**
 * Admin (MVP): local content management + question statistics.
 * Content uses the same compact formats as the seed files, so anything
 * written here can be pasted into the repo or imported into Supabase later.
 * In production this page must sit behind an admin role (RLS: is_admin()).
 */
export default function Admin() {
  const bank = useBank();
  const { state } = useGame();
  const ui = useUI();
  const [tab, setTab] = useState<Tab>('stats');
  const [custom, setCustom] = useState<CustomContent>(() => loadCustomContent());
  const [qType, setQType] = useState(0);
  const [qText, setQText] = useState('');
  const [wText, setWText] = useState('');
  const [rText, setRText] = useState('');

  const save = (c: CustomContent) => {
    saveCustomContent(c);
    setCustom(c);
    invalidateBank();
    ui.toast('✅ נשמר. התוכן יופיע בסשנים הבאים');
  };

  const stats = useMemo(() => {
    const m = new Map<string, { n: number; c: number; ms: number }>();
    for (const a of state.answers) {
      const r = m.get(a.questionId) ?? { n: 0, c: 0, ms: 0 };
      r.n++;
      if (a.correct) r.c++;
      r.ms += a.ms;
      m.set(a.questionId, r);
    }
    return [...m.entries()].map(([id, r]) => ({ id, ...r, acc: Math.round((r.c / r.n) * 100) })).sort((a, b) => a.acc - b.acc || b.n - a.n);
  }, [state.answers]);

  if (!bank) return <Loading />;

  const addQuestions = () => {
    const spec = TYPES[qType];
    try {
      const existing = custom.questions.filter((q) => q.type === spec.t).length;
      const parsed = parseQuestions(qText, spec.prefix, spec.t, spec.skill).map((q, i) => ({ ...q, id: `${spec.prefix}-${Date.now().toString(36)}-${existing + i}` }));
      if (!parsed.length || parsed.some((q) => q.answer < 0 || q.options.length !== 4)) throw new Error('bad');
      save({ ...custom, questions: [...custom.questions, ...parsed] });
      setQText('');
    } catch {
      ui.toast('❌ פורמט לא תקין: צריך 4 אפשרויות ואחת עם *');
    }
  };

  const addWords = () => {
    const parsed = parseWords(wText);
    if (!parsed.length || parsed.some((w) => !w.he || !w.example)) return ui.toast('❌ פורמט לא תקין');
    save({ ...custom, words: [...custom.words, ...parsed] });
    setWText('');
  };

  const addReading = () => {
    const parsed = parsePassages(rText.replace(/@@ /g, `@@ crd-${Date.now().toString(36)}-`));
    if (!parsed.length || parsed.some((p) => !p.questions.length || p.questions.some((q) => q.answer < 0))) return ui.toast('❌ פורמט לא תקין');
    save({ ...custom, passages: [...custom.passages, ...parsed] });
    setRText('');
  };

  return (
    <div className="stack">
      <PageHeader title="Admin 🛠️" sub="בסיס לניהול תוכן. ב-production: רק לתפקיד admin (RLS)" />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'stats', label: 'סטטיסטיקות' },
          { value: 'questions', label: 'שאלות' },
          { value: 'words', label: 'מילים' },
          { value: 'reading', label: 'אנסינים' },
        ]}
      />

      {tab === 'stats' && (
        <>
          <div className="grid-4">
            <div className="stat">
              <div className="v num">{bank.questions.length}</div>
              <div className="l">שאלות במאגר</div>
            </div>
            <div className="stat">
              <div className="v num">{bank.words.length}</div>
              <div className="l">מילים (+{bank.words.length * 2} שאלות מחוללות)</div>
            </div>
            <div className="stat">
              <div className="v num">{bank.passages.length}</div>
              <div className="l">אנסינים</div>
            </div>
            <div className="stat">
              <div className="v num">{custom.questions.length + custom.words.length + custom.passages.length}</div>
              <div className="l">פריטים מותאמים</div>
            </div>
          </div>
          <div className="card">
            <h3>
              <En>Question statistics</En> (הקשות ביותר קודם)
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>שאלה</th>
                    <th>ניסיונות</th>
                    <th>דיוק</th>
                    <th>זמן ממוצע</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.slice(0, 50).map((s) => {
                    const q = bank.byId.get(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="xs" dir="ltr">
                          {s.id}
                        </td>
                        <td className="en small" lang="en" style={{ maxWidth: 320 }}>
                          {q?.prompt.slice(0, 80) ?? '(generated word question)'}
                        </td>
                        <td className="num">{s.n}</td>
                        <td className="num">{s.acc}%</td>
                        <td className="num">{(s.ms / s.n / 1000).toFixed(1)}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!stats.length && <p className="faint">עוד אין תשובות.</p>}
          </div>
        </>
      )}

      {tab === 'questions' && (
        <div className="card stack">
          <h3>
            <En>Add question</En>
          </h3>
          <select value={qType} onChange={(e) => setQType(Number(e.target.value))} aria-label="סוג שאלה">
            {TYPES.map((t, i) => (
              <option key={t.t} value={i}>
                {t.t}
              </option>
            ))}
          </select>
          <p className="faint" style={{ margin: 0 }}>
            שורה לכל שאלה: <code dir="ltr">difficulty|topic|prompt|opt1;*correct;opt3;opt4|הסבר בעברית</code>
          </p>
          <textarea rows={5} dir="ltr" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="2|Everyday|She ____ to work by bus.|go;*goes;going;gone|גוף שלישי יחיד → goes" aria-label="שאלות חדשות" />
          <button className="btn" onClick={addQuestions}>
            הוסף
          </button>
          <h3>שאלות מותאמות ({custom.questions.length})</h3>
          <div className="list">
            {custom.questions.map((q) => (
              <div key={q.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <div className="en small" lang="en">
                    {q.prompt}
                  </div>
                  <div className="xs muted">
                    {q.type} · <Stars n={q.difficulty} /> · ✓ {q.options[q.answer]}
                  </div>
                </div>
                <button className="btn sm danger" onClick={() => save({ ...custom, questions: custom.questions.filter((x) => x.id !== q.id) })} aria-label="מחק שאלה">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'words' && (
        <div className="card stack">
          <h3>
            <En>Add vocabulary</En>
          </h3>
          <p className="faint" style={{ margin: 0 }}>
            שורה לכל מילה: <code dir="ltr">word|pos|תרגום|difficulty|Category|Example sentence.</code> (pos: n/v/adj/adv/conj/prep/phr)
          </p>
          <textarea rows={5} dir="ltr" value={wText} onChange={(e) => setWText(e.target.value)} placeholder="resilient|adj|עמיד, חסין|4|Descriptions|Children are often more resilient than adults think." aria-label="מילים חדשות" />
          <button className="btn" onClick={addWords}>
            הוסף
          </button>
          <div className="list">
            {custom.words.map((w) => (
              <div key={w.id} className="list-item">
                <span style={{ flex: 1 }}>
                  <b className="en-inline">{w.en}</b> · {w.he}
                </span>
                <button className="btn sm danger" onClick={() => save({ ...custom, words: custom.words.filter((x) => x.id !== w.id) })} aria-label="מחק מילה">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reading' && (
        <div className="card stack">
          <h3>
            <En>Add reading</En>
          </h3>
          <p className="faint" style={{ margin: 0 }}>
            פורמט: שורת כותרת <code dir="ltr">@@ id|emoji|Topic|difficulty|minutes|Title</code>, ואחריה פסקאות (שורה לכל פסקה) ושאלות <code dir="ltr">?? question|opt;*correct;opt;opt|הסבר</code>
          </p>
          <textarea rows={8} dir="ltr" value={rText} onChange={(e) => setRText(e.target.value)} aria-label="אנסין חדש" />
          <button className="btn" onClick={addReading}>
            הוסף
          </button>
          <div className="list">
            {custom.passages.map((p) => (
              <div key={p.id} className="list-item">
                <span style={{ flex: 1 }}>
                  {p.emoji} <span className="en-inline">{p.title}</span> · {p.questions.length} שאלות
                </span>
                <button className="btn sm danger" onClick={() => save({ ...custom, passages: custom.passages.filter((x) => x.id !== p.id) })} aria-label="מחק אנסין">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
