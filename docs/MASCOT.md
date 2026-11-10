# Mascot system

## Using it

```tsx
const mascot = useMascot(isLowEnergy ? 'resting' : 'idle'); // base state, from real app state

<Mascot state={mascot.state} size="medium" interactive />

mascot.play('celebrating'); // one-time reaction, then back to the base state
mascot.clear();             // end a reaction now
```

| Prop | Meaning |
|---|---|
| `state` | One of the 11 states below |
| `size` | `small`, `medium`, `large` or a number of pixels |
| `interactive` | Small hover and focus response |
| `still` | Stops continuous movement for focus tasks; one-time reactions still play |
| `label` | Screen reader text; leave empty when decorative |
| `onClick` | Makes the mascot a real button |

## States

| State | Type | Where the app uses it |
|---|---|---|
| `idle` | Held | Default on most screens |
| `listening` | Held | Chat while typing; game instructions |
| `thinking` | Held | Chat only while a request is pending |
| `calm` | Held | Breathing game; supportive chat replies |
| `resting` | Held | Low energy; pause screen |
| `concerned` | Held | Crisis replies; offering an easier task |
| `greeting` | One-time | Landing, onboarding, first Home visit, mission intro |
| `happy` | One-time | Correct answers, friendly replies, earned achievements |
| `celebrating` | One-time | Completed challenges and missions, level 3 and above on Rewards |
| `encouraging` | One-time | Wrong answers, completed onboarding steps |
| `curious` | One-time | Questions, moving to the next challenge |

Reactions come only from real events. A repeat of the reaction already playing is ignored.

## Artwork status

| Asset | Status |
|---|---|
| `public/mascot/base/pose-main.png` | Used as the still image for every state |
| `public/mascot/animations/*.webm` | A clip for all 11 states. Reactions are 3 seconds, `calm`, `resting` and `idle` are 5 |

Clips play for every state, except on Safari, under reduced motion, or once the level 4 hat is unlocked. During a focus task a still mascot plays reactions only, and holds no looping clip.

Without a clip, the mascot falls back to the still image with whole-body CSS movement and small effects around the character (`MascotFx.tsx`). Because that image is a single pose, **the face doesn't change in those cases**.

## Adding a new animation

1. Generate the clip in Masko from the main pose, starting and ending on that pose.
2. Save it as `public/mascot/animations/<state>.webm`, using the state names above.
3. Add one line to `CLIPS` in `src/components/mascot/manifest.ts`:

```ts
happy: clip('happy'),
```

Still images work the same way, through `EXPRESSIONS` and `public/mascot/expressions/`. For a one-time state, set its duration in `ONE_SHOT_MS` to the clip's length. Clips are fetched into the browser cache when the page goes idle (`preloadClips`), about 3.6 MB in total.

## Fallbacks

| Situation | What shows |
|---|---|
| Reduced motion, or `still` | Still image |
| Safari | Still image with CSS movement, because WebM transparency isn't reliable there (not yet tested on a real device) |
| Hat | Removed. The mascot always shows its clip or still art, with no overlay |
| Image fails to load | The prototype's drawn mascot |

## Open artwork questions

- **Color:** the brief says sage `#8DBFA3`, while the approved art is mint, about `#85E3B0`. The art was left unchanged, and the team needs to choose one.
- **Head angle:** the brief asks for a perfectly upright head, and the main pose looks slightly tilted. This can only be fixed by generating a new pose.
- **Name:** the character is called Numo in Masko, while the app is خويّك.
- **Licence:** confirm that your Masko plan allows use on your site.
