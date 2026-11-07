# Challenges: purposes and when they're suggested

Every activity supports practice, planning, reflection or an optional break. **None of them diagnoses or treats anything**, and scores are for personal tracking only. Names and full text are in `src/i18n/locales/{ar-SA,en}/challenges.json`. Stable data is in `src/features/challenges/catalog.ts`, and the goals used for suggestions are in `src/features/recommend/goals.ts`.

## The catalog

| ID | English name | Min | XP | Supports these goals | Easier version | Scored | What it records |
|---|---|---|---|---|---|---|---|
| `priority_board` | What Comes First? | 2 | 20 | prioritize | yes | no | The order the user chose |
| `breakdown` | Break It Down | 3 | 25 | start, prioritize | yes | no | The steps the user typed (stay on the device) |
| `start2` | Just Two Minutes | 2 | 25 | start (gentle) | no | no | Whether the user started |
| `study_sprint` | Study Sprint | 5 | 30 | focus, start | no | no | Time spent |
| `seq` | Put It in Order | 2 | 25 | social, prioritize | yes | yes | First-try accuracy |
| `video` | Focus for a Moment | 1 | 30 | focus | yes | yes | First-try accuracy |
| `attention_scene` | What Changed? | 2 | 25 | focus | yes | yes | First-try accuracy |
| `mem` | What Do You Remember? | 2 | 25 | memory, focus | yes | yes | First-try accuracy |
| `time` | Where Did the Time Go? | 1 | 20 | time (gentle) | no | no | Estimate against real time |
| `calm` | Take It Easy | 2 | 15 | stress, sleep, worry (gentle) | no | no | Completion only |
| `calm_landscape` | Take a Break | 1 | 10 | rest, stress, sleep (gentle) | no | no | Completion only |
| `emotion_map` | How Are You Feeling? | 1 | 0 | worry, only on request (gentle) | no | no | A self-report that never leaves the device, earns no XP and is never sent to the AI |

**Completion:** a challenge is complete only when its game reports a result. Skipped and abandoned are recorded as such and never count as complete. XP is paid once per item, at half rate after a retry (`src/features/mission/engine.ts`).

**Resume:** a resumed challenge restarts from its beginning, and says so. Earlier attempts stay saved.

## When each is suggested

| The person says something like | Goal | Usually suggested |
|---|---|---|
| "I have so much to do and don't know where to start" | prioritize | `priority_board`, `breakdown` |
| "I want to study but can't get myself to begin" | start | `start2`, `breakdown`, `study_sprint` |
| "I'm stressed after a long day" | stress | `calm`, `calm_landscape`, as an optional break |
| "I can't relax before bed" | sleep | `calm`, `calm_landscape`. Persistent sleep trouble → suggest a doctor |
| "I keep thinking about things I can't control" | worry | Advice first, then `calm`, or `emotion_map` only if they want to reflect |
| "I have an exam and keep getting distracted" | focus | `study_sprint`, `video`, `attention_scene` |
| "I'm nervous about a meeting" or "planning a gathering" | social | `seq` |
| "I'm exhausted and don't want to do anything" | rest | Rest, or at most one gentle option such as `calm_landscape` |

The AI and the offline rules both propose; the recommendation engine filters and ranks. See [AI.md](AI.md#how-suggestions-are-chosen).

## Feedback

After a mission, the finish screen asks "Did this suit you?" with three answers: it suited me, it was okay, not for me. It's optional. Answers stay on the device (`fb` in saved data, last 60 kept) and are only used to rank suggestions: a challenge marked "not for me" twice stops being suggested unless the user asks for it. A score is never read as a sign of anyone's health.

## Planned, not built yet

From reference §8–§9, in priority order: `micro_start` (بس أول خطوة), `grounding_54321` (حولك وش فيه؟), `sleep_winddown` (هديها قبل النوم), `thought_sort` (خلنا نفكّر فيها), `routine_builder`, `social_dialogue`, `activity_plan`, `sensory_preferences`. To add one: implement `GameProps` in `src/features/challenges/games/`, register it in `games/index.ts`, add it to `catalog.ts`, give it goals in `recommend/goals.ts`, and add its text in both locale files. It then becomes available to the AI's schema and the engine automatically.

## Content review status

| Content | Status |
|---|---|
| Crisis wording and numbers | Needs clinical review |
| `calm` and `emotion_map` text | Needs clinical review |
| Offline advice lines (`companion.rules.advice`) | Written for this release. Needs review by Saudi speakers and a clinician |
| Everything else | Needs review by Saudi speakers and a native English speaker |
