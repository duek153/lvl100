import { useEffect, useState } from 'react';
import type { ContentBank } from '../domain/engine';
import { loadBank } from '../data/content';

/** Lazily loads the content bank (separate chunks) on first use. */
export function useBank(): ContentBank | null {
  const [bank, setBank] = useState<ContentBank | null>(null);
  useEffect(() => {
    let alive = true;
    loadBank().then((b) => alive && setBank(b));
    return () => {
      alive = false;
    };
  }, []);
  return bank;
}
