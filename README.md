# خويّك | Khowayk

A Saudi Arabic wellness and daily-life companion: playable daily missions, progress and in-app rewards, with a rule-based chat for now. It is not a diagnostic or treatment tool.

## Run it

You need Node.js 20 or newer.

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
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests for missions, XP, saved data and crisis detection |
| `npm run typecheck` | Type check only |

## Where things are

| Path | Contents |
|---|---|
| `src/pages/` | One folder per screen |
| `src/features/mission/` | Mission rules (`engine.ts`), planner and player |
| `src/features/challenges/` | Catalog and the six games |
| `src/features/companion/` | Chat rules and crisis detection |
| `src/components/mascot/` | Mascot component, controller and asset manifest |
| `src/services/` | Interfaces a real backend or AI can implement later |
| `public/mascot/` | Mascot artwork |
| `prototype/` | The original single-file app, kept for reference |
| `docs/` | Architecture, mascot guide and task catalog |

Start with [KHOWAYK_REFERENCE.md](KHOWAYK_REFERENCE.md) for product requirements, then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). To add mascot animations, see [docs/MASCOT.md](docs/MASCOT.md). To add challenges, see [docs/TASK_CATALOG.md](docs/TASK_CATALOG.md).

## What is real today

- All data stays in the browser under the `kw2` key. There is no backend or account system.
- The chat uses keyword rules, not an AI model, and says so on screen.
- Prayer time, driving and events are entered by the user. Nothing is connected to a live service.
- Rewards are in-app only. There are no partners or vouchers.
