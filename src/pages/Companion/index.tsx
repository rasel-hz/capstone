import { useEffect, useRef, useState } from 'react';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { aiCompanion, isAiAvailable, ruleCompanion } from '../../services/companion';
import { today } from '../../utils';

export function Companion() {
  const s = useAppState();
  const store = useStore();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [supportive, setSupportive] = useState<MascotState | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const driving = !!s.driving;
  const useAi = aiReady && s.aiConsent === 1;

  // Thinking shows only while a real request is pending; listening only while the user is typing.
  const mascot = useMascot(waiting ? 'thinking' : supportive ?? (focused || text ? 'listening' : 'idle'));

  useEffect(() => {
    let live = true;
    void isAiAvailable().then((ok) => { if (live) setAiReady(ok); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [s.chat.length, waiting]);

  async function send() {
    const v = text.trim();
    if (!v || waiting || driving) return;
    setText('');
    mascot.clear();
    // The history sent to the AI shouldn't repeat this message, so it is read before saving it.
    const before = store.getState();
    store.update((d) => { d.chat.push({ t: v }); });
    setWaiting(true);
    let reply;
    try {
      reply = await (useAi ? aiCompanion : ruleCompanion).respond(v, before);
      setFellBack(false);
    } catch {
      // If the AI can't be reached, say so and answer with the rules instead of failing silently.
      reply = await ruleCompanion.respond(v, before);
      setFellBack(true);
    }
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
        {useAi ? 'الردود من نموذج ذكاء اصطناعي (OpenAI)، وممكن يغلط. ' : 'ردود المحادثة هنا تعتمد على قواعد داخل التطبيق، مو نموذج لغوي. '}
        أنا مو معالج ولا أشخّص، وما أحل محل أهلك وأصحابك أو المختصين.
      </p>
      {aiReady && s.aiConsent == null && (
        <div className="card consent">
          <h3>تبي تفعّل الردود الذكية؟</h3>
          <p>لو وافقت، رسالتك وآخر رسايل المحادثة وملخص نتائجك في التحديات تنرسل لشركة OpenAI عشان يطلع الرد. ما نرسل اسمك ولا الرحلات اللي اخترتها.</p>
          <p className="note">حسب سياسة OpenAI، بيانات الـ API ما تُستخدم للتدريب، وممكن تُحفظ عندهم لمدة تصل إلى ٣٠ يوم لمراقبة إساءة الاستخدام. ولا تكتب معلومات حساسة ما تبي تشاركها. تقدر توقفها بأي وقت من ملفي.</p>
          <button type="button" className="btn sm" onClick={() => store.update((d) => { d.aiConsent = 1; })}>أوافق</button>{' '}
          <button type="button" className="btn sm alt" onClick={() => store.update((d) => { d.aiConsent = 0; })}>لا، خلها بالقواعد</button>
        </div>
      )}
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
          {waiting && <div className="m b m--typing" aria-label="خويّك يكتب"><i /><i /><i /></div>}
        </div>
        {fellBack && <p className="note" role="status">ما قدرت أوصل للرد الذكي الحين، فرديت عليك بالقواعد البسيطة، ويمكن ما فهمت كلامك زين. إذا تمر بوقت صعب أو في خطر عليك، كلّم شخص تثق فيه أو اتصل بالإسعاف 997.</p>}
        {driving && <p className="note">🚗 وقفنا الكتابة وأنت تسوق. أول ما توصل بالسلامة ألغِ خيار القيادة من الرئيسية.</p>}
        <div className="row">
          <input
            aria-label="رسالتك لخويّك"
            className="grow"
            placeholder="اكتب لخويّك..."
            maxLength={1000}
            value={text}
            disabled={driving}
            onChange={(e) => { setText(e.target.value); if (supportive) setSupportive(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
          />
          <button type="button" className="btn" disabled={driving || waiting} onClick={() => void send()}>أرسل</button>
        </div>
      </div>
    </>
  );
}
