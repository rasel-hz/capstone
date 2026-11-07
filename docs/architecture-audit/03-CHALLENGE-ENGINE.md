# 03 · Challenge and mission engine

Sources: `src/features/mission/engine.ts`, `planner.ts`, `MissionProvider.tsx`, `MissionPlayer.tsx`, `src/features/challenges/catalog.ts`, `games/*.tsx`.

## Data model (client)

```ts
Mission     { id: 'm'+Date.now(), solo, items: MissionItem[], idx, status: IN_PROGRESS|PAUSED|DONE, started, xp? }
MissionItem { id: ChallengeId, why, diff: easy|normal, status: NOT_STARTED|IN_PROGRESS|PAUSED|COMPLETED|SKIPPED|ABANDONED,
              retries, xp, acc, start?, end?, paused?, pauseAt?, data? }
Attempt     { mid, id, status, acc, retries, xp, dur (s, excludes pauses), d: Date.toDateString(), ts, data? }   // appended to hist[]
```

Only one mission exists at a time (`s.mission`). Attempts are appended to `s.hist` when an item finishes (completed, skipped or abandoned). Starting an item does not create a history row.

## Mission lifecycle

```
start(items?)                                     MissionProvider.tsx:349
 ├─ guard(): driving → blocker · inPrayerWindow → blocker
 ├─ open mission exists?
 │    ├─ no items (daily) → resume('continue')
 │    └─ items (solo/chat) → conflict dialog: finish old | start new (old one is replaced, see 04 M-2)
 └─ createMission(items || generateMission(state), solo)  → player 'intro'

Player phases (MissionPlayer.tsx)
 intro ─run()─► preroll (3.2 s, skippable) ─► game ─onDone(r)─► result (4.2 s)
                   ▲                                            │
                   │      shouldOfferEasier? ─► easier (user chooses next diff)
                   └──────────── next(): advance idx ◄──────────┘
 idx past end ─► finish(): finishMission → summary screen, chat summary message, lastDaily

Side exits
 pause / resume      item PAUSED, pause time accumulated, all timers held (useTimers)
 skip                item SKIPPED, history row, next
 end (confirmed)     item ABANDONED, history row, next
 exit (X / Android back)  item PAUSED, mission PAUSED, saved; Home shows "pick up"
 app reload          hydrate → settle(): skips finished items so nothing replays
```

### State transitions (engine.ts)

| Function | From → to | Writes history? | XP |
|---|---|---|---|
| `createMission` | — → mission IN_PROGRESS, items NOT_STARTED | no | — |
| `beginItem` | item → IN_PROGRESS (`start` set once) | no | — |
| `completeItem` | item → COMPLETED. **Returns null if already COMPLETED**, which is the duplicate-XP guard | yes | `acc == null \|\| acc >= 50 ? base : round(base / 2)` |
| `skipItem` / `abandonItem` | item → SKIPPED / ABANDONED (no-op if COMPLETED) | yes | 0 |
| `pauseItem` / `resumeItem` | IN_PROGRESS ↔ PAUSED | no | — |
| `exitMission` | item IN_PROGRESS → PAUSED, mission → PAUSED, then `settle` | no | — |
| `settle` (on every load) | moves `idx` past finished items. All finished → DONE + `lastDaily` | no | — |
| `finishMission` | mission → DONE, builds the summary, pushes a chat message | no | — |

**Duplicate XP.** Verified in the browser: after completing `video` (+30), exiting mid-`mem`, reloading and finishing, total XP was 55, equal to the sum of the attempt rows. `completeItem` is the only place XP is added, and it refuses a second completion. Game components can call `onDone` only once per mount (the result phase unmounts the game). On the backend this guarantee must become an idempotency key (see 05).

### Daily mission generator (`planner.ts:generateMission`)

Rule-based. It always has three items:

1. `video`
2. `seq` if an `event` context is confirmed, else `mem`
3. `calm` if energy is low (check-in low today, **or** `pref === 'short'`); else `start2` if the journeys include `adhd` or `mood`; else `time`

Difficulty is `easy` when the last accuracy for that challenge was below 60, or energy is low (except for `calm`). Reasons are stored as codes (`WhyPart[]`) and turned into text when shown.

**Coverage gap:** the daily planner can only pick 6 of the 12 challenges. `attention_scene`, `priority_board`, `breakdown`, `study_sprint`, `emotion_map` and `calm_landscape` reach users only through the library, journeys, chat suggestions or the post-mission suggestion.

### Recommendation engine (`recommend/engine.ts`)

Used for chat suggestion cards and the "one more" card on Home. It filters by catalog, available minutes, "not for me" (two `-1` answers in a row), low energy (gentle or ≤ 2 min only) and goal match. Then it scores goal rank, AI preference, helpfulness ×2, minus plays in the last 24 h, plus gentle-on-low-energy and a journey match. It returns reason codes. It is deterministic, has unit tests, and the AI cannot bypass it.

## Challenge inventory

All 12 are registered in `GAMES` (`games/index.ts`) and playable. Every game has the same props (`diff`, `env`, `onDone(GameResult)`). `env` gives pause state, say/sfx and the round reporter.

| ID | Name (en) | File | Input | Mechanics | Scoring → `acc` | Completion | Retry / hints | Difficulty | Result `data` | XP base |
|---|---|---|---|---|---|---|---|---|---|---|
| `video` | Oasis attention clip | `VideoGame.tsx` | tap | 24 s animated SVG "clip" with captions, then 3 questions (balloons, last colour, birds) | first-try correct, without hint, ÷ questions | all questions answered correctly | wrong options disabled, hint shown after a miss, replay the clip | easy = 2 questions | — | 30 |
| `mem` | What's missing? | `MemoryGame.tsx` | tap | 5 s to memorise a tray, one item disappears, pick it from decoys | first-try rounds ÷ rounds | all rounds | colour hint after the 1st miss, named after the 2nd, auto-answer after 3 misses | easy = 1 round of 4; normal = 4, 5, 6 | — | 25 |
| `seq` | Order the steps | `SequenceGame.tsx` | drag or tap, arrow buttons | order 4 steps of an event / work / study morning. Only the first and last positions are graded | 100 on the first try; after one correction `max(60, 100 − 20·tries)`; otherwise share of the 2 anchor positions correct | 2nd check always ends | one correction round with an explanation | easy = 3 steps | — | 25 |
| `time` | Feel the time | `TimeGame.tsx` | tap | pick 5/10/15/20 s, start, stop when you think it has passed (hidden clock) | none (`null`) | after stop and an optional reflection | — | none | `{est, act, err, reflect}` | 20 |
| `calm` | Breathing | `CalmGame.tsx` | tap | 3 breath cycles at 3/4/5 s pace, or 30 s quiet. Optional tone | none | "did it help?" answered or skipped | — | pace chosen by the user | `{help, mode, pace}` | 15 |
| `start2` | Start in 2 minutes | `StartGame.tsx` | **free text** (task, first step) | 2-minute real-world timer, then self-report | none | outcome chosen | "stopped early" allowed | none | `{task, step, outcome, early, secs}` | 25 |
| `attention_scene` | Spot the difference | `AttentionSceneGame.tsx` | tap hotspots | find 2–3 changes between two SVG scenes (oasis, majlis) | found ÷ (found + misses + hints) | all found in every scene | hint names a quadrant (counts as a try) | easy = 1 scene, 2 changes | `{found, misses, hints}` | 25 |
| `priority_board` | What's first? | `PriorityBoardGame.tsx` | drag or tap, **free text** | sort 4–6 cards into now / later / not today (now ≤ 3), add your own, pick the first | none (no wrong answers) | a first item picked | edit the lists | easy = 4 cards, now ≤ 1, no custom cards | `{now, later, notToday, first}` | 20 |
| `breakdown` | Break it down | `BreakdownGame.tsx` | **free text** | task → up to 5 steps → "when" | none | plan saved | back buttons | easy = 1 step | `{task, steps, plan}` | 25 |
| `study_sprint` | Study sprint | `StudySprintGame.tsx` | **free text** | 5/10/15 min or untimed focus timer, park distracting thoughts | none | ≥ 60 s active, then a reflection | — | none | `{topic, plannedMin, secs, notes, reflect}` | 30 |
| `emotion_map` | Name the feeling | `EmotionMapGame.tsx` | tap | pick feelings → intensity 1–5 (optional) → what might help | none | finish | back | none | `{feelings, intensity, help}`. **Self-report: 0 XP, no achievements, never sent to the AI** | 0 |
| `calm_landscape` | Calm oasis | `CalmLandscapeGame.tsx` | tap | interactive scene (lanterns, water ripples, palm, dusk, ambient sound) | none | ≥ 20 s, then "did it help?" | — | none | `{help, secs, touches}` | 10 |

### Cross-cutting behaviour

- **Persistence of game progress:** none inside a game. Exiting or reloading mid-game restarts that game from the beginning (the mission position is kept).
- **Pause:** every timer goes through `useTimers(paused)` or checks `env.paused`, so pausing freezes countdowns, the clip and auto-advance. Verified by reading each game.
- **Language switch mid-game:** state holds stable IDs and the text is looked up when rendering. Covered by `tests/i18n.test.ts`.
- **Typed text** (`start2`, `priority_board`, `breakdown`, `study_sprint`) is stored in `hist[].data` on the device, shown in Progress, and can be erased in Settings ("clear typed text"). It is not sent to the AI.
- **Half XP** applies only to scored games (`acc < 50`). Unscored games always pay full XP on completion. The reference (§14.1) flags this as a policy to refine.
- **Easier offer:** after an item with retries or `acc < 60`, the player offers easy mode for the next item, unless it is already easy or is `calm`.

### UI issues found per challenge

From code reading. Only the first two challenges were played in the browser.

- `attention_scene`: `miss` highlighting is not cleared when moving to scene 2. Taps on unchanged objects during the 1.1 s transition after the last find still count as misses and lower `acc`.
- `calm_landscape`: ripple `setTimeout`s are not cancelled on unmount. Harmless in React 19, but untidy.
- `video`: the clip is generated SVG and labelled as such. The reference expects a licensed video to replace it later, and the data shape (`AttentionClip`) is ready for that.
- No game keeps an internal checkpoint (the reference's `challenge_checkpoints`), so long games such as `study_sprint` lose their elapsed time on exit.
