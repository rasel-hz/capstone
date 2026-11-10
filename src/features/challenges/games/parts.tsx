import { Lightbulb, MessageCircle, Phone } from 'lucide-react';
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../../../context/AppStateContext';
import { crisisMessage, detectCrisis, type CrisisLevel } from '../../companion/crisis';
import { fillName } from '../../companion/name';

// A circular progress ring for timers.
export function Ring({ value, size = 200, stroke = 12, children, tone = 'var(--em)' }: { value: number; size?: number; stroke?: number; children?: ReactNode; tone?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--lil)" strokeWidth={stroke} />
        <circle className="ring__v" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring__c">{children}</div>
    </div>
  );
}

export function HintButton({ used, onClick, disabled }: { used?: boolean; onClick(): void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn sm alt" disabled={disabled || used} onClick={onClick}>
      <Lightbulb size={15} aria-hidden="true" /> {t(used ? 'games.common.hintUsed' : 'games.common.hint')}
    </button>
  );
}

// One-tap answers shared by the question-style games.
export function Choices({ children, cols = 1 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  return <div className={`choices choices--${cols}`}>{children}</div>;
}

// Drag for mouse and touch through pointer events, because native drag-and-drop doesn't fire on phones.
// Targets are marked with data-drop. Every game using this must also offer a tap or keyboard route.
export function useDrag(onDrop: (id: string, target: string) => void) {
  const moved = useRef(false);
  const stop = useRef<(() => void) | null>(null);
  const cb = useRef(onDrop);
  cb.current = onDrop;

  useEffect(() => () => stop.current?.(), []);

  const bind = useCallback((id: string) => ({
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      const el = e.currentTarget;
      const x0 = e.clientX;
      const y0 = e.clientY;
      let over: Element | null = null;
      let dragging = false;
      moved.current = false;
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - x0;
        const dy = ev.clientY - y0;
        if (!dragging && Math.hypot(dx, dy) < 8) return;
        dragging = true;
        moved.current = true;
        el.classList.add('is-drag');
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(-1.5deg)`;
        const next = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]') ?? null;
        if (next !== over) {
          over?.classList.remove('drop-on');
          next?.classList.add('drop-on');
          over = next;
        }
      };
      const finish = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', finish);
        el.classList.remove('is-drag');
        el.style.transform = '';
        over?.classList.remove('drop-on');
        stop.current = null;
      };
      const up = () => {
        const target = over?.getAttribute('data-drop');
        const did = dragging;
        finish();
        if (did && target != null) cb.current(id, target);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', finish);
      stop.current = finish;
    },
    // A drag that ends on the card mustn't also count as a tap.
    onClickCapture(e: React.MouseEvent) {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    },
  }), []);

  return bind;
}

/** The strongest crisis level in anything the user typed, checked on the device before the game goes on. */
export const crisisIn = (...texts: (string | undefined)[]): CrisisLevel =>
  texts.reduce<CrisisLevel>((lv, x) => {
    const v = x ? detectCrisis(x) : 0;
    return v === 1 || lv === 1 ? 1 : v || lv;
  }, 0);

// Shown in place of the game when typed text needs support first: the same words as the chat, and the numbers to call.
// The game doesn't go on and nothing is saved from this screen. "Back" returns to what they wrote.
export function CrisisStop({ level, onBack }: { level: CrisisLevel; onBack(): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  return (
    <div className="scene q crisis-stop" role="alert">
      <p dir="auto">{fillName(crisisMessage(level, s.lang === 'en' ? 'en' : 'ar-SA'), s.name)}</p>
      <div className="row row--c">
        <a className="btn" href="tel:997"><Phone size={16} aria-hidden="true" /> {t('games.crisis.call997')}</a>
        <a className="btn alt" href="tel:937"><Phone size={16} aria-hidden="true" /> {t('games.crisis.call937')}</a>
      </div>
      <div className="row row--c"><button type="button" className="btn-link" onClick={onBack}>{t('common.back')}</button></div>
    </div>
  );
}

// One question before the challenge ends, such as "Start the first step now?". Both answers are fine.
export function AskNext({ q, detail, yes, no, onYes, onNo }: { q: string; detail?: string; yes: string; no: string; onYes(): void; onNo(): void }) {
  return (
    <div className="scene q">
      <h2 className="q__t">{q}</h2>
      {detail && <p className="center" dir="auto"><b>{detail}</b></p>}
      <div className="row row--c">
        <button type="button" className="btn" onClick={onYes}>{yes}</button>
        <button type="button" className="btn alt" onClick={onNo}>{no}</button>
      </div>
    </div>
  );
}

// Clearer support when the user says a feeling is strong: talk to Zaho, or call 937. Shown before anything else.
export function HeavySupport({ text, onChat }: { text: string; onChat(): void }) {
  const { t } = useTranslation();
  return (
    <div className="support" role="note">
      <p>{text}</p>
      <div className="row row--c row--wrap">
        <button type="button" className="btn sm" onClick={onChat}><MessageCircle size={15} aria-hidden="true" /> {t('player.go.chat')}</button>
        <a className="btn sm alt" href="tel:937"><Phone size={15} aria-hidden="true" /> {t('games.crisis.call937')}</a>
      </div>
    </div>
  );
}
