import { useEffect, useState } from 'react';
import { leaderboard, type BoardRow, type Period, type Scope } from '../services/cloud';
import { useCloud } from './CloudContext';

/** Real leaderboard rows when signed in; null while loading or signed out. */
export function useBoard(period: Period, scope: Scope, refreshKey = 0) {
  const cloud = useCloud();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = cloud.status === 'ready';
  useEffect(() => {
    if (!ready) {
      setRows(null);
      return;
    }
    let alive = true;
    setRows(null);
    leaderboard(period, scope)
      .then((r) => alive && (setRows(r), setError(null)))
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
    // lastSync: refetch after our own XP reached the server
  }, [ready, period, scope, refreshKey, cloud.lastSync]);
  return { ready, rows, error };
}
