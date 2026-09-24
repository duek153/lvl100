// Cloud sync with Supabase. Pure helpers (mapping, diffing, merge choice) are
// exported for tests; the client itself is loaded lazily so it never weighs
// on the first page load.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnswerRecord, GameState } from '../domain/types';
import { addDays, dayKey } from '../domain/util';

export const SUPABASE_URL = 'https://xycfsbvtwljfemclotoa.supabase.co';
/** Publishable (anon) key: meant to be public. Data is protected by RLS. */
export const SUPABASE_KEY = 'sb_publishable_N818zkbGsvnILkfrycbzgA_17PsMZ6C';

let clientPromise: Promise<SupabaseClient> | null = null;
export function getClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit', storageKey: 'lvl100-auth' },
      }),
    );
  }
  return clientPromise;
}

// ---------- mapping ----------
export interface AnswerRow {
  id: string;
  question_id: string;
  type: string;
  skill: string;
  topic: string;
  difficulty: number;
  correct: boolean;
  user_answer: number | null;
  correct_answer: number;
  ms: number;
  mode: string;
  confidence: string | null;
  answered_at: string;
}

export function answerToRow(a: AnswerRecord): AnswerRow {
  return {
    id: a.id,
    question_id: a.questionId,
    type: a.type,
    skill: a.skill,
    topic: a.topic,
    difficulty: a.difficulty,
    correct: a.correct,
    user_answer: a.userAnswer,
    correct_answer: a.correctAnswer,
    ms: Math.max(0, Math.min(Math.round(a.ms), 3_600_000)),
    mode: a.mode,
    confidence: a.confidence ?? null,
    answered_at: a.date,
  };
}

export function rowToAnswer(r: AnswerRow): AnswerRecord {
  return {
    id: r.id,
    questionId: r.question_id,
    type: r.type as AnswerRecord['type'],
    skill: r.skill as AnswerRecord['skill'],
    topic: r.topic,
    difficulty: r.difficulty as AnswerRecord['difficulty'],
    correct: r.correct,
    userAnswer: r.user_answer,
    correctAnswer: r.correct_answer,
    ms: r.ms,
    mode: r.mode as AnswerRecord['mode'],
    confidence: (r.confidence ?? undefined) as AnswerRecord['confidence'],
    date: new Date(r.answered_at).toISOString(),
  };
}

// ---------- diffing ----------
export const SLICES = ['profile', 'progress', 'vocab', 'attempts', 'achievements', 'settings', 'friends'] as const;
export type Slice = (typeof SLICES)[number];

export interface SyncMarker {
  /** id of the last answer confirmed pushed (answers are append-only) */
  lastAnswerId?: string | null;
  /** fallback when that id is no longer local: answers with date >= this */
  answersSince: string | null;
  /** JSON of each slice as last pushed */
  slices: Partial<Record<Slice, string>>;
  /** day → "xp:questions" as last pushed */
  days: Record<string, string>;
  profileKey?: string;
}

export const emptyMarker = (): SyncMarker => ({ answersSince: null, slices: {}, days: {} });

export interface PushPlan {
  slices: Partial<Record<Slice, unknown>>;
  answers: AnswerRow[];
  days: { day: string; xp: number; questions: number }[];
  profile: { display_name: string; avatar: string; is_public: boolean } | null;
  empty: boolean;
}

export function planPush(state: GameState, m: SyncMarker, today = dayKey()): PushPlan {
  const slices: PushPlan['slices'] = {};
  for (const k of SLICES) {
    const json = JSON.stringify(state[k] ?? null);
    if (m.slices[k] !== json) slices[k] = state[k];
  }
  const idx = m.lastAnswerId ? state.answers.findIndex((a) => a.id === m.lastAnswerId) : -1;
  const pending = idx >= 0 ? state.answers.slice(idx + 1) : m.answersSince ? state.answers.filter((a) => a.date >= m.answersSince!) : state.answers;
  const answers = pending.map(answerToRow);
  const days: PushPlan['days'] = [];
  const from = addDays(today, -35);
  for (const [day, v] of Object.entries(state.progress.days)) {
    if (day < from || day > today) continue;
    const row = { day, xp: Math.min(5000, Math.max(0, Math.round(v.xp))), questions: Math.min(2000, v.questions) };
    if (m.days[day] !== `${row.xp}:${row.questions}`) days.push(row);
  }
  let profile: PushPlan['profile'] = null;
  if (state.profile) {
    const p = { display_name: state.profile.name.slice(0, 24) || 'Player', avatar: state.profile.avatar, is_public: state.profile.publicProfile };
    if (m.profileKey !== JSON.stringify(p)) profile = p;
  }
  return { slices, answers, days, profile, empty: !Object.keys(slices).length && !answers.length && !days.length && !profile };
}

/** Marker after a successful push of `plan` built from `state`. */
export function markerAfter(state: GameState, m: SyncMarker, plan: PushPlan): SyncMarker {
  const slices = { ...m.slices };
  for (const k of Object.keys(plan.slices) as Slice[]) slices[k] = JSON.stringify(state[k] ?? null);
  const days = { ...m.days };
  for (const d of plan.days) days[d.day] = `${d.xp}:${d.questions}`;
  const last = state.answers[state.answers.length - 1];
  return {
    slices,
    days,
    lastAnswerId: last ? last.id : m.lastAnswerId ?? null,
    answersSince: last ? last.date : m.answersSince,
    profileKey: plan.profile ? JSON.stringify(plan.profile) : m.profileKey,
  };
}

/** On sign-in: which copy wins? Remote wins when it has more XP or this device is fresh. */
export function chooseSource(local: GameState, remote: { progress?: { xp?: number } | null } | null): 'pull' | 'push' {
  if (!remote || !remote.progress) return 'push';
  if (!local.profile?.onboarded) return 'pull';
  return (remote.progress.xp ?? 0) > local.progress.xp ? 'pull' : 'push';
}

// ---------- marker storage (per user) ----------
const markerKey = (uid: string) => `lvl100:cloud-sync:${uid}`;
export function loadMarker(uid: string): SyncMarker {
  try {
    const raw = localStorage.getItem(markerKey(uid));
    if (raw) return { ...emptyMarker(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyMarker();
}
export function saveMarker(uid: string, m: SyncMarker) {
  try {
    localStorage.setItem(markerKey(uid), JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

// ---------- server calls ----------
export interface CloudProfile {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  is_public: boolean;
}

export async function pushPlan(sb: SupabaseClient, uid: string, plan: PushPlan) {
  if (plan.profile) {
    const { error } = await sb.from('profiles').update(plan.profile).eq('id', uid);
    if (error) throw error;
  }
  if (Object.keys(plan.slices).length) {
    const { error } = await sb.from('user_state').upsert({ user_id: uid, ...plan.slices }, { onConflict: 'user_id' });
    if (error) throw error;
  }
  for (let i = 0; i < plan.answers.length; i += 500) {
    const chunk = plan.answers.slice(i, i + 500).map((r) => ({ ...r, user_id: uid }));
    const { error } = await sb.from('answers').upsert(chunk, { onConflict: 'user_id,id', ignoreDuplicates: true });
    if (error) throw error;
  }
  if (plan.days.length) {
    const { error } = await sb.from('daily_xp').upsert(plan.days.map((d) => ({ ...d, user_id: uid })), { onConflict: 'user_id,day' });
    if (error) throw error;
  }
}

export async function fetchRemote(sb: SupabaseClient, uid: string) {
  const { data, error } = await sb.from('user_state').select('*').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data as (Partial<Record<Slice, unknown>> & { updated_at: string }) | null;
}

export async function fetchAnswers(sb: SupabaseClient, uid: string, max = 4000): Promise<AnswerRecord[]> {
  const rows: AnswerRow[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await sb.from('answers').select('*').eq('user_id', uid).order('answered_at', { ascending: false }).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as AnswerRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows.reverse().map(rowToAnswer);
}

/** Export-format JSON that GameContext.importState understands. */
export function remoteToExport(remote: Partial<Record<Slice, unknown>>, answers: AnswerRecord[]): string {
  const out: Record<string, unknown> = { version: 1, exportedAt: new Date().toISOString(), answers };
  for (const k of SLICES) out[k] = remote[k] ?? null;
  return JSON.stringify(out);
}

export type Period = 'daily' | 'weekly' | 'monthly';
export type Scope = 'friends' | 'global';
export interface BoardRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  xp: number;
  is_me: boolean;
}

export async function leaderboard(period: Period, scope: Scope): Promise<BoardRow[]> {
  const sb = await getClient();
  const { data, error } = await sb.rpc('leaderboard', { p_period: period, p_scope: scope });
  if (error) throw error;
  return ((data ?? []) as BoardRow[]).map((r) => ({ ...r, xp: Number(r.xp) }));
}

export interface FriendRow {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  status: 'pending' | 'accepted';
  incoming: boolean;
  week_xp: number;
}

export async function myFriends(): Promise<FriendRow[]> {
  const sb = await getClient();
  const { data, error } = await sb.rpc('my_friends');
  if (error) throw error;
  return ((data ?? []) as FriendRow[]).map((r) => ({ ...r, week_xp: Number(r.week_xp) }));
}

export interface SearchRow {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  relation: 'none' | 'friend' | 'sent' | 'received';
}

export async function searchProfiles(q: string): Promise<SearchRow[]> {
  const sb = await getClient();
  const { data, error } = await sb.rpc('search_profiles', { p_query: q.trim() });
  if (error) throw error;
  return (data ?? []) as SearchRow[];
}

export async function sendFriendRequest(username: string): Promise<string> {
  const sb = await getClient();
  const { data, error } = await sb.rpc('send_friend_request', { p_username: username });
  if (error) throw error;
  return data as string;
}

export async function respondFriendRequest(requester: string, accept: boolean) {
  const sb = await getClient();
  const { error } = await sb.rpc('respond_friend_request', { p_requester: requester, p_accept: accept });
  if (error) throw error;
}

export async function removeFriend(other: string) {
  const sb = await getClient();
  const { error } = await sb.rpc('remove_friend', { p_other: other });
  if (error) throw error;
}

export function normalizeUsername(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export function validUsername(s: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(s);
}

/** Friendly Hebrew message for auth / network errors. */
export function cloudErrorHe(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/rate limit|too many/i.test(msg)) return 'נשלחו יותר מדי בקשות. חכה דקה ונסה שוב.';
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg)) return 'הקוד שגוי או שפג תוקפו. בקש קוד חדש.';
  if (/fetch|network|failed to fetch/i.test(msg)) return 'אין חיבור לשרת. בדוק את האינטרנט ונסה שוב.';
  if (/duplicate key|unique/i.test(msg)) return 'שם המשתמש הזה כבר תפוס.';
  if (/email/i.test(msg) && /invalid/i.test(msg)) return 'כתובת המייל לא תקינה.';
  return 'משהו השתבש: ' + msg;
}
