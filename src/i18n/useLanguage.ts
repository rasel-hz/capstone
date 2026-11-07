import { useCallback } from 'react';
import { useAppSelector, useStore } from '../context/AppStateContext';
import { setLanguage, type Lang } from '.';

export function useLanguage() {
  const store = useStore();
  const lang = useAppSelector((s) => s.lang) as Lang;
  const change = useCallback((l: Lang) => {
    if (store.getState().lang === l) return;
    // Only the preference changes, so missions, XP and timers aren't touched.
    store.update((d) => { d.lang = l; });
    setLanguage(l);
  }, [store]);
  return { lang, change, toggle: () => change(lang === 'en' ? 'ar-SA' : 'en') };
}
