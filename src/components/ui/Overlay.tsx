import { useEffect, useRef, type ReactNode } from 'react';

// Centered dialog. Keyboard focus moves into it when it opens.
export function Overlay({ children, label, top }: { children: ReactNode; label: string; top?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);
  return (
    <div className={`ov ${top ? 'ov--top' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="card" ref={ref}>{children}</div>
    </div>
  );
}
