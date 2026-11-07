import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

// Small shared pieces, so every screen has the same controls and spacing.

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="grow">
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

export function SectionTitle({ title, sub, icon: Icon }: { title: string; sub?: string; icon?: LucideIcon }) {
  return (
    <div className="sec-title">
      {Icon && <IconBadge icon={Icon} tone="lil" />}
      <div className="grow">
        <h2>{title}</h2>
        {sub && <p className="note flush">{sub}</p>}
      </div>
    </div>
  );
}

export type Tone = 'em' | 'lil' | 'sun' | 'sky' | 'pe' | 'cor' | 'sage';

export function IconBadge({ icon: Icon, tone = 'lil', size = 18 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return <span className={`ib ib--${tone}`} aria-hidden="true"><Icon size={size} strokeWidth={2} /></span>;
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ art, title, text, children }: { art?: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {art}
      <h3>{title}</h3>
      {text && <p className="note">{text}</p>}
      {children}
    </div>
  );
}

export interface SegOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

// A row of options where one is on. Uses real buttons, so it works by keyboard and screen reader.
export function Segmented<T extends string | number>({ label, value, options, onChange, className = '' }: { label: string; value: T | null; options: SegOption<T>[]; onChange(v: T): void; className?: string }) {
  return (
    <div className={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        const on = value === o.value;
        return (
          <button key={String(o.value)} type="button" className={`seg__b ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(o.value)}>
            {Icon && <Icon size={18} aria-hidden="true" />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange(v: boolean): void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`tgl ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

export function SettingRow({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div className="grow">
        <div className="set-row__t">{title}</div>
        {note && <p className="note flush">{note}</p>}
      </div>
      <div className="set-row__c">{children}</div>
    </div>
  );
}

// Centered dialog. Keyboard focus moves into it, and returns to where it was when it closes.
export function Dialog({ children, label, top }: { children: ReactNode; label: string; top?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => before?.focus?.();
  }, []);
  return (
    <div className={`ov ${top ? 'ov--top' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="dlg" ref={ref}>{children}</div>
    </div>
  );
}
