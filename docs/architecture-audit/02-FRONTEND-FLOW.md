# 02 · Frontend flow

How each screen is reached, what it reads and writes, and what is real versus hardcoded. All persistence below means the `kw2` document in `localStorage`, unless stated otherwise.

## Top-level gate (`src/App.tsx`)

```
started == 0 ─► <Landing/>
started == 1 && done == 0 ─► <Onboarding/>
done == 1 ─► <MissionProvider><AppShell/></MissionProvider>
```

`AppShell` renders `PAGES[view]`. `NavBar` has five tabs: Home, Challenges, خويّك (raised in the middle on phones), Progress and ملفي (Settings). Journeys and Rewards are sub-tabs of Challenges and Progress. There are no URLs. A browser refresh returns to the saved `view`.

`MissionProvider` wraps the shell. It owns the full-screen `MissionPlayer`, the driving, prayer and conflict blockers, and sets `#app.inert` while a dialog or the player is open.

## 1. Landing (`src/pages/Landing/index.tsx`)

- Static marketing sections: hero, how it works, meet the mascot, a playable demo, journeys, a Saudi context section, honesty notes.
- **Demo:** embeds the real `MemoryGame` on easy. The score is shown but **not saved**.
- **Mascot:** tapping cycles reactions (`curious → happy → celebrating → greeting → encouraging`). Sections reveal on scroll through `IntersectionObserver`.
- The CTA sets `started = 1`, the only state the landing page writes.
- The Saudi section (prayer, driving, family, Ramadan, work, weather) is marketing copy. None of it is connected (see §9).
- Verified in the browser: renders RTL at 1280 px and 375 px, with no console errors.

## 2. Onboarding (`src/pages/Onboarding/index.tsx`)

Five steps. Only step 1 is required. Steps 2 to 5 have Skip.

| Step | Collected | Field |
|---|---|---|
| About | name (max 40 chars, defaults to a gendered placeholder), grammatical address m/f | `name`, `g` |
| Journeys | any of 8 journeys (named as everyday areas, not conditions; ids are still `adhd`, `anx`, `ocd`, …) | `needs` (defaults to `['gen']`) |
| Day | schedule work/study/flex, active morning/evening, sleep early/late/skip | `sched`, `pat`, `sleep` |
| Prayer | protected minutes 0/20/30/45, optional Saudi city | `pp`, `city` |
| Comfort | sound, reduced motion | `snd`, `rm` |

- **Validation:** only a trim on the name. Everything else is chosen from fixed options.
- **Storage:** the draft lives in component state and is written once, on Finish (`Object.assign(d, tm, …)`), with `done = 1` and a first chat message.
- **Refresh mid-onboarding loses the draft.** `started` is saved, so the user lands back on step 1 with empty answers.
- There is no user profile or account. The "profile" is the fields above, saved on the device only.
- `sleep` and `pat` are collected but no code reads them for planning (searched: only Settings displays `pat`).

## 3. Home (`src/pages/Home/index.tsx`)

One "next step" card, chosen in this order:

1. **Driving on** → stop card, link to Settings.
2. **Inside a prayer window** (`inPrayerWindow`) → prayer card, no start button.
3. **Open mission** (`hasOpenMission`) → "pick up where you left off", with restart / easier / skip options.
4. **Today's daily mission done** (`lastDaily.d === today()`) → one extra suggestion from `recommend()`.
5. **Otherwise** → today's daily mission from `generateMission()`, with its reason text (`missionReason()`).

Then: an energy check-in (high / mid / low → `en[]`, one per day), a chat shortcut, a level and XP bar, and a "day context" list (next prayer, approved context tags).

- **Recommendations** are rule-based and deterministic (`planner.ts`, `recommend/engine.ts`). No AI is involved on Home.
- **XP / level:** `level = floor(xp / 100) + 1` (`utils/index.ts:5`). The XP bar is `xp % 100`.
- **Hardcoded:** the daily mission template (always `video`, then `mem` or `seq`, then `calm`, `start2` or `time`), greetings by hour, and reason sentences from the locale files.

## 4. Companion, خويّك (`src/pages/Companion/index.tsx`)

**It is a real LLM integration, with a keyword fallback.** It is not an agent: it has no tools, no function calling, no server memory, and it cannot read or change anything on its own.

### Message trace (AI mode)

```
<input> submit
 └─ send(v)                                   pages/Companion/index.tsx:64
    ├─ guard: empty / waiting / driving → return
    ├─ before = store.getState()              (history snapshot excludes this message)
    ├─ store.update: chat.push({t: v})        → saved to localStorage
    ├─ useAi = server /v1/health says ai:true AND aiConsent === 1
    └─ aiCompanion.respond(v, before)         services/companion.ts:20
       ├─ detectCrisis(v) on the device → if hit, ruleReply (reviewed text), nothing sent
       ├─ buildChatRequest(v, before)         features/companion/request.ts
       │    message, last 8 non-card non-crisis chat lines,
       │    context: address, lang, energy today, confirmed ctx tags, feedback net scores,
       │             attempt counts, avg accuracy, per-challenge count + last accuracy
       │    (never sent: name, journeys, typed game text, emotion_map results)
       └─ POST /v1/chat/messages (25 s timeout)
          server/api.ts: origin check → JSON only → 20/min/IP → 32 KB cap
          server/chat.ts handleChat:
            parseRequest (whitelist, clamps, catalog-only ids)
            → detectCrisis again → crisis reply (no OpenAI call)
            → OpenAI /moderations (5 s) → self-harm categories → crisis reply
            → OpenAI /responses: SYSTEM_PROMPT + developer CONTEXT JSON + history + message,
              strict JSON schema, reasoning effort low, store:false, one retry on network error
            → acceptOutput: parse, length ≤ 1400, distress flag → crisis reply,
              diagnosis-pattern filter, catalog-only suggestion ids, goal whitelist
    ◄─ { reply, tone, intent, lang, goals, minutes?, suggest?, pending? }
 ├─ on any error → ruleCompanion.respond(v, before) and show "fell back" banner
 ├─ proposal → buildSuggestion() → recommend() filters again (time, energy, "not for me" feedback)
 └─ store.update: push reply, optional suggestion card, optional context card (pend)
```

### Answers to the audit questions

| Question | Finding |
|---|---|
| Rule-based, mocked or LLM? | LLM (OpenAI Responses API) when the server has a key **and** the user consented. Otherwise keyword rules (`rules.ts`). The status label says which. **Verified:** a real reply arrived in 4.5 s. |
| Message storage | `chat[]` in localStorage. Never trimmed. |
| History persistent? | Yes on this device. Not on the server (`store: false`). The model sees only the last 8 lines. |
| Access to the profile? | Only the address form (m/f), language and today's energy. Not the name, journeys, schedule or city. |
| Challenge history? | An aggregate summary only: counts, average accuracy, last accuracy per challenge, feedback score. No dates and no per-attempt detail. |
| Progress and achievements? | Counts only. No XP, level or achievements are sent. |
| Can it modify the daily plan? | **No.** It can propose context flags (`event`, `work`, `sleep`, `low_energy`) and up to 3 catalog activity IDs. The user confirms through a card. "Save and lighten" sets `pref = 'short'`. |
| Permission before saving? | Yes. Context goes into `pend` and is only written to `ctx` / `en` after the card is confirmed. The user can drop single facts first. **But** the saved facts never expire (see 04, H-1). |
| Emotional context and safety | Three crisis layers: keywords on the device and on the server (both languages, idiom-aware), OpenAI moderation, and the model's `distress` flag. Crisis text is excluded from later history. Replies that look like a diagnosis are rejected. **Verified:** «ابي اموت» got the reviewed 997/937 message locally. |
| Saudi Arabic via system prompt? | Yes. `server/prompt.ts` sets a Najdi/Saudi voice, gender agreement and replies in the user's language. |
| Function calling / agent orchestration? | **None.** It is a single structured-output call. No tool loop, retrieval or memory writes. |

## 5. Daily mission engine

See 03 for the full state machine. In short: `MissionProvider.start()` → guards (driving, prayer, open mission conflict) → `createMission` → `MissionPlayer` phases `intro → preroll → game → result → (easier?) → … → finish`. Every transition is written to localStorage right away.

## 6. Challenges library (`src/pages/Challenges`) and Journeys (`src/pages/Journeys`)

- Filter by category, then play any of the 12 as a one-item "solo" mission (`missions.start([{id, why: [{k: 'self'}], diff: 'normal'}])`).
- Journeys toggle `needs` and list each journey's activities with a Play button.

## 7. Progress (`src/pages/Progress/index.tsx`)

All numbers come from the real `hist[]` (`progressStats`). There is **no placeholder data**. Verified after a played mission: "2 of 3 completed, 55 points, 67%, 100% accuracy".

- Tiles: completed, level and XP, completion rate, average first-try accuracy.
- A 7-day bar chart, and a 30-day view once there is more than a week of history.
- Scored challenges with a sparkline. Unscored ones with the median duration.
- Self-report: energy check-ins, calm helpfulness answers, `emotion_map` feelings, `start2` tasks.
- "Insights" are fixed sentences filled with counts. After ≥ 4 attempts it shows a tentative "short activities" note. Nothing is inferred by AI.

## 8. Rewards (`src/pages/Rewards/index.tsx`)

- XP and level from `s.xp`. Six achievements are computed on every render from `hist` (`achievements.ts`); none are stored.
- Unlocks: a lilac theme at level 3, a mascot hat at level 4. The hat only appears on the static SVG mascot. Animated clips are turned off while the hat is shown.
- A sticker collection: one per non-self-report challenge completed.
- **No redemption, partners or vouchers.** The page says so (`rewards.noPartners`).

## 9. Saudi context

| Feature | Real behaviour | External integration? |
|---|---|---|
| Prayer | Umm al-Qura times for 20 cities, calculated on the device (`prayer/times.ts`), with Ramadan Isha adjusted. Without a city, one manual `HH:MM` that expires each day. Blocks starting challenges from 2 min before adhan to `pp` minutes after. | No. Offline calculation. |
| Driving | A manual "I'm driving now" toggle disables chat input and blocks challenges. "Hours driven" shows a break tip at ≥ 2 h. | No |
| Calendar / events | Only the `event` tag, from a confirmed chat. It changes `mem` to `seq` in the plan. | No |
| Traffic | Not implemented beyond the driving toggle | No |
| Weather | Landing copy only | No |
| Family events | The same `event` tag | No |

## 10. Settings (`src/pages/Settings/index.tsx`)

Name, address form, journeys link, mission length (`pref`), language, accessibility (reduced motion, sound, larger text), schedule, city or manual prayer time, protected minutes, driving, AI consent toggle, a list of stored data, removing approved context tags, **export JSON**, **clear typed text**, and **delete everything** (clears `kw2` and reloads).
