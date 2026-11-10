import { useEffect, useState } from 'react';
import { fetchSummary, onPointsChanged } from '../services/points';

/** All points ever earned, from Supabase, so every device shows the same number. Spending doesn't lower it. Null until it loads or without a session. */
export function usePointsTotal(): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetchSummary().then((s) => { if (live) setN(s.lifetime); }, () => {});
    void load();
    const off = onPointsChanged(() => void load());
    return () => { live = false; off(); };
  }, []);
  return n;
}
