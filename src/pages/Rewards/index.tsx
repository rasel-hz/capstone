import { Award, Check, Crown, ExternalLink, Footprints, Layers, Lock, Palette, RefreshCw, Shapes, Sparkles, Sunrise, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, PageHeader } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { ChallengeArt } from '../../features/challenges/ChallengeArt';
import { CHALLENGES } from '../../features/challenges/catalog';
import { achievements, UNLOCKS, type AchievementArt } from '../../features/rewards/achievements';
import { useCountUp } from '../../hooks/useCountUp';
import { useBackHandler } from '../../services/native';
import {
  canRedeemOnServer, fetchRewards, fetchSummary, markCelebrated, newRequestKey, onPointsChanged, redeemReward, safeUrl, spendable,
  type PointsSummary, type RedeemResult, type Redemption, type Reward,
} from '../../services/points';
import { formatDate } from '../../i18n';
import type { ChallengeId } from '../../types';
import { level } from '../../utils';

const MEDAL: Record<AchievementArt, { icon: LucideIcon; c: string }> = {
  step: { icon: Footprints, c: '#8DBFA3' }, five: { icon: Layers, c: '#FFD36E' }, level: { icon: Award, c: '#A78BFA' },
  variety: { icon: Shapes, c: '#8BCDF1' }, retry: { icon: RefreshCw, c: '#FFC6A8' }, return: { icon: Sunrise, c: '#FF8E83' },
};

// A medal drawn around the icon, so earned and locked look clearly different without relying on color.
function Medal({ art, earned }: { art: AchievementArt; earned: boolean }) {
  const { icon: Icon, c } = MEDAL[art];
  return (
    <span className={`medal ${earned ? 'is-on' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64"><path d="M32 3l8 5 9-1 5 8 8 5-1 9 3 8-6 7-1 9-9 3-6 7-9-3-9 3-6-7-9-3-1-9-6-7 3-8-1-9 8-5 5-8 9 1z" fill={earned ? c : '#EEEAE2'} /></svg>
      <span className="medal__i">{earned ? <Icon size={24} /> : <Lock size={20} />}</span>
    </span>
  );
}

const STICKERS = (Object.keys(CHALLENGES) as ChallengeId[]).filter((id) => !CHALLENGES[id].selfReport);

// The brand's own logo, loaded from its website. If it can't load, a plain name badge, never a made-up logo.
function BrandLogo({ r, name }: { r: Reward; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!r.logo_url || failed) return <span className="rw-mono">{r.brand_en}</span>;
  return <img src={r.logo_url} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

type Loaded = { rewards: Reward[]; summary: PointsSummary };

function useRewardsData() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const [rewards, summary] = await Promise.all([fetchRewards(), fetchSummary()]);
      setData({ rewards, summary });
    } catch {
      // No fallback numbers: if Supabase can't answer, the page says so.
      setError(true);
    }
  }, []);
  useEffect(() => {
    void load();
    return onPointsChanged(() => void load());
  }, [load]);
  // After a redemption the server's new balance is shown straight away, before the next full reload.
  const patch = useCallback((fn: (s: PointsSummary) => PointsSummary) => setData((d) => (d ? { ...d, summary: fn(d.summary) } : d)), []);
  return { data, error, load, patch };
}

type Redeemed = Extract<RedeemResult, { status: 'redeemed' | 'already' }>;

// Redeeming spends the reward's points. It asks first, the server checks the balance and records it in one
// step, and the same confirmation can't be charged twice. Opening the brand's site is the next step; it
// doesn't mean the reward itself was claimed there.
function RewardDetails({ r, have, server, last, en, onClose, onRedeemed, onBalance }: {
  r: Reward; have: number; server: boolean; last: Redemption | null; en: boolean;
  onClose(): void; onRedeemed(res: Redeemed): void; onBalance(balance: number): void;
}) {
  const { t } = useTranslation();
  const afford = have >= r.required_points;
  const mascot = useMascot(afford ? 'happy' : 'curious');
  const [step, setStep] = useState<'view' | 'confirm' | 'busy' | 'done'>('view');
  const [err, setErr] = useState<'' | 'insufficient' | 'failed' | 'notAvailable'>('');
  const [done, setDone] = useState<Redeemed | null>(null);
  // One key per opening of this dialog: a double tap or a retry sends the same key and is charged once.
  const key = useRef(newRequestKey());
  useBackHandler(onClose);
  useEffect(() => {
    if (afford) mascot.play('celebrating');
  }, [afford, mascot.play]);
  const brand = en ? r.brand_en : r.brand_ar;
  const title = en ? r.title_en : r.title_ar;
  const left = Math.max(0, r.required_points - have);
  const lastUrl = last ? safeUrl(last.url) : null;

  async function confirm() {
    if (step === 'busy') return;
    setStep('busy');
    setErr('');
    try {
      const res = await redeemReward(r.id, key.current);
      if (res.status === 'insufficient') {
        onBalance(res.balance);
        setErr('insufficient');
        setStep('view');
        return;
      }
      onRedeemed(res);
      setDone(res);
      setStep('done');
      mascot.play('celebrating');
      // Opens the site straight away where the browser allows it; the button below always works too.
      const u = safeUrl(res.url);
      if (u) window.open(u, '_blank', 'noopener,noreferrer');
    } catch (e) {
      // Nothing was spent unless the server said so. The same key is kept, so trying again can't charge twice.
      setErr((e as Error).message === 'notAvailable' ? 'notAvailable' : 'failed');
      setStep('confirm');
    }
  }

  const doneUrl = done ? safeUrl(done.url) : null;
  return (
    <Dialog label={title}>
      <div className="rw-dlg" style={{ '--brand': r.accent_color } as CSSProperties}>
        {(afford || done) && (
          <>
            <span className="auth-spark auth-spark--a" aria-hidden="true"><Sparkles size={22} /></span>
            <span className="auth-spark auth-spark--b" aria-hidden="true"><Sparkles size={16} /></span>
          </>
        )}
        <div className="rw-dlg__top">
          <div className={`rw-logo rw-logo--lg ${r.logo_background ? 'is-dark' : ''}`} style={r.logo_background ? { background: r.logo_background } : undefined}><BrandLogo r={r} name={brand} /></div>
          <Mascot state={mascot.state} size={72} />
        </div>
        <h2>{title}</h2>
        <p className="rw-pts">{t('rewards.my.pts', { count: r.required_points })}</p>
        {done ? (
          <>
            <p className="rw-badge" role="status"><Check size={15} aria-hidden="true" /> {t('rewards.my.redeemed', { points: t('rewards.my.pts', { count: done.points }), balance: t('rewards.my.pts', { count: done.balance }) })}</p>
            <p className="note">{t('rewards.my.continueOnSite', { brand })}</p>
            {doneUrl && (
              <a className="btn btn--lg rw-go" href={doneUrl} target="_blank" rel="noopener noreferrer external" aria-label={t('rewards.my.openSiteLabel', { brand })}>
                {t('rewards.my.openSite', { brand })} <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
            <p className="note rw-demo">{t('rewards.my.demo')}</p>
          </>
        ) : afford ? (
          <>
            <p className="rw-left">{t('rewards.my.balanceAfter', { have: t('rewards.my.pts', { count: have }), after: t('rewards.my.pts', { count: have - r.required_points }) })}</p>
            {!server ? (
              <p className="note" role="status">{t('rewards.my.notAvailable')}</p>
            ) : step === 'view' ? (
              <button type="button" className="btn btn--lg" onClick={() => setStep('confirm')}>{t('rewards.my.redeem', { points: t('rewards.my.pts', { count: r.required_points }) })}</button>
            ) : (
              <div className="rw-confirm">
                <p><b>{t('rewards.my.confirmQ')}</b></p>
                <p className="note">{t('rewards.my.confirmText', { points: t('rewards.my.pts', { count: r.required_points }), brand })}</p>
                <div className="row row--c">
                  <button type="button" className="btn" onClick={() => void confirm()} disabled={step === 'busy'} aria-busy={step === 'busy'}>{t(step === 'busy' ? 'rewards.my.redeeming' : 'rewards.my.confirm')}</button>
                  <button type="button" className="btn alt" onClick={() => setStep('view')} disabled={step === 'busy'}>{t('rewards.my.cancel')}</button>
                </div>
              </div>
            )}
            <p className="note rw-demo">{t('rewards.my.demo')}</p>
          </>
        ) : (
          <>
            <p className="rw-left">{t('rewards.my.left', { count: left })}</p>
            <div className="rw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.required_points} aria-valuenow={Math.min(have, r.required_points)} aria-label={t('rewards.my.progressLabel', { title })}>
              <i style={{ width: `${Math.min(100, (have / r.required_points) * 100)}%` }} />
            </div>
            <p className="note">{t('rewards.my.lockedText', { points: t('rewards.my.pts', { count: r.required_points }) })}</p>
          </>
        )}
        {err && <p className="hint auth-err" role="alert">{t(`rewards.my.err.${err}`)}</p>}
        {!done && last && lastUrl && (
          <p className="note">
            {t('rewards.my.lastRedeemed', { date: formatDate(new Date(last.redeemed_at), { day: 'numeric', month: 'short' }) })}{' '}
            <a href={lastUrl} target="_blank" rel="noopener noreferrer external">{t('rewards.my.reopen', { brand })} <ExternalLink size={13} aria-hidden="true" /></a>
          </p>
        )}
        <button type="button" className="btn-link" onClick={onClose}>{t('rewards.my.close')}</button>
      </div>
    </Dialog>
  );
}

function RewardCard({ r, unlocked, fresh, lifetime, en, i, onOpen }: { r: Reward; unlocked: boolean; fresh: boolean; lifetime: number; en: boolean; i: number; onOpen(): void }) {
  // `unlocked` is true when the spendable balance covers this reward; `lifetime` is that balance.
  const { t } = useTranslation();
  const brand = en ? r.brand_en : r.brand_ar;
  const title = en ? r.title_en : r.title_ar;
  const left = Math.max(0, r.required_points - lifetime);
  const pct = Math.min(100, (lifetime / r.required_points) * 100);
  return (
    <li className={`rw-card ${unlocked ? 'is-open' : 'is-locked'} ${fresh ? 'is-new' : ''}`} style={{ '--brand': r.accent_color, animationDelay: `${i * 70}ms` } as CSSProperties}>
      {fresh && (
        <>
          <span className="auth-spark auth-spark--a" aria-hidden="true"><Sparkles size={20} /></span>
          <span className="auth-spark auth-spark--b" aria-hidden="true"><Sparkles size={14} /></span>
        </>
      )}
      <div className={`rw-logo ${r.logo_background ? 'is-dark' : ''}`} style={r.logo_background ? { background: r.logo_background } : undefined}><BrandLogo r={r} name={brand} /></div>
      <h3 className="rw-title">{title}</h3>
      <p className="rw-pts">{t('rewards.my.pts', { count: r.required_points })}</p>
      {unlocked ? (
        <p className="rw-badge"><Check size={15} aria-hidden="true" /> {t('rewards.my.canRedeem')}</p>
      ) : (
        <>
          <p className="rw-left"><Lock size={13} aria-hidden="true" /> {t('rewards.my.left', { count: left })}</p>
          <div className="rw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.required_points} aria-valuenow={Math.min(lifetime, r.required_points)} aria-label={t('rewards.my.progressLabel', { title })}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      <button type="button" className={`btn ${unlocked ? '' : 'alt'} rw-cta`} onClick={onOpen}>
        {unlocked ? (en ? r.cta_en : r.cta_ar) : t('rewards.my.details')}
      </button>
    </li>
  );
}

function PointsHero({ summary }: { summary: PointsSummary }) {
  const { t } = useTranslation();
  const bal = useCountUp(spendable(summary), 900);
  const life = useCountUp(summary.lifetime, 900);
  const today = useCountUp(summary.today, 900);
  return (
    <section className="rw-hero">
      <div className="grow">
        <p className="rw-hero__t">{t('rewards.my.heroTitle')}</p>
        <p className="rw-hero__n" aria-live="polite">{t('rewards.my.balance', { count: bal })}</p>
        <div className="rw-stats">
          <div><b>{today}</b><span>{t('rewards.my.today')}</span></div>
          <div><b>{life}</b><span>{t('rewards.my.lifetime')}</span></div>
        </div>
      </div>
    </section>
  );
}

export function Rewards() {
  const { t, i18n } = useTranslation();
  const en = i18n.language === 'en';
  const s = useAppState();
  const store = useStore();
  const lvl = level(s);
  const list = achievements(s);
  const earned = list.filter((a) => a.earned).length;
  const mascot = useMascot('idle');
  const done = new Set(s.hist.filter((h) => h.status === 'COMPLETED').map((h) => h.id));
  const stickers = STICKERS.filter((id) => done.has(id)).length;
  const { data, error, load, patch } = useRewardsData();
  const [open, setOpen] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());


  // A reward unlocked since the last visit is celebrated once, then recorded so it doesn't repeat.
  useEffect(() => {
    if (!data) return;
    const ids = data.summary.unlocks.filter((u) => !u.celebrated).map((u) => u.reward_id);
    if (!ids.length) return;
    setFresh(new Set(ids));
    mascot.play('celebrating');
    void markCelebrated().catch(() => {});
  }, [data, mascot.play]);

  // Rewards are bought with the spendable balance, not with everything ever earned.
  const have = data ? spendable(data.summary) : 0;
  const server = !!data && canRedeemOnServer(data.summary);
  const lastOf = (id: string) => data?.summary.redemptions?.find((x) => x.reward_id === id) ?? null;
  const redeemed = (res: Redeemed) => patch((sm) => ({
    ...sm,
    balance: res.balance,
    redemptions: res.status === 'redeemed'
      ? [{ id: res.redemption_id, reward_id: res.reward_id, points: res.points, url: res.url, redeemed_at: res.redeemed_at }, ...(sm.redemptions ?? [])]
      : sm.redemptions,
  }));
  const newOne = data?.rewards.find((r) => fresh.has(r.id));
  const shown = data?.rewards.find((r) => r.id === open);

  return (
    <>
      <PageHeader title={t('rewards.my.title')} sub={t('rewards.my.sub')}>
        <Mascot state={mascot.state} size={72} label={t('common.brand')} interactive />
      </PageHeader>

      {error ? (
        <div className="panel center" role="alert">
          <p>{t('rewards.my.error')}</p>
          <button type="button" className="btn sm" onClick={() => void load()}>{t('rewards.my.retry')}</button>
        </div>
      ) : !data ? (
        <div className="panel center rw-loading" role="status"><p className="note">{t('rewards.my.loading')}</p></div>
      ) : (
        <>
          <PointsHero summary={data.summary} />
          {newOne && <p className="rw-toast" role="status"><Sparkles size={16} aria-hidden="true" /> {t('rewards.my.newUnlock', { title: en ? newOne.title_en : newOne.title_ar })}</p>}
          <ul className="rw-grid">
            {data.rewards.map((r, i) => (
              <RewardCard key={r.id} r={r} i={i} en={en} lifetime={have} unlocked={have >= r.required_points} fresh={fresh.has(r.id)} onOpen={() => setOpen(r.id)} />
            ))}
          </ul>
          <p className="note center rw-how">{t('rewards.my.howChallenge')} · {t('rewards.my.howMission')}</p>
        </>
      )}

      <h2 className="rw-more">{t('rewards.my.moreTitle')}</h2>
      <section className="panel">
        <div className="panel__h"><h2>{t('rewards.achievements')}</h2><span className="note">{t('rewards.ofTotal', { n: earned, total: list.length })}</span></div>
        <ul className="medals">
          {list.map((a) => (
            <li key={a.art} className={a.earned ? 'chip--earned' : ''}>
              <Medal art={a.art} earned={a.earned} />
              <b>{t(`rewards.items.${a.art}.label`)}</b>
              <span className="note">{a.earned ? t('rewards.earned') : t(`rewards.items.${a.art}.hint`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>{t('rewards.unlocks')}</h2>
        <div className="unlocks">
          {UNLOCKS.map((u) => {
            const isOpen = lvl >= u.level;
            const active = !!u.theme && s.theme === u.theme;
            return (
              <div key={u.id} className={`unlock ${isOpen ? 'is-open' : ''}`}>
                <span className={`unlock__art ${u.theme ? 'unlock__art--theme' : 'unlock__art--hat'}`} aria-hidden="true">{u.theme ? <Palette size={26} /> : <Crown size={26} />}</span>
                <div className="grow">
                  <b>{t(`rewards.unlockItems.${u.id}.name`)}</b>
                  <p className="note flush">{isOpen ? t(`rewards.unlockItems.${u.id}.open`) : t('rewards.unlocksAt', { n: u.level })}</p>
                </div>
                {isOpen && u.theme ? (
                  <button type="button" className="btn sm alt" aria-pressed={active} onClick={() => store.update((d) => { d.theme = d.theme ? '' : u.theme; })}>{t(active ? 'rewards.turnOff' : 'rewards.turnOn')}</button>
                ) : isOpen ? <Check size={18} aria-label={t('rewards.unlocked')} /> : <Lock size={18} aria-label={t('rewards.locked')} />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel__h"><h2>{t('rewards.collection')}</h2><span className="note">{t('rewards.ofTotal', { n: stickers, total: STICKERS.length })}</span></div>
        <p className="note">{t('rewards.collectionNote')}</p>
        <ul className="stickers">
          {STICKERS.map((id) => (
            <li key={id} className={done.has(id) ? 'is-on' : ''}>
              <div className="sticker__art"><ChallengeArt id={id} /></div>
              <span>{done.has(id) ? t(`challenges.items.${id}.name`) : t('rewards.notYet')}</span>
              <span className="sr-only">{done.has(id) ? '' : t(`challenges.items.${id}.name`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {shown && data && (
        <RewardDetails
          r={shown} en={en} have={have} server={server} last={lastOf(shown.id)}
          onClose={() => setOpen(null)} onRedeemed={redeemed} onBalance={(b) => patch((sm) => ({ ...sm, balance: b }))}
        />
      )}
    </>
  );
}
