import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function En({ children, block }: { children: ReactNode; block?: boolean }) {
  return block ? (
    <div lang="en" dir="ltr" className="en">
      {children}
    </div>
  ) : (
    <span lang="en" dir="ltr" className="en-inline">
      {children}
    </span>
  );
}

export function Bar({ pct, className = '', label }: { pct: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`bar ${className}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ pct, size = 120, stroke = 12, color = 'var(--primary)', track = 'var(--bg-soft)', children, label }: { pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)}%`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export function Stars({ n, max = 4 }: { n: number; max?: number }) {
  return (
    <span className="stars" aria-label={`קושי ${n} מתוך ${max}`}>
      {'★'.repeat(n)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(max - n)}</span>
    </span>
  );
}

export function Stat({ value, label, icon }: { value: ReactNode; label: string; icon?: string }) {
  return (
    <div className="stat">
      <div className="v num">
        {icon && <span aria-hidden>{icon} </span>}
        {value}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}

export function PageHeader({ title, sub, back, right }: { title: ReactNode; sub?: ReactNode; back?: string | true; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="spread" style={{ marginBottom: 16 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {back && (
          <button className="icon-btn" aria-label="חזרה" onClick={() => (back === true ? nav(-1) : nav(back))}>
            →
          </button>
        )}
        <div>
          <h1 style={{ marginBottom: 2 }}>{title}</h1>
          {sub && <div className="muted">{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e">{emoji}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function SkillBar({ label, pct, to }: { label: string; pct: number; to?: string }) {
  const inner = (
    <div className="skill-row">
      <span className="small bold">{label}</span>
      <Bar pct={pct} className="thin" label={label} />
      <span className="small num" style={{ textAlign: 'end' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
  return to ? (
    <Link to={to} style={{ color: 'inherit' }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Loading() {
  return (
    <div className="empty" aria-busy="true">
      <div className="e bounce-in">⚡</div>
      <p>טוען…</p>
    </div>
  );
}

/** Simple responsive SVG line chart. */
export function LineChart({ points, min, max, target, height = 180, labels }: { points: number[]; min: number; max: number; target?: number; height?: number; labels?: string[] }) {
  const W = 600;
  const H = height;
  const P = { l: 34, r: 12, t: 12, b: 24 };
  if (points.length === 0) return <Empty emoji="📈" title="אין עדיין נתונים" />;
  const xs = (i: number) => P.l + (points.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (points.length - 1));
  const ys = (v: number) => P.t + (1 - (v - min) / (max - min || 1)) * (H - P.t - P.b);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  const area = `${d} L${xs(points.length - 1)},${H - P.b} L${xs(0)},${H - P.b} Z`;
  const ticks = 4;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="גרף" style={{ direction: 'ltr' }}>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = min + ((max - min) * i) / ticks;
        return (
          <g key={i}>
            <line className="grid-line" x1={P.l} x2={W - P.r} y1={ys(v)} y2={ys(v)} />
            <text x={P.l - 6} y={ys(v) + 4} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {target !== undefined && target >= min && target <= max && <line className="target" x1={P.l} x2={W - P.r} y1={ys(target)} y2={ys(target)} />}
      <path className="area" d={area} />
      <path className="line" d={d} />
      {points.length <= 40 && points.map((v, i) => <circle key={i} className="dot" cx={xs(i)} cy={ys(v)} r={4} />)}
      {labels && labels.length === points.length && (
        <>
          <text x={xs(0)} y={H - 6} textAnchor="start">
            {labels[0]}
          </text>
          <text x={xs(points.length - 1)} y={H - 6} textAnchor="end">
            {labels[labels.length - 1]}
          </text>
        </>
      )}
    </svg>
  );
}

export function BarChart({ values, labels, height = 160, unit = '' }: { values: number[]; labels: string[]; height?: number; unit?: string }) {
  const W = 600;
  const H = height;
  const P = { l: 8, r: 8, t: 18, b: 22 };
  const max = Math.max(1, ...values);
  const bw = (W - P.l - P.r) / values.length;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="גרף עמודות" style={{ direction: 'ltr' }}>
      {values.map((v, i) => {
        const h = (v / max) * (H - P.t - P.b);
        return (
          <g key={i}>
            <rect className="barrect" x={P.l + i * bw + bw * 0.18} y={H - P.b - h} width={bw * 0.64} height={Math.max(h, v > 0 ? 2 : 0)} rx={6} />
            {v > 0 && (
              <text x={P.l + i * bw + bw / 2} y={H - P.b - h - 4} textAnchor="middle">
                {v}
                {unit}
              </text>
            )}
            <text x={P.l + i * bw + bw / 2} y={H - 6} textAnchor="middle">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Latin runs (optionally quoted) inside Hebrew text get isolated as LTR so
// punctuation and quotes don't jump around (RTL/LTR mixing).
const LATIN_RUN = /(["“]?[A-Za-z](?:[A-Za-z0-9\s'’".,!?()\-–:;/&]*[A-Za-z0-9.!?"')’”])?)/g;

export function Bidi({ text }: { text: string }) {
  const parts = text.split(LATIN_RUN);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <bdi key={i} dir="ltr" lang="en">
            {p}
          </bdi>
        ) : (
          p
        ),
      )}
    </>
  );
}
