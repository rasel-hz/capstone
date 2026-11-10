import { ArrowRight, ChevronLeft, Heart, Moon, Sparkles, Sun, Sunset, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { dhikrNow, DHIKR_IDS, type DhikrId } from '../../features/dhikr/content';
import { useMissions } from '../../features/mission/MissionProvider';
import type { ViewId } from '../../types';

const ICON: Record<DhikrId, LucideIcon> = { dhikr_morning: Sun, dhikr_evening: Sunset, dhikr_calm_heart: Heart, dhikr_moment: Sparkles, dhikr_sleep: Moon };

/** The dhikr that fits the time now: morning, evening or before sleep when their time has come, otherwise a moment of dhikr. */
export function dhikrForNow(now = new Date()): DhikrId {
  const fit = dhikrNow(now);
  return (['dhikr_morning', 'dhikr_evening', 'dhikr_sleep'] as DhikrId[]).find((id) => fit.includes(id)) ?? 'dhikr_moment';
}

/**
 * "My dhikr": its own quiet place, not a challenge. No points, scores, "new" badges or counts of how often.
 * The one that fits the time comes first; tapping any opens it straight away.
 */
export function DhikrPage({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const missions = useMissions();
  const now = dhikrForNow();
  const open = (id: DhikrId) => missions.start([{ id, why: [{ k: 'self' }], diff: 'normal' }], { direct: true });
  const NowIc = ICON[now];
  return (
    <div className="dp">
      <button type="button" className="btn-link back" onClick={() => onNavigate('path')}><ArrowRight size={17} className="flip" aria-hidden="true" /> {t('nav.myJourney')}</button>
      <header className="dp__head">
        <Mascot state="calm" size={96} label={t('common.brand')} />
        <div>
          <h1>{t('dhikrPage.title')}</h1>
          <p>{t('dhikrPage.lead')}</p>
        </div>
      </header>

      <button type="button" className="dp__now" onClick={() => open(now)}>
        <span className="dp__now-ic" aria-hidden="true"><NowIc size={30} strokeWidth={1.8} /></span>
        <span className="dp__now-t">
          <small>{t('dhikrPage.now')}</small>
          <b>{t(`challenges.items.${now}.name`)}</b>
        </span>
        <ChevronLeft size={20} className="dp__chev" aria-hidden="true" />
      </button>

      <ul className="dp__list" aria-label={t('dhikrPage.all')}>
        {DHIKR_IDS.filter((id) => id !== now).map((id) => {
          const Ic = ICON[id];
          return (
            <li key={id}>
              <button type="button" onClick={() => open(id)}>
                <span className="dp__ic" aria-hidden="true"><Ic size={22} strokeWidth={1.8} /></span>
                <span className="dp__t"><b>{t(`challenges.items.${id}.name`)}</b><small>{t(`challenges.items.${id}.desc`)}</small></span>
                <ChevronLeft size={18} className="dp__chev" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
