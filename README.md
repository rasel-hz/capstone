# خويّك | Khowayk

A Saudi wellness and daily-life companion, in Arabic and English: playable daily missions, progress and in-app rewards, with a chat that uses OpenAI or keyword rules. It is not a diagnostic or treatment tool.

## Run it

You need Node.js 22.18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:8765.

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 8765 |
| `npm run build` | Type check and production build in `dist/` |
| `npm run preview` | Serve the production build with Vite |
| `npm start` | Serve the production build and API with Node, after `npm run build` |
| `npm test` | Unit tests for missions, XP, saved data, crisis detection, the chat server and the redesign rules |
| `npm run typecheck` | Type check only |

## Where things are

| Path | Contents |
|---|---|
| `src/pages/` | One folder per screen |
| `src/features/mission/` | Mission rules (`engine.ts`), planner and player |
| `src/features/challenges/` | Catalog, art and the 12 games |
| `src/features/companion/` | Chat rules and crisis detection |
| `src/components/ui/` | Shared UI kit |
| `src/components/mascot/` | Mascot component, controller and asset manifest |
| `src/services/` | Storage and chat services |
| `server/` | Holds the OpenAI key, safety gates and output validation |
| `public/mascot/` | Mascot artwork |
| `prototype/` | The original single-file app, kept for reference |
| `src/i18n/` | Language setup and all interface text |
| `docs/` | Architecture, language system, AI, mascot guide and task catalog |

Start with [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for what is done and what is left, and [KHOWAYK_REFERENCE.md](KHOWAYK_REFERENCE.md) for product requirements. Then read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). To add or change text, see [docs/I18N.md](docs/I18N.md). To add mascot animations, see [docs/MASCOT.md](docs/MASCOT.md). To add challenges, see [docs/TASK_CATALOG.md](docs/TASK_CATALOG.md).

## What is real today

- App data stays in the browser under the `kw2` key. There is no database or account system.
- The chat uses OpenAI only when a key is set and the user consents. Otherwise it uses keyword rules, and the screen says which. See [docs/AI.md](docs/AI.md), which also covers setting up your key.
- Prayer time, driving and events are entered by the user. Nothing is connected to a live service.
- Rewards are in-app only. There are no partners or vouchers.
