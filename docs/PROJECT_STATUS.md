# خويّك | KHOWAYK: project status

Last updated 2026-11-07, on the `faris-branch` branch.

This file lists what has been done and what still needs doing. For how to run the project and its rules, see [HANDOFF.md](HANDOFF.md). For product requirements, see [KHOWAYK_REFERENCE.md](../KHOWAYK_REFERENCE.md), which is the source of truth.

## Where things stand

| Area | Status |
|---|---|
| App | React, TypeScript and Vite, with all screens working |
| Languages | Saudi Arabic and English, switchable at any time, including mid-game |
| Challenges | 12 playable |
| Chat | Connected to OpenAI, with keyword rules as the fallback |
| Mascot | A clip for all 11 states |
| Android app | Project built with Capacitor, not yet run on a device. See [ANDROID.md](ANDROID.md) |
| Data | Saved in the browser only, with no accounts or database |
| Tests | 103 unit tests, type check and build all pass |
| Public launch | **Not ready.** See "Before any public launch" below |

`faris-branch` isn't merged into `main` yet. It's waiting on [PR #1](https://github.com/rasel-hz/capstone/pull/1).

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

## What we need to do

### Android app
- [ ] Install Android Studio, run the app on an emulator and a real phone, and fix anything that shows up.
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
- [ ] Decide whether to add more cities or a "use my location" option, which would need a consent design.

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

### Performance
- [ ] Split the code. The main bundle is about 690 KB (215 KB gzipped), which triggers a build warning.
- [ ] Check the landing page on a phone, because it plays up to 9 clips at once. They could play only when on screen.

### Project housekeeping
- [x] Update the title and description of PR #1, which predate most of this work.
- [ ] Review and merge PR #1 into `main`.
