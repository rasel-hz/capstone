# 05 · Backend integration

Goal: move from "one JSON document in localStorage" to server-owned records, **without rewriting the frontend**. This builds on the reference (§15–17) and adjusts it to what the code actually has.

## 1. What the frontend already gives us

| Asset | Where | Reuse |
|---|---|---|
| Repository seam | `StateRepository` in `src/services/storage.ts` | Keep it for local cache and offline use. Add domain calls next to it rather than syncing the whole document |
| Service seam for chat | `CompanionService` in `src/services/companion.ts` | Keep the interface. Point `aiCompanion` at the new agent endpoint |
| Pure domain logic in TypeScript | `mission/engine.ts`, `recommend/*`, `challenges/catalog.ts`, `companion/crisis.ts`, `progress/stats.ts`, `rewards/achievements.ts` | **Run the same code on the server.** `server/chat.ts` already imports from `src/`, so the setup works |
| API conventions | `/v1/…`, JSON errors `{error: code}`, origin checks, body cap, rate limit | Extend them |
| Request sanitising pattern | `parseRequest` in `server/chat.ts` | Use the same "whitelist, clamp, catalog-only" approach for every endpoint (with zod) |
| Provisioned database | `.env` `DataBase_URL` → Supabase Postgres (unused today) | Primary datastore |

Gaps: no auth, no user ID, no record IDs on attempts, no idempotency keys, no server time, no schema version, and string day keys (`toDateString`).

## 2. Recommended architecture

```
React app (unchanged screens)
  ├─ store (kept) ── local cache + optimistic UI
  └─ api client (new, src/services/api.ts) ── typed calls, auth header, retry with idempotency keys
            │ HTTPS + JWT
            ▼
Node API: TypeScript, Hono or Fastify, in server/ (grows out of today's server)
  ├─ auth middleware (verify Supabase JWT) ── user_id on every request
  ├─ routes: me, consents, checkins, context, missions, attempts, progress, rewards, chat
  ├─ domain/: shared pure modules (moved to packages/shared or imported from src/features)
  ├─ agent/: orchestrator, tools, policies, prompts (see 06)
  └─ db/: Drizzle ORM schema + SQL migrations
            │
            ▼
Supabase Postgres (+ Supabase Auth with anonymous sign-in → link email/phone later)
OpenAI (Responses API + Moderations) — server only
```

Why this shape:

- **TypeScript end to end.** Mission rules, the catalog, crisis detection and recommendations are already TypeScript with 157 tests. A Python backend would mean re-implementing and re-testing them, and two copies drifting apart.
- **Own API instead of browser-direct Supabase.** XP, mission state and AI tool calls must be **server-authoritative and validated**. Row-level security alone can't enforce "XP only for a valid completion, once". Supabase is used for managed Postgres and Auth only. The browser never gets database credentials.
- **Guest-first auth.** Supabase anonymous sign-in gives every install a real `user_id` with no friction, matching today's no-account experience. Linking a phone or email later keeps the same ID.
- **Server-side reuse of the dev setup.** The API handler is already mounted in Vite, so `npm run dev` stays one command.

## 3. Migration strategy (keeps the UI working at every step)

1. **Identity:** on first load, sign in anonymously and keep the session. All later calls carry the JWT.
2. **Import:** a one-time `POST /v1/me/import` with the current `kw2` document. The server validates it, writes profile, preferences, attempts (with derived idempotency keys) and check-ins, then recomputes XP from the ledger. Old browsers keep their data.
3. **Write-through:** the store keeps working locally. Each domain action also calls the API (`completeItem` → `POST /attempts/{id}/complete`). Server responses (authoritative XP, level, attempt IDs) are merged into the store.
4. **Server-authoritative reads:** Progress and Rewards read `GET /progress/summary` and `/rewards/wallet`. Local numbers become a fallback for offline use.
5. **Retire local truth:** `localStorage` becomes a cache with a schema version and a TTL.

## 4. Database design (PostgreSQL)

Conventions: `uuid` PKs (`gen_random_uuid()`), `timestamptz` in UTC, `local_day date` computed in the user's time zone, `created_at`/`updated_at` everywhere, `ON DELETE CASCADE` from `users` (so deletion propagates), and row ownership checked in the API. **Encrypt** free-text and self-report columns marked 🔒 at the application level (or with pgsodium).

```
users                (id, auth_id UNIQUE, locale, timezone DEFAULT 'Asia/Riyadh', created_at, deleted_at)
user_profiles        (user_id PK→users, display_name 🔒, address_form CHECK IN ('m','f'), city_id, schedule CHECK IN ('work','study','flex'),
                      active_pattern, sleep_pattern, onboarding_completed_at)
user_preferences     (user_id PK, sound bool, reduced_motion bool, large_text bool, theme, mission_length CHECK IN ('normal','short'),
                      prayer_protect_min CHECK IN (0,20,30,45), language)
consents             (id, user_id, purpose CHECK IN ('ai_chat','memory','analytics','notifications',…), policy_version,
                      granted_at, revoked_at NULL)              -- current = latest row with revoked_at NULL
journeys             (id PK text, active bool)                  -- seed: adhd, anx, ocd, mood, sleep, soc, aut, gen
user_journeys        (user_id, journey_id, priority, PRIMARY KEY (user_id, journey_id))
checkins             (id, user_id, local_day, energy CHECK IN ('high','mid','low'), source CHECK IN ('home','chat'), created_at,
                      UNIQUE (user_id, local_day))              -- one per day, upsert
conversations        (id, user_id, started_at, last_message_at, retention_until)
messages             (id, conversation_id, user_id, role CHECK IN ('user','assistant','system_notice'), content 🔒,
                      lang, intent, safety_level SMALLINT DEFAULT 0, model, created_at, expires_at)
context_observations (id, user_id, kind CHECK IN ('event','work','sleep','low_energy',…), value jsonb,
                      source CHECK IN ('user_said','user_set','system_inferred'), evidence_message_id NULL→messages,
                      status CHECK IN ('proposed','confirmed','rejected','expired'), valid_on date, valid_until timestamptz,
                      confidence real NULL, created_at, decided_at)          -- fixes H-1: always dated
user_memory          (id, user_id, key, value jsonb, source CHECK IN ('user_said','user_set'), consent_id→consents,
                      created_at, last_confirmed_at, expires_at NULL, UNIQUE (user_id, key))   -- only approved, durable
challenge_definitions(id PK text, version int, category, minutes, base_xp, scored bool, self_report bool, has_easy bool,
                      goals text[], gentle bool, on_request bool, active bool, PRIMARY KEY (id, version))   -- seeded from catalog.ts + goals.ts
missions             (id, user_id, kind CHECK IN ('daily','solo','chat'), local_day, status CHECK IN ('in_progress','paused','done','replaced'),
                      reason jsonb, planner CHECK IN ('rules','agent'), planner_run_id NULL→agent_runs,
                      created_at, started_at, ended_at)
                      -- at most one open mission per user:
                      CREATE UNIQUE INDEX one_open_mission ON missions(user_id) WHERE status IN ('in_progress','paused');
                      -- at most one daily per day:
                      CREATE UNIQUE INDEX one_daily ON missions(user_id, local_day) WHERE kind = 'daily';
mission_items        (id, mission_id, position, challenge_id, challenge_version, difficulty CHECK IN ('easy','normal'),
                      reason jsonb, status CHECK IN ('not_started','in_progress','paused','completed','skipped','abandoned'),
                      UNIQUE (mission_id, position))
challenge_attempts   (id, user_id, mission_item_id→mission_items, challenge_id, started_at, ended_at, active_ms, paused_ms,
                      status CHECK IN ('in_progress','completed','skipped','abandoned'),
                      client_attempt_key UNIQUE (user_id, client_attempt_key))   -- idempotent create
challenge_results    (attempt_id PK→challenge_attempts, first_try_accuracy SMALLINT NULL CHECK (0..100), retries int,
                      payload jsonb 🔒 (typed text / self-report), payload_schema_version, created_at)
xp_transactions      (id, user_id, delta int, reason CHECK IN ('attempt_completed','achievement','redemption','refund','adjustment'),
                      source_type, source_id uuid, idempotency_key text NOT NULL, created_at,
                      UNIQUE (user_id, idempotency_key))         -- e.g. 'attempt:<attempt_id>' → XP can't be paid twice
                      -- balance = SUM(delta); keep user_xp(user_id, total, level) updated in the same transaction
achievements         (id PK text, rule jsonb, active bool)
user_achievements    (user_id, achievement_id, awarded_at, PRIMARY KEY (user_id, achievement_id))
partners             (id, legal_name, category, status CHECK IN ('prospective','outreach','negotiating','contracted','integrated','live','paused','ended'),
                      contract_ref, owner)
rewards              (id, kind CHECK IN ('in_app','user_defined','partner'), partner_id NULL, cost_xp, inventory int NULL,
                      starts_at, ends_at, status, terms)
reward_redemptions   (id, user_id, reward_id, status CHECK IN ('reserved','issued','redeemed','expired','refunded','failed'),
                      xp_transaction_id→xp_transactions, voucher_ref 🔒, idempotency_key, UNIQUE (user_id, idempotency_key), timestamps)
agent_runs           (id, user_id, conversation_id, trigger CHECK IN ('chat','mission_plan','adapt'), model, prompt_version,
                      input_tokens, output_tokens, latency_ms, outcome CHECK IN ('ok','safety','fallback','error'), error_code, created_at)
agent_tool_calls     (id, run_id→agent_runs, tool, args jsonb (redacted), result_summary jsonb, status CHECK IN ('ok','denied','error','needs_approval'),
                      approved_by_user_at NULL, created_at)
audit_events         (id, actor CHECK IN ('user','agent','system','admin'), user_id, action, entity_type, entity_id, metadata jsonb (redacted), created_at)
```

### Relationships

```
users 1─1 user_profiles, user_preferences
users 1─* consents, checkins, conversations─* messages, context_observations, user_memory
users 1─* missions 1─* mission_items 1─* challenge_attempts 1─1 challenge_results
challenge_attempts 1─0..1 xp_transactions (idempotency_key = 'attempt:'||id)
users *─* achievements (user_achievements);  rewards *─1 partners;  reward_redemptions → xp_transactions
conversations 1─* agent_runs 1─* agent_tool_calls
```

### Constraints that carry today's guarantees to the server

- **No double XP:** `xp_transactions UNIQUE (user_id, idempotency_key)`, and the insert happens in the same transaction that sets the attempt to `completed`, guarded by `WHERE status = 'in_progress'`.
- **No duplicate attempt from retries:** `UNIQUE (user_id, client_attempt_key)`. The client generates a UUID before calling.
- **One open mission** and **one daily per day:** partial unique indexes (above). Replacing a mission marks it `replaced` and abandons its open item (fixes M-2).
- **Self-report never earns XP:** enforced in the completion service from `challenge_definitions.self_report`, not by the client.
- **Context is always dated:** `valid_on` / `valid_until` are required (fixes H-1).

## 5. API contracts (MVP)

Everything is JSON. Auth is `Authorization: Bearer <supabase-jwt>`. Errors use `{ "error": "<code>", "detail"?: string }`. Write calls accept an `Idempotency-Key` header.

| Method & path | Request | Response | Notes |
|---|---|---|---|
| `POST /v1/me/import` | `{ state: <kw2 document> }` | `{ imported: {attempts, checkins}, xp, level }` | Once per user. Validated and clamped |
| `GET /v1/me` | — | `{ profile, preferences, journeys[], consents{purpose: bool} }` | |
| `PATCH /v1/me` | partial profile / preferences | same as GET | Onboarding finish = one PATCH |
| `POST /v1/me/consents` | `{ purpose, granted: bool, policyVersion }` | `{ consents }` | Replaces the `aiConsent` flag |
| `GET /v1/me/export` · `DELETE /v1/me` | — | JSON export · `204` | The delete cascades |
| `POST /v1/checkins` | `{ energy, localDay? }` | `{ checkin }` | Upsert for the day |
| `GET /v1/context?day=` | — | `{ confirmed[], proposed[] }` | Only valid for that day |
| `POST /v1/context/{id}/decide` | `{ decision: 'confirm'\|'reject', drop?: kinds[], lightenToday?: bool }` | `{ confirmed[] }` | Called from the chat card |
| `GET /v1/challenges` | — | `{ items: ChallengeDefinition[] }` | Server copy of the catalog |
| `GET /v1/missions/active` | — | `{ mission \| null }` | Includes items and statuses |
| `POST /v1/missions` | `{ kind: 'daily'\|'solo'\|'chat', items?: [{challengeId, difficulty, reason}], replaceOpen?: bool }` | `{ mission }` or `409 {error:'open_mission', mission}` | Daily: the server plans. Solo/chat: items are validated against the catalog |
| `POST /v1/missions/{id}/pause` · `/resume` · `/exit` | — | `{ mission }` | |
| `POST /v1/missions/{id}/items/{pos}/attempts` | `{ clientAttemptKey, difficulty }` | `{ attempt }` | Idempotent start |
| `POST /v1/attempts/{id}/complete` | `{ accuracy: 0..100\|null, retries, activeMs, pausedMs, payload }` | `{ attempt, xpAwarded, xpTotal, level, leveledUp, newAchievements[] }` | Server computes XP (half-XP rule) |
| `POST /v1/attempts/{id}/skip` · `/abandon` | — | `{ attempt }` | |
| `POST /v1/missions/{id}/finish` | — | `{ summary }` | Same `MissionSummary` facts as today |
| `POST /v1/feedback` | `{ challengeId, value: -1\|0\|1 }` | `{ ok }` | "Did this suit you?" |
| `GET /v1/progress/summary?range=week\|month` | — | the `progressStats` shape | Same function, run on the server |
| `GET /v1/rewards/wallet` | — | `{ xp, level, achievements[], unlocks[], stickers[] }` | |
| `POST /v1/chat/messages` | `{ conversationId?, message, clientMessageId }` | `{ conversationId, reply, tone, intent, suggestion?, contextProposal?, safety }` | **The server builds the context** from the DB; the client no longer sends `history` or `context` (see 06) |

Shared request/response types live in `packages/shared` (or `src/shared/contracts.ts`) and are validated with zod on both sides.

## 6. Privacy and security requirements before any deployment

- Authenticated chat with per-user quotas and a spending cap on the OpenAI key (fixes H-2).
- Encryption for 🔒 columns. Retention: messages expire by default (for example after 30 days) unless the user keeps them.
- Export and delete per user. Deletion cascades and removes data from logs within a set window.
- Audit events for every agent write and consent change. Logs never contain message text or keys (today's rule in `server/chat.ts` stays).
- Security headers, CORS restricted to the app's origins, and TLS everywhere.
