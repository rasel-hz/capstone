import { useEffect, useRef, useState } from 'react';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { ruleCompanion } from '../../services/companion';
import { today } from '../../utils';

const service = ruleCompanion;

export function Companion() {
  const s = useAppState();
  const store = useStore();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [supportive, setSupportive] = useState<MascotState | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const driving = !!s.driving;

  // Thinking shows only while a real request is pending; listening only while the user is typing.
  const mascot = useMascot(waiting ? 'thinking' : supportive ?? (focused || text ? 'listening' : 'idle'));

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [s.chat.length]);

  async function send() {
    const v = text.trim();
    if (!v || waiting || driving) return;
    setText('');
    mascot.clear();
    store.update((d) => { d.chat.push({ t: v }); });
    setWaiting(true);
    const reply = await service.respond(v, store.getState());
    setWaiting(false);
    store.update((d) => {
      reply.messages.forEach((t) => d.chat.push({ b: 1, t }));
      if (reply.pending) {
        d.pend = { ctx: reply.pending.ctx, low: reply.pending.low };
        d.chat.push({ b: 1, card: 1, t: reply.pending.card });
      }
    });
    setSupportive(reply.tone === 'crisis' ? 'concerned' : reply.tone === 'support' ? 'calm' : null);
    if (reply.tone === 'friendly') mascot.play('happy');
  }

  function answerCard(m: 0 | 1 | 2) {
    store.update((d) => {
      const p = d.pend;
      d.chat = d.chat.filter((x) => !x.card);
      if (p && m) {
        p.ctx.forEach((c) => { if (!d.ctx.includes(c)) d.ctx.push(c); });
        if (p.low) {
          d.en = d.en.filter((y) => y.d !== today());
          d.en.push({ d: today(), e: 'low', ts: Date.now() });
        }
        if (m === 1) d.pref = 'short';
      }
      d.pend = null;
      d.chat.push({ b: 1, t: m === 1 ? 'تم يا بعدي، سجلتها وخففت مهمة اليوم. شوفها في الرئيسية.' : m === 2 ? 'تم، سجلتها وخطتك ما تغيّرت.' : 'عادي، ما سجلت شي.' });
    });
  }

  return (
    <>
      <div className="chat-head">
        <Mascot state={mascot.state} size={72} label="خويّك" />
        <h1>خويّك</h1>
      </div>
      <p className="note">
        {service.isAI ? '' : 'ردود المحادثة هنا تعتمد على قواعد داخل العرض، مو نموذج لغوي مربوط. '}
        أنا مو معالج ولا أشخّص، وما أحل محل أهلك وأصحابك أو المختصين.
      </p>
      <div className="card">
        <div className="chat" ref={list} role="log" aria-live="polite">
          {s.chat.map((m, i) => (m.card ? (
            <div key={i} className="m b">
              {m.t}<br />
              <button type="button" className="btn sm" onClick={() => answerCard(1)}>سجّل وخفّف الخطة</button>{' '}
              <button type="button" className="btn sm alt" onClick={() => answerCard(2)}>سجّل بس</button>{' '}
              <button type="button" className="btn sm alt" onClick={() => answerCard(0)}>لا</button>
            </div>
          ) : (
            <div key={i} className={`m ${m.b ? 'b' : 'u'}`}>{m.t}</div>
          )))}
        </div>
        {driving && <p className="note">🚗 وقفنا الكتابة وأنت تسوق. أول ما توصل بالسلامة ألغِ خيار القيادة من الرئيسية.</p>}
        <div className="row">
          <input
            aria-label="رسالتك لخويّك"
            className="grow"
            placeholder="اكتب لخويّك..."
            value={text}
            disabled={driving}
            onChange={(e) => { setText(e.target.value); if (supportive) setSupportive(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
          />
          <button type="button" className="btn" disabled={driving} onClick={() => void send()}>أرسل</button>
        </div>
      </div>
    </>
  );
}
