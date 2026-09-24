import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useGame } from './GameContext';
import {
  chooseSource,
  cloudErrorHe,
  fetchAnswers,
  fetchRemote,
  getClient,
  loadMarker,
  markerAfter,
  planPush,
  pushPlan,
  remoteToExport,
  saveMarker,
  type CloudProfile,
} from '../services/cloud';
import { hasPendingAuth, takePendingAuth } from '../services/authRedirect';

export type CloudStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

interface CloudCtx {
  status: CloudStatus;
  email: string | null;
  profile: CloudProfile | null;
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
  /** last sign-in merge result, for the account page to explain */
  mergeResult: 'pulled' | 'pushed' | null;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  createProfile: (username: string, displayName: string, isPublic: boolean) => Promise<void>;
  checkUsername: (u: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<CloudCtx | null>(null);

// Only touch the network if this device has signed in before (keeps first load light).
const HAS_SESSION = () => {
  if (hasPendingAuth()) return true;
  try {
    return !!localStorage.getItem('lvl100-auth');
  } catch {
    return false;
  }
};

export function CloudProvider({ children }: { children: ReactNode }) {
  const game = useGame();
  const gameRef = useRef(game);
  gameRef.current = game;
  const [status, setStatus] = useState<CloudStatus>(HAS_SESSION() ? 'loading' : 'signedOut');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<'pulled' | 'pushed' | null>(null);
  const pushing = useRef(false);
  const uid = session?.user.id ?? null;

  const push = useCallback(async () => {
    if (!uid || pushing.current) return;
    pushing.current = true;
    setSyncing(true);
    try {
      const sb = await getClient();
      const state = gameRef.current.getState();
      const marker = loadMarker(uid);
      const plan = planPush(state, marker);
      if (!plan.empty) {
        await pushPlan(sb, uid, plan);
        saveMarker(uid, markerAfter(state, marker, plan));
      }
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError(cloudErrorHe(e));
    } finally {
      pushing.current = false;
      setSyncing(false);
    }
  }, [uid]);

  /** After sign-in: load the profile, then decide whether this device or the cloud wins. */
  const initForSession = useCallback(
    async (s: Session) => {
      const sb = await getClient();
      const { data: prof, error: pe } = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      if (pe) throw pe;
      if (!prof) {
        setStatus('needsProfile');
        return;
      }
      setProfile(prof as CloudProfile);
      const remote = await fetchRemote(sb, s.user.id);
      const local = gameRef.current.getState();
      if (chooseSource(local, remote as { progress?: { xp?: number } } | null) === 'pull' && remote) {
        const answers = await fetchAnswers(sb, s.user.id);
        gameRef.current.importState(remoteToExport(remote, answers));
        // everything we just pulled is already in the cloud
        const pulled = gameRef.current.getState();
        saveMarker(s.user.id, markerAfter(pulled, loadMarker(s.user.id), planPush(pulled, { answersSince: null, slices: {}, days: {} })));
        setMergeResult('pulled');
      } else {
        setMergeResult(remote ? 'pushed' : null);
      }
      setStatus('ready');
    },
    [],
  );

  // restore an existing session on load
  useEffect(() => {
    if (!HAS_SESSION()) return;
    let alive = true;
    (async () => {
      try {
        const sb = await getClient();
        const pending = takePendingAuth();
        if (pending.error) {
          setError(/expired|invalid/i.test(pending.error) ? 'הקישור פג תוקף או שכבר נעשה בו שימוש. בקש מייל חדש.' : 'הכניסה דרך הקישור נכשלה. בקש מייל חדש.');
        }
        if (pending.tokens) {
          const { error: se } = await sb.auth.setSession(pending.tokens);
          if (se) setError(cloudErrorHe(se));
        }
        const { data } = await sb.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          setStatus('signedOut');
          return;
        }
        setSession(data.session);
        await initForSession(data.session);
      } catch (e) {
        if (alive) {
          setError(cloudErrorHe(e));
          setStatus('signedOut');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [initForSession]);

  // auto-sync: debounce after every state change, flush when the tab is hidden
  useEffect(() => {
    if (status !== 'ready') return;
    const t = setTimeout(push, 2500);
    return () => clearTimeout(t);
  }, [game.state, status, push]);
  useEffect(() => {
    if (status !== 'ready') return;
    const onHide = () => document.visibilityState === 'hidden' && push();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [status, push]);

  const value = useMemo<CloudCtx>(
    () => ({
      status,
      email: session?.user.email ?? null,
      profile,
      syncing,
      lastSync,
      error,
      mergeResult,
      sendCode: async (email) => {
        setError(null);
        const sb = await getClient();
        const { error: e } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname } });
        if (e) throw new Error(cloudErrorHe(e));
      },
      verifyCode: async (email, code) => {
        setError(null);
        const sb = await getClient();
        const { data, error: e } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (e || !data.session) throw new Error(cloudErrorHe(e ?? 'no session'));
        setSession(data.session);
        await initForSession(data.session);
      },
      checkUsername: async (u) => {
        const sb = await getClient();
        const { data, error: e } = await sb.rpc('username_available', { p_username: u });
        if (e) throw new Error(cloudErrorHe(e));
        return !!data;
      },
      createProfile: async (username, displayName, isPublic) => {
        if (!session) return;
        const sb = await getClient();
        const local = gameRef.current.getState().profile;
        const row = { id: session.user.id, username, display_name: displayName.slice(0, 24), avatar: local?.avatar ?? '🦊', is_public: isPublic };
        const { error: e } = await sb.from('profiles').insert(row);
        if (e) throw new Error(cloudErrorHe(e));
        await initForSession(session);
      },
      syncNow: push,
      signOut: async () => {
        await push();
        const sb = await getClient();
        await sb.auth.signOut();
        setSession(null);
        setProfile(null);
        setMergeResult(null);
        setStatus('signedOut');
      },
    }),
    [status, session, profile, syncing, lastSync, error, mergeResult, initForSession, push],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud(): CloudCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCloud outside provider');
  return c;
}
