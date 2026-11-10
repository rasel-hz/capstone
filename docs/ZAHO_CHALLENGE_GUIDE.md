# Which challenge Zaho picks: a reference for the agent

This is the reference for Zaho's agent: what each challenge is for, when to offer it while chatting, when not to, and how the challenges lead into each other. It describes the app as it is now. The rules the code already enforces are marked **(enforced)**: the agent can rely on them, but its suggestions should follow them anyway so the reply and the card agree.

The source of truth for IDs, lengths and points is `src/features/challenges/catalog.ts`, for goals `src/features/recommend/goals.ts`, and for names and text `src/i18n/locales/{ar-SA,en}/challenges.json`. The server already sends the model the live list of activities (`activities()` in `server/chat.ts`), so this guide is about judgement, not the list. If the two disagree, the code wins: update this file.

**Nothing here diagnoses or treats anything.** A challenge is practice, a plan, a moment to reflect or an optional break. Never tell the user a challenge fixes, heals or treats something, and never name a condition.

## The rules before any pick

1. **Crisis first, always.** If what the user wrote matches the crisis check, there is no challenge. The chat shows the support message and numbers (997, 937) instead **(enforced)**. The same check runs inside every challenge where the user types **(enforced)**.
2. **Rest is a real answer.** If they're exhausted or say they want to rest, offering rest, or nothing at all, is fine. At most one gentle option.
3. **At most three, best first** **(enforced)**. Each one gets a short reason tied to what the user actually said ("because you mentioned three projects and one evening").
4. **Fit the time they have.** Never suggest anything longer than the minutes they said **(enforced)**.
5. **Low energy means gentle and short** **(enforced)**. The gentle ones are marked below.
6. **Respect feedback.** Anything they marked "didn't suit me" twice isn't suggested unless they ask for it by name **(enforced)**.
7. **Suggest, don't start.** The user starts with a button. Zaho can't start, change or save anything by itself.
8. **Only active IDs.** `priority_board`, `time`, `start2` and `eye_break` are retired: never suggest them **(enforced)**.

## Quick lookup

| The user says something like | Offer first | Then |
|---|---|---|
| «عندي أشياء كثير وما أدري من وين أبدأ» and names two or more tasks | `seq` with their tasks | `breakdown` |
| Same, without naming tasks | `breakdown` | `seq` (it will ask them to write their tasks) |
| «أبي أذاكر بس ما أقدر أبدأ» / "can't get myself to begin" | `micro_start` | `breakdown`, `study_sprint` |
| «المهمة كبيرة عليّ» / "it's too big" | `breakdown` | `micro_start` |
| «عندي اختبار وأتشتت» / "I keep getting distracted" | `study_sprint` | `video`, `attention_scene` |
| «أبي أشحذ تركيزي شوي» / wants a short brain game | `video`, `attention_scene` | `mem` |
| «صرت أنسى» / wants a memory game | `mem` | `attention_scene` |
| «قلقان الحين» / «الدنيا زحمة عليّ» / anxious right now | `grounding` | `calm` |
| «متوتر» / «مضغوط بعد يوم طويل» / stressed after a long day | `calm` | `calm_landscape`, `grounding` |
| «بالي مشغول بأشياء» / going over worries or decisions | Advice first, then `thought_sort` | `calm` |
| «ودي أفضفض عن شعوري» / wants to reflect on feelings | `emotion_map` | `thought_sort` |
| «عيوني تعبت» / «لي ساعات على الشاشة» | `eye_rest` | `calm_landscape` |
| «أبي بريك» / "I need a break" | `calm_landscape` | `eye_rest` |
| «ما يجيني نوم» / winding down for bed | `calm` | `calm_landscape`. Persistent sleep trouble: suggest seeing a doctor |
| «عندي عزيمة وأبي أرتب لها» / planning a gathering | `seq` with their tasks | `breakdown` |
| «تعبان وما أبي شي» / exhausted | Rest, or nothing | at most `calm_landscape` |
| Asks for dhikr, or seems open to it and the time fits | the dhikr that fits now, as one activity | never in the journey; see the dhikr rules |

## Start and arrange

### `micro_start` · «بس أول خطوة» · Just the First Step
- **2 min · gentle · level points by effort**
- **What it does:** the user names a task, then either writes the first step they already know ("Yes, I know it") or shrinks one with a ladder until it feels easy ("Help me shrink it"). Then they try it with a 2-minute timer (the default), 60 seconds or none, and say how it went.
- **Helps with:** getting started when a task feels heavy, procrastination, "I don't know how to begin".
- **Offer when:** they want to start something real now, even a small part.
- **Don't offer when:** they have no task at all in mind, or they're too tired to do anything (rest first).
- **Leads to:** "not yet" asks "Plan it for another time?" and opens `breakdown` with the task filled in.
- **Points:** "I started" gives all its level points, "a little" 60%, "not yet" 30%. Reward points stay 10 for any completion.

### `breakdown` · «فكّكها» · Break It Down
- **3 min**
- **What it does:** the user writes a big task, splits it into up to five small steps (or picks example steps), and chooses when to do the first one.
- **Helps with:** a task that feels too big, not knowing the steps, planning for later.
- **Offer when:** "it's too big", "I don't know where to start" without a list of tasks, or "I'll do it later".
- **Don't offer when:** they're exhausted, or only have two minutes.
- **Leads to:** "Start the first step now?" opens `micro_start` with the task and step filled in. "No" puts the steps into today's goals.

### `seq` · «رتّب يومك» · Plan Your Day
- **2 min**
- **What it does:** the user's own tasks (from the chat, from today's goals, or typed there) sorted into now, later and not today, with optional time blocks if they know how much time they have. It never shows example tasks.
- **Helps with:** too many things at once, deciding what comes first today.
- **Offer when:** they named **at least two of their own tasks**, or have goals for today. Put those tasks in `tasks` so the board opens with them.
- **Don't offer when:** they named no tasks and have no goals today. Offer `breakdown` instead.
- **Leads to:** "Start the first one now?" opens `micro_start` with that task.

### `study_sprint` · «ركّز على قدك» · Focus Sprint
- **5 min (5, 10, 15 or 25, or no timer)**
- **What it does:** a short focus session for study, work or any task. A tip to put the phone away first. Distractions are written down to deal with later.
- **Helps with:** staying on one task, getting distracted, studying.
- **Offer when:** they have a specific thing to work on and a little time.
- **Don't offer when:** energy is low, or they have under 5 minutes.
- **Leads to:** parked distractions can go into today's goals, then "a 5-minute break?" opens `calm_landscape`, then "another session?" opens another sprint.

## Focus and memory games

These are short practice games with a first-try score for personal tracking only. Never present a score as saying anything about the person.

### `video` · «ركز معي شوي» · Focus for a Moment
- **1 min · scored**
- **What it does:** a 24-second oasis scene that's new every time (balloons, birds, sometimes a camel, a star or palms), then two or three questions about what was shown.
- **Helps with:** a quick attention warm-up, a short break that still feels active.
- **Offer when:** they want a quick game, or to "wake up" their focus.

### `attention_scene` · «وش اللي تغيّر؟» · What Changed?
- **2 min · scored**
- **What it does:** two pictures (oasis, majlis, souq, desert night or kitchen), find what changed: a colour, a move, something missing or something new. 2 to 4 differences, set by how the last round went.
- **Helps with:** noticing detail, careful looking.
- **Offer when:** they want a focus game a little longer than `video`.

### `mem` · «وش تتذكر؟» · What Do You Remember?
- **2 min · scored**
- **What it does:** a tray of Saudi objects (dallah, finjan, date, lantern, palm, camel…) for five seconds, then say which one disappeared.
- **Helps with:** short-term memory practice.
- **Offer when:** they want a memory game, or say they're forgetting things. Never suggest it means something about their health.

## Calm

### `calm` · «على هونك» · Take It Easy
- **2 min (1, 3 or 5) · gentle**
- **What it does:** guided breathing with a choice of method: a sigh (two breaths in, a long breath out), a longer breath out (4 in, 6 out), or calm and even (5 and 5). Or quiet without breathing, for anyone who doesn't like breathing exercises.
- **Helps with:** stress, tension, winding down before sleep.
- **Offer when:** stressed, tense, can't relax, before bed.

### `grounding` · «وش حولك؟» · What's Around You?
- **3 min · gentle**
- **What it does:** 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste. They tap once for each thing found, with Saudi examples, and "didn't find one" is fine. A rating before and after.
- **Helps with:** feeling anxious or overwhelmed right now, a racing mind, coming back to the moment.
- **Offer when:** "I'm anxious", "it's all too much", "my head is everywhere".
- **Note:** if the rating after is still 4 or 5, it offers to talk to Zaho or call 937 **(enforced)**.

### `eye_rest` · «ريّح عيونك» · Rest Your Eyes
- **1 min · gentle**
- **What it does:** the 20-20-20 habit. Look at something about 6 metres away for 20 seconds, then blink.
- **Helps with:** tired eyes after a long time at a screen.
- **Offer when:** they mention hours on the screen, studying or working at a laptop, or tired eyes. A good pick after `study_sprint`.
- **Say:** it rests the eyes. **Never say** it protects or improves eyesight.

### `calm_landscape` · «بريك على حاجتك» · A Break Your Way
- **2 min · gentle**
- **What it does:** asks "what do you need right now?" and gives that kind of break: rest my eyes (`eye_rest`), move a little (four gentle moves), my mind is busy (the breathing from `calm`), or just quiet (an oasis to look at).
- **Helps with:** a break between tasks, when they're not sure what they need.
- **Offer when:** "I need a break", after a long session, after work.

## Think and feel

### `thought_sort` · «خلنا نفكّر فيها» · Let's Think It Through
- **3 min**
- **What it does:** the user writes what's on their mind and sorts each into "I can do something about it", "not clear" or "come back later". "Later" gets a time and a reminder on Home. "Not clear" gets one question: what information would make it clearer. Then one small step, which can go into today's goals, start now (`micro_start`) or be planned (`breakdown`).
- **Helps with:** worries, overthinking, practical decisions, things they keep turning over.
- **Offer when:** they're going over worries or decisions. **Give real advice in the reply first**, then offer it.
- **Don't offer when:** they want to talk about how they feel rather than sort things out (listen, or `emotion_map`).

### `emotion_map` · «وش جوّك؟» · How Are You Feeling?
- **1 min · self-report · no points, no streak, never sent to the AI** **(enforced)**
- **What it does:** pick feelings (calm, happy, excited, proud, grateful, tired, tense, anxious, upset, sad, lonely, a bit lost, not sure) or write one, how strong it is, and what might help. If a hard feeling is strong (4 or 5), it shows clearer support first.
- **Helps with:** naming a feeling, checking in with themselves.
- **Offer only when:** they want to reflect on their feelings, or worry is the main thing they're dealing with **(enforced)**. Not as a default, and not just because they said they're stressed.
- **Leads to:** what they said might help: a walk or rest (`calm_landscape`), something small (`micro_start`), calming down (`calm`), or talking (the chat).

## Dhikr (Razan): not a challenge

Dhikr is worship, so it has its own page, «أذكاري» (My dhikr), reached from Home and from the map. It is **not** in the challenge library or the journey, earns **no points of any kind** and doesn't count towards the streak **(enforced, app and server)**. Five activities with verified texts and their sources: `dhikr_morning` «ابدأ يومك بذكر», `dhikr_evening` «اختم يومك بذكر», `dhikr_calm_heart` «طمّن قلبك», `dhikr_moment` «خذ لك لحظة ذكر», `dhikr_sleep` «قبل لا تنام».

- **Only when they ask for it, or seem open to it**, as one activity («أبي أذكار»). Never as part of the journey, even if asked: set `journey.include_dhikr` to false and offer it as a single activity **(enforced)**.
- **By the time** **(enforced)**: morning 4:00 to 12:00, evening 15:00 to 23:00, before sleep 20:00 to 4:00. The other two fit any time.
- **Never quote, write or paraphrase any dhikr, dua or verse yourself.** Only suggest the activity; the app shows the verified text.
- **Never present it as treatment**, promise it removes anxiety, or mention points, levels or rewards with it.

## How challenges lead into each other

A challenge only hands the user on after asking them. The next one opens with what was already written.

```
seq ──"start the first one now?"──▶ micro_start
breakdown ──"start the first step now?"──▶ micro_start
micro_start ──"not yet" → "plan it for later?"──▶ breakdown
thought_sort ──small step──▶ goals | micro_start | breakdown
study_sprint ──"a 5-minute break?"──▶ calm_landscape ──"another session?"──▶ study_sprint
calm_landscape ──"rest my eyes"──▶ eye_rest   ──"my mind is busy"──▶ calm
emotion_map ──what might help──▶ calm_landscape | micro_start | calm | chat
```

So Zaho usually only needs to offer the **first** step. For example, for "I have a big report and can't start", offer `breakdown`: the user can go on to `micro_start` from there.

## Retired, never suggest

| ID | Was | Use instead |
|---|---|---|
| `priority_board` | «وش أول شيء؟» | `seq` with their tasks, or `breakdown` |
| `time` | «وين راح الوقت؟» | `breakdown` or `micro_start` for now (`estimate_compare` «قدّرها» is planned) |
| `start2` | «دقيقتين ونبدأ» | `micro_start` (its timer is 2 minutes by default) |
| `eye_break` | «عيوني تعبت» | `eye_rest` |

They stay in the catalog only so old history reads.

## Keeping this up to date

When a challenge is added, retired or changes what it does, update this file in the same change. A challenge's `purpose` in the locale files is what the model sees, so keep it one clear sentence that matches what's written here.
