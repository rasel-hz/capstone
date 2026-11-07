# خويّك | Khowayk — Handoff for the next developer or AI agent

Written 2026-11-07, at commit `b3ce984` on `faris-branch`, and updated after the product redesign. See `CHANGELOG.md` for that work.

For a short list of what's done and what's left, see [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Prompt to give the AI agent

Paste this at the start of the agent's session:

> You are continuing work on خويّك | Khowayk, a Saudi Arabic wellness and daily-life companion built as a group capstone project. The repository is https://github.com/rasel-hz/capstone and the current work is on the `faris-branch` branch, not `main`.
>
> Before changing anything, read `docs/HANDOFF.md`, then `KHOWAYK_REFERENCE.md`, which is the product's source of truth. Follow the "Rules that must not be broken" section of the handoff exactly.
>
> Run `npm install`, `npm test` and `npm run dev`, and confirm the app works. Then summarise the current state in your own words and tell me which item from "What to do next" you recommend starting with. Wait for my answer before making changes. Never ask me to paste an API key into chat.

## Current state

| Item | State |
|---|---|
| Working app | React, TypeScript and Vite, with all screens and 12 playable challenges |
| Chat | Connected to OpenAI and checked with a real key, with keyword rules as the fallback |
| Languages | Saudi Arabic and English, switchable mid-game. See `docs/I18N.md` |
| Mascot | Component and 11 states are built, each with its own clip |
| Tests | 102 unit tests pass; type check and build pass |
| Data | Stored in the browser only (`localStorage` key `kw2`); no backend or accounts |
| Public deployment | **Not safe yet**, because anyone who can reach the server can spend the API key |

### Git

- **Repository:** https://github.com/rasel-hz/capstone
- **`main`:** contains only the reference document (`b3991a2`).
- **`faris-branch`:** contains everything below.
- **[PR #1](https://github.com/rasel-hz/capstone/pull/1):** open and not merged, from `faris-branch` into `main`. Its title and description predate the React and AI work and may need updating.

| Commit | Contents |
|---|---|
| `3bd6c67` | Task catalog and the original prototype |
| `04a37fc` | React refactor and mascot system |
| `b3ce984` | OpenAI chat and mascot effects |

## Setup

You need Node.js 22.18 or newer, because the production server runs TypeScript directly.

```bash
git clone https://github.com/rasel-hz/capstone.git
```

```bash
cd capstone
```

```bash
git checkout faris-branch
```

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:8765.

The app works without an API key, using keyword rules and saying so on screen. To use AI, each developer needs their own key:

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY=` in `.env`.
3. Set a monthly budget limit in the OpenAI account.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server and API on port 8765 |
| `npm test` | Unit tests |
| `npm run typecheck` | Type check only |
| `npm run build` | Type check and production build |
| `npm start` | Serve the production build and API with Node, after building |

## Rules that must not be broken

**Source of truth**
- `KHOWAYK_REFERENCE.md` is the source of truth. Its §-numbers are cited throughout the docs.
- Its change-control rule (end of the file) applies: update the status matrix, catalog and `CHANGELOG.md` when features change. Don't silently change scoring, privacy or clinical boundaries.

**Secrets**
- The repository is public. Never commit a key, paste one into chat, or send one in a group chat.
- The key belongs only in the git-ignored `.env`.
- Never give it a `VITE_` prefix, which would put it in the browser code.

**Safety and honesty**
- No diagnosis, automated treatment or unreviewed exposure therapy (§2, §11.6).
- Never claim that games improve attention or treat a condition.
- Never read mood or health from game scores.
- No fake AI: the screen says "AI" only when AI is actually in use (§21).
- Never invent prayer times, traffic, weather, calendar data, partners or offers. Prayer times come only from the on-device Umm al-Qura calculation in `src/features/prayer/times.ts` or from the user; the rest aren't connected.
- No task suggestions, XP or gamification in reply to a crisis message.
- Nothing interactive while driving.

**AI boundaries**
- The model only proposes text and context flags. Server code validates everything (§15.1).
- It can't start missions, award XP, change plans or save anything.
- Context is saved only after the user confirms it (§11.5).
- Keep the three crisis layers in `server/chat.ts`.
- Don't send the user's name, chosen journeys or typed game text to the model without a consent decision from the team.

**Language**
- Never put interface text in a component or in saved state. See `docs/I18N.md`.

**Game code**
- Follow "Adding a game" in `docs/ARCHITECTURE.md`.
- Use `useTimers(env.paused)` for delays.
- Offer a tap alternative to every drag.
- Render user text as plain React text, never with `dangerouslySetInnerHTML`.
- All status and XP changes go through `src/features/mission/engine.ts`, which prevents paying XP twice.

**Git**
- Commit or push only when the person you're working for asks.
- Commits and PRs must not carry AI attribution, such as `Co-Authored-By` or "Generated with" lines. `8alubaid` asked for this to keep the GitHub contributors list to real people.

## What has been built

### 1. Product reference and research
- `KHOWAYK_REFERENCE.md`: full product and engineering requirements.
- `docs/TASK_CATALOG.md`: researched tasks per category, including specs for 8 new tasks, category mapping, evidence limits and open questions. **The new tasks are not built.**

### 2. React refactor (`04a37fc`)
- Moved the single-file prototype to a modular app. `prototype/index.html` is kept as a backup.
- **Screens:** landing, onboarding and 5 tabs (home, challenges with a journeys sub-tab, companion, progress with a rewards sub-tab, settings).
- **Games at that point:** `video`, `mem`, `seq`, `time`, `calm`, `start2`. The redesign added six more.
- **Mission engine:** moves through `intro → preroll → game → result → (easier offer) → next item → finish`, with pause, skip and resume.
- **Data:** the prototype's `kw2` format still loads.

Bugs fixed during the refactor (full list in `CHANGELOG.md`):
- XP paid twice after a refresh
- Pause destroying the game
- Timers running behind the pause screen
- Late game actions completing skipped tasks
- User text able to run as code (XSS)
- Crisis detection missing spelling variations and misreading everyday idioms
- A crash on Home from a finished mission

### 3. Mascot system (`04a37fc`, `b3ce984`)
- `Mascot` component and `useMascot` controller, with 11 states tied to real app events.
- Falls back to a still image for reduced motion and Safari, and to a drawn mascot if the image fails.
- `MascotFx.tsx` draws effects around the character, such as thought dots and sleep z's. They're a stopgap and turn off automatically once a state has its own clip.

### 4. OpenAI chat (`b3ce984`)

How one message is handled:

```text
Browser: clear crisis wording?  → reviewed support message. Nothing is sent.
Browser: no consent or no key?  → rule-based reply, labelled on screen.
Server:  validate and limit the request, keeping known fields only
Server:  clear crisis wording?  → reviewed support message. OpenAI isn't called.
OpenAI:  moderation flags self-harm? → reviewed support message.
OpenAI:  model reply in a strict JSON format
Server:  model flagged distress? → reviewed support message replaces the reply.
Server:  invalid, cut off, refused or diagnosing reply? → rejected.
Browser: rejected or unreachable → rule-based reply, with a notice that says where to get help.
Browser: context flags → shown as a question. Saved only if the user confirms.
```

**Settings:**
- Uses the OpenAI Responses API with default model `gpt-6-luna`, which `OPENAI_MODEL` can override.
- Sets `store: false` and low reasoning effort.
- Allows 5 seconds for moderation and 19 seconds for the reply, with one retry after a dropped connection. The browser's limit is 25 seconds.

**API:**

| Endpoint | Purpose |
|---|---|
| `GET /v1/health` | Returns `{ "ai": boolean }` |
| `POST /v1/chat/messages` | Takes `{ message, history, context }`, returns `{ reply, tone, source, pending? }` |

- `tone` is `friendly`, `support` or `crisis`. `source` is `ai` or `safety`.
- `pending` is `{ ctx, low }`, a proposal the user must confirm.
- Server limits: same-origin only, JSON only, 20 messages per minute per address, 32 KB per request, 1000 characters per message.

See `docs/AI.md` for what's sent to OpenAI and the full results of the real-model check.

## Where things are

| Path | Contents |
|---|---|
| `server/chat.ts` | Safety gates, OpenAI calls and output validation |
| `server/prompt.ts` | System prompt and reply schema |
| `server/api.ts` | HTTP routes and limits |
| `server/index.ts` | Production server |
| `vite.config.ts` | Mounts the API in the dev server |
| `src/features/companion/crisis.ts` | Crisis keywords and support message |
| `src/features/companion/rules.ts` | Keyword-rule replies |
| `src/features/companion/request.ts` | Builds the minimal request sent to the server |
| `src/services/companion.ts` | Chooses AI or rules; checks availability |
| `src/services/storage.ts` | Saved data, defaults and `hydrate()` |
| `src/features/mission/engine.ts` | Mission status and XP rules |
| `src/features/mission/planner.ts` | Rule-based daily mission |
| `src/features/challenges/catalog.ts` | Challenges and journeys |
| `src/features/challenges/games/` | The 12 games |
| `src/features/challenges/ChallengeArt.tsx` | Challenge, journey and oasis art |
| `src/components/ui/kit.tsx` | Shared UI kit |
| `src/components/mascot/manifest.ts` | Mascot clips, images and timings |
| `tests/` | Mission, crisis, rules and chat tests |
| `docs/ARCHITECTURE.md`, `docs/AI.md`, `docs/MASCOT.md`, `docs/TASK_CATALOG.md` | Detailed guides |

## What has and hasn't been tested

**Tested**
- Played through in the browser: landing, onboarding, all tabs, all 12 challenges and a partial daily mission, including exit and refresh mid-mission.
- With the real OpenAI model, about 40 messages: everyday chat, feminine address, the §11.5 example, diagnosis requests, prompt injection, invented data, reassurance loops, off-topic requests and indirect distress. Results are in `docs/AI.md`.
- In the app with the real model: consent, context confirmation and the crisis reply.
- Server protections: cross-origin requests, bad JSON, oversized requests and path traversal.

**Not tested**
- Safari, real phones and screen readers
- The retry against a real dropped connection (unit test only)
- Some game paths: the `start2` and `study_sprint` timers running all the way out, and the sound options by ear
- The system's own reduced-motion setting and the backup mascot image

The real-model check was a spot check, not an evaluation. There are no automated browser tests.

## Known problems

| Problem | Where | Notes |
|---|---|---|
| Crisis wording and numbers have no clinical review | `src/features/companion/crisis.ts` | Required by §11.6. Includes the 2026-11-07 wording change |
| Support message uses masculine grammar for everyone | same | Change it together with the clinical review |
| No domestic-violence line in the support message | same | Add only a verified number |
| Rule replies use masculine grammar | `src/features/companion/rules.ts` | Includes the "تبي أخفف مهمة اليوم؟" card. The AI path already handles gender |
| Indirect distress can't be detected when AI is unreachable | `src/pages/Companion/index.tsx` | The notice points to help, but the reply is generic |
| About 2 of 40 real calls failed | `server/chat.ts` | One took over 20 seconds, and one failed quickly after about a minute idle. The cause isn't confirmed. The server now logs the failure type |
| Daily mission barely uses chosen journeys | `src/features/mission/planner.ts` | It's almost always `video`, then `mem` or `seq`, then `calm`, `start2` or `time`. The six new challenges never enter it automatically |
| Resumed challenges restart | `MissionPlayer.tsx` | Allowed by reference Flow B, and explained on screen. No game checkpoints yet |
| Bundle is about 690 KB (215 KB gzipped) | Build | Over Vite's 500 KB warning. Works, but code splitting would help phones |
| Browser back button doesn't move between tabs | `state.view` | React Router wasn't added on purpose |

## What to do next

This order is a recommendation. The team can change it.

### 1. Settle team decisions

These block other work:

| Decision | Options or recommendation | Blocks |
|---|---|---|
| Who owns `server/` and `server/prompt.ts`? | A teammate planned to build the AI agent. It can replace `handleChat` while keeping the response format and safety gates | All AI work |
| Who does the clinical review? | Needs a qualified person | Crisis wording, OCD content |
| Which crisis numbers are correct? | The app uses 997 and 937. 920033360 is listed in directories but **unconfirmed**, so don't add it without official confirmation | Launch |
| What does the OCD journey show? | Recommendation: «قريبًا», and hide it from onboarding | Journey mapping |
| Mint or sage? | The art is mint (about `#85E3B0`), and the brief says sage `#8DBFA3` | Final art |
| Numo or خويّك? | Masko calls the character Numo, and the app speaks as خويّك | Art and copy |
| Is the slightly tilted head acceptable? | Fixing it needs a new pose | Final art |
| Add `activity_plan` to the reference? | It's in the catalog but not in §9 | Task 4 below |

### 2. Make the daily mission use chosen journeys

Change `generateMission` in `src/features/mission/planner.ts`, keep it deterministic, and add tests. Later an AI planner can propose missions, with these rules as the validator (§10.2).

### 3. Build the 8 new tasks

Specs are in section 5 of `docs/TASK_CATALOG.md`. Build in this order, because later tasks reuse earlier ones:

1. `sensory_preferences`
2. `priority_board`
3. `breakdown`
4. `activity_plan`
5. `grounding_54321`
6. `thought_sort`
7. `routine_builder`
8. `social_dialogue`

`priority_board` and `breakdown` are already built, so skip those. Then update journey mappings as in section 4.1 of the catalog. Its Arabic copy is a draft and needs review.

### 4. Finish the mascot

All 11 clips are in the app. What's left:

- **iPhone:** Safari shows the still image, because WebM transparency isn't reliable there. Check whether Masko offers a version that works, such as MOV or HEVC.
- **Reduced motion:** these users see the same still image for every state. Stills for each state would go in `EXPRESSIONS`.
- **Phone icon:** not started. In Masko's Logo tab, use this prompt, then save the largest PNG as `assets/icon-source.png` and generate the icon sizes and web manifest from it:

> App icon of the character's head and leaf only, centered and looking straight ahead, friendly closed-mouth smile. Fill about 65% of a square image. Flat, solid background color #28785B. No text, no shadow, no border, no rounded corners.

### 5. Finish the AI requirements

From the table in `docs/AI.md`:
- Evaluation suite (§19.2), turning the manual cases in `docs/AI.md` into repeatable tests, including the reassurance guard
- Saudi tone review by native speakers (§20)
- Tool calling (§11.3)
- AI mission planner (§10.2)
- Context provenance fields (§7)
- Contextual messages during challenges (§11.2)

### 6. Backend before any public launch

Authentication, PostgreSQL, server-side chat and memory, consent and deletion controls, and per-user spending limits (§15–§17). Add these **before** deploying publicly.

### 7. Quality checks

Safari, real phones, screen readers and automated browser tests for the full daily mission (§19).

## Definition of done

Use §21 of the reference. At a minimum, before calling something finished:

1. `npm test` and `npm run build` pass.
2. You've tried it in the browser, in the right-to-left layout, on desktop and phone widths.
3. Reduced motion and keyboard use still work.
4. `CHANGELOG.md` and any affected docs are updated.
5. You've said plainly what was tested and what wasn't.
