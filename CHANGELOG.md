# Changelog

## Unreleased

### Added
- OpenAI chat through a small server that holds the key, with consent, data minimisation, three crisis layers, validated model output and a labelled fallback to the rules. See `docs/AI.md`.
- Small effects around the mascot, so each state looks different until its own animation exists.
- `npm start` to serve the production build and API. Node.js 22.18 or newer is now required.

### Changed
- `KHOWAYK_REFERENCE.md` §2 and §11.1 now describe the optional OpenAI connection, after checking it with a real key.
- The support message now also covers harm from another person, and points to someone the user trusts instead of family. This wording still needs clinical review.
- The chat declines general tasks such as code, homework and translation, so it stays a companion.

### Fixed
- A dropped OpenAI connection now retries once, and the server gives up before the browser does.
- When the AI can't be reached, the notice now includes where to get help, because the rules can miss indirect distress.

## 0.2.0 — React refactor and mascot system (2026-11-06)

### Changed
- Moved the single-file prototype to React, TypeScript and Vite. The prototype, including the fixes below, is kept in `prototype/index.html`, and the untouched original is in git history.
- Saved data stays in the `kw2` browser key, in the same format.

### Added
- Reusable `Mascot` component and `useMascot` controller, with 11 states tied to real app events.
- New approved artwork: the main pose and the `idle` animation.
- Consistent motion: page fade-ins, moving navigation pill, card entrances and hover, animated XP counts, chart entrance.
- Error screen in place of a blank page if something crashes.
- Service interfaces for storage and the chat, ready for a backend or AI later.
- Unit tests for missions, XP, saved data and crisis detection.
- Chat typing is disabled while the driving setting is on.

### Fixed
- Pause destroyed the game and left an empty screen.
- XP could be paid twice after leaving or refreshing on the results screen.
- Skipping or pausing on the results screen could change a finished item's status.
- Late game actions could complete a task after it was skipped.
- Double-clicking a correct answer counted it twice.
- Timers kept running behind the pause screen in the memory, breathing and task-start games.
- `start2` lost the user's task, and now records whether they actually started.
- `time` reports the difference in seconds instead of a misleading accuracy percentage.
- `seq` accepts any order for the middle steps, and works by keyboard.
- Partial missions were described as finished.
- Crisis detection handles spelling variations and everyday idioms, with a check-in for unclear messages. It is still a keyword safety net that needs clinical review.
- User text could run as code in the page (XSS).
- Onboarding lost the typed name when choosing a gender, and the default name ignored the chosen gender.
- The phone navigation bar stretched over the whole screen.

### Not in this release
- The other 10 mascot animations, which need to be generated.
- The 8 new tasks in `docs/TASK_CATALOG.md`.
- Real AI, a backend, accounts, live integrations and partner rewards.
