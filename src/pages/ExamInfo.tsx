import { EXAM_FACTS, SCORE_BANDS, SCORE_DISCLAIMER, SOURCES, AMIRNET_SECTIONS } from '../data/exam';
import { En, PageHeader } from '../components/ui';

export default function ExamInfo() {
  return (
    <div className="stack q-wrap">
      <PageHeader title="על המבחן ℹ️" sub='אמיר"ם ואמירנט: מה באמת צריך לדעת' />
      <div className="card">
        <h2>אמיר"ם ↔ אמירנט</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th>
                <th>אמיר"ם</th>
                <th>אמירנט</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>סטטוס</td>
                <td>הופסקה, והוחלפה באמירנט</td>
                <td>
                  <b>הבחינה הפעילה</b>. מדצמבר 2026 היא הבחינה היחידה לסיווג באנגלית
                </td>
              </tr>
              <tr>
                <td>פורמט</td>
                <td>ממוחשבת</td>
                <td>ממוחשבת ואדפטיבית</td>
              </tr>
              <tr>
                <td>סולם</td>
                <td>50–150</td>
                <td>50–150 (ציונים שקולים)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>
          משמעות הציונים (<En>50–150</En>)
        </h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ציון</th>
                <th>רמה</th>
                <th>משמעות</th>
                <th>היעד הבא</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_BANDS.map((b, i) => (
                <tr key={b.en}>
                  <td className="num">
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: b.color, marginInlineEnd: 6 }} />
                    {b.min}–{b.max}
                  </td>
                  <td>
                    {b.he}
                    <div className="faint en">{b.en}</div>
                  </td>
                  <td>{b.meaning}</td>
                  <td className="num">{SCORE_BANDS[i + 1] ? `${SCORE_BANDS[i + 1].min} (${SCORE_BANDS[i + 1].he})` : '🏆'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ marginTop: 8 }}>
          ⚠️ כל מוסד קובע ספים משלו. הטבלה היא החלוקה המקובלת. בדקו את דרישות המוסד שלכם ואת{' '}
          <a href={SOURCES.significance} target="_blank" rel="noreferrer">
            עמוד משמעות הציונים של מאל"ו
          </a>
          .
        </p>
      </div>
      <div className="card">
        <h2>מבנה הבחינה (כפי שמודל בסימולציה)</h2>
        <ul style={{ lineHeight: 1.9 }}>
          {AMIRNET_SECTIONS.map((s, i) => (
            <li key={i}>
              {s.titleHe}: {s.questions} שאלות · {s.minutes} דק׳
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>עובדות ומקורות</h2>
        <div className="list">
          {EXAM_FACTS.map((f, i) => (
            <div key={i} className="list-item" style={{ alignItems: 'flex-start' }}>
              <span>{f.verified ? '✅' : '⚠️'}</span>
              <div style={{ flex: 1 }}>
                <div>{f.he}</div>
                {f.source.startsWith('http') ? (
                  <a className="xs" href={f.source} target="_blank" rel="noreferrer" dir="ltr">
                    {f.source.replace('https://www.', '')}
                  </a>
                ) : (
                  <span className="xs muted">מקור משני, יש לאמת באתר מאל"ו</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 8 }}>
          ✅ = הופיע במקור רשמי של מאל"ו · ⚠️ = נמצא רק במקורות משניים
        </p>
      </div>
      <div className="card soft">
        <h3>תרגול רשמי</h3>
        <p className="muted">
          מאל"ו מציע 3 בחינות אמירנט ממוחשבות להתנסות. החומרים מיועדים לשימוש אישי בלבד, ולכן LVL100 לא מעתיק אותם, רק מפנה אליהם. כל השאלות וקטעי הקריאה ב-LVL100 מקוריים.
        </p>
        <a className="btn block" href={SOURCES.practice} target="_blank" rel="noreferrer">
          לבחינות ההתנסות הרשמיות ↗
        </a>
      </div>
      <div className="notice">ℹ️ {SCORE_DISCLAIMER}</div>
    </div>
  );
}
