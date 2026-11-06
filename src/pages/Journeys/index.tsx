import { useAppState, useStore } from '../../context/AppStateContext';
import { CHALLENGES, JOURNEYS } from '../../features/challenges/catalog';
import { JourneyScene } from '../../features/challenges/JourneyScene';
import { useMissions } from '../../features/mission/MissionProvider';
import type { JourneyId } from '../../types';

export function Journeys() {
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();

  function toggle(id: JourneyId) {
    store.update((d) => {
      d.needs = d.needs.includes(id) ? d.needs.filter((x) => x !== id) : [...d.needs, id];
      if (!d.needs.length) d.needs = ['gen'];
    });
  }

  return (
    <>
      <h1>رحلاتي</h1>
      <p className="note">اختر أكثر من رحلة. ما نطلب تشخيص. هذي رحلات دعم وتدريب، مو علاج.</p>
      <div className="grid">
        {JOURNEYS.map((j) => {
          const on = s.needs.includes(j.id);
          return (
            <div key={j.id} className="card jc lift">
              <JourneyScene id={j.id} />
              <div className="b">
                <h2 className="flush">{j.n}</h2>
                <p className="note jc-note">{j.d}</p>
                <div className="map">
                  {j.a.map((a, i) => (
                    <button
                      key={a}
                      type="button"
                      title={CHALLENGES[a].t}
                      aria-label={CHALLENGES[a].t}
                      className={`node ${s.hist.some((h) => h.id === a && h.status === 'COMPLETED') ? 'd' : ''}`}
                      onClick={() => missions.start([{ id: a, why: 'من رحلة ' + j.n, diff: 'normal' }])}
                    >{i + 1}</button>
                  ))}
                </div>
                <button type="button" className={`btn sm ${on ? '' : 'alt'}`} aria-pressed={on} onClick={() => toggle(j.id)}>{on ? 'رحلة نشطة ✓' : 'أضفها'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
