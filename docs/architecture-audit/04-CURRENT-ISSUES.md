# 04 · Current issues

Every issue below has evidence. **[Reproduced]** means it was triggered in a real Chromium session against the running dev server (script: `scratchpad/pw/bugs.mjs`, outside the repo). **[Code]** means it was confirmed by reading the cited lines but not run.

**No Critical issues were found for the current use: a local, single-device demo.** H-2 becomes Critical as soon as the server is reachable from the internet.

Type check, 157 unit tests and the production build all pass. The browser walkthrough produced **no console errors and no failed requests**.

---

## High

### H-1 · "Today" context and "lighter missions" never expire [Reproduced]

- **Where:** `src/pages/Companion/index.tsx:99-115` (`answerCard`), `src/services/storage.ts:hydrate`, `src/features/mission/planner.ts:isLowEnergy`, `src/features/companion/request.ts:140`
- **What is wrong:** confirmed context tags (`event`, `work`, `sleep`) are saved to `ctx` with no date, and nothing clears them. "Save and lighten" sets `pref = 'short'` permanently, and `isLowEnergy()` treats `pref === 'short'` as low energy every day.
- **Reproduce:** confirm "I have a gathering today", then open the app 3 days later (simulated with a fixed clock). Result: `ctx=["event"]`, `pref="short"`, and Home says *«خطوات بسيطة، على قد طاقتك اليوم ومع مناسبتك اللي سجلتها»* ("simple steps, sized to your energy today and around the event you recorded").
- **Impact:** every later daily mission is shortened and built around an old event. The AI receives these tags as `confirmed_today`, so it talks about a gathering that happened days ago. This contradicts the reference (§11.4 and `context_facts.valid_until`).
- **Fix:** store context as `{tag, day}` (or `valid_until`) and drop stale entries in `hydrate`. Make "lighten today" a per-day flag, separate from the lasting Settings preference. Add a unit test that crosses a day boundary.

### H-2 · The chat endpoint can be used by any non-browser client [Reproduced] (Critical before public deployment)

- **Where:** `server/api.ts:36-46` (`sameOrigin`, `isApp`)
- **What is wrong:** requests with **no** `Origin` header are allowed, and `Origin: http://localhost` is trusted as "the Android app". Browsers can't fake these, but curl or any script can. There is no authentication, and the only limit is 20 requests per minute per IP.
- **Reproduce:** `curl -X POST -H 'content-type: application/json' -d '{}' …/v1/chat/messages` returns `invalid_message`, which means it passed the gate. With `Origin: https://evil.example` it returns `forbidden`.
- **Impact:** if deployed, anyone can spend the OpenAI key (cost and abuse risk).
- **Fix:** before deploying anywhere, require an authenticated session or token, set per-user quotas, rate-limit by user, and set a spending cap on the key. This is step 2 of the roadmap.

### H-3 · Malformed saved data locks the user on the error screen [Reproduced]

- **Where:** `src/services/storage.ts:hydrate` (`Object.assign(defaultState(), saved)` with no shape checks), `src/components/ui/ErrorBoundary.tsx`
- **What is wrong:** if `kw2` parses as JSON but has a wrong type (for example `hist: "x"` after a bad import, a manual edit, an older build or a partial write), the app crashes on render. The error screen's only button reloads, which loads the same data and crashes again.
- **Reproduce:** set `kw2` to a valid state with `"hist":"corrupted"` → error screen → Reload → error screen again.
- **Impact:** the user is stuck. The only way out is browser devtools. With the backend this becomes a sync-corruption risk too.
- **Fix:** validate types in `hydrate` (arrays are arrays, numbers are numbers, the mission shape is valid) and fall back per field. On the error screen, offer "export my data" and "reset the app". Add a schema version field (`v`) for migrations.

---

## Medium

### M-1 · A chat suggestion card says "started" when nothing started [Reproduced]

- **Where:** `src/features/companion/SuggestionCard.tsx:259, 272`
- **What is wrong:** the card is marked `st: 'started'` **before** `missions.start()` runs. The start can then be blocked by a prayer window, or by the "you have an unfinished mission" dialog.
- **Reproduce:** (a) with a paused mission, press Start on a card → conflict dialog → "finish the old one". The card now reads "started" but the old mission resumes. (b) Riyadh at 12:00, just after Dhuhr: Start → prayer blocker, the card reads "started", and no mission is created.
- **Impact:** the suggestion is lost (an old card can't be reused) and the chat log is misleading.
- **Fix:** have `start()` return whether it started (or accept an `onStarted` callback) and update the card only then. Also disable Start while `inPrayerWindow`, as the Home screen already does.

### M-2 · "Start new" over an open mission loses the interrupted attempt [Reproduced]

- **Where:** `src/features/mission/MissionProvider.tsx:390` → `begin()` → `createMission()` overwrites `s.mission`
- **What is wrong:** the paused or in-progress item of the old mission is never written to `hist` as ABANDONED.
- **Reproduce:** start a mission and exit during item 2, then start a chat suggestion → "start new". `hist` has 0 records for the interrupted item.
- **Impact:** completion rate and "not finished" counts are overstated in Progress, and the AI context is inaccurate. On the backend the attempt would be orphaned.
- **Fix:** in `createMission`, abandon open items of an unfinished previous mission (record them and mark the old mission DONE) before replacing it.

### M-3 · Dates are device-local strings, while prayer uses Saudi time [Code]

- **Where:** `src/utils/index.ts:3` (`today = new Date().toDateString()`), used for `hist[].d`, `en[].d`, `lastDaily.d`, `prayerDay`. `prayer/times.ts` uses `Asia/Riyadh`.
- **What is wrong:** day keys follow the device time zone and an English, locale-free string ("Sat Nov 07 2026"). They aren't ISO and aren't Saudi time.
- **Impact:** for a user travelling or with a misset time zone, "today" differs between the mission and the prayer windows. Migrating to a backend needs a conversion step.
- **Fix:** use a `localDay()` helper returning `YYYY-MM-DD` in the user's chosen time zone (default `Asia/Riyadh`), with a one-time migration of existing strings. Store UTC timestamps on the server.

### M-4 · The daily planner ignores half the catalog and the AI's goals [Code]

- **Where:** `src/features/mission/planner.ts:256`
- **What is wrong:** a fixed 3-slot template that can only use `video`, `mem`, `seq`, `calm`, `start2` and `time`. The goals detected in chat feed only suggestion cards, not the daily mission. `sleep` and `pat` from onboarding are never used.
- **Impact:** missions feel repetitive, and personalisation is mostly cosmetic (reason text).
- **Fix:** build the daily mission with `recommend()` (which already covers all 12 with explainable reasons), with fixed safety rules on top. This is the planned "mission personalisation" step.

### M-5 · One 739 kB JavaScript bundle [Verified in the build output]

- **Where:** `vite build` reports `index-*.js` 738.83 kB (232 kB gzip) with a size warning.
- **Impact:** slower first load on mobile data and in the Android WebView.
- **Fix:** lazy-load pages and games with `React.lazy`, and split `motion`/`adhan`. Low effort.

### M-6 · Onboarding answers are lost on refresh [Code]

- **Where:** `src/pages/Onboarding/index.tsx:258`. The draft lives only in component state.
- **Impact:** a refresh or an Android process kill during onboarding restarts it from step 1.
- **Fix:** keep the draft in the store (or in `sessionStorage`) and save the step index.

---

## Low

| ID | Issue | Evidence | Fix |
|---|---|---|---|
| L-1 | `chat`, `hist`, `en` are never trimmed. 3,000 messages = 58 KB, so the 5 MB quota is far off, but growth has no limit | [Reproduced] | Cap chat at about 200 lines locally; the server becomes the archive |
| L-2 | `attention_scene`: miss highlight carries into scene 2, and taps during the 1.1 s transition count as misses | [Code] `AttentionSceneGame.tsx:337-375` | Reset `miss` in the scene effect, and ignore taps once all are found |
| L-3 | The rate limiter's `hits` map is never pruned, so memory grows with distinct IPs | [Code] `server/api.ts:49` | Delete keys whose window is empty, or use a shared store |
| L-4 | The production server sends no security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) | [Code] `server/index.ts` | Add headers, or put it behind a platform that adds them |
| L-5 | `calm_landscape` ripple timeouts are not cleared on unmount | [Code] `CalmLandscapeGame.tsx:383` | Track and clear them |
| L-6 | `.env` key `DataBase_URL` uses non-standard casing and is unused | [Verified] | Rename to `DATABASE_URL` when wiring the backend |
| L-7 | No URL routing, so browser Back/Forward and deep links don't work on the web | [Code] `App.tsx`, `AppShell.tsx` | Optional: hash routing that maps to `view` |
| L-8 | No ESLint config, although the code has `eslint-disable` comments | [Verified] | Add a flat config with `react-hooks` |
| L-9 | Building Android from inside OneDrive breaks (already noted in `PROJECT_STATUS.md`) | docs | Move the repo to a plain folder |

---

## Checked and **not** a problem

- **XSS:** `dangerouslySetInnerHTML` appears twice (`Mascot.tsx:49`, `MemoryGame.tsx:34`), both with constant SVG strings. User text is always rendered as React text, and i18n `escapeValue: false` is safe for that reason.
- **Secret exposure:** the key is read only on the server, with no `VITE_` prefix. The built bundle contains no key material. `.env` is gitignored and untracked.
- **Duplicate XP:** guarded in `completeItem`. Verified across exit + reload + resume.
- **Timers after skip/exit:** `useTimers` cancels on unmount and pauses with the game.
- **Refresh during a mission:** `settle()` never replays a finished item. Verified.
- **Mobile layout:** no horizontal overflow at 375 px on Home, Chat or Progress. RTL is correct.
- **Crisis path:** handled on the device without a network call. Verified with «ابي اموت».
- **Dependencies:** `npm audit` reports 0 vulnerabilities.
