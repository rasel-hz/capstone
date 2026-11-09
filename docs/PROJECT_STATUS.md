# خويّك | KHOWAYK: project status

Last updated 2026-11-07, when `faris-branch` (with Raseel's `raseel` branch merged in) was pushed to `main`.

This file lists what has been done and what still needs doing. For how to run the project and its rules, see [HANDOFF.md](HANDOFF.md). For product requirements, see [KHOWAYK_REFERENCE.md](../KHOWAYK_REFERENCE.md), which is the source of truth.

## Where things stand

| Area | Status |
|---|---|
| App | React, TypeScript and Vite, with all screens working |
| Languages | Saudi Arabic and English, switchable at any time, including mid-game |
| Challenges | 14 playable, including Just the First Step and Let's Think It Through |
| Chat | OpenAI, helpful-first, follows the language you write in, and suggests activities through an explainable engine. Offline fallback is labelled limited mode |
| Home | The next journey step, today's goals, a chat entry and a compact journey preview |
| Mascot | A clip for all 11 states |
| Prayer times | Calculated on the device for a city or your rounded location, with a selectable method. A once-per-window check-in and an optional break replace the old lock. See [PRAYER.md](PRAYER.md) |
| Navigation | 5 tabs, with خويّك raised in the middle on phones |
| Android app | Built with Capacitor and running on the Android emulator. Games and chat not yet tried there. See [ANDROID.md](ANDROID.md) |
| Data | Saved in the browser only, with no accounts or database |
| Onboarding and journey | Adaptive questions, an illustrated oasis journey map with Numo on the current step, and a humane daily streak. See [JOURNEY.md](JOURNEY.md) |
| Tests | 300 unit tests, type check and build all pass. `npm run eval:ai` passed 23 of 23 real-model cases on 2026-11-08 |
| Chat to game | Your own tasks go from the chat into the planning board, and your choices come back to the chat |
| Public launch | **Not ready.** See "Before any public launch" below |

All work so far is on `main`. Start new work on a new branch from `main`.

## What we've done

### 1. Reference and research
- Added the product and engineering reference.
- Researched tasks for each category and wrote [TASK_CATALOG.md](TASK_CATALOG.md), with specs, evidence limits and open questions.

### 2. Move to React
- Rebuilt the single-file prototype as a modular app, and kept the prototype in `prototype/`. Saved data from the prototype still loads.
- Fixed bugs, including XP paid twice after a refresh, pause destroying a game, timers running behind the pause screen, and user text able to run as code.
- Added a mission engine with tests, so status and XP rules live in one place.

### 3. OpenAI chat
- Added a small server that holds the API key, so it never reaches the browser.
- Added a consent card before anything is sent, and limited what is sent. Names, journeys, typed game text and feelings answers stay on the device.
- Added three crisis checks: keywords, moderation and the model's distress flag.
- The model can only suggest context, and it's saved only after the user confirms.
- Replies that appear to diagnose are blocked, and if the AI fails, the app uses keyword rules and says so.
- Spot-checked with the real model. See [AI.md](AI.md).

### 4. Product redesign
- Added a design system, Lucide icons and original vector art, and removed every emoji from the interface.
- Rebuilt every screen: the dashboard around a mission timeline, the challenge library, journey maps, chat, progress, rewards, settings, landing and onboarding.
- Moved the driving control from the dashboard to ملفي. Its safety behaviour is unchanged: challenges are blocked and chat typing is disabled while it's on.
- Added a focused player with one shared header, plus intro, result and summary screens.
- Rebuilt the six original games, keeping their IDs, base XP and the half-XP rule. In `mem`, the answer used to be obvious, and options now include decoys.
- Added six challenges: `attention_scene`, `priority_board`, `breakdown`, `study_sprint`, `calm_landscape` and `emotion_map`.
- `emotion_map` earns no XP or achievements, ends without a celebration, and is never sent to the AI.
- Added data export, deleting typed text, and removing saved context.

### 5. English and Arabic
- Moved all interface text into locale files, using `i18next`.
- Added right-to-left and left-to-right layouts, and a language switcher.
- Switching language mid-game keeps the round, objects, timers, score and typed text, with no reload. Game state now holds stable IDs instead of words.
- The AI replies in the selected language, and crisis wording is checked in both languages.
- See [I18N.md](I18N.md) for how to add or change text.

### 6. Mascot animations
- Added the 10 remaining clips from Masko, so all 11 states have their own animation.
- Reactions now play their full length, including during games.

### 7. Prayer times
- Calculated on the device for 20 Saudi cities with the Umm al-Qura method, with Isha 30 minutes later in Ramadan. No location is read.
- With a city chosen, every prayer of the day is protected, Home shows the next prayer, and ملفي shows today's five times. Manual entry still works without a city.

### 8. Navigation
- Cut the bar from 7 tabs to 5, with خويّك raised in the middle on phones. Journeys and rewards became sub-tabs of Challenges and Progress.

### 9. Android app
- Wrapped the web app with Capacitor as `com.khowayk.app`, in `android/`.
- The phone's back button closes dialogs, leaves challenges, steps back through onboarding and journeys, and only then leaves the app.
- Pages leave room for the status bar and gesture bar, and the Arabic font is bundled so the app works offline.
- In the app, chat goes to the laptop's server over USB (`npm run android:connect`). The server only accepts the app's own origins.
- Ran it on the Android emulator: onboarding in both languages, the mascot and the back button work.
- **Tip:** don't keep the project in a OneDrive folder. OneDrive turns build files into cloud placeholders, which breaks the Android build. Use a plain folder such as `C:\dev\Khaweyak`.

### 10. Helpful companion and a calmer Home
- The AI answers the actual request first, then suggests an activity only when it helps. Every suggestion is checked against the catalog, the time available, energy and past feedback.
- Recommendation engine, chat suggestion cards, optional "Did this suit you?" feedback, and an AI evaluation script. See [AI.md](AI.md) and [CHALLENGES.md](CHALLENGES.md).
- Home simplified to one next step.

## What we need to do

### Journey and streak
- [ ] Check the journey map on a real iPhone and Android phone, and watch Numo's walk between steps while the screen is visible.
- [ ] Ask Masko for a walking clip. Numo travels in the standing pose for now.
- [ ] Product owner: set the age policy for minors. The reference requires safeguarding, consent and regulatory review before launch.
- [ ] Build `sleep_winddown` and `routine_builder`. Sleep journeys use calm activities for now.
- [ ] Save the profile, journey and rest days to Supabase, so they follow an account to a new device.
- [ ] Add free-text "something else" answers in onboarding, and adapt the journey as feedback comes in.
- [ ] Commission distinct Numo clips for streak milestones. They use existing clips and particles today.
- [ ] Test the whole flow signed in with a real account, and on a phone.

### Companion and recommendations
- [x] Pass the user's own tasks from chat to the planning game, save their choices, and follow up from them.
- [ ] Add `seq` mode C (break one of their tasks into steps) and mode D (a weekly board with rest days).
- [x] Build `micro_start` and `thought_sort`.
- [ ] Build the next activities from the brief: `sleep_winddown`, `grounding_54321`, `estimate_compare`, `routine_builder`, `switch_rules`, `daily_reflection`, `self_compassion`, `social_dialogue`, `family_event_plan`. See [CHALLENGES.md](CHALLENGES.md).
- [ ] Question banks with at least 15 validated variants per scored game, versioned, with seeded randomness, repeat avoidance and answer-key tests.
- [ ] Exact-round checkpoints when resuming.
- [ ] A full context store with provenance, consent scope and expiry for each fact. Today tasks stay with the chat card and the attempt, and only confirmed day tags are saved as context.
- [ ] Use the AI's goals for the daily mission too, not only chat suggestions.
- [ ] Stream replies so long answers appear as they're written.
- [ ] Grow `npm run eval:ai` into a scored dataset with repeats, and run it before each release.
- [ ] Move to typed tool calls (reference §11.3) and server-side memory with provenance (§7, §11.4) once there are accounts.
- [ ] Have Saudi speakers and a clinician review the new offline advice lines.
- [x] Try the "Did this suit you?" question in a live run. It appeared after finishing the planning board in the browser.

### Android app
- [x] Install Android Studio and run the app on an emulator.
- [ ] Try every game, the AI chat and the new 5-tab bar on the emulator.
- [ ] Run it on a real phone.
- [ ] Make the app icon and splash screen.
- [ ] Decide how the demo reaches the AI: over USB from a laptop, or a hosted server with a limited key.
- [ ] Later: iPhone (needs a Mac and Xcode) and Google Play.

### Team decisions first

| Decision | Notes |
|---|---|
| Who owns `server/` and `server/prompt.ts`? | A teammate planned to build the AI agent. It can replace `handleChat` while keeping the response format and safety gates |
| Who does the clinical review? | Blocks crisis wording and OCD content |
| Which crisis numbers are correct? | The app uses 997 and 937. 920033360 appears in directories but is **unconfirmed** |
| What should the OCD journey show? | Recommendation: «قريبًا», and hide it from onboarding |
| Mint or sage? | The art is mint (about `#85E3B0`), and the brief says sage `#8DBFA3` |
| Numo or خويّك? | Masko calls the character Numo, and the app speaks as خويّك |
| Is the slightly tilted head acceptable? | Fixing it needs a new pose |
| Add `activity_plan` to the reference? | It's in the catalog but not in §9 |

### Reviews by people
- [ ] **Clinical review** of crisis wording in both languages, and the `calm` and `emotion_map` text.
- [ ] **Saudi speakers** review all Arabic copy.
- [ ] **Native English speaker** reviews all English copy.
- [ ] **Mascot clips:** nobody has reviewed the 10 new clips on their real screens. Check their size, smoothness and how they switch between states.
- [ ] Confirm the Masko plan allows use on the site.

### Safety wording
- [ ] Add a verified line for domestic violence to the support message.
- [ ] Give the Arabic support message feminine grammar when the user chose it.
- [ ] Do the same for Arabic keyword-rule replies, which use masculine grammar.
- [ ] When the AI can't be reached, indirect distress can't be detected. The on-screen notice points to help, but the reply itself is generic.

### Product
- [ ] Make the daily mission use chosen journeys. It still follows the fixed pattern in reference §10.1, and the six new challenges never enter it automatically.
- [ ] Build the remaining first-batch tasks in the catalog: `sensory_preferences`, `activity_plan`, `grounding_54321`, `thought_sort`, `routine_builder` and `social_dialogue`.
- [ ] Give the social journey real conversation challenges. It only has `seq` and `mem` today, and its card says so.
- [ ] Update reference §8 and §9, which still describe the games as they were before the redesign.
- [ ] Add game checkpoints. A resumed challenge restarts from the beginning, and says so on screen.
- [ ] Replace the 24-second animated scene in `video` with rights-cleared video.
- [ ] Check calculated prayer times against the official Umm al-Qura calendar for a few cities and dates, including Ramadan. Only Riyadh on one date was compared so far.
- [x] Add a "use my location" option with a consent step, and replace the prayer lock with a check-in and optional break.
- [ ] Test "Use My Location" on a real phone and in a browser that allows it. In the preview pane the browser denied it, and the denied path was verified.
- [ ] Add more verified cities (more Qassim cities, for example) from a checked dataset, and optional per-prayer minute adjustments.
- [ ] Decide whether to add AlAdhan as an optional cross-check. Times are calculated on the device today.

### Mascot
- [ ] **iPhone and Safari** show the still image, because WebM transparency isn't reliable there. Check whether Masko offers MOV or HEVC.
- [ ] **Level 4 and above** lose the clips, because the hat can't follow their movement. Fix this for active users, for example with clips that include the hat.
- [ ] **Reduced motion** shows one still image for every state. Add a still per state in `EXPRESSIONS`.
- [ ] Decide whether 3-second reactions feel too long in fast moments.
- [ ] Make the phone app icon. The prompt is in [HANDOFF.md](HANDOFF.md).

### AI
- [ ] Build an AI evaluation suite (§19.2). Today's checks are manual spot checks.
- [ ] Add tool calling (§11.3) and an AI mission planner (§10.2).
- [ ] Add context provenance fields (§7).
- [ ] Add contextual AI messages during challenges (§11.2).
- [ ] Find out why about 2 of 40 real calls failed earlier. The server now retries once and logs the failure type.

### Before any public launch
- [ ] Add accounts and authentication. Without them, **anyone who can reach the server can spend the API key**.
- [ ] Add per-user spending limits.
- [ ] Add a database, server-side chat and memory, and server-side consent and deletion (§15–§17).
- [ ] Have privacy and legal terms reviewed.
- [ ] Check OpenAI's data policy again.

### Testing not done yet
- [ ] Safari, real phones and tablets.
- [ ] Screen readers, in both languages.
- [ ] The system's own reduced-motion setting.
- [ ] The `start2` and `study_sprint` timers running all the way out.
- [ ] How the sound options actually sound.
- [ ] The chat on the production build in English. It was tested in Arabic on the production build, and in English on the dev server.
- [ ] Automated browser tests. Current tests cover rules and data, not screens.
- [ ] The 5-tab navigation in the desktop sidebar.
- [ ] Blocking challenges at a calculated prayer time, live in the app. It's covered by unit tests only.

### Performance
- [ ] Split the code. The main bundle is about 690 KB (215 KB gzipped), which triggers a build warning.
- [ ] Check the landing page on a phone, because it plays up to 9 clips at once. They could play only when on screen.

### Project housekeeping
- [x] Update the title and description of PR #1, which predate most of this work.
- [x] Merge `faris-branch` and `raseel` into `main`.
