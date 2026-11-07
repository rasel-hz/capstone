import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { shuffled } from '../../../utils';
import type { GameProps } from '../types';
import { useDrag } from './parts';

type Col = 'now' | 'later' | 'notToday';
const COLS: { id: Col; title: string; note: string }[] = [
  { id: 'now', title: 'الحين', note: 'اللي يستاهل اليوم أول' },
  { id: 'later', title: 'بعدين', note: 'مهم، بس يقدر يصبر' },
  { id: 'notToday', title: 'مو اليوم', note: 'نخليه لوقت ثاني' },
];
const SEEDS = ['أرد على رسالة مهمة', 'أجهز ملابس بكرة', 'أرتب مكتبي', 'أخلص شغلة الدوام أو المذاكرة', 'أكلم أهلي', 'أحجز موعد', 'أطلع أتمشى', 'أدفع فاتورة'];

// There are no wrong placements here, so this has no score (task catalog 5.2).
export function PriorityBoardGame({ diff, env, onDone }: GameProps) {
  const easy = diff === 'easy';
  const limit = easy ? 1 : 3;
  const [deck, setDeck] = useState(() => shuffled(SEEDS).slice(0, easy ? 4 : 6));
  const [board, setBoard] = useState<Record<Col, string[]>>({ now: [], later: [], notToday: [] });
  const [picked, setPicked] = useState<string | null>(null);
  const [own, setOwn] = useState('');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'sort' | 'first'>('sort');

  useEffect(() => {
    env.round(1, 2, 'الخطوة');
    env.say('curious', 'حط كل مهمة في مكانها. ما فيه إجابة غلط.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveTo(card: string, col: Col) {
    if (col === 'now' && !board.now.includes(card) && board.now.length >= limit) {
      setNote(`«الحين» فيها ${limit === 1 ? 'مكان واحد' : `${limit} أماكن`} بس. وش نأجل؟`);
      env.say('curious', 'وش نأجل؟');
      setPicked(card);
      return;
    }
    setBoard((b) => ({
      now: b.now.filter((x) => x !== card),
      later: b.later.filter((x) => x !== card),
      notToday: b.notToday.filter((x) => x !== card),
      [col]: [...b[col].filter((x) => x !== card), card],
    }));
    setDeck((d) => d.filter((x) => x !== card));
    setPicked(null);
    setNote('');
    env.sfx('tap');
  }
  function backToDeck(card: string) {
    setBoard((b) => ({ now: b.now.filter((x) => x !== card), later: b.later.filter((x) => x !== card), notToday: b.notToday.filter((x) => x !== card) }));
    setDeck((d) => [...d, card]);
    setNote('');
  }
  function addOwn() {
    const v = own.trim();
    if (!v || deck.includes(v) || Object.values(board).flat().includes(v)) return;
    setDeck((d) => [...d, v]);
    setOwn('');
  }

  const bind = useDrag((id, target) => {
    if (target === 'deck') backToDeck(id);
    else moveTo(id, target as Col);
  });

  if (phase === 'first') {
    return (
      <div className="scene q">
        <h2 className="q__t">من «الحين»: وش أول شي؟</h2>
        <div className="choices choices--1">
          {board.now.map((c) => (
            <button key={c} type="button" className="opt" onClick={() => { env.sfx('ok'); onDone({ acc: null, retries: 0, say: `تمام، أول شي: ${c}.`, note: `أول شي اخترته: ${c}. قدامك ${board.later.length} لبعدين، و${board.notToday.length} مو اليوم.`, data: { ...board, first: c } }); }}>{c}</button>
          ))}
        </div>
        <div className="row row--c"><button type="button" className="btn-link" onClick={() => { setPhase('sort'); env.round(1, 2, 'الخطوة'); }}>أبي أعدل القوائم</button></div>
      </div>
    );
  }

  const ready = !deck.length && board.now.length > 0;
  return (
    <div className="scene pb">
      <div className="pb__deck" data-drop="deck">
        <div className="pb__cards">
          {deck.map((c) => (
            <button key={c} type="button" className={`crd ${picked === c ? 'is-picked' : ''}`} aria-pressed={picked === c} {...bind(c)} onClick={() => setPicked(picked === c ? null : c)}>{c}</button>
          ))}
          {!deck.length && <span className="note">وزّعت كل البطاقات.</span>}
        </div>
        {!easy && (
          <form className="pb__add" onSubmit={(e) => { e.preventDefault(); addOwn(); }}>
            <input aria-label="أضف مهمتك" placeholder="أضف مهمة من عندك" maxLength={60} value={own} onChange={(e) => setOwn(e.target.value)} />
            <button type="submit" className="btn sm alt" aria-label="أضف"><Plus size={16} aria-hidden="true" /></button>
          </form>
        )}
      </div>
      <p className="hint" role="status">{note || (picked ? `اختر قائمة لـ«${picked}»` : 'اسحب البطاقة، أو اضغطها وبعدها اضغط القائمة.')}</p>
      <div className="pb__cols">
        {COLS.map((col) => (
          <section key={col.id} data-drop={col.id} className={`pb__col pb__col--${col.id}`} aria-label={col.title}>
            <button type="button" className="pb__head" disabled={!picked} onClick={() => picked && moveTo(picked, col.id)}>
              <b>{col.title}</b>
              {col.id === 'now' && <span className="pb__n">{board.now.length} من {limit}</span>}
              <span className="note">{col.note}</span>
            </button>
            {board[col.id].map((c) => (
              <div key={c} className="crd crd--in" {...bind(c)}>
                <span className="grow">{c}</span>
                <button type="button" aria-label={`رجّع ${c}`} onClick={() => backToDeck(c)}><X size={15} /></button>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="row row--c">
        <button type="button" className="btn" disabled={!ready} onClick={() => { setPhase('first'); env.round(2, 2, 'الخطوة'); env.say('listening', 'وش أول شي؟'); }}>التالي</button>
      </div>
      {!deck.length && !board.now.length && <p className="note center">حط شي واحد على الأقل في «الحين».</p>}
    </div>
  );
}
