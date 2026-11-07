import { Bot, CarFront, Check, Pencil, Send, ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { aiCompanion, isAiAvailable, ruleCompanion } from '../../services/companion';
import type { ContextTag } from '../../types';
import { today } from '../../utils';

const TAGS: Record<ContextTag, string> = { event: 'عندك عزيمة أو مناسبة', work: 'عندك دوام أو دراسة', sleep: 'نومك كان متأخر' };
const SUGGEST = ['نمت متأخر اليوم', 'مالي خلق اليوم', 'عندي عزيمة بالليل', 'كيف نتائجي؟'];

export function Companion() {
  const s = useAppState();
  const store = useStore();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [editing, setEditing] = useState(false);
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
  }, [s.chat.length, waiting, editing]);

  async function send(raw: string) {
    const v = raw.trim();
    if (!v || waiting || driving) return;
    setText('');
    setEditing(false);
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
    setEditing(false);
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

  // Lets the user drop anything the companion misunderstood before it is saved.
  function dropFact(k: ContextTag | 'low') {
    store.update((d) => {
      if (!d.pend) return;
      if (k === 'low') d.pend.low = 0;
      else d.pend.ctx = d.pend.ctx.filter((c) => c !== k);
    });
  }

  const pend = s.pend;
  const empty = !!pend && !pend.ctx.length && !pend.low;
  const showSuggest = !waiting && !driving && !pend && s.chat.filter((m) => !m.b).length < 2;

  return (
    <div className="chatp">
      <header className="chat-head">
        <Mascot state={mascot.state} size={72} label="خويّك" />
        <div className="grow">
          <h1>خويّك</h1>
          <span className={`status ${useAi ? 'status--ai' : ''}`}><Bot size={14} aria-hidden="true" /> {useAi ? 'ردود من نموذج ذكاء اصطناعي (OpenAI)، وممكن يغلط' : 'ردود من قواعد داخل التطبيق، مو نموذج لغوي'}</span>
        </div>
      </header>
      <p className="note chat-disc">أنا مو معالج ولا أشخّص، وما أحل محل أهلك وأصحابك أو المختصين.</p>

      {aiReady && s.aiConsent == null && (
        <div className="panel consent">
          <h3>تبي تفعّل الردود الذكية؟</h3>
          <p>لو وافقت، رسالتك وآخر رسايل المحادثة وملخص نتائجك في التحديات تنرسل لشركة OpenAI عشان يطلع الرد. ما نرسل اسمك ولا الرحلات اللي اخترتها.</p>
          <p className="note">حسب سياسة OpenAI، بيانات الـ API ما تُستخدم للتدريب، وممكن تُحفظ عندهم لمدة تصل إلى ٣٠ يوم لمراقبة إساءة الاستخدام. ولا تكتب معلومات حساسة ما تبي تشاركها. تقدر توقفها بأي وقت من ملفي.</p>
          <div className="row">
            <button type="button" className="btn sm" onClick={() => store.update((d) => { d.aiConsent = 1; })}>أوافق</button>
            <button type="button" className="btn sm alt" onClick={() => store.update((d) => { d.aiConsent = 0; })}>لا، خلها بالقواعد</button>
          </div>
        </div>
      )}

      <div className="chat-box">
        <div className="chat" ref={list} role="log" aria-live="polite" tabIndex={0} aria-label="المحادثة">
          {!s.chat.length && <p className="note center">قل لي عن يومك: نومك، دوامك، أو أي شي يشغل بالك.</p>}
          {s.chat.map((m, i) => (m.card ? (
            <div key={i} className="ccard">
              <b>{m.t}</b>
              <p className="note flush">هذا اللي فهمته من كلامك. ما أسجل شي إلا بموافقتك.</p>
              {pend && (
                <ul className="ccard__facts">
                  {pend.low ? <li><span>طاقتك قليلة اليوم</span>{editing && <button type="button" aria-label="شيل: طاقتك قليلة اليوم" onClick={() => dropFact('low')}><X size={15} /></button>}</li> : null}
                  {pend.ctx.map((c) => <li key={c}><span>{TAGS[c]}</span>{editing && <button type="button" aria-label={`شيل: ${TAGS[c]}`} onClick={() => dropFact(c)}><X size={15} /></button>}</li>)}
                  {empty && <li className="note">شلت كل شي، فما فيه شي أسجله.</li>}
                </ul>
              )}
              <div className="row">
                <button type="button" className="btn sm" disabled={empty} onClick={() => answerCard(1)}><Check size={15} aria-hidden="true" /> سجّل وخفّف الخطة</button>
                <button type="button" className="btn sm alt" disabled={empty} onClick={() => answerCard(2)}>سجّل بس</button>
                <button type="button" className="btn sm alt" aria-pressed={editing} onClick={() => setEditing(!editing)}><Pencil size={14} aria-hidden="true" /> عدّل</button>
                <button type="button" className="btn sm alt" onClick={() => answerCard(0)}>لا</button>
              </div>
            </div>
          ) : (
            <div key={i} className={`m ${m.b ? 'b' : 'u'}`}>{m.t}</div>
          )))}
          {waiting && <div className="m b m--typing" role="status" aria-label="خويّك يكتب"><i /><i /><i /></div>}
        </div>

        {fellBack && <p className="alert" role="status"><ShieldAlert size={17} aria-hidden="true" /> <span>ما قدرت أوصل للرد الذكي الحين، فرديت عليك بالقواعد البسيطة، ويمكن ما فهمت كلامك زين. إذا تمر بوقت صعب أو في خطر عليك، كلّم شخص تثق فيه أو اتصل بالإسعاف 997.</span></p>}
        {driving && <p className="alert" role="status"><CarFront size={17} aria-hidden="true" /> <span>وقفنا الكتابة لأنك حددت إنك تسوق. أول ما توصل بالسلامة غيّرها من ملفي.</span></p>}

        {showSuggest && (
          <div className="tags chat-sug" role="group" aria-label="اقتراحات">
            {SUGGEST.map((x) => <button key={x} type="button" className="tag tag--btn" onClick={() => void send(x)}>{x}</button>)}
          </div>
        )}
        <form className="chat-in" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <input
            aria-label="رسالتك لخويّك"
            placeholder="اكتب لخويّك..."
            maxLength={1000}
            value={text}
            disabled={driving}
            onChange={(e) => { setText(e.target.value); if (supportive) setSupportive(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <button type="submit" className="btn" disabled={driving || waiting || !text.trim()} aria-label="أرسل"><Send size={17} aria-hidden="true" /><span>أرسل</span></button>
        </form>
      </div>
    </div>
  );
}
