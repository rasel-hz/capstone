# 07 · Implementation roadmap

This adapts the suggested order to what the code shows. Three changes from the generic plan:

1. **Fix the data-model bugs before the backend.** H-1 (undated context) and M-3 (day keys) would otherwise be copied into the database schema and the import.
2. **Auth comes with the backend foundation, not after it.** The chat endpoint is already live and can be used by any client (H-2), so nothing should be deployed without a user identity.
3. **The OpenAI companion already exists.** "Implement the AI companion" becomes "move the existing pipeline behind auth and persistence". Tools come after that.

Each stage leaves the app working and shippable as a demo.

---

## Stage 0 · Safety net (½–1 day)

| Task | Acceptance criteria |
|---|---|
| 0.1 Add a Playwright E2E suite to the repo (devDependency, `tests/e2e/`), based on the audit scripts: onboarding → chat (rules mode) → mission → refresh → progress | `npm run test:e2e` passes locally. The AI step is skipped unless `E2E_AI=1` |
| 0.2 Add an ESLint flat config with `react-hooks` | `npm run lint` runs. Existing `eslint-disable` comments resolve |
| 0.3 CI workflow: typecheck, unit tests, build, lint | A green check on a PR |

## Stage 1 · Stabilise the frontend (2–3 days) · depends on 0

| Task | Fixes | Acceptance criteria |
|---|---|---|
| 1.1 Dated context: `ctx` → `[{tag, day}]`. "Lighten today" becomes a per-day flag; Settings `pref` stays lasting. Migrate old data in `hydrate` | H-1 | Unit test: confirmed context and "lighter" don't apply the next day. Settings "short" still applies |
| 1.2 `localDay()` as `YYYY-MM-DD` in `Asia/Riyadh` (or the profile's time zone); migrate `hist.d`, `en.d`, `lastDaily.d`, `prayerDay` | M-3 | Old saves load. Day boundaries are tested at 23:59 / 00:01 Riyadh |
| 1.3 Schema version `v` + type-safe `hydrate` with per-field fallback; error screen offers Export and Reset | H-3 | Corrupt `hist` loads with an empty history instead of crashing. The E2E case passes |
| 1.4 `missions.start()` returns a result; the suggestion card updates only on success; Start is disabled in a prayer window | M-1 | Both reproductions in 04 no longer happen |
| 1.5 Replacing an open mission records its open item as ABANDONED | M-2 | `hist` has the record. Unit test added |
| 1.6 Persist the onboarding draft and step | M-6 | Refresh at step 3 resumes at step 3 |
| 1.7 Code-split pages and games | M-5 | The main chunk is under 400 kB, with no build warning |
| 1.8 Give each attempt a client UUID (`aid`), and give each mission a UUID | backend prep | Needed later for idempotent sync |

## Stage 2 · Contracts and backend foundation (3–4 days) · depends on 1

| Task | Acceptance criteria |
|---|---|
| 2.1 `packages/shared` (or `src/shared`): zod schemas + TS types for every request and response in 05 §5; move catalog, engine, recommend, stats and crisis code there so both sides import it | The frontend and server compile against one copy. Existing tests still pass |
| 2.2 API skeleton (Hono or Fastify) in `server/`, still mounted in Vite dev; structured logging without message text | `npm run dev` is still one command. `/v1/health` reports db and ai status |
| 2.3 Drizzle schema + migrations for 05 §4 (users through xp_transactions first); seed `challenge_definitions` and `achievements` from code | `npm run db:migrate` creates the schema on the Supabase DB. Partial unique indexes are present |
| 2.4 Auth: Supabase anonymous sign-in on the client, JWT verified on the server, `users` row on first call | Every `/v1/*` route except health requires a valid JWT |
| 2.5 Lock down chat: auth required, per-user rate and daily caps, CORS limited to app origins, security headers | H-2 closed. The curl reproduction from 04 returns 401 |
| 2.6 Rename the env var to `DATABASE_URL`; document it in `.env.example` | — |

## Stage 3 · Profiles, consent and import (2 days) · depends on 2

| Task | Acceptance criteria |
|---|---|
| 3.1 `GET/PATCH /v1/me`, `POST /v1/me/consents`; onboarding finish and Settings call them | Profile survives clearing the browser after sign-in is restored |
| 3.2 `POST /v1/me/import` from `kw2` (validated, idempotent) | Importing twice gives no duplicates. XP equals the sum of imported completed attempts |
| 3.3 `GET /v1/me/export`, `DELETE /v1/me` wired to Settings | Delete removes every row (cascade test) |

## Stage 4 · Missions, attempts and the XP ledger (3–4 days) · depends on 3

| Task | Acceptance criteria |
|---|---|
| 4.1 Mission endpoints + server engine (same pure functions) | One open mission at a time and one daily per day are enforced by the DB |
| 4.2 Attempt start/complete/skip/abandon with idempotency keys; XP inserted into `xp_transactions` in the same transaction | **Sending the same completion 5 times in parallel awards XP once** (integration test) |
| 4.3 Frontend write-through: engine actions call the API, merge authoritative XP and level, and queue offline | Playing offline then reconnecting syncs without duplicates |
| 4.4 Achievements computed on the server and stored on award | The same 6 achievements; awarded once each |

## Stage 5 · Progress and rewards on real records (1–2 days) · depends on 4

| Task | Acceptance criteria |
|---|---|
| 5.1 `GET /v1/progress/summary`, `GET /v1/rewards/wallet`; Progress and Rewards read them | Numbers match the local computation for imported data |

## Stage 6 · Companion on the server (2–3 days) · depends on 3 (parallel with 4–5)

| Task | Acceptance criteria |
|---|---|
| 6.1 `conversations` and `messages` persistence with retention; chat history loads from the server | Chat survives a device change. Crisis turns are flagged and excluded from prompts |
| 6.2 Context assembled on the server from the DB, so the client no longer sends `history` or `context` | The request body is `{conversationId, message, clientMessageId}` only |
| 6.3 `agent_runs` logging (tokens, latency, outcome); cost caps | A dashboard query shows per-user usage |
| 6.4 Keep every existing safety gate and all `tests/chat.test.ts` cases | Existing tests pass unchanged against the new handler |

## Stage 7 · Agent tools (4–5 days) · depends on 4, 5, 6

| Task | Acceptance criteria |
|---|---|
| 7.1 `ModelAdapter` + tool loop (max 4 rounds, 20 s budget) | Unit tests with a fake model cover the loop, timeouts and fallback |
| 7.2 Read tools: profile, preferences, context, history, results, progress, active mission, prayer schedule, rewards | "What did I score in memory?" answers from tool data (eval case) |
| 7.3 Proposal tools: `propose_context_update`, `generate_daily_mission`, `adapt_remaining_mission`, approved through the existing cards | No tool writes without a user click (test: run the agent, assert no rows change except `proposed`) |
| 7.4 Evidence check in the output gate | Replies citing numbers not in tool results are rejected or retried (eval case) |
| 7.5 Expand `npm run eval:ai` into a scored dataset; run it in CI when prompt or tool files change | ≥ 95% pass. 100% on crisis and diagnosis cases |

## Stage 8 · Memory and consent (2 days) · depends on 7

| Task | Acceptance criteria |
|---|---|
| 8.1 `user_memory` with the `memory` consent purpose; `remember_preference` proposal tool; a Settings page to view and delete memory | The user can see and delete every remembered item. Nothing is stored without approval |
| 8.2 Daily context expiry job (or query-time filter) | Yesterday's context is never in today's prompt |

## Stage 9 · Mission personalisation (2–3 days) · depends on 7

| Task | Acceptance criteria |
|---|---|
| 9.1 The daily planner uses `recommend()` across all 12 challenges, with goals from chat and check-ins, under fixed safety rules (prayer, driving, low energy, minutes) | M-4 closed. Each item has a reason code tied to a real input |
| 9.2 "Why this?" on each item shows its evidence (what you said, a result, a preference) | Every reason links to a record |

## Stage 10 · Saudi integrations (as approved, 1–2 days each)

Prayer: keep calculating on the device, and add a verified-provider check. Calendar (Google or Microsoft, read-only, least privilege). Weather (optional outdoor suggestions only). **Each needs its own consent, its own adapter, a "not connected" state and a tool that returns `unavailable`, not a guess.**

## Stage 11 · Rewards infrastructure (2–3 days, partners later)

`rewards`, `reward_redemptions` with atomic reserve and refund; in-app and user-defined rewards first. Partner tables only, with status `prospective`. **No partner offers are shown until a contract exists** (reference §14.3–14.4).

## Stage 12 · Integration and E2E QA (ongoing, 2 days of hardening)

Run the reference §19.1 demo script as E2E. Run an accessibility pass (axe) and an RTL visual check at 375, 768 and 1280 px. Test on the Android emulator and a real phone. Load-test chat with quotas.

## Stage 13 · Deployment (1–2 days)

API on a Node host (Render, Fly or Railway) with secrets set, the web app on static hosting or the same host, Supabase production project, backups, error monitoring, and the Android build pointing at the hosted `VITE_API_BASE`. **Go/no-go gates:** H-2 closed, clinical review of crisis text, and confirmed crisis numbers.

---

## Dependency graph

```
0 ─► 1 ─► 2 ─► 3 ─┬─► 4 ─► 5 ─┐
                  └─► 6 ──────┴─► 7 ─┬─► 8
                                     └─► 9 ─► 10 ─► 11 ─► 12 ─► 13
```

## First implementation task

**Stage 1.1: dated context and a per-day "lighter" flag.** It fixes the highest-impact verified bug (every later mission and AI reply is built on stale facts). It is small (`types`, `storage.hydrate`, `Companion.answerCard`, `planner`, `request.ts`, plus tests) and it settles the data shape the backend's `context_observations` will use. Stage 1.2 (ISO day keys) should land in the same branch, since both touch `hydrate` and day logic.
