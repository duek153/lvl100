// Grammar topics + practice questions. Original content. APPEND ONLY per topic.
import type { GrammarTopic, Question } from '../domain/types';
import { parseQuestions } from './questions/parse';

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'tenses',
    title: 'Verb Tenses',
    titleHe: 'זמני פעלים',
    emoji: '⏳',
    explanation: [
      'Present Simple: הרגלים ועובדות. בגוף שלישי יחיד מוסיפים s (She works).',
      'Present Progressive: פעולה שקורה עכשיו (I am reading).',
      'Past Simple: פעולה שהסתיימה בעבר בזמן ידוע (yesterday, in 2020, ago).',
      'Present Perfect: have/has + V3. חוויה, או פעולה מהעבר שקשורה להווה (already, yet, since, for, ever).',
      'Past Perfect: had + V3. הפעולה המוקדמת יותר מבין שתי פעולות בעבר.',
      'Future: will + V1. תוכנית או כוונה: be going to.',
    ],
    examples: ['She has lived here since 2019.', 'When I arrived, the movie had already started.', 'I will call you tomorrow.'],
  },
  {
    id: 'agreement',
    title: 'Subject–Verb Agreement',
    titleHe: 'התאמת נושא-נשוא',
    emoji: '🤝',
    explanation: [
      'נושא ביחיד מקבל פועל ביחיד, ונושא ברבים מקבל פועל ברבים.',
      'Everyone, nobody, each ו-every הם ביחיד: Everyone is here.',
      'הפועל מתאים לנושא, לא לשם העצם הקרוב: The box of apples is heavy.',
      'בצירוף either/neither ... or/nor, הפועל מתאים לנושא הקרוב אליו.',
    ],
    examples: ['Each of the students has a book.', 'The list of names is long.', 'Neither the teacher nor the students were late.'],
  },
  {
    id: 'articles',
    title: 'Articles',
    titleHe: 'a / an / the',
    emoji: '🅰️',
    explanation: [
      'a לפני צליל עיצור, an לפני צליל תנועה: a university, an hour.',
      'the לדבר מוכר או מסוים, או לדבר יחיד מסוגו (the sun).',
      'בלי article: רבים או שמות עצם בלתי ספירים במובן כללי (Dogs are loyal. Water is important).',
    ],
    examples: ['I saw an elephant at the zoo.', 'The moon is bright tonight.', 'Honesty is important.'],
  },
  {
    id: 'prepositions',
    title: 'Prepositions',
    titleHe: 'מילות יחס',
    emoji: '📍',
    explanation: [
      'זמן: at לשעה (at 5), on ליום או תאריך (on Monday), in לחודש, שנה ועונה (in May).',
      'מקום: in = בתוך, on = על, at = בנקודה מסוימת (at the door).',
      'צירופים קבועים: interested in, depend on, good at, afraid of, responsible for.',
    ],
    examples: ['The meeting is on Sunday at 10.', "She's interested in art.", 'It depends on the weather.'],
  },
  {
    id: 'pronouns',
    title: 'Pronouns',
    titleHe: 'כינויי גוף',
    emoji: '👤',
    explanation: [
      'Subject (I, he, they) לעומת Object (me, him, them).',
      'Possessive: my/your כתואר לפני שם עצם, mine/yours לבד.',
      'Reflexive: myself/themselves, כשהנושא והמושא זהים.',
      'Relative: who לאנשים, which לדברים, whose לשייכות.',
    ],
    examples: ['This book is mine.', 'She taught herself to code.', 'The man whose car was stolen called the police.'],
  },
  {
    id: 'conditionals',
    title: 'Conditionals',
    titleHe: 'משפטי תנאי',
    emoji: '🔀',
    explanation: [
      'Type 0: עובדה. If + present, present (If you heat ice, it melts).',
      'Type 1: אפשרות ממשית. If + present, will + V1.',
      'Type 2: דמיוני בהווה. If + past, would + V1 (If I were rich...).',
      'Type 3: דמיוני בעבר. If + had V3, would have + V3.',
      'unless = if ... not.',
    ],
    examples: ['If it rains, we will stay home.', 'If I had wings, I would fly.', 'If she had studied, she would have passed.'],
  },
  {
    id: 'modals',
    title: 'Modals',
    titleHe: 'פעלים מודאליים',
    emoji: '🎛️',
    explanation: [
      'can/could: יכולת. may/might: אפשרות.',
      'must: חובה או מסקנה ודאית. must not: איסור.',
      "don't have to: אין חובה (לא אסור!).",
      'should: המלצה. אחרי מודאלי תמיד בא פועל בצורת בסיס (V1).',
    ],
    examples: ['You must wear a seatbelt.', "You don't have to come if you're busy.", 'He might be late.'],
  },
  {
    id: 'passive',
    title: 'Passive Voice',
    titleHe: 'סביל',
    emoji: '🔄',
    explanation: [
      'מבנה: be (בזמן המתאים) + V3.',
      'משתמשים בסביל כשהפעולה חשובה יותר ממי שביצע אותה.',
      'את מבצע הפעולה מציינים עם by.',
    ],
    examples: ['The letter was written in 1920.', 'English is spoken all over the world.', 'The road is being repaired.'],
  },
  {
    id: 'comparatives',
    title: 'Comparatives & Superlatives',
    titleHe: 'השוואה והפלגה',
    emoji: '📊',
    explanation: [
      'מילה קצרה: er/est (taller, the tallest).',
      'מילה ארוכה: more/most (more interesting, the most interesting).',
      'חריגים: good → better → best, bad → worse → worst.',
      'as ... as = שוויון. than בא אחרי ערך השוואה.',
    ],
    examples: ['This test is harder than the last one.', 'She is the best player on the team.', 'He is as tall as his father.'],
  },
  {
    id: 'conjunctions',
    title: 'Conjunctions & Connectors',
    titleHe: 'מילות קישור',
    emoji: '🔗',
    explanation: [
      'ניגוד: but, although, however, despite, whereas, nevertheless.',
      'סיבה: because (+ משפט), because of / due to (+ שם עצם).',
      'תוצאה: so, therefore, thus, as a result.',
      'הוספה: and, moreover, furthermore, in addition.',
      'במבחן, מילות קישור הן רמז מרכזי להבנת כיוון המשפט!',
    ],
    examples: ['Despite the rain, we went out.', 'He was tired; therefore, he went to bed.', 'Although she was sick, she came.'],
  },
  {
    id: 'structure',
    title: 'Sentence Structure',
    titleHe: 'מבנה משפט',
    emoji: '🏗️',
    explanation: [
      'סדר בסיסי: Subject + Verb + Object (She reads books).',
      'שאלה: פועל עזר לפני הנושא (Do you like it? Where did he go?).',
      'Gerund (V-ing) אחרי enjoy, avoid, finish. To + V1 אחרי want, decide, hope.',
      'היפוך אחרי שלילה בתחילת משפט: Never have I seen...',
    ],
    examples: ['I enjoy reading.', 'She decided to leave.', 'Never have I seen such a view.'],
  },
];

const RAW: Record<string, string> = {
  tenses: `
1|tenses|She ____ to school every day.|go;*goes;going;gone|Present Simple בגוף שלישי יחיד: goes.
1|tenses|Look! The baby ____.|sleeps;*is sleeping;slept;has slept|"Look!" = קורה עכשיו, ולכן Present Progressive.
1|tenses|We ____ a great movie yesterday.|see;*saw;have seen;will see|yesterday = זמן מוגדר בעבר, ולכן Past Simple.
2|tenses|I ____ in Haifa since 2018.|live;lived;*have lived;am living|since + נקודת זמן מחייב Present Perfect.
2|tenses|Have you ____ been to London?|never;*ever;yet;already|שאלה על חוויה: Have you ever...?
2|tenses|Tomorrow I ____ my grandparents.|visited;*will visit;have visited;had visited|Tomorrow = עתיד.
3|tenses|When we arrived at the cinema, the film ____ already started.|has;*had;have;was|הפעולה המוקדמת מבין שתיים בעבר: Past Perfect (had started).
3|tenses|While I ____ dinner, the phone rang.|cooked;*was cooking;have cooked;cook|פעולה מתמשכת בעבר שנקטעה: Past Progressive.
3|tenses|She hasn't finished her project ____.|already;*yet;since;ago|yet בא במשפטי שלילה ושאלה בסוף המשפט.
4|tenses|By the time he retires, he ____ at the company for 40 years.|works;will work;*will have worked;has worked|By the time + עתיד מחייב Future Perfect.
4|tenses|The ancient temple ____ over 2,000 years ago.|has been built;*was built;is built;had built|ago מחייב Past Simple, ובמבנה סביל: was built.
  `,
  agreement: `
1|agreement|My sister ____ a new bike.|have;*has;having;are|My sister = יחיד, ולכן has.
1|agreement|The dogs ____ in the garden.|is;*are;was;has|The dogs = רבים, ולכן are.
2|agreement|Everyone in the class ____ the answer.|know;*knows;are knowing;have known|Everyone הוא ביחיד, ולכן knows.
2|agreement|The box of chocolates ____ on the table.|are;*is;were;have|הנושא הוא box (יחיד), לא chocolates.
2|agreement|Each of the players ____ a number.|have;*has;are having;were|Each הוא ביחיד, ולכן has.
3|agreement|Neither the manager nor the workers ____ happy with the decision.|was;*were;is;has been|בצירוף neither/nor הפועל מתאים לנושא הקרוב (workers, רבים).
3|agreement|The news ____ surprising.|were;*was;are;have been|news הוא שם עצם בלתי ספיר, ולכן was.
3|agreement|Mathematics ____ my favorite subject.|are;*is;were;have been|Mathematics מסתיים ב-s אבל נחשב יחיד.
4|agreement|The number of students who study abroad ____ increasing every year.|are;*is;were;have been|The number of = יחיד, לעומת A number of = רבים.
4|agreement|A number of problems ____ discussed at the meeting.|was;*were;has been;is|A number of = הרבה (רבים), ולכן were.
  `,
  articles: `
1|articles|I have ____ apple in my bag.|a;*an;the;—|apple מתחיל בצליל תנועה, ולכן an.
1|articles|She wants to be ____ doctor.|an;*a;the;—|doctor מתחיל בעיצור, ולכן a.
1|articles|____ sun rises in the east.|A;An;*The;—|דבר יחיד מסוגו מקבל the.
2|articles|He waited for ____ hour.|a;*an;the;—|ב-hour ה-h לא נהגית, והצליל תנועתי, ולכן an.
2|articles|She studies at ____ university in Jerusalem.|an;*a;the;—|university נהגית "יו", צליל עיצורי, ולכן a.
2|articles|I bought a shirt and a hat. ____ shirt is blue.|A;An;*The;—|אחרי שהזכרנו את החולצה היא מוכרת, ולכן the.
3|articles|____ honesty is the best policy.|A;The;An;*— (no article)|שם עצם מופשט במובן כללי בא בלי article.
3|articles|He plays ____ guitar in a band.|a;*the;an;—|play + כלי נגינה מקבל the.
3|articles|____ Dead Sea is the lowest place on Earth.|A;*The;An;—|לשמות ימים ונהרות מוסיפים the.
4|articles|____ rich should help ____ poor.|A / a;*The / the;— / —;The / —|the + תואר מציין קבוצת אנשים (the rich, the poor).
  `,
  prepositions: `
1|prepositions|The class starts ____ 8 o'clock.|in;on;*at;by|שעה מקבלת at.
1|prepositions|My birthday is ____ May.|at;on;*in;to|חודש מקבל in.
1|prepositions|The keys are ____ the table.|*on;in;at;of|על משטח: on.
2|prepositions|We have a meeting ____ Monday.|in;*on;at;by|יום בשבוע מקבל on.
2|prepositions|She is very good ____ math.|in;on;*at;for|good at = טוב ב-.
2|prepositions|I'm afraid ____ spiders.|from;*of;with;to|afraid of = מפחד מ-.
3|prepositions|The trip depends ____ the weather.|of;*on;from;at|depend on = תלוי ב-.
3|prepositions|He is responsible ____ the whole project.|of;on;*for;to|responsible for = אחראי על.
3|prepositions|She has been interested ____ science since childhood.|on;at;*in;about|interested in = מתעניין ב-.
4|prepositions|The success of the plan will depend largely ____ how well we cooperate.|of;*on;in;at|depend on (אפילו כשיש largely באמצע).
4|prepositions|The results are consistent ____ previous studies.|to;*with;at;for|consistent with = עקבי עם.
  `,
  pronouns: `
1|pronouns|____ is my best friend.|Him;*He;His;Her|בתפקיד נושא: He.
1|pronouns|Can you help ____?|I;*me;my;mine|כמושא אחרי פועל: me.
1|pronouns|This is ____ house.|we;us;*our;ours|לפני שם עצם: our.
2|pronouns|That bag isn't yours; it's ____.|my;me;*mine;I|לבד, בלי שם עצם: mine.
2|pronouns|The children made the cake by ____.|them;themself;*themselves;theirs|רפלקסיבי ברבים: themselves.
2|pronouns|The woman ____ lives next door is a pilot.|which;*who;whose;what|לאנשים משתמשים ב-who.
3|pronouns|The book ____ I bought yesterday is excellent.|who;*which;whose;whom|לדברים משתמשים ב-which.
3|pronouns|The boy ____ bike was stolen called the police.|who;which;*whose;whom|שייכות: whose.
3|pronouns|Between you and ____, I don't like the new manager.|I;*me;my;mine|אחרי מילת יחס (between) בא מושא: me.
4|pronouns|The committee, most of ____ members are experts, rejected the plan.|who;which;*whose;whom|שייכות: whose members, "שחבריה".
4|pronouns|To ____ should I address the letter?|who;*whom;whose;which|אחרי מילת יחס (to) בא whom.
  `,
  conditionals: `
1|conditionals|If you heat water to 100°C, it ____.|boil;*boils;boiled;will boiled|Type 0 (עובדה): present בשני חלקי המשפט.
2|conditionals|If it rains tomorrow, we ____ at home.|stay;*will stay;would stay;stayed|Type 1: If + present, will + V1.
2|conditionals|If I ____ you, I would take the job.|am;*were;will be;have been|Type 2: If I were you.
2|conditionals|You won't pass the test ____ you study.|if;*unless;because;so|unless = אם לא.
3|conditionals|If I had more free time, I ____ learn to play the piano.|will;*would;had;have|Type 2: would + V1.
3|conditionals|If she had left earlier, she ____ the train.|would catch;*would have caught;will catch;caught|Type 3: would have + V3.
3|conditionals|We would have won if our best player ____ injured.|wasn't;*hadn't been;isn't;wouldn't be|Type 3: בחלק של if בא Past Perfect.
4|conditionals|____ I known about the party, I would have come.|If;*Had;Were;Should|היפוך: Had I known = If I had known.
4|conditionals|____ you need any help, please call me.|*Should;Would;Had;Were|Should you need = If you need (רשמי).
4|conditionals|If he hadn't missed the flight, he ____ in Paris now.|would have been;*would be;will be;is|Mixed conditional: תנאי בעבר ותוצאה בהווה (now).
  `,
  modals: `
1|modals|I ____ swim when I was five.|*could;must;should;might|יכולת בעבר: could.
1|modals|You ____ wear a helmet when you ride a bike. It's the law.|might;*must;could;may|חוק = חובה, ולכן must.
2|modals|You ____ smoke here. It's forbidden.|don't have to;*must not;needn't;might|forbidden = איסור, ולכן must not.
2|modals|You ____ bring anything. We have plenty of food.|must not;*don't have to;can't;shouldn't|אין צורך = don't have to.
2|modals|He ____ be at home; the lights are on.|*must;can't;mustn't;shouldn't|מסקנה ודאית מהאורות: must.
3|modals|She ____ be tired. She just woke up after 10 hours of sleep.|must;*can't;should;has to|מסקנה שלילית ודאית: can't be.
3|modals|You ____ see a doctor about that cough.|*should;mustn't;can't;couldn't|המלצה: should.
3|modals|He isn't here yet, and he's never late. He ____ have forgotten the meeting.|should;*must;can;would|מסקנה על העבר: must have + V3.
4|modals|You ____ have told me earlier! Now it's too late.|must;*should;can;will|should have + V3 = ביקורת על מה שלא נעשה בעבר.
4|modals|The roads are wet, so it ____ have rained last night.|should;can't;*must;would|מסקנה ודאית על העבר: must have rained.
  `,
  passive: `
1|passive|English ____ in many countries.|speaks;*is spoken;speaking;spoke|סביל בהווה: is + V3.
2|passive|The window ____ by the ball yesterday.|broke;*was broken;is broken;has broken|סביל בעבר: was + V3.
2|passive|The letters ____ every morning.|deliver;*are delivered;delivering;is delivered|letters (רבים) + סביל בהווה: are delivered.
2|passive|This song ____ by a famous band.|wrote;*was written;writing;has wrote|סביל בעבר: was written.
3|passive|The new bridge ____ next year.|will build;*will be built;is building;built|סביל בעתיד: will be + V3.
3|passive|The road ____ at the moment, so use another route.|is repaired;*is being repaired;repaired;was repairing|סביל מתמשך: is being + V3.
3|passive|The results ____ yet.|haven't published;*haven't been published;didn't publish;aren't publishing|סביל ב-Present Perfect: have been + V3.
4|passive|The suspect is believed ____ the country last week.|to leave;*to have left;leaving;left|is believed to have + V3 לפעולה בעבר.
4|passive|The report must ____ by Friday.|finish;finished;*be finished;be finishing|מודאלי + סביל: must be + V3.
4|passive|The painting ____ to have been stolen in 1990.|thinks;*is thought;is thinking;has thought|סביל עם פועל חשיבה: is thought to...
  `,
  comparatives: `
1|comparatives|An elephant is ____ than a dog.|big;*bigger;biggest;more big|השוואה בין שניים: bigger than.
1|comparatives|This is the ____ day of the year.|hot;hotter;*hottest;more hot|הפלגה: the hottest.
2|comparatives|This book is ____ than the movie.|interestinger;*more interesting;most interesting;interesting|מילה ארוכה: more interesting.
2|comparatives|She is the ____ student in the class.|good;better;*best;goodest|good → better → best.
2|comparatives|My cold is ____ today than yesterday.|bad;*worse;worst;badder|bad → worse → worst.
3|comparatives|Tom is as ____ as his brother.|taller;tallest;*tall;more tall|as + צורת בסיס + as.
3|comparatives|The more you read, the ____ your vocabulary becomes.|rich;*richer;richest;more rich|The more ..., the + comparative.
3|comparatives|This is by far the ____ decision I have ever made.|*most difficult;more difficult;difficultest;difficult|by far + הפלגה.
4|comparatives|The new phone is not nearly as expensive ____ the old one.|than;*as;like;that|not nearly as ... as.
4|comparatives|The test was ____ easier than I expected; I finished in half the time.|*much;more;most;very|לחיזוק צורת השוואה משתמשים ב-much (much easier). very easier ו-more easier שגויים.
  `,
  conjunctions: `
1|conjunctions|I wanted to go out, ____ it was raining.|and;*but;so;because|ניגוד: but.
1|conjunctions|She was hungry, ____ she made a sandwich.|but;*so;although;because|תוצאה: so.
2|conjunctions|We stayed inside ____ the storm.|because;*because of;so;although|לפני שם עצם בא because of.
2|conjunctions|____ he was tired, he finished the work.|Because;*Although;So;Despite|ניגוד + משפט: Although.
2|conjunctions|____ the rain, the game continued.|Although;*Despite;Because;However|לפני שם עצם בא Despite.
3|conjunctions|The plan is cheap. ____, it is very risky.|Therefore;*However;Because;Moreover|ניגוד בין משפטים: However.
3|conjunctions|He trained every day; ____, he won the race.|however;*as a result;although;despite|תוצאה: as a result.
3|conjunctions|The hotel was clean. ____, the staff were friendly.|However;*In addition;Therefore;Although|הוספה של דבר חיובי: In addition.
4|conjunctions|The first study found no effect, ____ the second showed a clear improvement.|therefore;*whereas;because;moreover|ניגוד בין שני חלקים: whereas.
4|conjunctions|The evidence was weak; ____, the court found him guilty.|therefore;*nevertheless;moreover;thus|ראיות חלשות ובכל זאת אשם: nevertheless.
4|conjunctions|____ its small size, the country has a strong economy.|Although;*In spite of;Because of;Whereas|לפני צירוף שמני: In spite of.
  `,
  structure: `
1|structure|____ you like pizza?|Are;*Do;Is;Does|שאלה עם you בהווה: Do.
1|structure|Where ____ he go yesterday?|does;*did;do;was|שאלה בעבר: did + V1.
2|structure|I enjoy ____ books.|to read;*reading;read;reads|אחרי enjoy בא V-ing.
2|structure|She decided ____ abroad.|studying;*to study;study;studied|אחרי decide בא to + V1.
2|structure|Can you tell me where ____?|is the station;*the station is;does the station;the station does|שאלה עקיפה: הסדר הוא נושא ואחריו פועל.
3|structure|He avoided ____ the question.|to answer;*answering;answer;answered|אחרי avoid בא V-ing.
3|structure|I'm looking forward to ____ you.|see;*seeing;saw;seen|look forward to + V-ing (to כאן היא מילת יחס).
3|structure|She made me ____ the dishes.|to wash;*wash;washing;washed|make someone + V1 בלי to.
4|structure|Never ____ such a beautiful sunset.|I have seen;*have I seen;I saw;did I saw|היפוך אחרי Never בתחילת משפט.
4|structure|Not only ____ late, but he also forgot his books.|he was;*was he;he is;did he|היפוך אחרי Not only.
4|structure|Rarely ____ this kind of bird in the city.|we see;*do we see;we do see;see we|היפוך אחרי Rarely: do + נושא + V1.
  `,
};

export const GRAMMAR_QUESTIONS: Question[] = Object.entries(RAW).flatMap(([topic, raw]) =>
  parseQuestions(raw, `gr-${topic}`, 'grammar', 'grammar'),
);
