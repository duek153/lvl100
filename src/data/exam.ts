// Official AmirNet facts. Single source of truth — update here when NITE
// publishes changes. Every fact carries its source. Items marked `verified:
// false` were only found in secondary sources and must be re-checked on
// nite.org.il before launch (the dev environment could not reach it).

export interface Fact {
  he: string;
  source: string;
  verified: boolean;
}

export const SOURCES = {
  faq: 'https://www.nite.org.il/other-tests/amirnet/faq/?lang=en',
  tips: 'https://www.nite.org.il/other-tests/amirnet/tips/?lang=en',
  scores: 'https://www.nite.org.il/other-tests/amirnet/scores/?lang=en',
  significance: 'https://www.nite.org.il/other-tests/amirnet/scores/significance/?lang=en',
  practice: 'https://www.nite.org.il/other-tests/amirnet/practice-test/?lang=en',
  notice2024: 'https://www.nite.org.il/news/notice-15122024/?lang=en',
  notice2026: 'https://www.nite.org.il/news/notice-15022026/?lang=en',
  home: 'https://www.nite.org.il/other-tests/amirnet/?lang=en',
};

export const EXAM_FACTS: Fact[] = [
  { he: 'אמירנט היא בחינת סיווג ממוחשבת ואדפטיבית, שבודקת הבנת הנקרא ואוצר מילים באנגלית.', source: SOURCES.home, verified: true },
  { he: 'סוגי השאלות: השלמת משפטים, ניסוח מחדש, וקטע קריאה ושאלות. אלה אותם סוגים כמו בתחום האנגלית בפסיכומטרי.', source: SOURCES.faq, verified: true },
  { he: 'הציונים הם בסולם 50–150, ושקולים לציוני אמיר"ם, אמי"ר והתחום האנגלי בפסיכומטרי.', source: SOURCES.scores, verified: true },
  { he: 'הבחינה נפתחת בפרק ברמת קושי בינונית. בסוף כל פרק התוכנה מעריכה את הרמה ובוחרת את הפרק הבא בהתאם.', source: SOURCES.tips, verified: true },
  { he: 'אפשר לחזור לשאלות בתוך אותו פרק, אבל אי אפשר לחזור לפרק שזמנו הסתיים.', source: SOURCES.tips, verified: true },
  { he: 'אפשר לעבור לפרק הבא לפני תום הזמן רק אם עניתם על כל השאלות בפרק.', source: SOURCES.tips, verified: true },
  { he: 'שאלה שלא נענתה נחשבת תשובה שגויה, ולכן תמיד עדיף לנחש.', source: SOURCES.tips, verified: true },
  { he: 'בבחינה 7 או 8 פרקים, כולל פרקים ניסיוניים.', source: SOURCES.faq, verified: true },
  { he: 'מאז 17.3.2025 יש פרקים ניסיוניים (Grammar in Context, Word Formation, האזנה ועוד). טעות בהם לא מורידה נקודות, ותשובות נכונות יכולות להוסיף 1–2 נקודות.', source: SOURCES.notice2024, verified: true },
  { he: 'מ-19.4.2026 אפשר להאזין לטקסטים בתוכנת הקראה, וייתכן פרק ניסיוני של מטלת כתיבה (12 דקות).', source: SOURCES.faq, verified: true },
  { he: 'ממועד דצמבר 2026 התחום האנגלי מופרד מהפסיכומטרי, ואמירנט תהיה הבחינה היחידה לסיווג באנגלית. אפשר להיבחן בה לאורך כל השנה.', source: SOURCES.notice2026, verified: true },
  { he: 'בחינות אמי"ר ואמיר"ם הופסקו והוחלפו באמירנט.', source: 'secondary', verified: false },
  { he: 'פירוט הפרקים המדורגים: 3 פרקי השלמת משפטים (4 שאלות, 4 דק\' לכל פרק), 2 פרקי ניסוח מחדש (3 שאלות, 6 דק\' לכל פרק), ופרק קריאה אחד (5 שאלות, 15 דק\'). בסך הכול כ-39 דקות, וכ-50 דקות עם הפרקים הניסיוניים.', source: 'secondary', verified: false },
];

export interface ScoreBand {
  min: number;
  max: number;
  he: string;
  en: string;
  meaning: string;
  color: string;
}

/** Common CHE placement bands. Each institution may set its own cut-offs. */
export const SCORE_BANDS: ScoreBand[] = [
  { min: 50, max: 69, he: 'טרום-בסיסי א׳', en: 'Pre-Basic A', meaning: '5 קורסי אנגלית', color: '#94a3b8' },
  { min: 70, max: 84, he: 'טרום-בסיסי ב׳', en: 'Pre-Basic B', meaning: '4 קורסי אנגלית', color: '#60a5fa' },
  { min: 85, max: 99, he: 'בסיסי', en: 'Basic', meaning: '3 קורסי אנגלית', color: '#34d399' },
  { min: 100, max: 119, he: 'מתקדמים א׳', en: 'Advanced 1', meaning: '2 קורסי אנגלית', color: '#fbbf24' },
  { min: 120, max: 133, he: 'מתקדמים ב׳', en: 'Advanced 2', meaning: 'קורס אנגלית אחד', color: '#f97316' },
  { min: 134, max: 150, he: 'פטור', en: 'Exempt', meaning: 'פטור מלימודי אנגלית', color: '#a855f7' },
];

export function bandFor(score: number): ScoreBand {
  return SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? (score < 50 ? SCORE_BANDS[0] : SCORE_BANDS[SCORE_BANDS.length - 1]);
}

export function nextBand(score: number): ScoreBand | null {
  const i = SCORE_BANDS.indexOf(bandFor(score));
  return i < SCORE_BANDS.length - 1 ? SCORE_BANDS[i + 1] : null;
}

/** Official AmirNet structure as modelled in the simulation. */
export interface SimSectionSpec {
  kind: 'sentence_completion' | 'restatement' | 'reading' | 'experimental';
  questions: number;
  minutes: number;
  titleHe: string;
}

export const AMIRNET_SECTIONS: SimSectionSpec[] = [
  { kind: 'sentence_completion', questions: 4, minutes: 4, titleHe: 'השלמת משפטים' },
  { kind: 'restatement', questions: 3, minutes: 6, titleHe: 'ניסוח מחדש' },
  { kind: 'sentence_completion', questions: 4, minutes: 4, titleHe: 'השלמת משפטים' },
  { kind: 'reading', questions: 5, minutes: 15, titleHe: 'קטע קריאה' },
  { kind: 'sentence_completion', questions: 4, minutes: 4, titleHe: 'השלמת משפטים' },
  { kind: 'restatement', questions: 3, minutes: 6, titleHe: 'ניסוח מחדש' },
];

export const EXPERIMENTAL_SECTION: SimSectionSpec = {
  kind: 'experimental',
  questions: 4,
  minutes: 5,
  titleHe: 'פרק ניסיוני · Grammar in Context',
};

export const SCORE_DISCLAIMER =
  'הציון המשוער הוא אומדן פנימי של LVL100, שמבוסס על הביצועים שלך באתר. זה לא ציון רשמי של מאל"ו ולא תחזית מובטחת.';
