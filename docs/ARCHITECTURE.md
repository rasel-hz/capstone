# Architecture

The app is React, TypeScript and Vite, with a small Node server for AI and no database. [KHOWAYK_REFERENCE.md](../KHOWAYK_REFERENCE.md) is the product requirements document. This file describes what exists.

## How the parts fit

```text
pages/ and MissionPlayer     screens: render state and call actions
        |
features/*                   plain rules with no UI: engine, planner, crisis, achievements, stats
        |
context/AppStateContext      one store: update(draft => ...) then save
        |
services/storage             StateRepository: localStorage key `kw2` today, an API later
```

**State.** `store.update(fn)` clones the state, runs `fn` on the clone, saves it and notifies React. Rule functions change the draft directly, which keeps them short and easy to test. Use `useAppState()` for the whole state, or `useAppSelector()` for one simple value so a component re-renders less.

**Saved data.** `AppState` matches the prototype's `kw2` document. `hydrate()` fills in missing fields, so old data keeps working. When you add a field, add a default in `defaultState()`.

**Navigation.** The current screen is `state.view`, as in the prototype. React Router isn't used, because the app has no shareable pages yet. A browser's back button therefore doesn't move between tabs.

## Missions

`engine.ts` owns every status change. `MissionPlayer.tsx` only decides what to show.

The player moves through `intro → preroll → game → result → (easier offer) → next item → finish`.

Rules the engine enforces, with tests in `tests/engine.test.ts`:

- `completeItem` returns `null` if the item already finished, so XP can't be paid twice.
- `settle` runs on load and on exit, and moves past finished items so they can't replay.
- Skipping and ending give 0 XP, and can't overwrite a completed item.
- Paused time is left out of `dur`.
- Partial missions are reported as partial.

The planner is rule-based. Driving and prayer checks happen in `MissionProvider`, before any challenge can start.

## Design system

- **Tokens:** `styles/tokens.css` holds the brand palette from reference 3.3, derived shades, the type scale, radii and motion timing. Use these instead of new values.
- **UI kit:** `components/ui/kit.tsx` has the page header, section title, icon badge, progress bar, empty state, segmented control, switch, setting row and dialog.
- **Icons:** Lucide only, through `lucide-react`. No emoji; `tests/redesign.test.ts` fails if one appears in `src/`.
- **Art:** `features/challenges/ChallengeArt.tsx` has the challenge art, journey art and oasis backdrop, all flat vector drawn from the palette.

## Language

All text is in `src/i18n/locales/`, and state holds stable IDs. See [I18N.md](I18N.md).

## The shared player

`MissionPlayer.tsx` owns the header, intro, result and completion screens. A game only draws its play area and reports through `GameEnv`:

- `env.say(mood, text)` updates the mascot and speech bubble.
- `env.round(current, total, label)` shows progress in the header.
- `env.paused`, `env.rm` and `env.snd` tell it about pause, reduced motion and sound.

While the player or a blocking dialog is open, `MissionProvider` sets `inert` on the app behind it.

## Adding a game

1. Create `src/features/challenges/games/YourGame.tsx` using the `GameProps` interface.
2. Register it in `games/index.ts`, and in `CHALLENGES` in `catalog.ts`.
3. Add its ID to the `ChallengeId` type, add its art to `ChallengeArt.tsx`, add its text to `challenges.json` and `games.json` in both languages, and add it to any journey that should offer it.

A game must:

- Use `useTimers(env.paused)` for delays, so they pause with the game and stop when it closes.
- Respect `env.paused` for anything else that runs over time.
- Call `onDone` only when its own completion rule is met.
- Render user text as plain React text, never with `dangerouslySetInnerHTML`.
- Keep stable IDs in state and look up words when rendering, so a language switch can't reset it.
- Offer a tap alternative to any drag. `useDrag` in `games/parts.tsx` handles mouse and touch; native drag-and-drop doesn't fire on phones.
- Set `selfReport: true` in the catalog for anything that records feelings, so it earns nothing and stays on the device.

## AI

See [AI.md](AI.md). `server/api.ts` is mounted inside the dev server by `vite.config.ts`, and by `server/index.ts` in production, so `npm run dev` is still one command. The key never reaches the frontend.

## Motion

Design tokens are in `styles/tokens.css`, and shared animations are in `styles/motion.css`.

- CSS handles nearly everything. Motion for React is used only for the moving navigation and filter pills, and reduced-motion detection.
- Page changes show the new page immediately and fade it in, so a tap is never delayed.
- Both the in-app setting (`.rm` on `body`) and the system's `prefers-reduced-motion` setting turn movement off.
- Keep movement minimal during games. `<Mascot still />` stops continuous movement.

## Known gaps

See [CHANGELOG.md](../CHANGELOG.md) for what changed in the refactor, and section 9 of [TASK_CATALOG.md](TASK_CATALOG.md) for open product decisions.

- Crisis detection is a keyword safety net, and its wording and numbers need clinical review.
- The daily mission still follows the fixed pattern in reference 10.1. Chosen journeys change its explanation and the journey screens, but barely change which challenges it picks, and none of the six new challenges enter it automatically.
- A resumed challenge restarts instead of continuing from a checkpoint, and says so.
- Safari, real phones and screen readers haven't been tested.
- There are no automated browser tests; unit tests cover the rules only.
