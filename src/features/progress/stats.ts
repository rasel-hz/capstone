import type { AppState, Attempt, ChallengeId } from '../../types';

export function progressStats(s: AppState) {
  const H = s.hist.filter((h) => h.mid);
  const C = H.filter((h) => h.status === 'COMPLETED');
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    return { label: d.toLocaleDateString('ar-SA', { weekday: 'short' }), count: C.filter((h) => h.d === d.toDateString()).length };
  });
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
    byChallenge: [...byChallenge.entries()],
    shortCount: C.filter((h) => h.dur <= 60).length,
  };
}
