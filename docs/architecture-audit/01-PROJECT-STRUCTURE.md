# 01 · Project structure

Audit date: 2026-11-07 · Branch: `main` at `1558513` · Working tree clean.

Everything below was checked against the code. Nothing comes from the product reference alone.

## Real stack

| Layer | What is actually used | Version |
|---|---|---|
| UI | React 19, TypeScript (strict), function components and hooks | react 19.3, typescript 7.0 |
| Build | Vite 8 (Rolldown), `@vitejs/plugin-react` | vite 8.3.6 |
| Styling | Plain CSS with design tokens (`src/styles/*.css`). No Tailwind, no CSS-in-JS | — |
| Motion | `motion` (Framer Motion successor) and CSS keyframes, plus `.webm` mascot clips | motion 14 |
| i18n | `i18next` + `react-i18next`, bundled JSON per locale and area | ar-SA (default, RTL) and en |
| Icons | `lucide-react` | — |
| Prayer times | `adhan`, Umm al-Qura, calculated on the device | adhan 4.4 |
| State | One custom store (`useSyncExternalStore`) holding one JSON document | — |
| Persistence | `localStorage` key `kw2`. No database, no accounts | — |
| Server | Node `http` (no framework). One module serves `/v1/health` and `/v1/chat/messages` | Node ≥ 22.18 (24.15 on this machine) |
| AI | OpenAI Responses API with strict JSON-schema output, plus the Moderations API | default model `gpt-6-luna` |
| Mobile | Capacitor 8, Android only (`android/`) | — |
| Tests | Vitest, Node environment, 9 files, 157 tests. No component, browser or E2E tests | vitest 5.1 |
| Package manager | npm, `package-lock.json` | npm 11 |

There is no router library. Navigation is a `view` field in the store (`home | journeys | chal | chat | prog | rew | set`), so screens have no URLs and the browser Back button does nothing inside the app.

## How it launches

```
npm ci            # lockfile install (155 packages, 0 vulnerabilities)
npm run dev       # Vite on http://localhost:8765 (strictPort)
```

`vite.config.ts` mounts the same API handler as the production server (`server/api.ts`) as Vite middleware. One command runs the UI and the chat API, and the OpenAI key stays in the Node process. The key is read from `.env` with `loadEnv`. No `VITE_` prefix, so the key never reaches the bundle (checked: no key material in the built JS).

Production: `npm run build` → `dist/`, then `npm start` (`node server/index.ts`) serves `dist/` plus the API on `127.0.0.1:8765`.

## Repository tree (source only)

```
capstone/
├─ index.html                 RTL shell; sets lang/dir from saved state before first paint
├─ vite.config.ts             dev server + API middleware, port 8765
├─ capacitor.config.json      Android wrapper (webDir: dist)
├─ server/                    Node API (runs in Vite dev and in `npm start`)
│  ├─ api.ts                  routing, origin check, 32 KB body cap, 20 req/min/IP limit
│  ├─ chat.ts                 request sanitising, crisis gate, moderation, OpenAI call, output validation
│  ├─ prompt.ts               SYSTEM_PROMPT, INTENTS, REPLY_SCHEMA (strict JSON schema)
│  └─ index.ts                production static server + API
├─ src/
│  ├─ main.tsx / App.tsx      providers; Landing → Onboarding → AppShell gate on `started`/`done`
│  ├─ context/AppStateContext.tsx   the store: load → hydrate → settle → save on every update
│  ├─ services/
│  │  ├─ storage.ts           StateRepository interface + localStorage implementation + hydrate()
│  │  ├─ companion.ts         CompanionService: aiCompanion (HTTP) and ruleCompanion (local)
│  │  └─ native.ts            Capacitor back button, API base URL for the Android app
│  ├─ types/index.ts          AppState, Mission, MissionItem, Attempt, ChatMessage, …
│  ├─ features/
│  │  ├─ mission/             engine.ts (state machine, XP), planner.ts (rule planner), MissionProvider, MissionPlayer
│  │  ├─ challenges/          catalog.ts (12 challenges, 8 journeys), games/*.tsx, art
│  │  ├─ companion/           rules.ts (keyword fallback), crisis.ts, request.ts (what leaves the device), lang.ts
│  │  ├─ recommend/           engine.ts (explainable ranking), goals.ts, suggest.ts
│  │  ├─ progress/stats.ts    all Progress numbers, derived from `hist`
│  │  ├─ rewards/achievements.ts  6 achievements + 2 unlocks, derived from `hist` and `xp`
│  │  └─ prayer/              times.ts (adhan), city picker
│  ├─ pages/                  Landing, Onboarding, Home, Challenges, Journeys, Companion, Progress, Rewards, Settings
│  ├─ components/             AppShell, NavBar, Mascot (+ clip manifest), UI kit, ErrorBoundary
│  ├─ i18n/                   setup + locales/{ar-SA,en}/*.json (14 areas each)
│  └─ styles/                 tokens, base, components, games, landing, mascot, motion
├─ tests/                     9 Vitest suites (engine, chat server, crisis, i18n, prayer, recommend, …)
├─ scripts/ai-eval.ts         live-model evaluation (calls OpenAI; not part of `npm test`)
├─ public/mascot/             pose PNG + 11 transparent .webm clips (~4 MB)
├─ prototype/index.html       original single-file app, kept for reference
├─ android/                   Capacitor Android project
└─ docs/                      ARCHITECTURE, AI, CHALLENGES, I18N, MASCOT, HANDOFF, PROJECT_STATUS, TASK_CATALOG
```

About 11,600 lines across `src/`, `server/`, `tests/` and `scripts/`.

## Architectural explanation

```
┌──────────────── Browser (or Capacitor WebView) ────────────────┐
│ React pages ──► useAppState() ──► Store (one AppState object)   │
│                                    │ update(fn): structuredClone │
│                                    ▼ → mutate draft → save       │
│                           StateRepository (localStorage "kw2")   │
│ Mission engine / planner / recommend / stats: pure functions     │
│ over AppState, all client-side                                   │
│ Companion page ──► CompanionService ─┬─ ruleCompanion (local)    │
│                                      └─ aiCompanion ──HTTP──┐    │
└─────────────────────────────────────────────────────────────┼────┘
                                                              ▼
                         Node API (/v1/chat/messages) ── OpenAI Moderations + Responses
```

- **One source of truth on the client.** `AppState` (`src/types/index.ts:124`) holds the profile, preferences, chat, the active mission, attempt history (`hist`), XP, check-ins and feedback. Each `update()` deep-clones, mutates and writes the whole document.
- **Domain logic is pure and testable.** `features/mission/engine.ts` mutates a draft passed in by the store. Scoring, XP, settle-on-load and duplicate-XP protection live there.
- **A repository seam already exists.** `StateRepository` (`src/services/storage.ts:4`) is the planned swap point for a backend. It works on the whole document, which is too coarse for a real API (see 05).
- **The AI is a stateless proxy.** The server keeps no conversation, user or memory. The browser sends the last 8 messages and a summary each time.

## Configuration and environment

| Variable | Read by | Status on this machine |
|---|---|---|
| `OPENAI_API_KEY` | `server/api.ts` `depsFromEnv` | set |
| `OPENAI_MODEL` | same | not set → `gpt-6-luna` |
| `OPENAI_BASE_URL` | same | not set |
| `VITE_API_BASE` | `src/services/native.ts` (Android only) | not set |
| `DataBase_URL` | **nothing in the code** | set. A `postgresql` URL for a Supabase project |
| `PORT`, `HOST` | `server/index.ts` | defaults 8765 / 127.0.0.1 |

`.env` is gitignored and untracked (checked with `git ls-files`). `DataBase_URL` uses mixed case. Rename it to `DATABASE_URL` when the backend starts reading it, since most ORMs and hosts expect that name.

## Not present

Authentication, database access, migrations, a router, a backend API beyond chat, server-side sessions, analytics, push notifications, calendar/maps/weather integrations, CI configuration, lint configuration (there are `eslint-disable` comments but no ESLint config or dependency), Playwright/E2E tests, and deployment config (no Dockerfile or hosting manifest).
