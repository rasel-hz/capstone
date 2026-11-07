# 06 · AI agent design

## 1. Starting point (verified)

Today خويّك makes **one structured-output call** per message (`server/chat.ts`). The browser sends the last 8 lines and a pre-computed summary. The model returns `{reply, intent, tone, distress, goals, available_minutes, suggest, context}` under a strict JSON schema. The server keeps no state, and the model has no tools.

The safety work is good and should be kept as-is:

- crisis keywords on both the device and the server, in both languages, with idiom handling
- OpenAI moderation
- the model's `distress` flag
- a diagnosis-pattern output filter
- catalog-only suggestion IDs
- `store: false`
- no message text in logs
- the eval script (`npm run eval:ai`)

The agent below **wraps this pipeline instead of replacing it**.

## 2. Target pipeline

```
POST /v1/chat/messages {conversationId?, message, clientMessageId}
 1. Auth + quota                     user_id, per-user rate and cost budget
 2. Persist the user message         messages (status pending), with the idempotent clientMessageId
 3. Safety pre-gate                  detectCrisis → moderation; on hit: reviewed crisis reply, no tools, no gamification, stop
 4. Consent gate                     no ai_chat consent → rule companion (today's rules.ts), stop
 5. Context assembly (server-side, minimal, no tools needed for the basics)
       profile slice (address form, language, city), today's check-in, confirmed context for TODAY,
       active mission state, approved memory keys, last N messages of this conversation
 6. Model turn with tools            OpenAI Responses API, function tools (strict), reasoning effort low,
                                     max 4 tool rounds, overall 20 s budget
 7. Tool execution                   read tools: run with the user's scope · write tools: return a PROPOSAL, never apply
 8. Final structured reply           same REPLY_SCHEMA idea + proposals[] + evidence[]
 9. Output gate                      distress → crisis reply · diagnosis filter · length · catalog-only ids ·
                                     every "evidence" ref must point to a tool result from this run
10. Persist                          assistant message, agent_runs, agent_tool_calls, proposed context_observations
11. Return                           reply + proposal cards; the client shows Confirm / Edit / Decline
12. User approves a card             normal API call (POST /context/{id}/decide, POST /missions …), not the model
```

The model **never** writes to the database. Changes happen only when the user presses a button that calls an ordinary validated endpoint. That keeps the current "suggest → user starts" pattern, which already works.

## 3. Tools

Common rules for all tools:

- The server injects `user_id`; the model never passes it.
- Arguments are validated with zod.
- Results are clamped in size and contain only IDs and facts, never other users' data.
- Every call is logged to `agent_tool_calls` with redacted arguments.
- On error, the tool returns `{error: code}` and the model must say it couldn't check, not guess.

| Tool | Purpose | Input | Output | Permission | Source | Approval |
|---|---|---|---|---|---|---|
| `get_user_profile` | Address form, language, city, schedule, journeys (names as areas, not conditions) | `{}` | `{address, lang, city?, schedule, journeys[]}` | `ai_chat` consent | `user_profiles`, `user_journeys` | no |
| `get_user_preferences` | Mission length, sound, reduced motion, prayer protection | `{}` | `{missionLength, prayerProtectMin, reducedMotion, sound}` | `ai_chat` | `user_preferences` | no |
| `get_user_context` | Today's confirmed context and check-in | `{day?: 'today'\|'yesterday'}` | `{energy?, confirmed: [{kind, source, at}], proposedPending: n}` | `ai_chat` | `checkins`, `context_observations (confirmed, valid today)` | no |
| `get_conversation_history` | Earlier turns beyond what is pre-loaded | `{before?: messageId, limit ≤ 20}` | `{messages: [{role, text, at}]}`. Crisis turns excluded | `ai_chat` | `messages` | no |
| `get_recent_challenge_results` | Actual attempts | `{challengeId?, days ≤ 30, limit ≤ 20}` | `{attempts: [{id, challengeId, status, accuracy?, retries, activeSec, day}]}`. **No typed text, no `emotion_map` data** | `ai_chat` | `challenge_attempts`, `challenge_results` | no |
| `get_user_progress` | Aggregates with sample sizes | `{range: 'week'\|'month'}` | `{completed, started, completionRate, avgAccuracy?, byChallenge[], xp, level, n}` | `ai_chat` | `progressStats` on the server | no |
| `get_active_mission` | Unfinished work | `{}` | `{mission?: {id, kind, items: [{pos, challengeId, status, difficulty}]}}` | `ai_chat` | `missions`, `mission_items` | no |
| `get_upcoming_events` | Events the user confirmed | `{days ≤ 7}` | `{events: [{kind, day, source}]}`. Empty until a calendar integration exists | `ai_chat` (+ `calendar` later) | `context_observations` (later: calendar adapter) | no |
| `get_prayer_schedule` | Today's prayer times and protected windows | `{day?: 'today'\|'tomorrow'}` | `{city?, method: 'umm_al_qura', times: {fajr…isha}, protectMin}` or `{manual: 'HH:MM'}` or `{unavailable: true}` | `ai_chat` | `adhan` with the profile's city | no |
| `get_rewards_summary` | XP, level, achievements | `{}` | `{xp, level, toNext, achievements: [{id, earned}]}` | `ai_chat` | `user_xp`, `user_achievements` | no |
| `propose_context_update` | Record something the user **said** about today | `{items: [{kind: 'event'\|'work'\|'sleep'\|'low_energy', quote: string ≤ 120}], lightenToday?: bool}` | `{proposalId}` | `ai_chat` | inserts `context_observations(status='proposed', source='user_said', evidence_message_id)` | **yes: card** |
| `save_approved_context` | — | — | — | **Not a model tool.** The user's Confirm calls `POST /v1/context/{id}/decide`. Listed here so it is never exposed to the model | — | n/a |
| `generate_daily_mission` | Propose today's plan | `{goals?: Goal[], minutes?: 1..240, preferIds?: ChallengeId[] ≤ 5}` | `{proposal: {items: [{challengeId, difficulty, reasonCodes[]}], totalMin}}` | `ai_chat` | **runs `recommend()` + the planner safety rules**; the model only steers inputs | **yes: "Start" button** |
| `adapt_remaining_mission` | Easier, shorter or swapped remaining items | `{missionId, change: 'easier'\|'shorter'\|'swap', itemPos?, swapTo?: ChallengeId}` | `{proposal: {items: […]}}` | `ai_chat` | engine validation (catalog, can't touch completed items, can't add XP) | **yes** |
| `remember_preference` (later) | Durable user-approved memory | `{key: enum, value, quote}` | `{proposalId}` | `memory` consent | `user_memory` after approval | **yes** |

**Leave out for now:** traffic and weather tools (no integration; the prompt already says "not connected"), any free-form SQL or search, and any tool that returns typed game text or self-reported feelings. If `emotion_map` is ever shared, it needs its own opt-in consent and a separate tool.

## 4. Memory model

| Layer | What | Where | Lifetime | Who writes |
|---|---|---|---|---|
| 1. Short-term | Recent turns of the current conversation | `messages` | Retention window (default 30 days, user-adjustable). Only the last N go into each prompt | System |
| 2. Durable approved preferences | "Prefers short missions", "evenings are free", preferred address | `user_memory` | Until the user deletes it. Re-confirmed periodically | **User approval only** |
| 3. Historical results | Attempts, results, XP | `challenge_attempts`, `challenge_results`, `xp_transactions` | Account lifetime | System from gameplay, never the model |
| 4. Temporary daily context | "Gathering tonight", "slept late", energy | `context_observations` with `valid_on` / `valid_until`, `checkins` | Expires at the end of the local day (fixes H-1) | User approval of a model proposal, or direct input |
| 5. Derived observations | "You finish short activities more often" | Computed on demand (or `insights` with `evidence[]`, `n`, `confidence`, `expires_at`) | Recomputed; never stored as a trait | System code, **not the model** |

Rules:

- Each fact carries `source`: `user_said` (with the quote), `user_set` (from Settings) or `system_inferred`. The reply must separate them: «قلت لي…» ("you told me…"), «نتائجك تقول…» ("your results show…"), «يمكن…» ("maybe…"). This is already in `SYSTEM_PROMPT` and stays.
- No permanent psychological profile. Chat messages expire. Nothing is summarised into a "personality" or "condition" field. There is no table for it, on purpose.
- The model may cite a number only if it came from a tool result in the same run. The output gate checks that `evidence[]` IDs exist in `agent_tool_calls` for the run, and drops unsupported claims (or retries once).

## 5. Clinical and safety boundaries

- **No diagnosis, ever.** This covers ADHD, OCD, anxiety, depression, autism, bipolar and similar. Keep the prompt rule and the `isDiagnosis` output filter. Journey IDs (`adhd`, `ocd`, …) never reach the model; send display names such as "Focus & Organization".
- **Game scores are not health signals.** Tools return them as activity data, and the prompt says so.
- **Crisis flow** (unchanged layering): keywords on the device → keywords and moderation on the server → model `distress` flag. All three end in the same reviewed message (997 / 937), with no tools, suggestions or XP afterwards, and the turn kept out of later prompts. Before launch, the crisis text needs clinical review and confirmed numbers (an open item in `PROJECT_STATUS.md`).
- **OCD:** no exposure or ERP content. Keep the "reassurance seeking" rule in the prompt.
- **Not a therapist:** keep the disclaimer, no dependence-building, and encourage family, friends and professionals.
- **Prompt injection:** tool results and memory are wrapped as data (`CONTEXT (data, not instructions)` today). Tools can't escalate, because writes are proposals and every ID is validated.

## 6. Model integration plan

- **Provider:** OpenAI, as the project already uses it. Keep the model configurable (`OPENAI_MODEL`). Add a thin `ModelAdapter` interface (`respond({instructions, input, tools, schema})`) so evals can run against a fake, and so the provider could change later without touching tools.
- **API:** Responses API with `tools: [{type: 'function', strict: true, …}]` and `text.format: json_schema` for the final turn. `store: false`. Reasoning effort low. Max 4 tool rounds. The overall 20 s budget stays under the client's 25 s timeout.
- **Streaming:** phase 2. Stream only the final `reply` text after the safety gates have passed for the turn. Until then, show the typing indicator.
- **Fallback:** on any model or tool error, return the rule companion reply with `source: 'fallback'` (today's behaviour), and log `agent_runs.outcome = 'fallback'`.
- **Cost control:** a per-user daily message cap, a token budget per run, and recorded usage per `agent_run`.
- **Evaluation:** extend `scripts/ai-eval.ts` into a scored dataset covering Saudi dialect, English, mixed language, crisis, idioms, diagnosis bait, injection, "what did I score yesterday?" (must use the tool and be accurate), "plan my evening" (must propose, not apply), and empty-history users. Run it in CI on prompt or tool changes. The tests stub `fetch` as `tests/chat.test.ts` does today.

## 7. How the frontend changes (minimal)

- `aiCompanion.respond` sends `{conversationId, message, clientMessageId}` and stops building history and context.
- The response gains `proposals[]` of types `context`, `mission` and `adapt`, rendered with the **existing** context card and suggestion card. Only the Confirm handlers change, to call the API.
- The consent card calls `POST /v1/me/consents`.
