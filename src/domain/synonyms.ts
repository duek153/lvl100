// Near-synonym clusters. Generated word questions never use a word from the
// same cluster as a distractor, so every question has exactly one answer.
export const SYNONYM_GROUPS: string[][] = [
  ['huge', 'enormous', 'vast', 'massive', 'tiny'],
  ['almost', 'nearly', 'approximately'],
  ['goal', 'purpose', 'objective', 'reason'],
  ['result', 'outcome', 'consequence', 'effect'],
  ['effect', 'impact', 'influence'],
  ['although', 'despite', 'nevertheless', 'however', 'whereas'],
  ['furthermore', 'moreover'],
  ['therefore', 'thus'],
  ['eventually', 'ultimately', 'finally'],
  ['necessary', 'essential', 'vital', 'crucial', 'important'],
  ['enough', 'sufficient', 'adequate'],
  ['accurate', 'precise', 'correct', 'exactly'],
  ['significant', 'considerable', 'substantial', 'major', 'important', 'serious'],
  ['wealthy', 'valuable', 'expensive'],
  ['reveal', 'expose', 'discover', 'detect', 'identify', 'recognize'],
  ['achieve', 'gain', 'obtain', 'acquire', 'accomplish', 'reach', 'earn', 'succeed'],
  ['change', 'alter', 'modify', 'transform', 'vary', 'adjust', 'adapt', 'replace', 'reverse'],
  ['increase', 'expand', 'extend', 'raise', 'grow', 'add', 'spread'],
  ['decrease', 'reduce', 'decline'],
  ['allow', 'permit', 'enable'],
  ['prohibit', 'restrict', 'limit', 'prevent', 'avoid'],
  ['cease', 'fail', 'refuse', 'reject', 'deny'],
  ['build', 'construct', 'establish', 'develop', 'produce', 'generate', 'invent'],
  ['assist', 'support', 'encourage', 'promote', 'provide', 'contribute'],
  ['afraid', 'scared', 'fear', 'nervous', 'anxious', 'worried', 'concern'],
  ['clever', 'wise', 'bright', 'capable', 'able'],
  ['rare', 'scarce', 'unusual', 'strange', 'unique', 'extraordinary', 'remarkable'],
  ['common', 'widespread', 'typical', 'regular', 'ordinary', 'popular', 'frequently'],
  ['continue', 'proceed', 'persist', 'remain'],
  ['maintain', 'retain', 'preserve', 'sustain', 'save', 'protect', 'defend', 'keep'],
  ['convince', 'persuade'],
  ['occur', 'happen', 'appear', 'emerge'],
  ['assume', 'suspect', 'consider', 'guess', 'imagine', 'expect', 'anticipate', 'predict'],
  ['notice', 'observe', 'perceive', 'realize', 'aware'],
  ['intend', 'plan'],
  ['illustrate', 'describe', 'explain', 'emphasize', 'mention', 'announce', 'inform'],
  ['amazing', 'impressive', 'remarkable', 'extraordinary', 'dramatic'],
  ['genuine', 'real'],
  ['obvious', 'apparent', 'evident', 'definite', 'certain'],
  ['harm', 'damage', 'destroy', 'injury', 'attack'],
  ['whole', 'entire', 'complete', 'final'],
  ['main', 'primary', 'fundamental', 'basic', 'major'],
  ['various', 'numerous', 'different'],
  ['permanent', 'constant', 'stable', 'regular'],
  ['temporary', 'brief'],
  ['rapid', 'quickly', 'immediately', 'suddenly'],
  ['rely', 'trust', 'depend'],
  ['convenient', 'useful', 'efficient', 'appropriate', 'suitable'],
  ['collapse', 'fail', 'disappear'],
  ['investigate', 'search', 'examine'],
  ['judge', 'estimate', 'measure', 'determine', 'conclude'],
  ['require', 'demand', 'request', 'insist'],
  ['opportunity', 'chance'],
  ['attempt', 'effort', 'challenge'],
  ['approach', 'method', 'procedure', 'attitude'],
  ['feature', 'characteristic', 'factor', 'quality'],
  ['frustrated', 'angry', 'tired'],
  ['vague', 'abstract', 'subtle', 'complex'],
  ['rigid', 'strict'],
  ['hostile', 'aggressive'],
  ['reluctant', 'shy', 'hesitate'],
  ['mature', 'independent'],
  ['forgive', 'tolerate', 'accept', 'agree', 'approve'],
  ['lack', 'absence'],
  ['former', 'previous', 'initial'],
  ['subsequent', 'eventually'],
  ['occasionally', 'frequently'],
  ['prosper', 'succeed', 'grow'],
  ['pursue', 'search'],
  ['resolve', 'solve', 'repair', 'restore'],
  ['exclude', 'eliminate', 'remove'],
  ['exceed', 'exaggerate'],
  ['imply', 'suggest', 'mention'],
  ['impose', 'force'],
  ['portion', 'proportion', 'amount'],
  ['inhabitant', 'neighbor'],
  ['instance', 'example'],
  ['vital', 'healthy'],
  ['isolated', 'alone', 'lonely', 'separate', 'private'],
  ['careless', 'lazy'],
  ['moderate', 'gentle'],
  ['concentrate', 'attention'],
  ['motivate', 'encourage'],
  ['combine', 'join', 'include', 'contain', 'consist'],
  ['commit', 'perform', 'conduct'],
  ['boundary', 'limit', 'area'],
  ['superior', 'powerful'],
  ['obligation', 'rule', 'policy', 'principle'],
  ['warn', 'remind'],
  ['survive', 'escape', 'rescue', 'overcome'],
  ['generous', 'friendly', 'polite'],
  ['confuse', 'surprise'],
  ['source', 'cause'],
];

const index = new Map<string, Set<string>>();
for (const g of SYNONYM_GROUPS) {
  for (const w of g) {
    const s = index.get(w) ?? new Set<string>();
    for (const o of g) if (o !== w) s.add(o);
    index.set(w, s);
  }
}

export function areSynonyms(a: string, b: string): boolean {
  return index.get(a.toLowerCase())?.has(b.toLowerCase()) ?? false;
}

const parts = (he: string) =>
  he
    .split(/[,;]/)
    .map((p) => p.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);

/** True if two Hebrew glosses share a meaning fragment. */
export function heOverlap(a: string, b: string): boolean {
  const pa = parts(a);
  const pb = parts(b);
  return pa.some((x) => pb.some((y) => x === y || x.includes(y) || y.includes(x)));
}
