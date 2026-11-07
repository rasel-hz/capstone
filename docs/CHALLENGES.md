# Challenges: purposes and when they're suggested

Every activity supports practice, planning, reflection or an optional break. **None of them diagnoses or treats anything**, and scores are for personal tracking only. Names and full text are in `src/i18n/locales/{ar-SA,en}/challenges.json`. Stable data is in `src/features/challenges/catalog.ts`, and the goals used for suggestions are in `src/features/recommend/goals.ts`.

## The catalog

| ID | English name | Min | XP | Supports these goals | Easier version | Scored | What it records |
|---|---|---|---|---|---|---|---|
| `priority_board` | What Comes First? | 2 | 20 | prioritize | yes | no | The order the user chose |
| `breakdown` | Break It Down | 3 | 25 | start, prioritize | yes | no | The steps the user typed (stay on the device) |
| `micro_start` | Just the First Step | 2 | 20 | start (gentle) | yes (starts at a smaller step) | no | Task, the step chosen, how far it was shrunk, timer mode, and whether they started |
| `start2` | Just Two Minutes | 2 | 25 | start (gentle) | no | no | Whether the user started |
| `thought_sort` | Let's Think It Through | 3 | 15 | worry, prioritize | yes (up to 3 items) | no | Concerns sorted into act on / uncertain / later, and an optional next step. Stays on the device, never sent to the AI |
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

## `seq` has two modes

| Mode | When | What happens | Scored |
|---|---|---|---|
| Personal planning | The chat passed the user's own tasks, or they asked to organise and named none | Their tasks (plus an optional break, labelled), sorted into Now / Later / Not today, then optional time blocks checked against the time they gave | No. Priorities are the user's call. Only the time limit is checked |
| Example scenario | Started from the library or the daily mission, with no personal tasks | The original sequencing exercise with general scenes, now labelled "Example scenario" | First-try accuracy, first and last step only |

Personal planning is in `games/PersonalPlanGame.tsx`, its config and checks in `src/features/plan/`.

## When each is suggested

| The person says something like | Goal | Usually suggested |
|---|---|---|
| "I have so much to do and don't know where to start" | prioritize | `priority_board`, `breakdown` |
| "I want to study but can't get myself to begin" | start | `micro_start`, `start2`, `breakdown`, `study_sprint` |
| "I'm stressed after a long day" | stress | `calm`, `calm_landscape`, as an optional break |
| "I can't relax before bed" | sleep | `calm`, `calm_landscape`. Persistent sleep trouble → suggest a doctor |
| "I keep thinking about things I can't control" | worry | Advice first, then `thought_sort`, `calm`, or `emotion_map` only if they want to reflect |
| "I have an exam and keep getting distracted" | focus | `study_sprint`, `video`, `attention_scene` |
| "I'm nervous about a meeting" or "planning a gathering" | social | `seq` |
| "I'm exhausted and don't want to do anything" | rest | Rest, or at most one gentle option such as `calm_landscape` |

The AI and the offline rules both propose; the recommendation engine filters and ranks. See [AI.md](AI.md#how-suggestions-are-chosen).

## Evaluation framework

What each activity is for, what it can and can't tell us, and what review it needs. **No research citations are listed, because none have been verified for this app.** Every activity is marked as needing evidence review before any claim beyond "practice" or "optional break".

| ID | Everyday problem | What the user does | Type | Can measure in the app | Can't conclude | Review needed |
|---|---|---|---|---|---|---|
| `seq` (personal) | Too many interests, unsure what to do first | Sorts their own tasks, optionally splits their time | Planning support | Completion, what they chose, whether blocks fit their time, helpfulness answer | Whether they followed the plan, or that it improved anything | Evidence review; UX test with users |
| `seq` (example) | Practising ordering steps | Orders a general scenario | Practice | First-try accuracy, retries | Anything about real-life planning ability | Evidence review |
| `priority_board` | Everything feels urgent | Sorts cards into now, later, not today, picks one | Planning support | Choices, completion | Real-world prioritising skill | Evidence review |
| `breakdown` | A big task feels too big | Writes steps and a time to start | Planning support | Steps written, completion | Whether they started | Evidence review |
| `micro_start` | A task feels too big to begin | Shrinks the first step through 5 sizes, or writes their own, then tries it with 60 s, 2 min or no timer | Planning support | Step size chosen, timer mode, self-reported start | That it changes procrastination over time, or anything clinical | Evidence review |
| `start2` | Putting a task off | Names a tiny step and tries it for two minutes | Planning support | Self-reported start | Lasting change in habits | Evidence review |
| `thought_sort` | Going over everyday worries | Writes up to 5 concerns, sorts them into act on / uncertain / later, picks one next step | Reflection | Completion, counts per group (the text stays on the device) | Anxiety levels or any change in them; it isn't a therapy technique as built | Clinical review of wording before any claim; evidence review |
| `study_sprint` | Hard to focus on study | A short timed session | Practice | Time spent | Learning gains | Evidence review |
| `video`, `attention_scene`, `mem` | Wants a light focus or memory game | Observes and answers validated questions | Entertainment and practice | Accuracy, retries | Any effect on attention or memory in daily life, or anything clinical | Evidence review; never present as ADHD support |
| `time` | Time slips away | Estimates a duration, compares it with real time | Practice | Estimate vs actual | Time-management ability | Evidence review |
| `calm` | Wants a calm pause | Optional paced breathing or a non-breath option | Optional break | Completion | That it treats anxiety or anything else | Clinical review of wording |
| `calm_landscape` | Needs a break | Looks at a quiet scene | Optional break | Completion | Any health effect | Content review |
| `emotion_map` | Wants to reflect on feelings | Picks words for how they feel | Reflection | Nothing sent or scored | Mood, diagnosis or risk | Clinical review |

**Safety for all:** skippable at any point, never during driving or a protected prayer time, never offered as the response to a crisis, and rest is always an acceptable answer.

## Feedback

After a mission, the finish screen asks "Did this suit you?" with three answers: it suited me, it was okay, not for me. It's optional. Answers stay on the device (`fb` in saved data, last 60 kept) and are only used to rank suggestions: a challenge marked "not for me" twice stops being suggested unless the user asks for it. A score is never read as a sign of anyone's health.

## Planned, not built yet

- **More `seq` modes:** break one of the user's tasks into steps (mode C) and a weekly board with rest days (mode D).
- **New activities**, in priority order (`micro_start` and `thought_sort` are done): `sleep_winddown` (هديها قبل النوم), `grounding_54321` (حولك وش فيه؟), `estimate_compare` (قدّرها), `routine_builder` (رتّب روتينك), `switch_rules` (غيّر القاعدة), `daily_reflection` (وش ضبط اليوم؟), `self_compassion` (كلم نفسك زين), `social_dialogue` (وش ترد؟), `family_event_plan` (جهّز للعزيمة).
- **Question banks:** at least 15 validated variants for each scored game, versioned, with answer-key tests, seeded randomness and no repeated round twice in a row.
- **Checkpoints:** resuming at the exact round. Today a resumed challenge restarts and says so. To add one: implement `GameProps` in `src/features/challenges/games/`, register it in `games/index.ts`, add it to `catalog.ts`, give it goals in `recommend/goals.ts`, and add its text in both locale files. It then becomes available to the AI's schema and the engine automatically.

## Content review status

| Content | Status |
|---|---|
| Crisis wording and numbers | Needs clinical review |
| `calm` and `emotion_map` text | Needs clinical review |
| Offline advice lines (`companion.rules.advice`) | Written for this release. Needs review by Saudi speakers and a clinician |
| Everything else | Needs review by Saudi speakers and a native English speaker |
