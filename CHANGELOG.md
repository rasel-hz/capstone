# Changelog

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
