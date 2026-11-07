# 08 · Testing report

Run on 2026-11-07, Windows 11, Node 24.15.0, npm 11.12.1, branch `main` at `1558513`. No project source files were changed. The browser scripts ran from a temporary folder outside the repository.

## Environment and startup

| Check | Result |
|---|---|
| Dependencies | `node_modules` was missing. `npm ci` installed 155 packages, **0 vulnerabilities** |
| Port 8765 | Free before start (`netstat`) |
| `npm run dev` | Vite 8.3.6 ready in 834 ms at **http://localhost:8765** |
| `GET /` | 200, RTL Arabic shell |
| `GET /v1/health` | `{"ai":true}`: the key is configured on the server |

## Static checks

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | **Pass**, no errors |
| Unit tests | `npx vitest run` | **Pass**: 9 files, **157/157** tests, 4 s |
| Production build | `npx vite build` (to a temporary folder) | **Pass**. Warning: one JS chunk of 738.83 kB (232 kB gzip) |
| Key leakage | grep of the built JS for `sk-…` / `OPENAI_API_KEY` | **None found** |
| `.env` tracked by git? | `git ls-files .env` | No |

## Browser walkthrough (Playwright 1.49 + Chromium, headless)

Fresh profile, Arabic interface, non-sensitive test data (name "Test").

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Landing renders | PASS | `title="خويّك \| Khowayk"`, `dir=rtl` |
| 2 | CTA opens onboarding | PASS | |
| 3 | Complete onboarding | PASS | Saved `needs=["gen"]`, `city=riyadh`, `g=m` |
| 4 | Energy check-in | PASS | `en[-1].e = mid` |
| 5 | Open companion; consent prompt | PASS | Consent card shown because the server has a key. Accepted |
| 6 | Status label | PASS | «ردود من نموذج ذكاء اصطناعي (OpenAI)، وممكن يغلط» ("Replies from an AI model (OpenAI), which can make mistakes") |
| 7 | Send a planning message (real OpenAI call) | PASS | Reply in Saudi Arabic in **4.5 s**, practical advice + suggestion card (`priority_board`, `breakdown`, `seq`) with a grounded reason |
| 8 | No fallback banner | PASS | |
| 9 | Crisis wording «ابي اموت» | PASS | Reviewed support text with 997/937, answered **on the device** (no network call) |
| 10 | Context extraction «سهرت امس وعندي دوام اليوم» ("I stayed up late last night and I have work today") | PASS | Context card shown. "Save only" stored `ctx=["work","sleep"]` |
| 11 | Start the daily mission | PASS | Items `video:normal, mem:normal, time:normal` |
| 12 | Play `video` (24 s clip + 3 questions) | PASS | acc 100, +30 XP, 1 history row |
| 13 | Exit mid-mission | PASS | Mission PAUSED at idx 1 |
| 14 | **Refresh**, then check XP and resume | PASS | XP still 30. "Continue" shown |
| 15 | Resume and play `mem` | PASS | acc 100, +25 XP, total 55 |
| 16 | Skip the last item → summary | PASS | Mission DONE. **XP 55 = sum of attempt rows** (no duplicate) |
| 17 | Progress page | PASS | "2 of 3 attempts completed / Level 1, 55 points / 67% / 100% accuracy", all from real data |
| 18 | Rewards page | PASS | 6 achievements rendered |
| 19 | **Refresh** keeps XP, history and chat | PASS | xp 55, hist 3, chat 10 |
| 20–22 | Mobile 375 × 780: Home, Chat, Progress | PASS | 0 px horizontal overflow. Bottom nav with the raised buddy |
| — | Browser console | **No errors or warnings** | |
| — | Network | **No failed or 4xx/5xx requests** | |

Screenshots were reviewed for landing (desktop), chat with the AI reply and suggestion card, and mobile Home. They render correctly in RTL.

## Targeted reproductions (rule mode; no OpenAI calls)

| ID | Scenario | Result |
|---|---|---|
| H-1 | Saved `ctx=['event']` + `pref='short'`, app opened 3 days later (fixed clock) | **Reproduced**: still applied. Home text refers to "your event" and "your energy today" |
| M-1a | Suggestion card Start while a mission is paused → "finish the old one" | **Reproduced**: card says started, the old mission resumes |
| M-1b | Suggestion card Start at 12:00 Riyadh (inside the Dhuhr window) | **Reproduced**: prayer blocker shown, card says started, no mission |
| M-2 | "Start new" over a paused mission | **Reproduced**: 0 history rows for the interrupted item |
| H-3 | `kw2.hist = "corrupted"` | **Reproduced**: error screen before and after Reload |
| L-1 | 3,000 chat messages | **Reproduced**: not trimmed (58 KB) |
| H-2 | `curl` POST `/v1/chat/messages` with no Origin / spoofed `http://localhost` / foreign Origin (empty body, so no OpenAI call) | **Reproduced**: the first two pass the gate (`invalid_message`), the foreign one gets `forbidden` |

## Not tested, and why

| Item | Blocker |
|---|---|
| Games other than `video` and `mem` in the browser | Time. `time` was skipped and the others were reviewed in code only. Their logic is summarised in 03 |
| Android build and emulator | No Android SDK or emulator on this machine. Also, the repo sits in OneDrive, which `PROJECT_STATUS.md` says breaks Gradle |
| `npm run eval:ai` | It runs many live OpenAI calls (cost). It was left for the team to run deliberately |
| Screen-reader behaviour | Only automated ARIA and role checks were used through Playwright locators. No manual screen-reader session |
| Language switch mid-game | Covered by `tests/i18n.test.ts`, not repeated in the browser |
| Production server (`npm start`) | The build was verified. The server itself wasn't started, to keep port 8765 for the running dev server |

## The running app

The dev server is still running in the background on **http://localhost:8765**. The audit added a test profile named "Test" to *Playwright's* temporary browser profiles only. Your own browser's saved data is untouched.
