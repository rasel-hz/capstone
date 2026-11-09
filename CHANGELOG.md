# Changelog

## Unreleased: Home as a small world

### Changed
- Home is one scene instead of stacked cards: a sky that follows the time of day, the buddy large on its hill, today's step on the meadow, goals as stepping stones on a trail, and a quieter garden for the rest.
- The buddy asks about energy in a speech bubble, once a day. After an answer it becomes a small badge beside the buddy that reopens the question.
- On a "low energy" day the buddy looks sad with the user instead of laughing. A "short missions" preference doesn't make it sad.
- Total points and the streak sit small at the top. Points open Rewards; the streak opens Progress.
- Goals are shorter to read ("My goals") and give no points, since they are self-reported. They still fill the buddy's energy, shown by its glow.

### Added
- Light motion from React Bits (MIT + Commons Clause): the greeting settles in word by word, sections rise into view, and a small spark marks high energy and finished goals. All of it stops with reduced motion. Adds `gsap`.

### Removed
- The energy leaves and the full-energy break note under the goals, and the points and streak chips on the journey strip.

## Unreleased: illustrated journey map

### Added
- The journey is now an illustrated oasis world: a winding route over islands and bridges, chapters with their own look, stepping-stone steps, gate milestones, and scenery placed so it never covers a step.
- Numo stands on the step saved progress says is current, celebrates a verified finish once, then moves along the route to the next step. It opens near the current step.
- A level sheet with the step's details, XP, and Start, Resume or Play again.
- A sticky header with total XP, streak and journey progress.

### Changed
- The finish screen links back to the journey after a journey step.
- Onboarding is shorter: the free-time follow-up, the sleep question and the "harder days" question are gone, leaving at most six questions.
- The smart replies consent card in the chat is now one short message. The full detail moved to the setting in My Profile.
- Removed every emoji from the app text, the reward data and the docs. Streak milestones now use icons.

## Unreleased: personal onboarding, journey map and daily streak

### Added
- Adaptive onboarding: questions follow from earlier answers, about daily life, goals and a main goal, optional tasks, when to help, sleep, hard days and how to help. All optional, stored as self-report.
- A personal journey built from those answers, on an original oasis map with chapters, checkmarks, real XP, milestones and Numo at the current step. See docs/JOURNEY.md.
- A humane daily streak worked out from recorded attempts: one per day, chosen rest days, one protected missed day in any 7, milestones at 1, 3, 7, 14 and 30 days, and an off switch.
- Existing users keep everything and can build a journey when they choose.
- The companion knows what the user chose to share in onboarding.

### Changed
- Prayer protection, location, sound and motion are no longer onboarding questions. They are in My Profile.
- Home shows the next journey step and a compact journey preview.
- A back button on the first onboarding step returns to the landing page.

## Unreleased: journeys as 7-day programs and today's goals

### Added
- A journey is now a 7-day program: one challenge a day, and a 1 to 5 self-rating on the first and last day. The result shows before and after, on the challenges page and in Progress. Missing a day never resets anything; the step waits.
- Today's goals on Home, in the user's own words. A chat suggestion with the user's tasks can add them in one tap.
- The buddy's energy for the day: each goal ticked or challenge completed adds one, up to five. Nothing takes it away; a new day starts fresh.
- The buddy on Home rests until the first point of the day, then wakes up, reacts to each new point and celebrates a full bar.
- A full bar suggests stopping: "you've done your part today", with a one-minute calm break.
- Progress shows full days this week. Days that didn't fill up aren't recorded.
- A warm "I missed you" after a gap of more than three days, saying nothing was lost.

### Changed
- Challenges and Journeys are one page: the journey in progress on top, then activities grouped by what the user wants to do now (arrange, get started, focus, calm down, think it through). Journeys open from the journey card instead of a sub-tab.

## Unreleased: prayer check-in instead of a lock

### Fixed
- A prayer window no longer locks challenges. Someone who had already prayed was blocked for about half an hour with only an OK button.

### Added
- A once-per-window check-in («صلّيت؟»): "Yes, I've prayed" continues the saved mission, "Not yet" opens an optional break reminder with the mission saved, "Not now" continues. Each prayer is separate, only one answer is kept, and it earns nothing.
- An optional break reminder: 10 to 30 minutes or custom, pause, change, cancel, "I'm back", and a welcome-back screen. It survives closing the app and switching language, and never claims anyone prayed.
- During a game, the check-in waits for the result screen between challenges.
- "Use My Location" with an explanation first, rounded to about 1 km and kept on the device, plus a searchable city list. Calculation method (9 options, Umm al-Qura default) and standard or Hanafi Asr. Sunrise shown apart.
- Settings to turn off prompts or the whole feature. Turning it off removes the city, location and answers.
- The companion knows the next prayer and minutes until it, only when set up, and says so instead of guessing when it isn't.
- `docs/PRAYER.md`.

### Changed
- Home shows a compact next-prayer row instead of replacing the mission with «وقت صلاة».

## Unreleased: two new activities

### Added
- **Just the First Step** (`micro_start`, بس أول خطوة): pick a task (including ones named in the chat), shrink its first step through five sizes or write your own, then try it with a 60-second timer, a 2-minute timer or none. No score; any answer to "did you start?" is fine.
- **Let's Think It Through** (`thought_sort`, خلنا نفكّر فيها): write up to five concerns, sort them into "I can act on it", "uncertain" and "revisit later", then choose one small next step. Stays on the device and is never sent to the AI.
- Both are in the catalog, journeys, recommendation engine and AI schema, with original art and full Arabic and English text. The real model now suggests them for "can't get started" and for worries.

### Changed
- On-request activities such as the feelings map rank behind others unless asked for by name.
- Deleting typed text also removes concerns, next steps and first steps.

## Unreleased: chat-to-game planning with your own tasks

### Fixed
- "رتبها يا وحش" showed a generic university morning after someone described their own projects, because games received nothing from the chat. It now receives the user's tasks.

### Added
- The AI lists the tasks the user named, in their own words. The server keeps only tasks whose words appear in what the user wrote, so it can't add lectures, exams or errands.
- A personal planning mode in `seq`: the user's tasks in Now / Later / Not today, then optional time blocks checked against the time they gave. No score, because priorities have no wrong answer. An optional "break after work" appears only if they mentioned work, and is labelled as a suggestion.
- With no tasks named, the board opens empty for the user to add their own.
- What the user chose is saved, the chat follows up with exactly those choices, and the AI can answer "what did I decide?" from the saved plan.
- Tests for the brief's acceptance cases A to I (`tests/pipeline.test.ts`), and six of them in `npm run eval:ai`.
- An evaluation framework for each challenge in `docs/CHALLENGES.md`.

### Changed
- The general `seq` exercise is labelled "Example scenario".
- Planning and advice replies never show the save card.
- Starter chips show only in an empty chat.
- Deleting typed text also removes planning tasks from the open mission and chat cards.

## Unreleased: helpful companion and a calmer Home

### Added
- The AI answers what the person asked first, with practical advice, and suggests an activity only when it helps. It returns an intent, goals, stated minutes and up to 3 activity IDs with a reason, all checked by the server. See `docs/AI.md`.
- A recommendation engine in `src/features/recommend/`: filters first (catalog only, fits the time, gentle on low-energy days, nothing twice marked unhelpful), then an explainable score and a reason from what was said.
- A compact suggestion card in the chat: Start, Another, Not now, or all of them as one short mission. Nothing starts on its own.
- An optional "Did this suit you?" question after a mission. Answers stay on the device and shape later suggestions.
- `npm run eval:ai`: 15 real conversations checked against the brief's rules. 15 of 15 passed on 2026-11-07.
- `docs/CHALLENGES.md`: what each activity is for, when it's suggested, and its limits.

### Changed
- Replies follow the language the person writes in, not only the app's language, including the support message and offline replies.
- Offline replies recognise goals such as prioritising, getting started, focus and rest, give reviewed advice, and offer a fitting activity. They are labelled on screen as limited mode, not AI.
- The context card no longer appears when someone is mainly asking for advice.
- Home shows one next step, a way to talk, and a small progress line. The shortcut grid, recent attempts and empty day cards are gone, and prayer time entry lives in ملفي.
- Your own long messages fold behind "Show more". Replies never fold.

### Fixed
- The chat on the Android emulator fell back to rules with no visible reason when the laptop server wasn't connected. The limited-mode label now says so.

## Unreleased: five-tab navigation

### Changed
- The navigation has 5 tabs instead of 7: الرئيسية، تحدياتي، خويّك، تطوري، ملفي. Journeys became a sub-tab of Challenges, and rewards a sub-tab of Progress, so every page is still one or two taps away.
- On phones, خويّك sits raised in the middle of the bar as the mascot.

### Removed
- The floating خويّك button on desktop, which repeated the chat tab.

## Unreleased: calculated prayer times

### Added
- Prayer times calculated on the device for 20 Saudi cities, with the Umm al-Qura method and Isha 30 minutes later in Ramadan. The user picks a city in onboarding or ملفي; no location is read and nothing is sent. Uses the MIT-licensed `adhan` library.
- With a city chosen, every prayer of the day is protected for the chosen minutes, and Home shows the next prayer. ملفي shows today's five times.

### Changed
- Entering the next prayer time by hand still works when no city is chosen, and is unchanged.
- Screens that said no prayer times are connected now say they're calculated on the device and can differ from a local mosque by a minute or two.

## Unreleased: Android app

### Added
- An Android app built with Capacitor from the same code, in `android/`. See `docs/ANDROID.md`. Runs on the Android emulator; games and the AI chat are not yet tried there.
- Android back button handling: it closes the top screen, steps back through onboarding, goes Home, then leaves the app in the background.
- The server accepts requests from the installed app's own origins. Other websites are still rejected.

### Changed
- The font is bundled instead of loaded from Google Fonts, so the app and website look right with no internet.
- Mascot clips are switched off in the iOS app, because its web view may not show WebM transparency.

## Unreleased: mascot animations

### Added
- Clips for the 10 remaining mascot states, so all 11 now have their own animation.

### Changed
- Reactions now last the length of their clips, 3 seconds instead of about 1, and also play during games.
- Clips are fetched ahead of time when the page is idle, unless someone has asked to save data or reduce motion. This adds about 3.6 MB.

### Fixed
- Switching clips no longer shows a blank frame.
- CSS movement no longer plays on top of a clip.

## Unreleased: English and Arabic

### Added
- A full English interface alongside Saudi Arabic, using `i18next` and `react-i18next`: landing, onboarding, all 7 tabs, all 12 challenges, the player, dialogs and the companion. See `docs/I18N.md`.
- A language switcher in the sidebar, landing, onboarding, the game header, the summary screen and ملفي. The choice is saved in the `kw2` data, and older data opens in Arabic with progress unchanged.
- Right-to-left and left-to-right layouts, set before the first paint so nothing flashes.
- Switching mid-game keeps the round, objects, timers, score and typed text, without a reload.
- Crisis detection and the support message in English. Crisis wording is checked in both languages whichever is showing.
- The AI companion replies in the selected language, and rule replies understand both.
- `tests/i18n.test.ts`: matching keys and variables, the agreed glossary, keys used in code, no hardcoded Arabic, plurals and server language.

### Changed
- Challenge and journey text moved from `catalog.ts` to locale files. Categories, sequence cards and answers now use stable IDs, so language can't affect validation.
- Mission reasons and summaries are saved as codes and facts, and written out when shown. Older saved reasons appear as they were written.
- The diagnosis filter no longer rejects honest refusals such as "I can't tell you if you have ADHD".

### Not changed
- Colors, art, animation, scoring, XP, levels, the mascot and saved progress.

## Unreleased: product redesign

### Changed
- **Design system:** type scale, spacing, shared UI kit (`components/ui/kit.tsx`), Lucide icons and original flat SVG art. No emoji anywhere in the interface; a test enforces this.
- **Dashboard:** compact welcome and energy check-in, mission timeline as the main focus, progress, quick actions and «ترتيب يومك».
- **Driving:** the card left the dashboard. The manual setting and hours moved to ملفي. All driving safety behaviour is unchanged: challenges are blocked and chat typing is disabled while it is on.
- **Challenge library:** featured challenge, animated category filters, 12 illustrated cards with real status. Challenges never played say «ما جربته للحين».
- **Shared player:** focused screen with one header (progress, round, pause, skip, end, exit, sound), intro, result and completion screens. The app behind it can't be reached by keyboard.
- **Journeys:** illustrated cards, real progress and a detail map showing what's done and what's next.
- **Chat:** status label, suggested messages, and confirmation cards where facts can be removed before saving.
- **Progress:** summary tiles, week and month chart with table view, separate scored and unscored results, self-reports labelled as such, and explained observations.
- **Rewards:** medals, unlocks and a challenge card collection.
- **ملفي:** grouped settings, a list of what's stored, data export, deleting typed text, removing saved context, and larger text.
- **Landing and onboarding:** redrawn hero, stepper, illustrated journey picker and skippable optional steps.
- **Mission reasons:** each step now gives its own reason, from what the user actually said.

### Six existing games
Challenge IDs, base XP and the half-XP rule are unchanged.
- `video`: redrawn animated scene, captions, restart, replay, hints. Clip data is separate from its player. The clip is still 24 seconds, and says so.
- `mem`: **gameplay fix.** Options now include objects that weren't on the tray; before, the answer was simply the one you could no longer see. Normal mode grows from 4 to 6 objects over 3 rounds, and easy stays at 1 round of 4.
- `seq`: mouse and touch drag, tap, and arrow buttons. Work, study and event examples, with the reason given when a step moves. The middle steps can still go in any order, and scoring is unchanged.
- `time`: running time stays hidden so the estimate means something. Bars compare estimate and actual, with an optional reflection.
- `calm`: pace choice, optional soft tone, a quiet break instead of breathing, and an option to skip the self-report.
- `start2`: examples, a ring timer, a privacy note and a clearer reflection.

### Scoring notes
- Using a hint means that question no longer counts as right first try. Hints are new, so no earlier result changes.
- The `mem` round count changed in normal mode, so its accuracy now moves in thirds instead of halves.

### Added
- Six new playable challenges from reference §9:
  - `attention_scene`: spot the differences, 25 XP, scored.
  - `priority_board`: sort into now, later and not today, 20 XP.
  - `breakdown`: split a task into steps with a plan, 25 XP.
  - `study_sprint`: focus timer with parked distractions, 30 XP, needs 60 active seconds.
  - `calm_landscape`: interactive oasis break, 10 XP, needs 20 seconds.
  - `emotion_map`: self-reported feelings. **0 XP, no achievements, no celebration, and never sent to the AI service** (reference 14.2).

### Fixed
- A manually entered prayer time no longer carries over to the next day.
- Keyboard users could reach the page behind the player.
- The landing demo no longer praises a 0% score.

## OpenAI chat (not yet versioned)

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
