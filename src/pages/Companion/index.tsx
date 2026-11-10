import { named } from '../../features/companion/name';
import { Bot, CarFront, Check, Pencil, Send, ShieldAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import type { MascotState } from '../../components/mascot/manifest';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { tr } from '../../i18n';
import { SuggestionCard } from '../../features/companion/SuggestionCard';
import { completeTalk } from '../../features/path/planner';
import { buildSuggestion } from '../../features/recommend/suggest';
import { aiCompanion, isAiAvailable, ruleCompanion } from '../../services/companion';
import type { ContextTag } from '../../types';
import { today } from '../../utils';

const SUGGEST = ['overwhelmed', 'start', 'low', 'results'];
const LONG = 280;

// The user's long messages fold so the conversation stays readable; the full text is one tap away.
// Replies never fold, because the advice is the point.
function Bubble({ text, bot }: { text: string; bot: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const long = !bot && text.length > LONG;
  return (
    <div className={`m ${bot ? 'b' : 'u'} ${long && !open ? 'm--fold' : ''}`} dir="auto">
      {long && !open ? `${text.slice(0, LONG).trimEnd()}…` : text}
      {long && (
        <button type="button" className="m__more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {t(open ? 'companion.less' : 'companion.more')}
        </button>
      )}
    </div>
  );
}

export function Companion() {
  const { t } = useTranslation();
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
  // Smart replies run whenever the AI service is available. The status line under the title says so.
  const useAi = aiReady;

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
    store.update((d) => { d.chat.push({ t: v }); completeTalk(d); });
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
    // Any proposed activity goes through the same filters as every recommendation before it is shown.
    const sug = reply.proposal ? buildSuggestion(store.getState(), reply.proposal) : undefined;
    store.update((d) => {
      reply.messages.forEach((m) => d.chat.push({ b: 1, t: m }));
      if (sug) d.chat.push({ b: 1, t: '', sug });
      if (reply.pending) {
        d.pend = { ctx: reply.pending.ctx, low: reply.pending.low };
        // The card's words come from the locale files when shown, because it is still a live control.
        d.chat.push({ b: 1, card: 1, t: '' });
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
      d.chat.push({ b: 1, t: tr(m === 1 ? 'companion.card.savedLighter' : m === 2 ? 'companion.card.saved' : 'companion.card.declined', named(d.name)) });
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
  // Starter ideas only for an empty chat, so they never crowd a reply or a suggestion card.
  const showSuggest = !waiting && !driving && !pend && !s.chat.length;
  const lowFact = t('companion.card.lowFact');

  return (
    <div className="chatp">
      <header className="chat-head">
        <Mascot state={mascot.state} size={72} label={t('common.brand')} />
        <div className="grow">
          <h1>{t('nav.chat')}</h1>
          <span className={`status ${useAi ? 'status--ai' : 'status--limited'}`}><Bot size={14} aria-hidden="true" /> {t(useAi ? 'companion.statusAi' : 'companion.statusRules')}</span>
        </div>
      </header>

      <div className="chat-box">
        {/* Zaho floats quietly behind the conversation. Decorative only: it never takes taps or covers text. */}
        <div className="chat-bg" aria-hidden="true"><Mascot state="idle" size={280} still={!!s.rm} /></div>
        <div className="chat" ref={list} role="log" aria-live="polite" tabIndex={0} aria-label={t('companion.logLabel')}>
          {!s.chat.length && <p className="note center">{t('companion.empty')}</p>}
          {s.chat.map((m, i) => (m.card ? (
            <div key={i} className="ccard">
              <b>{t('companion.card.ask', { context: s.g })}</b>
              <p className="note flush">{t('companion.card.note')}</p>
              {pend && (
                <ul className="ccard__facts">
                  {pend.low ? <li><span>{lowFact}</span>{editing && <button type="button" aria-label={t('companion.card.drop', { fact: lowFact })} onClick={() => dropFact('low')}><X size={15} /></button>}</li> : null}
                  {pend.ctx.map((c) => {
                    const fact = t(`common.context.${c}`);
                    return <li key={c}><span>{fact}</span>{editing && <button type="button" aria-label={t('companion.card.drop', { fact })} onClick={() => dropFact(c)}><X size={15} /></button>}</li>;
                  })}
                  {empty && <li className="note">{t('companion.card.empty')}</li>}
                </ul>
              )}
              <div className="row">
                <button type="button" className="btn sm" disabled={empty} onClick={() => answerCard(1)}><Check size={15} aria-hidden="true" /> {t('companion.card.saveLighter')}</button>
                <button type="button" className="btn sm alt" disabled={empty} onClick={() => answerCard(2)}>{t('companion.card.saveOnly')}</button>
                <button type="button" className="btn sm alt" aria-pressed={editing} onClick={() => setEditing(!editing)}><Pencil size={14} aria-hidden="true" /> {t('companion.card.edit')}</button>
                <button type="button" className="btn sm alt" onClick={() => answerCard(0)}>{t('companion.card.no')}</button>
              </div>
            </div>
          ) : m.sug ? (
            <SuggestionCard key={i} index={i} sug={m.sug} />
          ) : (
            <Bubble key={i} text={m.t} bot={!!m.b} />
          )))}
          {waiting && <div className="m b m--typing" role="status" aria-label={t('companion.typing')}><i /><i /><i /></div>}
        </div>

        {fellBack && <p className="alert" role="status"><ShieldAlert size={17} aria-hidden="true" /> <span>{t('companion.fallback')}</span></p>}
        {driving && <p className="alert" role="status"><CarFront size={17} aria-hidden="true" /> <span>{t('companion.driving')}</span></p>}

        {showSuggest && (
          <div className="tags chat-sug" role="group" aria-label={t('companion.suggestLabel')}>
            {SUGGEST.map((k) => <button key={k} type="button" className="tag tag--btn" onClick={() => void send(t(`companion.suggest.${k}`))}>{t(`companion.suggest.${k}`)}</button>)}
          </div>
        )}
        <form className="chat-in" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <input
            dir="auto"
            aria-label={t('companion.inputLabel')}
            placeholder={t('companion.inputPh')}
            maxLength={1000}
            value={text}
            disabled={driving}
            onChange={(e) => { setText(e.target.value); if (supportive) setSupportive(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <button type="submit" className="btn" disabled={driving || waiting || !text.trim()} aria-label={t('companion.send')}><Send size={17} className="flip" aria-hidden="true" /><span>{t('companion.send')}</span></button>
        </form>
      </div>
    </div>
  );
}
