# خويّك | Khowayk — Task Catalog by Category

> **Version:** 0.1 draft, 2026-11-06
> **Audience:** frontend (build the tasks), AI agent (choose between them), content and clinical reviewers
> **Companion to:** [KHOWAYK_REFERENCE.md](../KHOWAYK_REFERENCE.md). `§9` means section 9 of that file; "section 4" means this file.
> **Status:** `[PROPOSED]`. Nothing here is built yet, and all Arabic copy is a draft that needs review.

## 1. The short version

The prototype has 8 categories (journeys) but only 6 games, so most categories reuse the same tasks. For example, social confidence currently gets a sequencing game and a memory game, and neither one involves a social situation.

**Build these 8 new tasks first.** This follows the §9 release rule of 5–8 fully playable templates. Together with the 6 existing games, they give every category except OCD at least one task that fits it.

| Build order | ID | Arabic title | Categories it serves | Why it's in the first batch |
|---:|---|---|---|---|
| 1 | `sensory_preferences` | اختَر راحتك | `aut`, all | Other tasks read these settings, so it comes first |
| 2 | `priority_board` | وش أول شيء؟ | `adhd` | Simplest drag-and-tap board; later tasks reuse it |
| 3 | `breakdown` | فكّكها | `adhd`, `mood` | Builds on the board; adds if-then planning |
| 4 | `activity_plan` | خطوة تعدّل جوّك | `mood`, `gen` | Best evidence in this catalog. **New: not in §9** |
| 5 | `grounding_54321` | حولك وش فيه؟ | `anx`, `gen` | Alternative for people who dislike breathing exercises |
| 6 | `thought_sort` | خلنا نفكّر فيها | `anx` | Reuses the board mechanic |
| 7 | `routine_builder` | رتّب روتينك | `sleep`, `aut` | One builder with two variants |
| 8 | `social_dialogue` | وش ترد؟ | `soc` | First task that actually practises a social situation |

**The OCD category (`ocd`) gets no new task until a clinician has reviewed the content.** See section 4.3 of this file. The team needs to decide what that category shows in the meantime.

**Fix the existing games first.** The bugs in the current games (section 7 of this file) would carry straight over into the new tasks if they're copied as a pattern.

## 2. What the research changed

| Finding | What we do because of it | Strength of evidence |
|---|---|---|
| Internet-delivered behavioural activation reduces depressive symptoms, though the reviews note some risk of bias | Add `activity_plan`, which §9 doesn't include | **Strongest here**, but it's about depression rather than everyday low mood |
| Forming if-then plans helps people reach goals in general (94-study meta-analysis). In children, ready-made plan sheets worked better than free-form sentences | `breakdown` uses fill-in-the-blank if-then plans | Good in general, but ADHD data is mostly children; **I found no trial in adults with ADHD** |
| Adults with ADHD say tools focus on completion and give little help with starting tasks, estimating time, or emotions | Prioritise starting tasks over tracking them | Qualitative only (22 interviews) |
| Near-term game gains don't reliably carry over to real life, and the largest far-transfer effects in ADHD games came from the highest-risk-of-bias studies | **Never claim games improve attention or treat ADHD.** Prefer tasks that produce something usable, like a plan | Moderate; still debated |
| Worry postponement results are mixed: one 2024 trial helped, an earlier trial and an internet-delivered version didn't | Offer it as an optional ending to `thought_sort`, not as its own task | Mixed |
| Cognitive restructuring is common in anxiety treatment protocols (60%) but rare in popular apps (12%) | `thought_sort` is a useful gap to fill | One app review |
| Chatbots can become a reassurance compulsion for people with OCD, and reviewers call for safety testing of this specifically | AI guard rule in section 8 of this file; no repeatable "check" tasks in `ocd` | Emerging; a review plus clinician commentary, no controlled trials |
| Standalone sleep hygiene education hasn't shown efficacy. Sleep restriction is generally not prescribed with untreated bipolar disorder or uncontrolled seizures | Present `routine_builder` as routine support, never insomnia treatment. **Don't build sleep restriction** | Good (AASM, clinical references) |
| In Saudi studies, Ramadan often shifts sleep later and sometimes shortens it, but results vary and routine seems to matter more than fasting itself | Offer an optional Ramadan template; never assume it applies | Small, mixed studies |
| Fully digital social anxiety CBT has been tested, but the trial's authors say apps often lack interactive exercises and that risks are understudied. **I found no trial of app-based role-play in young adults** | Build `social_dialogue` as practice with no "correct" answer, and include an exit | Weak for this exact mechanic |
| Autistic adults lost agency when settings were imposed, automation was opaque, or stimuli were excessive. Masking carries real costs, and communication difficulty runs both ways | Users control all sensory settings; **no task trains eye contact or "acting normal"**; `social_dialogue` isn't a default for `aut` | Participatory research; no outcome trials |
| Acceptance of mental health apps in Saudi Arabia depends on usefulness, ease of use and social endorsement, plus religious and social considerations | Keep clinical labels out of the UI; make prayer and religious content optional | One acceptance survey |
| Popular gamified features include streaks and daily rewards, and critics warn they can frame distress as a failure of effort. I found no study measuring harm from streaks | Keep the prototype's no-streak policy; never give XP for sharing feelings | Ethics commentary only |

**Limits of this research:** it comes from web searches and mostly abstracts or summaries, and I didn't read every paper in full, so check any figure before quoting it. It isn't a clinical review. The searches found **no direct evidence on 5-4-3-2-1 grounding, on intolerance-of-uncertainty programs, or on side effects of breathing exercises**. Those tasks are included because they're common practice or required by §8.5, not because this research validated them.

## 3. Rules every task follows

### 3.1 The game interface

Each game is a React component that receives `GameProps`.

```tsx
export function YourGame({ diff, env, onDone }: GameProps) {
  const timers = useTimers(env.paused); // delays that pause with the game and stop when it closes
  env.say('curious', 'نص خويّك');        // updates the mascot and its speech bubble
  // Call this when the task has really finished:
  onDone({ acc: null /* or 0-100 when scored */, retries: 0, data: { /* task-specific */ } });
}
```

To add one, follow "Adding a game" in [ARCHITECTURE.md](ARCHITECTURE.md). References elsewhere in this catalog to `CH`, `JN`, `cb` and `G` are the prototype's names for `CHALLENGES`, `JOURNEYS`, `onDone` and `useTimers`.

### 3.2 Defaults (each task only lists where it differs)

| Rule | Default |
|---|---|
| **Score** | `acc: null`. Most new tasks have no right answer, so show no percentage |
| **Completion** | Only when the task's own completion rule is met (§10.3). Timers running out don't count |
| **XP** | Flat, once per attempt, for finishing the interaction. Never for what the user revealed (§14.2). Never for real-world results we can't verify |
| **Skip / end** | Handled by the mission shell: `SKIPPED` / `ABANDONED`, 0 XP, no guilt in the wording |
| **Resume** | Save after each step to `it.checkpoint`. If it can't be restored, say so and restart the task |
| **Input** | Every drag has a tap alternative: tap a card, then tap its destination. All controls are real `<button>`s |
| **Motion and sound** | Respect `S.rm` and `S.snd`. Nothing depends on sound alone |
| **Mascot** | Stays still during focus steps (§3.2) |
| **Free text** | Always escape it before rendering (§19.3 XSS risk). Set with `textContent`, never `innerHTML`. Keep it on the device and let the user delete it |
| **Blocked when** | `S.driving`; inside a prayer window (handled by `guard()`) |
| **Gendered copy** | Use `T(m, f)` where Arabic needs it; drafts below are mostly gender-neutral |

## 4. Tasks per category

"Now" shows the current mapping in the prototype's `JN` array. Listed order is the suggested order on the journey map.

### 4.1 Category map

| ID | Category | Now | Proposed first batch | Later (section 6) |
|---|---|---|---|---|
| `adhd` | التركيز والتنظيم | `video`, `seq`, `time`, `mem`, `start2` | `start2`, `priority_board`, `breakdown`, `seq`, `time`, `video` | `switch_rules`, `study_sprint` |
| `anx` | الهدوء والقلق | `calm`, `video`, `mem` | `grounding_54321`, `calm`, `thought_sort`, `mem` | `emotion_map` |
| `ocd` | التعامل مع عدم اليقين | `calm`, `time` | **Team decision needed** (section 4.3) | `uncertainty_education` once reviewed |
| `mood` | المزاج والحماس | `start2`, `calm`, `seq` | `activity_plan`, `start2`, `breakdown`, `calm` | `self_compassion` |
| `sleep` | النوم والروتين | `calm`, `seq`, `time` | `routine_builder` (evening), `calm` | `sleep_winddown` |
| `soc` | الثقة الاجتماعية | `seq`, `mem` | `social_dialogue`, `grounding_54321` | `family_event_plan` |
| `aut` | روتين واضح وهادئ | `seq`, `time`, `calm` | `sensory_preferences`, `routine_builder`, `time` | `time_buffer` |
| `gen` | عافية عامة | `video`, `mem`, `calm`, `time` | `activity_plan`, `grounding_54321`, `mem`, `video` | `daily_reflection` |

```js
// Replacement for the `a:` arrays in JN, once the new tasks exist.
adhd:  ['start2','priority_board','breakdown','seq','time','video'],
anx:   ['grounding_54321','calm','thought_sort','mem'],
mood:  ['activity_plan','start2','breakdown','calm'],
sleep: ['routine_builder','calm'],
soc:   ['social_dialogue','grounding_54321'],
aut:   ['sensory_preferences','routine_builder','time'],
gen:   ['activity_plan','grounding_54321','mem','video'],
// ocd: see section 4.3
```

### 4.2 Why some tasks left a category

- **`seq` and `mem` leave `soc`:** they don't practise anything social.
- **`seq` leaves `aut` and `sleep`:** it marks a single order as correct, while `routine_builder` lets people build their own.
- **`time` leaves `sleep`:** counting to ten doesn't help with sleep.

### 4.3 The OCD category needs a decision

§9 and §11.6 forbid unsupervised exposure content and require reviewed material. Beyond that, tasks that are harmless elsewhere could backfire here. A clinician should confirm these concerns, which come from general reasoning plus the reassurance research rather than from a study of these specific tasks:

- `calm` could become a way of neutralising distress.
- `thought_sort` could become repeated checking or rumination, so it's not offered in this category.
- Repeatable tasks with feedback could turn into reassurance.

**Recommendation:** until someone clinically qualified reviews `uncertainty_education`, show this journey as «قريبًا» and don't offer it during onboarding. Users who want it can use `gen` in the meantime. If the team has no clinical reviewer before the capstone demo, leave this journey out of the demo.

## 5. First-batch task specs

### 5.1 `sensory_preferences` — اختَر راحتك

- **Categories:** `aut`, available to everyone from «ملفي». Category `تهيئة`.
- **Time:** about 1 min. **XP:** 10, the first time only.
- **Mechanic:** one setting per screen, each with a live preview on a small oasis scene.
  - الصوت: شغّال / واطي / مقفل
  - الحركة: عادية / أقل / بدون
  - ألوان الخلفية: عادية / هادئة
  - حركة خويّك: عادية / ثابت
  - المؤقت: ظاهر / مخفي
  - **بعد كل تحدي:** ننتقل تلقائيًا / أنا اللي أضغط «التالي»
- **Completion:** settings saved. Applies across the app immediately, and can be changed any time.
- **Difficulty:** none.
- **Needs approval:** the "I press next" option is an accessibility exception to the auto-advance rule in §10.3. Predictability is the reason for it.

### 5.2 `priority_board` — وش أول شيء؟

- **Categories:** `adhd`. Category `تخطيط`.
- **Time:** 2 min. **XP:** 20.
- **Mechanic:** place cards into three columns: **الحين / بعدين / مو اليوم**, then pick one card from «الحين» as the first thing to do.
- **Limit:** «الحين» holds 3 cards (normal) or 1 card (easy). When it's full, the mascot asks «وش نأجل؟» rather than showing an error.
- **Cards:** the user can add their own. Otherwise use seeds:
  - أرد على رسالة مهمة · أجهز ملابس بكرة · أرتب مكتبي · أذاكر أو أخلص شغلة الدوام · أكلم أهلي · أحجز موعد · أطلع أتمشى · أدفع فاتورة
- **Difficulty:** easy = 4 cards; normal = 6–8.
- **Completion:** every card placed and one chosen.
- **Result:** `data: { now: [...], later: [...], notToday: [...], first: '...' }`
- **Next step:** offer to start `start2` with the chosen card already filled in.
- **Never:** say a placement is wrong, or pull cards from a calendar or chat unless the user confirmed that context.

### 5.3 `breakdown` — فكّكها

- **Categories:** `adhd`, `mood`. Category `مهمة حقيقية`.
- **Time:** 3 min. **XP:** 25, for the plan only.
- **Steps:**
  1. Type a big task or pick one: أذاكر للاختبار · أجهز العرض · أرتب الغرفة · أخلص المعاملة.
  2. Build 2–5 small steps. Examples appear for the seed tasks, and the user can edit, reorder or delete them.
  3. Fill in a ready-made plan: **«إذا [وقت أو موقف]، بسوي [الخطوة الأولى]»**. Choices for the first blank: بعد الصلاة (optional) · بعد القهوة · أول ما أوصل البيت · الساعة ___.
- **Difficulty:** easy = one step and the plan; normal = up to 5.
- **Completion:** at least one step and a complete plan.
- **Result:** `data: { task, steps: [...], plan: { when, firstStep } }`
- **Follow-up (optional, next visit):** «بدأتها؟» بدأت / شوي / لا لسا. Every answer gets a kind response. No XP for it, because we can't verify it.

### 5.4 `activity_plan` — خطوة تعدّل جوّك

**New proposal, not in §9.** Needs product approval and content review.

- **Categories:** `mood`, `gen`. Category `مزاج`.
- **Time:** 2 min to plan, then a short check-in later. **XP:** 20, for planning.
- **Steps:**
  1. Pick one small activity:
     - **ناس:** أكلم أحد أحبه · أقعد مع أهلي
     - **حركة:** أمشي ١٠ دقايق · أتمدد
     - **شيء أحبه:** أسمع شيء أحبه · أشرب قهوتي على هوني
     - **إنجاز صغير:** أرتب زاوية وحدة · أخلص شغلة صغيرة
     - **معنى (اختياري):** وقت هادي · شيء أسويه لغيري
     - **من عندي:** free text
  2. Pick when: اليوم الصبح / العصر / بعد المغرب / الليل / وقت ثاني.
  3. Optional: «كيف جوّك الحين؟» from 1 to 5, with «أفضّل ما أقول» always available.
- **Check-in (next visit):** «سويتها؟» إي / شوي / لا. If yes, optionally ask how they feel from 1 to 5.
- **Difficulty:** easy shows only the 5-minute options, used when the user reported low energy.
- **Completion:** activity and time chosen.
- **Result:** `data: { activity, when, moodBefore?, did?, moodAfter? }`
- **Insights:** say «قلت لي» and only after several entries. **Never** present it as improvement or infer a condition.
- **Exclusions:** don't offer it right after a crisis response. Never make the user feel behind for not doing it.

### 5.5 `grounding_54321` — حولك وش فيه؟

- **Categories:** `anx`, `soc`, `gen`. Category `استرخاء`.
- **Time:** 2 min. **XP:** 15.
- **Mechanic:** one prompt at a time. Tapping fills in a small part of an oasis scene, so nobody has to type or say anything.
  1. ٥ أشياء تشوفها
  2. ٤ أشياء تقدر تلمسها
  3. ٣ أصوات تسمعها
  4. ٢ روائح تلاحظها
  5. ١ شيء تقدّره في هاللحظة
- **Every step has «تخطَّ هذي»**, because not every sense is available or comfortable for everyone.
- **Difficulty:** easy = 3-2-1.
- **Completion:** reach the final step. Then ask «كيف حسيت؟» ارتحت / شوي / ما فرق.
- **Result:** `data: { help, skipped }`. **Store nothing about what they noticed.**
- **Never:** promise relief, or use it as a crisis response. A crisis goes to the safety flow (§11.6).
- **Evidence note:** I found no direct trial of this technique, so it's included as common practice and §8.5's alternative to breathing.

### 5.6 `thought_sort` — خلنا نفكّر فيها

- **Categories:** `anx`. **Not offered in `ocd`** (section 4.3). Category `تفكير`.
- **Time:** 3 min. **XP:** 20. **Limit:** once a day, so it doesn't become a loop.
- **Steps:**
  1. Type up to 3 worries or use seeds: بكرة عندي عرض ولسا ما جهزت · يمكن أتأخر على الدوام · وش بيقولون لو غلطت؟ · مدري وش بيصير بعدين.
  2. Sort each into **أقدر أسوي فيها شيء** or **مو بيدي الحين**. No answer is wrong.
  3. For «أقدر»: pick the next small step (can pass it to `breakdown`).
  4. For «مو بيدي»: choose one: أحطها لوقت ثاني (pick a time) / أرجع ليومي / أكلم أحد أثق فيه.
- **Difficulty:** easy = one worry.
- **Completion:** every worry sorted and one action picked.
- **Result:** `data: { sorted: [{ text, bin, action }] }`. Worry text is sensitive: keep it on the device, make it deletable, and share it with the AI only if the user agrees.
- **Copy to avoid:** «لا تشيل هم» or anything saying the worry isn't real or won't happen.
- **Exit:** if the user types something about harm or danger, stop and go to the safety flow (§11.6).

### 5.7 `routine_builder` — رتّب روتينك

- **Categories:** `sleep` (evening), `aut` (any time of day). Category `روتين`.
- **Time:** 3 min. **XP:** 20.
- **Mechanic:** pick cards, put them in your own order, optionally add times. The result is a visual schedule saved to «الرئيسية».
- **Morning cards:** أصحى · أشرب موية · ألبس · أفطر · أجهز شنطتي · أطلع بدري · الصلاة (اختياري).
- **Evening cards:** أجهز ملابس بكرة · أكتب اللي في بالي · أوقف الشاشات · أنوّر خفيف · أقرأ شوي · الصلاة (اختياري).
- **Add your own:** always available.
- **Variants:**
  - **`sleep`:** the evening set, with a reminder that this is a routine aid, not insomnia treatment.
  - **`aut`:** icon plus text, no animation, every step shown from the start, and a preview of what happens next.
  - **Ramadan (optional):** the user picks it themselves. Never turn it on automatically or assume fasting.
- **Difficulty:** easy = 3 steps from a ready-made suggestion.
- **Completion:** at least 3 steps saved.
- **Result:** `data: { kind, steps: [{ label, time? }] }`
- **Never:** mark an order wrong (§8.3), set a required bedtime, or restrict time in bed.

### 5.8 `social_dialogue` — وش ترد؟

- **Categories:** `soc`. Available to `aut` only if the user chooses it. Category `اجتماعي`.
- **Time:** 3 min. **XP:** 20.
- **Mechanic:** a short illustrated scene and 3 respectful replies. After choosing, show how it might come across and ask how it felt. **All replies are acceptable, and none is marked wrong.**
- **Draft scenes:**
  1. **الاجتماع:** فجأة سألك مديرك عن رأيك وما كنت جاهز.
     - «خلني أفكر وأرجع لك بعد الاجتماع.»
     - «للحين ما تكوّن عندي رأي، بس اللي أشوفه…»
     - «ممكن توضح لي النقطة أكثر؟»
  2. **العزيمة:** قريبك سألك قدام الكل سؤال شخصي ما تحب تجاوبه.
     - «الله يسلمك، خلنا نسولف في شيء ثاني.»
     - يضحك ويرد برد قصير ويغير الموضوع.
     - «هذي خلها لي، بس علمني عنك؟»
  3. **الاعتذار:** صديقك عزمك وأنت تعبان ودك تعتذر.
     - «ودي والله، بس اليوم مالي طاقة. نخليها وقت ثاني؟»
     - «ما أقدر اليوم، تتعوض.»
     - «أجي شوي وأمشي بدري.»
- **Difficulty:** easy = 1 scene; normal = 2–3.
- **Completion:** all scenes in the round answered.
- **Result:** `data: { scenes: [{ id, choice, felt }] }`
- **Scoring:** no percentage, ever. Progress here is "tried it", not "got it right".
- **Never:** coach eye contact, tone or "appearing normal", or imply that one style of talking is the right one.
- **Content review:** scenes need review for Saudi cultural fit, including gender and family settings.

## 6. Second batch

Don't start these until the first batch works end to end.

| ID | Title | Category | What it needs first |
|---|---|---|---|
| `self_compassion` | كلم نفسك زين | `mood` | Content review; meta-analysis supports reduced self-criticism, online results are inconsistent |
| `daily_reflection` | وش ضبط اليوم؟ | `gen`, all | Mission summary screen |
| `sleep_winddown` | هديها قبل النوم | `sleep` | `routine_builder`; dim mode |
| `switch_rules` | غيّر القاعدة | `adhd` | Timing engine; describe it as practice only |
| `emotion_map` | وش جوّك؟ | `anx`, `mood` | Consent design; self-report only |
| `time_buffer` | لا تستعجل | `aut`, `adhd` | Reliable prayer and schedule data |
| `family_event_plan` | جهّز للعزيمة | `soc` | Confirmed event context from the AI agent |
| `study_sprint` | مذاكرة على قدك | `adhd` | Timer shared with `start2` |
| `uncertainty_education` | مو لازم أعرف كل شيء | `ocd` | **Clinical review. Blocked until then.** |

## 7. Fix these in the existing games first

**Status:** fixed in version 0.2.0 (see [CHANGELOG.md](../CHANGELOG.md)), except `calm`, which still needs `grounding_54321` as its alternative and pace options. The XP row was resolved by paying XP once only, because the flat policy in section 3.2 already matched. The table is kept for reference.

Each of these comes from reading the prototype code directly.

| Game | Problem | Fix |
|---|---|---|
| `start2` | The task text is lost: `data:{task:$('#tk')?0:1}` runs after `#tk` is gone, so it always saves `1` | Save the real text and first step before replacing the screen |
| `start2` | The button stays disabled until the 2 minutes end, and the only recorded outcome is finishing | Add started / not started / stopped early (§8.6) |
| `time` | Pausing sets `s=0`, so the stopwatch restarts instead of pausing; `G.resume` does nothing | Track elapsed time and exclude paused time |
| `time` | The accuracy formula divides by the actual time, which fails if it's 0 | Guard against 0 and report the error in seconds, not "accuracy" (§8.4) |
| `mem`, `calm`, `start2` | Pause doesn't stop their timers, so the game keeps running behind the pause screen | Implement `G.pause` and `G.resume` |
| `seq` | Only one order counts as correct, and placed cards are `<span>`s that can't be reached by keyboard | Allow several valid orders; use buttons (§8.3) |
| `seq` | «أصحى وأتوضأ» assumes the user's practice | Make it optional |
| `calm` | Always breath-focused, with fixed timing | Add the `grounding_54321` alternative and pace options (§8.5) |
| All | `fin()` gives full XP when `acc` is null, including self-report-only tasks | Use the flat policy in section 3.2 |
| Onboarding | In `onext()`, a second line overwrites the female default name, so «يا بطلة» never applies. `T()` also reads `S.g`, which isn't set yet during onboarding | Delete the duplicate line and pick the default from `tm.g` |

## 8. Handoff to the AI agent

So the agent and the frontend agree on the same list:

1. **Allowed IDs only.** The agent proposes from this catalog; the server or app rejects anything else (§10.2).
2. **Catalog fields the planner can use:** `id`, `categories`, `minutes`, `hasEasy`, `needsAudio`, `sensitiveData`, `dailyLimit`, `excludedFrom`.
3. **Reason codes, not free-form reasons:** for example `user_reported_low_energy`, `confirmed_family_event`, `chosen_journey`, `last_attempt_hard`. Then localise them in the UI.
4. **Hard exclusions:**
   - Never `thought_sort` inside `ocd`, and only once a day.
   - Never `social_dialogue` as a default in `aut`.
   - Never any interactive task while driving.
   - No task suggestions in reply to a crisis message.
5. **Reassurance guard (new, from the research).** If someone repeatedly asks the same question looking for certainty («متأكد ما فيه شيء؟» again and again), the agent shouldn't keep answering with new versions of reassurance. It should gently name the pattern once, avoid giving certainty or probabilities, and suggest talking to a professional. **Add this to the AI evaluation suite.** A clinician should review the wording.
6. **Never read emotions from game results.** A low score means a low score, not low mood.
7. **Free text is off-limits by default.** Worries and task text reach the model only with consent.

## 9. Open questions

| # | Question | Owner | Why it matters |
|---:|---|---|---|
| 1 | What should `ocd` show until it's reviewed? (Recommendation: «قريبًا») | Product | See section 4.3 |
| 2 | Is there a clinician or counsellor who can review content? | Product | Blocks `uncertainty_education`, and matters for sections 5.5 and 5.6 of this file |
| 3 | Approve adding `activity_plan` to §9? | Product | It's not in the reference yet. If approved, update §9 and the change log |
| 4 | Approve the "I press next" exception? | Product | Conflicts with auto-advance in §10.3 |
| 5 | Which crisis numbers are correct? | Safety | See below |
| 6 | Build in the prototype or in React first? | Frontend | §22 says React; a prototype game is faster for a demo. The contract in section 3.1 works for both |

**Crisis numbers:** the prototype uses 997 and 937. Directories list **920033360** as the National Center for Mental Health Promotion's support line, but they describe it differently and **I couldn't confirm it from an official source**. Don't add it to the app until someone checks with the Ministry of Health or the center directly. §11.6 already requires this check for all the numbers.

## 10. Sources

**ADHD and planning**
- [Implementation intentions and goal achievement: meta-analysis](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes)
- [Implementation intentions in children: systematic review and meta-analysis](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjop.70065)
- [If-then plans and executive functions in children with ADHD](https://guilfordjournals.com/doi/10.1521/jscp.2011.30.6.616)
- [Interviews with adults with ADHD on task tools (arXiv)](https://arxiv.org/pdf/2603.17258)
- [Content analysis of serious games for ADHD (Frontiers in Psychiatry, 2025)](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1605744/full)
- [Who benefits from brain training, and why (UCI)](https://news.uci.edu/2022/06/21/who-benefits-from-brain-training-and-why)

**Anxiety and worry**
- [Science-based mobile apps for reducing anxiety: meta-analysis](https://openaccess.hku.edu.tr/items/4f3b8dad-4b2b-41cf-81fb-c548199ba839)
- [Can smartphone interventions reduce anxiety? Meta-analysis of RCTs](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_1893966375)
- [Review of popular apps for evidence-based content](https://ersearch2.cvtisr.sk/vufind/SummonRecord/FETCH-LOGICAL-c384t-c687ed49664f3ceb9e6e9b47c98334f4fe3e63a5525eba178e074c879f31a2ac3/Details)
- [Worry postponement: randomized waitlist-controlled trial (2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11303915/)
- [Internet-delivered worry postponement trial](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjhp.12170)
- [Worry postponement, daily worry and sleep: RCT (2025)](https://www.tandfonline.com/doi/full/10.1080/08870446.2025.2590072)

**OCD and AI**
- [Artificial intelligence and OCD: review](https://link.springer.com/article/10.1007/s40474-026-00367-0)
- [Why "just a tool" AI can still feed OCD compulsions (ADAA)](https://adaa.org/learn-from-us/from-the-experts/blog-posts/professional/why-just-tool-ai-can-still-feed-ocd)
- [App-guided ERP pilot (LiveOCDFree)](https://sites.northwestern.edu/ocdanxietylab/files/2019/10/Boisseau-et-al-App-Guided.pdf)

**Mood**
- [Internet-based behavioral activation: systematic review and meta-analysis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10251223/)
- [Engagement with smartphone behavioural activation (MoodMission)](https://www.cambridge.org/core/journals/behavioural-and-cognitive-psychotherapy/article/engagement-with-smartphonedelivered-behavioural-activation-interventions-a-study-of-the-moodmission-smartphone-application/F9A7E5FAB03490888F212811FDD59692)
- [Self-compassion interventions: meta-analysis of RCTs](https://self-compassion.org/wp-content/uploads/2019/08/Ferrari2019.pdf)
- [Online self-compassion interventions: systematic review](https://www.researchgate.net/publication/392436336_Online_Self-Compassion_Interventions_and_Wellbeing_Outcomes_A_Systematic_Review_of_RCTs)

**Sleep and Ramadan**
- [Digital CBT for insomnia (AASM)](https://aasm.org/clinical-resources/digital-cognitive-behavioral-therapy-for-insomnia/)
- [Review of digital CBT-I apps and engagement](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7999422/)
- [Sleep restriction therapy, including who shouldn't use it (Sleep Foundation)](https://www.sleepfoundation.org/insomnia/treatment/sleep-restriction-therapy)
- [Changing sleep patterns during Ramadan (Saudi Ministry of Health)](https://www.moh.gov.sa/en/awarenessplateform/seasonalandfestivalhealth/educational-content/pages/changing-sleeping-pattern-during-ramadan.aspx)
- [Ramadan sleep and lifestyle in adults in Jeddah](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9478032/)
- [Quality of sleep in the Saudi population during Ramadan](https://pmc.ncbi.nlm.nih.gov/articles/PMC10799651)

**Social confidence**
- [Fully digital CBT for social anxiety: RCT (JMIR, 2025)](https://www.jmir.org/2025/1/e64138)
- [Game-based digital exposure task (CHI PLAY 2021)](https://discovery.ucl.ac.uk/10165883/1/3474675.pdf)

**Autistic adults**
- [Involvement of autistic adults in participatory design (ACM CHI)](https://dl.acm.org/doi/pdf/10.1145/3706598.3713961)
- [Participatory methods with autistic people: systematic review](https://www.researchgate.net/publication/371162103_Participatory_Methods_to_Engage_Autistic_People_in_the_Design_of_Digital_Technology_A_Systematic_Literature_Review)
- [Neuro-affirmative support and the double empathy problem](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11966444/)
- [How support systems reinforce autistic masking](https://www.tandfonline.com/doi/full/10.1080/09687599.2026.2659101)

**Saudi and Arabic context**
- [Willingness to use psychological health apps among Saudis](https://www.researchgate.net/publication/403685913_The_Willingness_to_Utilize_Psychological_Health_Applications_Among_Saudis_A_Study_Guided_by_the_Unified_Theory_of_Acceptance_and_Use_of_Technology_UTAUT)
- [Contextual adaptation of digital wellbeing interventions in Saudi Arabia](https://pmc.ncbi.nlm.nih.gov/articles/PMC11825761/)
- [Internet-based CBT for depression in Arabic-speaking countries: RCT](https://onlinelibrary.wiley.com/doi/full/10.1002/smi.3432)
- [Culturally adapted internet CBT for young Arabic-speaking adults: RCT](https://www.sciencedirect.com/science/article/pii/S2589979126000077)

**Gamification**
- [Reay: Treating symptoms or treating causes (ethics of gamified mental health apps)](https://eprints.soton.ac.uk/496242/1/Reay_Treating_Symptoms_or_Treating_Causes.pdf)

**Helplines (unconfirmed, see section 9)**
- [National Center for Mental Health Promotion (Find a Helpline)](https://findahelpline.com/organizations/national-center-for-mental-health-promotion)
- [Ministry of Health 937 call center (Eye of Riyadh)](https://www.eyeofriyadh.com/ar/news/details/saudi-ministry-of-health-provides-more-accessible-health-services-through-its-937-call-center)
