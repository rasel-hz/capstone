import type { Store } from '../../context/AppStateContext';
import { defaultState, hydrate } from '../../services/storage';
import type { AppState } from '../../types';
import { settle } from '../mission/engine';
import type { Profile } from '../../services/auth';

// Progress, chat and settings still live on the device (see docs/architecture-audit/05). Each account's copy
// is kept under its own key, so signing out never deletes progress, and a second account on the same device
// never sees the first one's data. The working copy stays under "kw2", so nothing else in the app changes.
const userKey = (uid: string) => `kw2:u:${uid}`;
// Data made before accounts existed, set aside when someone signs in to a different account. Never deleted.
const UNCLAIMED = 'kw2:unclaimed';

function read(key: string): Partial<AppState> | null {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Storage full or blocked. The working copy is unaffected.
  }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove.
  }
}

function replace(store: Store, next: AppState) {
  store.update((d) => {
    for (const k of Object.keys(d)) delete (d as unknown as Record<string, unknown>)[k];
    Object.assign(d, next);
    settle(d);
  });
}

const hasProgress = (s: AppState) => !!s.done || s.hist.length > 0;

/** Signed out, or the session expired: put this account's data away and show a fresh start. */
export function stashAndReset(store: Store) {
  const s = store.getState();
  if (s.uid) write(userKey(s.uid), s);
  replace(store, { ...defaultState(), lang: s.lang });
}

/**
 * Makes the working copy belong to this account. Returns true when the account's own data was restored.
 * `fresh` marks an interactive sign-in, which always opens on Home.
 */
export function loadForUser(store: Store, profile: Profile, fresh: boolean) {
  const s = store.getState();
  let next: AppState;
  if (s.uid === profile.id) {
    next = structuredClone(s);
  } else {
    if (s.uid) write(userKey(s.uid), s);
    else if (hasProgress(s)) write(UNCLAIMED, s);
    const saved = read(userKey(profile.id));
    next = hydrate(saved ?? { needs: ['gen'] });
    // Keep the language on screen, so the interface doesn't switch during sign-in.
    next.lang = s.lang;
    if (saved) remove(userKey(profile.id));
  }
  next.uid = profile.id;
  next.started = 1;
  next.name = profile.firstName;
  next.g = profile.addressForm;
  // Onboarding finished on any device counts as finished here.
  if (profile.onboardingDone) next.done = 1;
  if (fresh || profile.onboardingDone) next.view = 'home';
  replace(store, next);
}

/** The account was just created: the onboarding answers on this device become the account's. */
export function claimForUser(store: Store, uid: string) {
  store.update((d) => {
    d.uid = uid;
  });
}
