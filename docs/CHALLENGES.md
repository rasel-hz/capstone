# Challenges: purposes and when they're suggested

Every activity supports practice, planning, reflection or an optional break. **None of them diagnoses or treats anything**, and scores are for personal tracking only. Names and full text are in `src/i18n/locales/{ar-SA,en}/challenges.json`. Stable data is in `src/features/challenges/catalog.ts`, and the goals used for suggestions are in `src/features/recommend/goals.ts`.

## The catalog

| ID | English name | Min | XP | Supports these goals | Easier version | Scored | What it records |
|---|---|---|---|---|---|---|---|
| `breakdown` | Break It Down | 3 | 25 | start, prioritize, time | yes | no | The steps the user typed (stay on the device) |
| `micro_start` | Just the First Step | 2 | 20 × effort | start, time (gentle) | yes (starts at a smaller step) | no | Task, the step (written or shrunk), timer mode, and whether they started |
| `thought_sort` | Let's Think It Through | 3 | 15 | worry, prioritize | yes (up to 3 items) | no | Concerns sorted into act on / not clear / later, the "later" time, what's missing, and an optional next step. Stays on the device, never sent to the AI |
| `study_sprint` | Focus Sprint | 5 | 30 | focus, start, time | no | no | Time spent, parked distractions |
| `seq` | Plan Your Day | 2 | 25 | social, prioritize | yes | no | The user's own tasks sorted into now / later / not today |
| `video` | Focus for a Moment | 1 | 30 | focus | yes (fewer things, 2 questions) | yes | First-try accuracy |
| `attention_scene` | What Changed? | 2 | 25 | focus | yes (one scene, 2 differences) | yes | First-try accuracy, how many differences |
| `mem` | What Do You Remember? | 2 | 25 | memory, focus | yes | yes | First-try accuracy |
| `calm` | Take It Easy | 2 | 15 | stress, sleep, worry (gentle) | no | no | Method, minutes, and whether it helped |
| `grounding` | What's Around You? | 3 | 15 | worry, stress (gentle) | no | no | How it felt before and after (1 to 5), and how many things they found for each sense. Nothing typed |
| `eye_rest` | Rest Your Eyes | 1 | 10 | rest, focus (gentle) | no | no | How many 20-second rounds |
| `calm_landscape` | A Break Your Way | 2 | 10 | rest, stress, sleep (gentle) | no | no | Which break, and whether it helped |
| `emotion_map` | How Are You Feeling? | 1 | 0 | worry, only on request (gentle) | no | no | A self-report that never leaves the device, earns no XP and is never sent to the AI |

**Retired:** `priority_board` (What Comes First?), `time` (Where Did the Time Go?), `start2` (Just Two Minutes) and `eye_break` (the first eye break, replaced by `eye_rest`) are marked `retired` in the catalog. They are never shown, suggested, planned or offered to the AI, and stay only so old history and saved missions still read. "Just Two Minutes" lives on in "Just the First Step", whose timer is 2 minutes by default.

**Completion:** a challenge is complete only when its game reports a result. Skipped and abandoned are recorded as such and never count as complete. XP is paid once per item, at half rate after a retry (`src/features/mission/engine.ts`). A game can scale its level points by the effort the user reported (`xpScale`): "Just the first step" gives all of it for "I started", 60% for "a little" and 30% for "not yet". Reward points in Supabase stay a flat 10 for any completed challenge, because effort is self-reported.

**Resume:** a resumed challenge restarts from its beginning, and says so. Earlier attempts stay saved.

## Typed text is checked first

Every challenge where the user types freely (Just the First Step, Break It Down, Let's Think It Through, How Are You Feeling?, Focus Sprint, Plan Your Day) checks the text on the device with the same crisis wording as the chat (`crisisIn` in `games/parts.tsx`). If it matches, the game stops and shows the same support message and numbers as the chat. Nothing from that screen is saved.

## Going on from one challenge to the next

A game can hand the user on, only after asking them (`GameResult.then`). The next challenge is added right after the current one with what was handed over (`seed`: the task, a step, where it came from). It's a bonus: leaving it doesn't make the mission partial.

| From | Question | Goes to |
|---|---|---|
| Plan Your Day | "Start the first one now?" | Just the First Step, with that task |
| Break It Down | "Start the first step now?" (no → the steps go into today's goals) | Just the First Step, with the task and its first step |
| Just the First Step, "not yet" | "Plan it for another time?" | Break It Down, with the task |
| Focus Sprint | Parked distractions → today's goals? Then "a 5-minute break?", then "another session?" | A Break Your Way, then Focus Sprint again |
| Let's Think It Through | The small step: my goals / start now / plan it | Today's goals, Just the First Step, or Break It Down |
| How Are You Feeling? | "Try … now?" for the first thing they said might help | A Break Your Way (moving, or rest), Just the First Step, Take It Easy, or the chat with Zaho |

"Let's think it through" can also set a time for what was put under "later" (in an hour, tonight, tomorrow morning, or a time). It then shows on Home at that time, with "done" or "remind me tomorrow" (`src/features/later/later.ts`).

## The two short calm exercises

- **Rest Your Eyes** (`eye_rest`, the 20-20-20 habit): look at something about 6 metres away for 20 seconds, then blink. One round completes it, another is optional. The timer can be paused, and with reduced motion the ring steps instead of gliding. It's also the "rest my eyes" option in "A break your way". It rests the eyes; it says nothing about eyesight.
- **What's Around You?** (`grounding`, 5-4-3-2-1): five things you see, four you touch, three you hear, two you smell and one you taste. The user taps once for each thing found, with three Saudi examples per sense, and "didn't find one" moves on with no sense of failing. A rating before and after (both optional). If the after rating is 4 or 5, the same support as "How are you feeling?" comes first: talk to Zaho, or call 937. It can calm a little; it isn't a treatment.

## Variety in the attention games

- **Focus for a Moment** builds a new scene each time (`games/videoScene.ts`): 2 to 5 balloons with random colours, times and positions, 1 to 3 birds from either side, and sometimes a camel, a star or more palms. The questions come from a bank worked out from the scene, so the answer is always what was shown. The same scene is never played twice in a row. Easy has fewer things and two questions.
- **What Changed?** picks scenes from the oasis, majlis, souq, desert night and kitchen, never the same first scene twice in a row. Every object sits a little differently each time, and each difference is a new colour, a move, something missing or something new. Normal has 2 to 4 differences, from how the last round went.
- **What Do You Remember?** uses everyday Saudi things (dallah, finjan, date, lantern, palm, camel, tent, incense burner) instead of shapes.

## When each is suggested

| The person says something like | Goal | Usually suggested |
|---|---|---|
| "I have so much to do and don't know where to start" | prioritize | `seq` only with at least two of their own tasks, otherwise `breakdown` |
| "I want to study but can't get myself to begin" | start | `micro_start`, `breakdown`, `study_sprint` |
| "I'm anxious right now" or "it's all too much" | stress, worry | `grounding`, `calm` |
| "I've been on the screen for hours" | rest, focus | `eye_rest` |
| "I'm stressed after a long day" | stress | `calm`, `calm_landscape`, as an optional break |
| "I can't relax before bed" | sleep | `calm`, `calm_landscape`. Persistent sleep trouble → suggest a doctor |
| "I keep thinking about things I can't control" | worry | Advice first, then `thought_sort`, `calm`, or `emotion_map` only if they want to reflect |
| "I have an exam and keep getting distracted" | focus | `study_sprint`, `video`, `attention_scene` |
| "I'm nervous about a meeting" or "planning a gathering" | social | `seq` with their own tasks |
| "I'm exhausted and don't want to do anything" | rest | Rest, or at most one gentle option such as `calm_landscape` |

The AI and the offline rules both propose; the recommendation engine filters and ranks. See [AI.md](AI.md#how-suggestions-are-chosen). The full guide for the agent, challenge by challenge, is [ZAHO_CHALLENGE_GUIDE.md](ZAHO_CHALLENGE_GUIDE.md).

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
- **New activities**, in priority order (`micro_start`, `thought_sort`, `grounding` and `eye_rest` are done): `sleep_winddown` (هديها قبل النوم), `estimate_compare` (قدّرها, replacing the retired `time`), `routine_builder` (رتّب روتينك), `switch_rules` (غيّر القاعدة), `daily_reflection` (وش ضبط اليوم؟), `self_compassion` (كلم نفسك زين), `social_dialogue` (وش ترد؟), `family_event_plan` (جهّز للعزيمة).
- **Question banks:** "Focus for a moment" and "What changed?" now build each round at random, with answer-key tests and no repeated round twice in a row. Still to do: versioned, reviewed variants for every scored game.
- **Checkpoints:** resuming at the exact round. Today a resumed challenge restarts and says so. To add one: implement `GameProps` in `src/features/challenges/games/`, register it in `games/index.ts`, add it to `catalog.ts`, give it goals in `recommend/goals.ts`, and add its text in both locale files. It then becomes available to the AI's schema and the engine automatically.

## Content review status

| Content | Status |
|---|---|
| Crisis wording and numbers | Needs clinical review |
| `calm` and `emotion_map` text | Needs clinical review |
| Offline advice lines (`companion.rules.advice`) | Written for this release. Needs review by Saudi speakers and a clinician |
| Everything else | Needs review by Saudi speakers and a native English speaker |
