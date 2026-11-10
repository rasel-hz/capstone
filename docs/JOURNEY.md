# Onboarding, the personal journey and the daily streak

## Flow

```text
Onboarding answers → LifeProfile → buildPlan() → journey map → one step at a time
                                                     ↓
                     Mission engine verifies completion → XP once → step marked done → next step opens
                                                     ↓
                                 Recorded attempts → daily streak
```

| Part | File |
|---|---|
| Question engine (which questions, options, validation) | `src/features/profile/questions.ts` |
| Question screens | `src/features/profile/ProfileQuestions.tsx` |
| Journey planner and progress | `src/features/path/planner.ts` |
| Journey map | `src/pages/Path/index.tsx` |
| Streak rules | `src/features/streak/streak.ts` |
| Streak display and milestones | `src/features/streak/StreakBits.tsx` |

## Onboarding

After the name and account steps, questions depend on earlier answers, and every one is optional:

| Question | Asked when |
|---|---|
| Daily life | Always |
| Goals | Always |
| Main goal | Only if more than one goal was chosen |
| Something to start or organize (free text) | Organizing, starting, focus or habit goals, or anyone studying |
| When to help | Always. "After school" and "after work" appear only if they apply |
| How to help | Always |

- Answers are stable IDs in `AppState.prof`, marked as self-reported. A category never implies a timetable, an age or a condition, and goals are never mapped to a diagnosis.
- Typed tasks are saved only if the "keep these" box is ticked. Settings → delete typed text removes them.
- Sound, motion, prayer times and the protected minutes moved to My Profile.
- **Age policy is still open.** The reference requires separate safeguarding, consent and regulatory review for minors before launch. "School student" is only recorded as said, with a note about a parent or guardian. The product owner needs to decide the policy.

## The journey

`buildPlan` is deterministic, so results can be tested and explained. The main goal picks the steps, then the answers adjust them:

- Studying adds Study Sprint for organizing, starting or focus goals. Work alone doesn't.
- Two or more kept tasks put the personal planning board first, with exactly those tasks.
- "Talk things through" starts with a conversation step. "Calm" starts with a break. "Step-by-step" starts with planning.
- Sleep, hard-day and free-time questions were removed to keep onboarding short. Sleep and hard-day answers saved before that still count: "Feeling exhausted" starts with something gentle, and "Too many thoughts" adds Let's Think It Through.
- No answers gives a gentle start.

Each chapter ends with a reflection and a milestone. Only challenges that exist can appear. `sleep_winddown` and `routine_builder` aren't built yet, so sleep journeys use the calm activities.

**Progress is only ever recorded:**

- A game step finishes only from an attempt started on that step (`jn` on the mission item), through the mission engine's completion, which pays XP once. Playing the same game from the library doesn't touch the journey.
- A completed step shows the XP really earned. Upcoming steps show "Earn N XP".
- A talk step finishes only when a message is really sent. A reflection and a milestone earn no XP.
- Revising answers keeps finished steps and replaces only what's ahead.
- Sequence applies only to the journey. Every challenge stays open in the library.

Existing users keep everything. No journey is created for them until they choose to answer the questions from Home.

## My journey (the tab)

"My journey" («رحلتي») replaced "My challenges" in the bottom bar. The page is only the map. **Want something specific?** (the challenge library, `chal`, which keeps the tab lit) and **Dhikr** (the library on the dhikr group, since dhikr is never picked on its own) sit on the map itself and scroll with it. Answers are edited from the pencil in the header.

**Choosing a step as it's reached.** A step's sheet has **Swap it** («غيّره»): the next best fit from the recommendation engine for that chapter's goals, never one already on the journey, never dhikr, at most `SWAPS` (2) times (`swapCurrent`). As a step is reached, `freshenCurrent` replaces it if the user has since said it didn't suit them, unless they chose it with a swap, and `replaceRetired` replaces any step not done yet whose challenge was retired. Finished steps never change.

**It never ends.** While the user is in the last chapter, `ensureAhead` adds the next one. The map stops partway into the chapter after the current one: its first part shows, locked, then it fades into a blur with "Opens after chapter N", and there is nothing to scroll to past it. Steps past that point aren't drawn.

Starting a step from the map opens the game itself (`missions.start(items, { direct: true })`), with no intro or countdown. From the library, the intro page has one button that starts the game.

The older 7-day journeys can no longer be started or picked. Their results stay in Achievements.

## The map

| Part | File |
|---|---|
| World geometry, scenery placement, where Numo stands | `src/features/path/world.ts` |
| The illustration | `src/features/path/map/OasisWorld.tsx` |
| Steps | `src/features/path/map/JourneyNode.tsx` |
| Numo on the map | `src/features/path/map/NumoWalker.tsx` |
| Celebrate, then travel | `src/features/path/map/useJourneyTravel.ts` |
| Level sheet | `src/features/path/map/LevelSheet.tsx` |
| Screen and header | `src/pages/Path/index.tsx` |

- **Layout is deterministic.** Positions come from the plan alone, in a world 390 units wide, and stay valid for any number of steps. The coastline is the route itself drawn thick, so an island always fits its steps.
- **Each chapter has a look** (welcome, garden, calm, hill) chosen from its theme. Neighbouring chapters always differ.
- **Numo's place comes from saved progress** (`standKey`), never a stored level number.
- **Order of events:** the game engine verifies completion and saves it, which is what advances the journey. Only afterwards does the map play the celebration, and it marks it as seen as it starts, so a refresh can't replay it. It also waits until the challenge screen has closed.
- **There is no walking clip.** Numo travels along the route in the standing pose with a small step, so the character isn't distorted. A walking clip from Masko would slot in at `NumoWalker`.
- **Performance:** the world is one static SVG, redrawn only when a step finishes, and only Numo's single clip plays. There's nothing to lazy-load because the scenery is inline vector art.
- **Reduced motion:** a still Numo, no travel, no pulse, no drifting water.

## Streak rules

The streak is calculated from recorded attempts, not stored as a counter, so repeat events can't inflate it and existing users get their real history.

| Rule | Detail |
|---|---|
| A day qualifies | At least one completed challenge. Skipped, abandoned and self-report check-ins don't count. Neither do opening the app, answering questions, reflections or prayer answers |
| One per day | However many challenges are finished |
| Calendar | The local date of the chosen location or city, otherwise the device's zone |
| Today | Never breaks a streak while it's still open |
| Rest day | User's choice, up to 2 in any 7 days. Keeps the streak, doesn't add to it |
| Grace | With "Protect a missed day" on (default), one unplanned missed day in any 7 is protected |
| Reset | Otherwise the current streak returns to 0. The longest is kept, XP is untouched, and nothing shames the user |
| Milestones | 1, 3, 7, 14 and 30 days, each celebrated once |
| Off switch | My Profile → Show my daily streak |

## Storage

The profile, journey, rest days and streak settings are in the on-device `kw2` state, per account. They aren't in Supabase yet, so a new device starts without them. Streaks use the attempts on that device. No database migration was needed.

## Tests

`tests/journey-streak.test.ts` covers the ten scenarios from the brief. The UI was checked in the browser with a temporary page that skipped login, covering onboarding, the map, a real completion, the finish screen, and Home in Arabic.
