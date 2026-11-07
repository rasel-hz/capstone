import type { AppState, Attempt, ChallengeId } from '../../types';

export function progressStats(s: AppState) {
  const H = s.hist.filter((h) => h.mid);
  const C = H.filter((h) => h.status === 'COMPLETED');
  const dayRow = (d: Date, label: string) => ({ label, full: d.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long' }), count: C.filter((h) => h.d === d.toDateString()).length });
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    return dayRow(d, d.toLocaleDateString('ar-SA', { weekday: 'short' }));
  });
  const month = [...Array(30)].map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5);
    return dayRow(d, (29 - i) % 7 === 0 ? d.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'numeric' }) : '');
  });
  const oldest = H.length ? Math.min(...H.map((h) => h.ts)) : Date.now();
  const scored = C.filter((h) => h.acc != null);
  const byChallenge = new Map<ChallengeId, Attempt[]>();
  C.forEach((h) => byChallenge.set(h.id, [...(byChallenge.get(h.id) || []), h]));
  return {
    attempts: H,
    completed: C,
    notFinished: H.filter((h) => h.status === 'ABANDONED' || h.status === 'SKIPPED').length,
    avgAccuracy: scored.length ? Math.round(scored.reduce((n, h) => n + (h.acc as number), 0) / scored.length) : null,
    days,
    maxDay: Math.max(1, ...days.map((d) => d.count)),
    month,
    maxMonth: Math.max(1, ...month.map((d) => d.count)),
    // The month view only appears once there is more than a week of history to show.
    hasMonth: Date.now() - oldest > 7 * 864e5,
    completionRate: H.length ? Math.round((C.length / H.length) * 100) : null,
    byChallenge: [...byChallenge.entries()],
    shortCount: C.filter((h) => h.dur <= 60).length,
  };
}
