# Prayer times and prayer-aware scheduling

Prayer times are an optional, supportive part of the day. They never lock the app.

## What was wrong

With a city set, `inPrayerWindow` was true from 2 minutes before each call to prayer until the protected minutes ended (30 by default). During that time the mission guard showed an overlay whose only button was OK, and Home replaced the mission with «وقت صلاة». Someone who had already prayed was blocked for about half an hour, five times a day, with no way to continue.

## How it works now

```text
Start or resume a challenge
  → driving?                → blocked (unchanged safety rule)
  → in a prayer window, "ask me" on, not answered for this window?
       → check-in: «صلّيت؟»
            إيه، صلّيت      → recorded for this window only → the mission opens or resumes
            لسه ما صلّيت    → optional break reminder; the mission stays saved
            مو الحين        → recorded for this window only → the mission opens or resumes
  → otherwise               → the challenge starts
```

- **Asked once per window.** The answer is keyed by the place's local date and the prayer (`2026-11-07:asr`), so Asr never covers Maghrib. Only the latest answer is kept, replaced by the next one, so no prayer history builds up.
- **Never verified, never rewarded.** It's the user's own report. It earns no XP and changes no challenge.
- **During a game** nothing interrupts the round. If a window started while playing, the check-in appears on the result screen between challenges, and auto-advance waits. "Not yet" saves the mission at the next challenge and opens the break.
- **Home** shows a compact next-prayer row with the time remaining, a small check-in card only during a window, and a reminder row while a break runs. The next step stays the main thing on screen.

### The break

- Pick 10, 15, 20 or 30 minutes, or type 1 to 120. Pause, resume, change the length, cancel, or go back to the dashboard while it runs.
- It's saved in state, so closing the app, reloading or switching language keeps the same reminder.
- When time is up the app shows «حيّاك، نكمل من وين وقفنا؟» with continue, more time or "in a bit". If the user already allowed notifications in My Profile and the browser granted them, a notification is shown while the app is open in the background. The app can't reopen itself.
- Time running out never means the user prayed. Coming back (`back`) only stops this window's prompt.

## Where the times come from

**Calculated on the device with the MIT-licensed [adhan](https://github.com/batoulapps/adhan-js) library.** No prayer API is called and no coordinates leave the phone.

The brief suggested the AlAdhan API (`method=4`, `school=0`). We kept on-device calculation because it works offline, sends nothing about the user's location to a third party, and can't go stale or fail with a network error. The defaults match AlAdhan's: Umm al-Qura (method 4) and standard Asr (school 0). AlAdhan could be added later as an optional cross-check; it isn't connected.

| Setting | Options | Default |
|---|---|---|
| Place | One of 20 Saudi cities (searchable), or the device's location once | none |
| Method | Umm al-Qura (Makkah), Muslim World League, Egyptian, Karachi, ISNA, Dubai, Qatar, Kuwait, Diyanet | Umm al-Qura |
| Asr | Standard or Hanafi (later) | Standard |
| Protected minutes | 0, 20, 30, 45 | 30 |
| Ask me before pausing challenges | on or off. Off means no prompts at all | on |
| Prayer-aware scheduling | on or off | on |

- Umm al-Qura sets Isha 90 minutes after Maghrib, 120 in Ramadan (Umm al-Qura calendar from the device).
- Sunrise is shown separately and is not treated as a prayer.
- The screens name the method and say times can differ from a local mosque by a minute or two. Check results against the [official Umm al-Qura calendar](https://www.ummulqura.org.sa/prayer-times); only Riyadh on one date has been compared so far (`tests/prayer.test.ts`).
- Per-prayer minute adjustments aren't supported yet.

## Location and privacy

- "Use My Location" first explains why, then asks the browser once (no high accuracy, no tracking). Coordinates are rounded to 2 decimal places (about 1 km) and kept with the device's time zone. Times are shown as "Your location (near Riyadh)" when within 40 km of a listed city.
- Denied, timed out, unavailable, insecure page or unsupported device: a clear message, and the city list keeps working.
- On Android the app asks only for approximate location (`ACCESS_COARSE_LOCATION`).
- The companion receives only the next prayer's name, the minutes until it and whether a window is active. Never the location or any check-in answer. With no prayer times set up it gets nothing, and the prompt tells it not to guess.
- **Remove my location** clears the coordinates. **Turning the feature off** clears the city, location, typed time, answer and any break.

## Edge cases

| Case | Behaviour |
|---|---|
| Location denied or unavailable | Message, city list still works |
| Travelling abroad | Location mode uses the device's time zone at the time of sharing |
| Device time zone differs from the city | Times and dates follow the city's zone (`Asia/Riyadh` for listed cities) |
| Isha window crosses midnight | Yesterday's Isha is checked, and the window keeps the evening's key |
| Opened after a prayer already started | Asked if still inside the protected minutes |
| Already answered this window | Not asked again until the next prayer |
| Browser closed during a break | The reminder and the saved mission are there on return |
| Back after the reminder ran out | Welcome-back screen, no claim of prayer |
| Language switched during a break | Same reminder, same time left |
| No city, location or typed time | No prayer row, no prompt, no invented time |
| Impossible place or time zone | No times shown, never a fake one |
| Prayer API down, stale data, offline | Not applicable: nothing is fetched |
| Feature off | No prompts; missions fully available |

## Tests

`tests/prayer-flow.test.ts` covers tests A, B, C, D, H and the edge cases above. `tests/prayer.test.ts` checks the calculation against published Riyadh times. `npm run eval:ai` has two prayer cases.
