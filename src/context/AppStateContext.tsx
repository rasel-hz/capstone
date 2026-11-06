import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { hydrate, localRepository, type StateRepository } from '../services/storage';
import { settle } from '../features/mission/engine';
import type { AppState } from '../types';

export interface Store {
  getState(): AppState;
  subscribe(fn: () => void): () => void;
  update(fn: (draft: AppState) => void): void;
  reset(): void;
}

export function createStore(repo: StateRepository): Store {
  let state = hydrate(repo.load());
  settle(state);
  repo.save(state);
  const subs = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    update(fn) {
      const next = structuredClone(state);
      fn(next);
      state = next;
      repo.save(state);
      subs.forEach((s) => s());
    },
    reset() {
      repo.clear();
    },
  };
}

const Ctx = createContext<Store | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createStore(localRepository), []);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore needs AppStateProvider');
  return s;
}

export function useAppState(): AppState {
  const s = useStore();
  return useSyncExternalStore(s.subscribe, s.getState);
}

// For values that return a primitive, so a component only re-renders when that value changes.
export function useAppSelector<T extends string | number | boolean | null>(pick: (s: AppState) => T): T {
  const s = useStore();
  return useSyncExternalStore(s.subscribe, () => pick(s.getState()));
}
