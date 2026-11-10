import { Check, ExternalLink, Lock, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, PageHeader } from '../../components/ui/kit';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { PokeBubble, usePoke } from '../../components/mascot/usePoke';
import { useCountUp } from '../../hooks/useCountUp';
import { useBackHandler } from '../../services/native';
import { balanceOf, fetchRewards, fetchSummary, markCelebrated, onPointsChanged, PointsError, redeemReward, safeUrl, type PointsSummary, type Reward } from '../../services/points';

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
  return { data, error, load };
}

// Using a reward spends its points, like paying with them. A second tap confirms, so nothing is spent by accident.
function RewardDetails({ r, canUse, balance, en, onClose }: { r: Reward; canUse: boolean; balance: number; en: boolean; onClose(): void }) {
  const { t } = useTranslation();
  const mascot = useMascot(canUse ? 'happy' : 'curious');
  const [step, setStep] = useState<'view' | 'confirm' | 'busy' | 'done'>('view');
  const [err, setErr] = useState<'notEnough' | 'failed' | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  useBackHandler(onClose);
  const brand = en ? r.brand_en : r.brand_ar;
  const title = en ? r.title_en : r.title_ar;
  const url = safeUrl(r.website_url);
  const left = Math.max(0, r.required_points - balance);
  const cost = t('rewards.my.pts', { count: r.required_points });

  async function use() {
    setStep('busy');
    setErr(null);
    try {
      const s = await redeemReward(r.id);
      setAfter(balanceOf(s));
      setStep('done');
      mascot.play('celebrating');
    } catch (e) {
      setErr(e instanceof PointsError && e.message === 'notEnough' ? 'notEnough' : 'failed');
      setStep('view');
    }
  }

  return (
    <Dialog label={title}>
      <div className="rw-dlg" style={{ '--brand': r.accent_color } as CSSProperties}>
        {step === 'done' && (
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
        <p className="rw-pts">{cost}</p>
        {step === 'done' ? (
          <>
            <p className="rw-badge" role="status"><Check size={15} aria-hidden="true" /> {t('rewards.my.usedTitle')}</p>
            <p>{t('rewards.my.usedText', { points: cost, balance: t('rewards.my.pts', { count: after ?? 0 }) })}</p>
            <p className="note rw-demo">{t('rewards.my.demo')}</p>
            {url && (
              <a className="btn btn--lg rw-go" href={url} target="_blank" rel="noopener noreferrer external" aria-label={t('rewards.my.openSiteLabel', { brand })}>
                {t('rewards.my.openSite', { brand })} <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
          </>
        ) : canUse ? (
          <>
            <p className="rw-badge"><Check size={15} aria-hidden="true" /> {t('rewards.my.unlocked')}</p>
            {step === 'view' ? (
              <button type="button" className="btn btn--lg rw-go" onClick={() => setStep('confirm')}>{t('rewards.my.use')}</button>
            ) : (
              <div className="rw-confirm" role="group" aria-label={t('rewards.my.use')}>
                <p>{t('rewards.my.confirmQ', { points: cost })}</p>
                <div className="row row--c">
                  <button type="button" className="btn" disabled={step === 'busy'} onClick={() => void use()}>{t('rewards.my.confirmYes')}</button>
                  <button type="button" className="btn alt" disabled={step === 'busy'} onClick={() => setStep('view')}>{t('rewards.my.confirmNo')}</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="rw-left">{t('rewards.my.left', { count: left })}</p>
            <div className="rw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.required_points} aria-valuenow={Math.min(balance, r.required_points)} aria-label={t('rewards.my.progressLabel', { title })}>
              <i style={{ width: `${Math.min(100, (balance / r.required_points) * 100)}%` }} />
            </div>
          </>
        )}
        {err && <p className="hint" role="alert">{t(`rewards.my.${err}`)}</p>}
        <button type="button" className="btn-link" onClick={onClose}>{t('rewards.my.close')}</button>
      </div>
    </Dialog>
  );
}

function RewardCard({ r, canUse, fresh, balance, en, i, onOpen }: { r: Reward; canUse: boolean; fresh: boolean; balance: number; en: boolean; i: number; onOpen(): void }) {
  const { t } = useTranslation();
  const brand = en ? r.brand_en : r.brand_ar;
  const title = en ? r.title_en : r.title_ar;
  const left = Math.max(0, r.required_points - balance);
  const pct = Math.min(100, (balance / r.required_points) * 100);
  return (
    <li className={`rw-card ${canUse ? 'is-open' : 'is-locked'} ${fresh ? 'is-new' : ''}`} style={{ '--brand': r.accent_color, animationDelay: `${i * 70}ms` } as CSSProperties}>
      {fresh && (
        <>
          <span className="auth-spark auth-spark--a" aria-hidden="true"><Sparkles size={20} /></span>
          <span className="auth-spark auth-spark--b" aria-hidden="true"><Sparkles size={14} /></span>
        </>
      )}
      <div className={`rw-logo ${r.logo_background ? 'is-dark' : ''}`} style={r.logo_background ? { background: r.logo_background } : undefined}><BrandLogo r={r} name={brand} /></div>
      <h3 className="rw-title">{title}</h3>
      <p className="rw-pts">{t('rewards.my.pts', { count: r.required_points })}</p>
      {canUse ? (
        <p className="rw-badge"><Check size={15} aria-hidden="true" /> {t('rewards.my.unlocked')}</p>
      ) : (
        <>
          <p className="rw-left"><Lock size={13} aria-hidden="true" /> {t('rewards.my.left', { count: left })}</p>
          <div className="rw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={r.required_points} aria-valuenow={Math.min(balance, r.required_points)} aria-label={t('rewards.my.progressLabel', { title })}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      <button type="button" className={`btn ${canUse ? '' : 'alt'} rw-cta`} onClick={onOpen}>
        {canUse ? t('rewards.my.use') : t('rewards.my.details')}
      </button>
    </li>
  );
}

function PointsHero({ summary }: { summary: PointsSummary }) {
  const { t } = useTranslation();
  const life = useCountUp(summary.lifetime, 900);
  const today = useCountUp(summary.today, 900);
  const bal = useCountUp(balanceOf(summary), 900);
  return (
    <section className="rw-hero">
      <div className="grow">
        <p className="rw-hero__t">{t('rewards.my.balance')}</p>
        <p className="rw-hero__n" aria-live="polite">{t('rewards.my.pts', { count: bal })}</p>
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
  const mascot = useMascot('idle');
  const { poke, line: pokeLine } = usePoke(mascot, 'rewards');
  const { data, error, load } = useRewardsData();
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

  const balance = data ? balanceOf(data.summary) : 0;
  const titleOf = (id: string) => { const r = data?.rewards.find((x) => x.id === id); return r ? (en ? r.title_en : r.title_ar) : id; };
  const urlOf = (id: string) => { const r = data?.rewards.find((x) => x.id === id); return r ? safeUrl(r.website_url) : null; };
  const newOne = data?.rewards.find((r) => fresh.has(r.id));
  const shown = data?.rewards.find((r) => r.id === open);

  return (
    <>
      <PageHeader title={t('rewards.my.title')} sub={t('rewards.my.sub')}>
        <span className="poke-wrap">
          <Mascot state={mascot.state} size={72} label={t('common.brand')} interactive onClick={poke} />
          <PokeBubble line={pokeLine} />
        </span>
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
              <RewardCard key={r.id} r={r} i={i} en={en} balance={balance} canUse={balance >= r.required_points} fresh={fresh.has(r.id)} onOpen={() => setOpen(r.id)} />
            ))}
          </ul>
          <p className="note center rw-how">{t('rewards.my.howChallenge')} · {t('rewards.my.howMission')}</p>
          {!!data.summary.redemptions?.length && (
            <section className="panel rw-used">
              <h2>{t('rewards.my.historyTitle')}</h2>
              <ul>
                {data.summary.redemptions.map((u) => (
                  <li key={u.at}>
                    <span>{titleOf(u.reward_id)}</span>
                    <span className="note">-{t('rewards.my.pts', { count: u.points })}</span>
                    {/* Reopening a used reward's site never spends points again. */}
                    {urlOf(u.reward_id) && <a className="rw-used__go" href={urlOf(u.reward_id)!} target="_blank" rel="noopener noreferrer external">{t('rewards.my.reopen')} <ExternalLink size={13} aria-hidden="true" /></a>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {shown && data && <RewardDetails key={shown.id} r={shown} en={en} balance={balance} canUse={balance >= shown.required_points} onClose={() => setOpen(null)} />}
    </>
  );
}
