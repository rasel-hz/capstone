import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tr } from '../../../i18n';
import { shuffled } from '../../../utils';
import type { GameProps } from '../types';
import { useDrag } from './parts';

type Col = 'now' | 'later' | 'notToday';
const COLS: Col[] = ['now', 'later', 'notToday'];
const SEEDS = ['message', 'clothes', 'desk', 'work', 'family', 'appointment', 'walk', 'bill'].map((x) => `seed:${x}`);

// A card is either "seed:id", shown in the current language, or text the user typed, shown as typed.
const label = (c: string) => (c.startsWith('seed:') ? tr(`games.priority.seeds.${c.slice(5)}`) : c);

// There are no wrong placements here, so this has no score (task catalog 5.2).
export function PriorityBoardGame({ diff, env, onDone }: GameProps) {
  const { t } = useTranslation();
  const easy = diff === 'easy';
  const limit = easy ? 1 : 3;
  const [deck, setDeck] = useState(() => shuffled(SEEDS).slice(0, easy ? 4 : 6));
  const [board, setBoard] = useState<Record<Col, string[]>>({ now: [], later: [], notToday: [] });
  const [picked, setPicked] = useState<string | null>(null);
  const [own, setOwn] = useState('');
  const [full, setFull] = useState(false);
  const [phase, setPhase] = useState<'sort' | 'first'>('sort');

  useEffect(() => {
    env.round(1, 2, 'games.common.step');
    env.say('curious', 'games.priority.intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveTo(card: string, col: Col) {
    if (col === 'now' && !board.now.includes(card) && board.now.length >= limit) {
      setFull(true);
      env.say('curious', 'games.priority.whatToDelay');
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
    setFull(false);
    env.sfx('tap');
  }
  function backToDeck(card: string) {
    setBoard((b) => ({ now: b.now.filter((x) => x !== card), later: b.later.filter((x) => x !== card), notToday: b.notToday.filter((x) => x !== card) }));
    setDeck((d) => [...d, card]);
    setFull(false);
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
        <h2 className="q__t">{t('games.priority.firstQ')}</h2>
        <div className="choices choices--1">
          {board.now.map((c) => (
            <button key={c} type="button" className="opt" dir="auto" onClick={() => {
              env.sfx('ok');
              const { later, notToday } = board;
              onDone({
                acc: null,
                retries: 0,
                say: () => tr('games.priority.firstSay', { item: label(c) }),
                note: () => tr('games.priority.note', { item: label(c), later: later.length, notToday: notToday.length }),
                data: { ...board, first: c },
              });
            }}>{label(c)}</button>
          ))}
        </div>
        <div className="row row--c"><button type="button" className="btn-link" onClick={() => { setPhase('sort'); env.round(1, 2, 'games.common.step'); }}>{t('games.priority.editLists')}</button></div>
      </div>
    );
  }

  const ready = !deck.length && board.now.length > 0;
  return (
    <div className="scene pb">
      <div className="pb__deck" data-drop="deck">
        <div className="pb__cards">
          {deck.map((c) => (
            <button key={c} type="button" dir="auto" className={`crd ${picked === c ? 'is-picked' : ''}`} aria-pressed={picked === c} {...bind(c)} onClick={() => setPicked(picked === c ? null : c)}>{label(c)}</button>
          ))}
          {!deck.length && <span className="note">{t('games.priority.allPlaced')}</span>}
        </div>
        {!easy && (
          <form className="pb__add" onSubmit={(e) => { e.preventDefault(); addOwn(); }}>
            <input dir="auto" aria-label={t('games.priority.addLabel')} placeholder={t('games.priority.addPh')} maxLength={60} value={own} onChange={(e) => setOwn(e.target.value)} />
            <button type="submit" className="btn sm alt" aria-label={t('common.add')}><Plus size={16} aria-hidden="true" /></button>
          </form>
        )}
      </div>
      <p className="hint" role="status">{full ? t('games.priority.full', { count: limit }) : picked ? t('games.priority.chooseList', { item: label(picked) }) : t('games.priority.guide')}</p>
      <div className="pb__cols">
        {COLS.map((col) => (
          <section key={col} data-drop={col} className={`pb__col pb__col--${col}`} aria-label={t(`games.priority.cols.${col}.title`)}>
            <button type="button" className="pb__head" disabled={!picked} onClick={() => picked && moveTo(picked, col)}>
              <b>{t(`games.priority.cols.${col}.title`)}</b>
              {col === 'now' && <span className="pb__n">{t('games.priority.nowCount', { n: board.now.length, limit })}</span>}
              <span className="note">{t(`games.priority.cols.${col}.note`)}</span>
            </button>
            {board[col].map((c) => (
              <div key={c} className="crd crd--in" {...bind(c)}>
                <span className="grow" dir="auto">{label(c)}</span>
                <button type="button" aria-label={t('games.common.putBack', { item: label(c) })} onClick={() => backToDeck(c)}><X size={15} /></button>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="row row--c">
        <button type="button" className="btn" disabled={!ready} onClick={() => { setPhase('first'); env.round(2, 2, 'games.common.step'); env.say('listening', 'games.priority.firstAsk'); }}>{t('common.next')}</button>
      </div>
      {!deck.length && !board.now.length && <p className="note center">{t('games.priority.needOne')}</p>}
    </div>
  );
}
