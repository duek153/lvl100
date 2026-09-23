import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { LEVELS } from '../domain/levels';

type ToastKind = 'info' | 'achievement' | 'success';
interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

interface UICtx {
  toast: (text: string, kind?: ToastKind) => void;
  xpFloat: (amount: number, x?: number, y?: number) => void;
  confetti: () => void;
  levelUp: (level: number) => void;
}

const Ctx = createContext<UICtx | null>(null);

const COLORS = ['#6d4aff', '#ff5c8a', '#f5b300', '#22c55e', '#0ea5e9', '#a855f7'];

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [floats, setFloats] = useState<{ id: number; amount: number; x: number; y: number }[]>([]);
  const [confettiKey, setConfettiKey] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const idRef = useRef(1);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const xpFloat = useCallback((amount: number, x = window.innerWidth / 2, y = window.innerHeight / 2) => {
    if (amount <= 0) return;
    const id = idRef.current++;
    setFloats((f) => [...f, { id, amount, x, y }]);
    setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1000);
  }, []);

  const confetti = useCallback(() => {
    setConfettiKey((k) => k + 1);
    setTimeout(() => setConfettiKey(0), 2600);
  }, []);

  const levelUp = useCallback(
    (lv: number) => {
      setLevel(lv);
      confetti();
    },
    [confetti],
  );

  const value = useMemo(() => ({ toast, xpFloat, confetti, levelUp }), [toast, xpFloat, confetti, levelUp]);
  const def = level ? LEVELS[level - 1] : null;

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
      {floats.map((f) => (
        <div key={f.id} className="xp-float" style={{ left: f.x, top: f.y }} aria-hidden>
          +{f.amount} XP
        </div>
      ))}
      {confettiKey > 0 && (
        <div className="confetti" aria-hidden key={confettiKey}>
          {Array.from({ length: 60 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                background: COLORS[i % COLORS.length],
                animationDuration: `${1.4 + ((i * 13) % 10) / 10}s`,
                animationDelay: `${((i * 7) % 10) / 20}s`,
              }}
            />
          ))}
        </div>
      )}
      {def && (
        <div className="modal-bg" onClick={() => setLevel(null)} role="dialog" aria-modal="true" aria-label="Level up">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '3.5rem' }} className="bounce-in">
              {def.emoji}
            </div>
            <div className="chip primary" style={{ margin: '8px 0' }}>
              LEVEL UP
            </div>
            <h1 className="en-inline">Level {def.level}</h1>
            <h2 className="en" style={{ textAlign: 'center' }}>
              {def.name}
            </h2>
            <p className="muted">{def.nameHe}. עוד צעד בדרך ל-100.</p>
            <button className="btn block" autoFocus onClick={() => setLevel(null)}>
              יאללה, ממשיכים 🚀
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI outside provider');
  return c;
}
