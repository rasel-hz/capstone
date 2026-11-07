# خويّك | KHOWAYK — Product & Engineering Reference

> **Document type:** Single Source of Truth (Product Requirements + Current-State Audit + Technical Blueprint + Team Handoff)
> **Version:** 1.0 — 2026-11-06
> **Source of current implementation:** `خويّك _ Khowayk.html` supplied by the project owner.
> **Language:** Arabic-first (Saudi/Najdi), with a full English interface. English for technical interfaces and code.
> **Status key:** `[CURRENT]` verified in supplied HTML · `[TARGET]` approved product direction, not yet implemented · `[PROPOSED]` suggested design requiring approval · `[EXTERNAL]` requires external service/agreement.
> **Critical rule:** Never describe a proposed feature, partner, integration, medical capability, or AI model as live unless verified in the running system.

---

## 0. How to use this document

This file is intended for product managers, UI/UX designers, frontend engineers, backend engineers, AI engineers, QA engineers, content designers, and potential partners. Read sections 1–5 for product intent, 6–10 for user journeys and challenges, 11–17 for architecture and integrations, 18–22 for delivery and acceptance. The HTML is a **single-file browser prototype**, not a production backend. Use it as the behavioral starting point, not as proof of deployed services.

**Non-negotiable:** Build a product, **not just a chatbot**, a collection of static task cards, or a diagnostic tool. The defining experience is **conversation → consented context → personalized daily mission → playable challenges → immediate feedback → automatic next challenge → verified persistence → meaningful insights → rewards → follow-up with خويّك**.

## 1. Executive overview

**Name:** خويّك (Khowayk). **Tagline:** «خويّك يفهمك، ويعينك على يومك.»

خويّك منصة سعودية للعافية الذهنية، تجمع بين رفيق ذكي يسولف بلهجة سعودية طبيعية، تحديات ذهنية وتفاعلية حقيقية، خطط يومية مرنة، تحليل الأداء الفعلي، ونظام نقاط ومكافآت. هدفها مساعدة المستخدم يفهم عاداته ويجرب أساليب مناسبة لتنظيم يومه، بدء المهام، الانتباه، التعامل مع الضغط، وتطوير روتين يناسب ظروفه. هي **ليست جهة تشخيص أو علاج** ولا تزعم استنتاج اضطراب من لعبة أو محادثة.

**Product pillars:** (1) Saudi companion, (2) personalized context, (3) continuous missions, (4) rich mini-games, (5) transparent insights, (6) humane rewards, (7) Saudi daily-life fit, (8) privacy and safety.

**Target users [PROPOSED]:** Saudi Arabic-speaking adults and young adults; students, employees, and people who choose support around attention, organization, mood, anxiety, routines, social confidence, and related wellbeing needs. Design inclusive accessibility. Do not infer diagnoses; allow participation without disclosing one. For minors, separate safeguarding, consent, and regulatory review are required before launch.

**Success is not screen time.** Optimize for voluntary completion, meaningful self-reported usefulness, returning without pressure, privacy trust, and accessibility; not compulsive engagement.

## 2. Scope truth table — existing vs desired

| Capability | Status | Actual situation / required change |
|---|---|---|
| Public landing page | CURRENT | Hero, mascot, how it works, journeys, playable memory preview, Saudi lifestyle, honest positioning, CTAs. Sample rewards section removed. |
| RTL Arabic visual system | CURRENT | IBM Plex Sans Arabic, CSS variables, sidebar/mobile bottom navigation. Improve accessibility, componentization, and polish. |
| English interface | CURRENT | Every screen and challenge in Saudi Arabic and English, with RTL and LTR, switchable mid-game. See `docs/I18N.md`. |
| Animated mascot | CURRENT | Approved 2D character with a clip for each of its 11 states, tied to real app events. Safari and reduced motion use the still image. See `docs/MASCOT.md`. |
| Onboarding | CURRENT | 5 steps for name/pronouns, chosen journeys, routine/sleep, prayer buffer, sound/motion. |
| Home | CURRENT | Greeting, energy check-in, mission timeline with reasons, progress, quick actions, «ترتيب يومك» (next calculated prayer or manual prayer time, confirmed context, schedule). The driving card moved to settings; if the user set driving, the mission is replaced by a safety notice. |
| Journey selection | CURRENT | 8 journey definitions with a detail map of shared challenges; not 8 distinct clinical programs. |
| Challenges | CURRENT | 12 playable types: the 6 in §8 plus `attention_scene`, `priority_board`, `breakdown`, `study_sprint`, `emotion_map` and `calm_landscape` from §9. Library has categories, real status and original art. |
| Connected mission player | CURRENT | Focused full-screen player: intro, automatic progression, round indicator, feedback, skip/end/pause/exit, result, final summary. Mid-game state isn't restored: a resumed challenge restarts, and says so. |
| Companion chat | CURRENT | OpenAI through a small server when a key is set and the user consents. Helpful-first replies in the language the user writes in, structured output (intent, goals, the user's tasks, stated minutes, up to 3 catalog activities), all validated on the server. Keyword rules otherwise, labelled as limited mode. No tools, server-side memory or accounts yet. See `docs/AI.md`. |
| AI conversation and reasoning | CURRENT (partial) / TARGET | Structured extraction, grounded task lists, safety layers and a 21-case real-model check (`npm run eval:ai`) are in. Tool calling, server memory with provenance and a scored evaluation dataset are TARGET. |
| Chat-to-game planning | CURRENT | The user's own tasks go from the chat into `seq`'s personal planning board; their choices are saved and fed back to the chat. See `docs/AI.md#from-chat-to-game-personal-planning`. |
| Mission personalization | CURRENT (basic) | Chat suggestions are ranked by an explainable engine (`src/features/recommend/`). The daily mission is still the rule-based `genMission()`. |
| Progress dashboard | CURRENT | Locally calculated completion, accuracy, week and month chart, per-challenge results (scored and unscored kept apart), self-reports, and basic pattern statements. |
| XP and achievements | CURRENT | Points, level = floor(XP/100)+1, achievements, challenge card collection, lavender theme and mascot hat unlocks. `emotion_map` earns no XP and counts toward nothing (§14.2). |
| External brand rewards | TARGET / EXTERNAL | No live vouchers, contracts, inventory, or redemption partners. |
| Prayer times | CURRENT (calculated) | Optional. The user searches one of 20 Saudi cities or shares their location once (rounded to about 1 km, kept with its time zone). Times are calculated on the device with the adhan library: Umm al-Qura by default, 8 other methods, standard or Hanafi Asr; sunrise shown apart. Nothing is sent to a prayer API. Manual entry remains. See `docs/PRAYER.md`. |
| Prayer-aware scheduling | CURRENT | No lock. In a protected window the app asks once («صلّيت؟»): prayed → continue the saved mission; not yet → optional break reminder with the mission saved; not now → continue. Each window is separate, one answer is kept at a time, nothing earns XP, and the user can turn prompts or the whole feature off. |
| Traffic, calendar, weather | TARGET / EXTERNAL | Not connected; driving hours and event context are user-entered/keyword captured. |
| Persistent backend | TARGET | Prototype stores JSON in browser `localStorage` under `kw2`. |
| Authentication/multi-device sync | TARGET | Not implemented in supplied file. |
| Notifications | TARGET | Not activated in current prototype. |
| Production video content | TARGET | Existing “video” is a 24-second HTML/SVG animated scene, not a sourced 3-minute media asset. |
| Professional mental-health treatment | OUT OF SCOPE | No diagnosis, no automated treatment, no unreviewed ERP/exposure therapy. |

## 3. Brand and experience principles

### 3.1 Personality

The companion is **خويّك**: approachable, observant without pretending to read minds, helpful without judging, friendly without fostering dependence. Use natural Saudi/Najdi phrasing; short contextual responses, not excessive hype. Address gender appropriately when provided; do not assume gender from name. Never invent personal events. Explicitly differentiate “قلت لي” (user-reported) from “لاحظت من نتائجك” (observed) and “يمكن” (hypothesis).

**Voice examples (adapt to context):**

- Welcome: «هلا والله! وش علومك اليوم؟» / «يا هلا برجعتك!»
- Low energy: «يا بعدي، شكله يومك مليان. وش رايك نخففها شوي؟»
- Start: «يلا يا بطلة، وريني شطارتك!» / «يلا يا وحش، نبدأ؟»
- Wrong answer: «قربتي، جربي مرة ثانية. تلميح صغير؟»
- Repeated difficulty: «عوافي، نغير الطريقة شوي.»
- Success: «يا سلام! كذا الشغل.»
- Between challenges: «خلصنا الأول، الحين عندي لك شيء ثاني.»
- Return: «آخر مرة وقفنا هنا. ودك نكمل ولا نخليها أسهل؟»
- End: «ياخي أنتِ كفو! خلصنا اللي اتفقنا عليه اليوم. تستاهلين ترتاحين.»
- Reflection: «وش أكثر شيء ناسبك اليوم؟»
- Social balance: «ولا تنسى وقتك مع أهلك وناسك.»

**Avoid:** robotic therapy speak, repetitive “you can do anything”, exaggerated clinical claims, guilt over missed days, pressure to keep chatting, assumptions like “أعرف أنك حزين” without self-report.

### 3.2 Mascot identity

**[CURRENT]** SVG rounded green character with lavender leaf/antenna, yellow glow, peach cheeks, expressive face. Implemented expressions: `idle`, `listen`, `think`, `happy`, `enc`, `celebrate`, `curious`, `calm`, `rest`, `concern`; level 4 adds a hat. Basic floating/glow animation and confetti exist.

**[TARGET]** Refined original illustrated/3D-inspired character, coherent motion language and reusable animation assets. Appear on landing, onboarding, chat, home, mission intro, gameplay feedback, transitions, completion, rewards, and progress. During focus tasks, reduce distracting animation. Use accessible alternatives and reduced-motion mode. **Do not rely on emoji as the primary artwork.**

### 3.3 Visual system

**Theme:** Vibrant Saudi Oasis — calm yet colorful, warm and premium, not washed-out or childish. Exact palette from existing HTML:

| Token | Hex | Use |
|---|---|---|
| Sage | `#8DBFA3` | wellbeing/progress |
| Emerald | `#28785B` | primary CTAs |
| Lavender | `#A78BFA` | AI/journeys |
| Lilac | `#E9DFFF` | secondary surfaces |
| Coral | `#FF8E83` | friendly reactions |
| Sunny yellow | `#FFD36E` | achievements |
| Sky blue | `#8BCDF1` | calming scenes |
| Peach | `#FFC6A8` | warm accent |
| Ivory | `#FFFDF8` | page background |
| Cream | `#F8F5EF` | secondary background |
| Forest ink | `#263D37` | main text |

Use meaningful color contrast, soft layered gradients, shadows, animated scene depth, responsive grids, readable typography, RTL-first components, clear focus rings, touch-friendly controls, keyboard support, screen reader announcements, optional audio and mute, and `prefers-reduced-motion`. Sound effects must never be required to understand a result.

## 4. Complete information architecture

**[CURRENT] navigation:** five tabs: `الرئيسية` (`home`), `تحدياتي` (`chal`), `خويّك` (`chat`, in the middle, shown as the mascot on phones), `تطوري` (`prog`), `ملفي` (`set`). `رحلاتي` (`journeys`) is a sub-tab of `تحدياتي`, and `مكافآتي` (`rew`) a sub-tab of `تطوري`. Desktop sidebar, mobile bottom bar.

**[TARGET] additional UX surfaces:** account/sign-in and guest mode, consent/privacy center, calendar & integrations manager, notification preferences, challenge history/detail, saved personal plan, reward wallet and redemption history, accessible help and support, and administrator/partner management (separate restricted interface). Avoid overcrowding main navigation.

## 5. End-to-end user journey (canonical)

### Flow A — first visit

1. User opens public landing page.
2. Sees animated hero and mascot; can interact with character, scroll through value proposition, journeys, Saudi integrations, and try a small playable demo.
3. Clicks «يلا نبدأ رحلتنا».
4. Onboarding introduces companion, asks preferred name/pronouns and optionally chosen needs; no diagnosis required.
5. Collects schedule pattern, energy/sleep preferences, prayer scheduling, sound and reduced-motion preferences; each optional or skippable as appropriate.
6. Explain exactly what data is saved and where; obtain explicit consent for sensitive data and optional integrations.
7. Home opens with greeting, check-in, first mission preview, and accessible chat.
8. Companion invites the user to describe their day; asks before recording derived facts.
9. Mission generated from confirmed inputs and history (if any); displays short “why these tasks” explanations.
10. User starts the daily mission **once**.
11. Intro scene → playable challenge 1 → score/feedback → automatic challenge 2 → feedback → adaptive challenge 3 → final celebration.
12. Saved results update progress, XP, unlocks; companion can discuss real results and ask for optional reflection.

### Flow B — return and interrupted mission

1. Restore authenticated/saved session.
2. Detect unfinished mission and current challenge.
3. Display warm factual welcome: «آخر مرة وقفنا عند …».
4. Offer **Continue / Restart / Easier / Skip**; do not pressure.
5. Resume at the exact supported checkpoint; if mid-game state cannot be restored safely, explicitly explain and restart that challenge without erasing historical attempts.
6. No unearned XP or fake completion.

### Flow C — a difficult day

1. User reports low energy, late sleep, or a packed schedule.
2. Companion paraphrases and asks permission to save/adjust.
3. Planner reduces difficulty/duration or suggests rest; **no automatic clinical inference**.
4. User can override recommendation.
5. Adapt after each challenge using actual attempts and self-reported fatigue.
6. If prayer or driving constraints apply, block/pause appropriately.

### Flow D — scheduled commitments

1. User optionally connects calendar or reports «عندي عزيمة الساعة ٨».
2. Extract event + time with confirmation; do not invent details.
3. Determine available time and protected prayer windows; optional traffic ETA if approved integration exists.
4. Offer short mission before event and optional preparation sequencing challenge.
5. Never send a challenge or interactive prompt while driving.

## 6. Landing page detailed specification

**[CURRENT]** sticky top bar, mascot hero with slogan «كل يوم له جوّه.. وخويّك يعرف كيف يمشي معك 🤍», CTAs «يلا نبدأ رحلتنا» / «اكتشف خويّك», animated floating decorative elements and mouse parallax; “تعرّف على خويّك” with 6 expressions; “كيف يشتغل؟” six steps; 8 illustrated journey cards; playable memory preview; Saudi lifestyle cards (prayer, driving, family, Ramadan, study, weather); illustrative level preview explicitly labeled example; closing CTA.

**[TARGET]** upgrade to premium editorial storytelling, richer original vector/illustration scenes, microinteractions, smooth but restrained scroll reveals, crisp mobile layout, fast load, accessible semantic HTML, SEO metadata, privacy links, transparent “wellbeing not therapy” messaging, clear account entry. Landing demo must be genuinely playable, not a fake animation.

**Design acceptance:** no generic SaaS hero, no overwhelming gradients, no static mascot-only image, no dead buttons, no false partner logos, no unverified outcome claims.

## 7. Onboarding and data collection

**[CURRENT] 5 steps:**

1. Name/alias + grammatical address (male/female in current UI).
2. Select any of 8 support journeys.
3. Work/study/flexible, morning/evening, optional sleep pattern.
4. Manually configured prayer-protection interval: 0/20/30/45 minutes, and an optional city for calculated prayer times; without a city, the prayer time is entered manually later.
5. Sound on/off and normal/reduced motion.

**[TARGET] expand carefully:** goals, available time today, optional energy/mood, sensory/accessibility preferences, optional calendar integration, optional prayer city/method, notification consent, optional sleep and commute patterns, preferred companion tone, personal reward preference. **Do not turn onboarding into a long clinical questionnaire.** Ask progressively when information is needed. Allow view/edit/delete/withdraw consent.

**Data provenance:** every context fact must record `source` (`user_explicit`, `user_confirmed_chat`, `integration`, `game_result`), `timestamp`, `confidence`, `consent_scope`, and optionally expiry. Derived mood should not be saved as a diagnosis.

## 8. Current challenge inventory — precise implementation audit

**[CURRENT]** The HTML defines exactly **six** playable challenge IDs in `CH`. These are the current playable templates; more must be added. Current durations in metadata are approximate and sometimes differ from actual playtime.

| ID | Arabic name | Category | Metadata minutes | Base XP | Actual interaction | Current limitations |
|---|---|---|---:|---:|---|---|
| `video` | ركز معي شوي | تركيز | 1 | 30 | 24-second animated oasis scene with balloons/birds, play/pause, CC, 2–3 multiple-choice questions, hints/replay | Not a real 3-minute video; HTML/SVG animation, fixed question bank; needs real media content pipeline |
| `mem` | وش تتذكر؟ | ذاكرة | 2 | 25 | Observe 4–5 colored shapes for 5 seconds; identify missing shape, retry/hint; 1–2 rounds | Limited variants; timer/resume/score edge cases need review |
| `seq` | رتبها يا وحش | تخطيط | 2 | 25 | With the user's tasks from chat: Now / Later / Not today, then optional time blocks checked against their time, no score. Otherwise: the original ordering exercise, labelled as an example | Modes C (break a task into steps) and D (weekly board) not built yet; the example mode's fixed first and last steps remain |
| `time` | وين راح الوقت؟ | وعي بالوقت | 1 | 20 | Predict 5/10/15/20 seconds for counting to ten; start/stop stopwatch; compare estimate vs actual | Very narrow task, no broader time-management transfer; divide-by-zero and timer edge cases need tests |
| `calm` | على هونك | استرخاء | 2 | 15 | Animated breathing circle, 3 cycles, then “ارتحت / شوي / ما فرق” self-report | One breathing exercise is not appropriate for everyone; provide alternatives and opt-out |
| `start2` | دقيقتين ونبدأ | مهمة حقيقية | 2 | 25 | Enter postponed task + smallest first step; 2-minute countdown; finish after timer | User-entered task not properly persisted in current result (`data.task` becomes a boolean-like value); fix data model |

### 8.1 Video attention (`video`) — full flow

1. Companion introduces visual attention scene in Saudi Arabic.
2. Existing code draws 24-second oasis with 3 colored balloons and 2 bird passes; caption toggle and play/pause controls.
3. Ask: number of balloons (3), last balloon color (sky blue), number of bird crossings (2); easy mode uses 2 questions.
4. Incorrect selection highlights error, shows question-specific hint and replay option; attempts increment.
5. Correct selection triggers positive reaction and advances automatically.
6. Final result: `acc` is **first-try correct answer percentage**, `retries` count; score should be clearly labeled as such.
7. **[TARGET]** replace/augment with actual rights-cleared videos, selectable 30s/1m/3m length, accessible captions/transcripts, question-to-timestamp mapping, variable difficulty, meaningful playback, verified answer keys, video asset metadata, and content review. Never generate factual questions unrelated to actual clip.

### 8.2 Memory (`mem`)

Observe shapes and colors → hide one → select missing object → contextual hint (color) → retry → next round → record first-try accuracy. **[TARGET]** add spatial layouts, object locations, sounds optional, story-based scenes, gradual complexity, meaningful difficulty control, keyboard input, and careful timeout cleanup.

### 8.3 Sequencing (`seq`)

Morning preparation or “عزيمة” scene → drag/tap cards into slots → press «جاهز» → feedback. **[TARGET]** multiple acceptable orders when valid; actual user calendar details only if confirmed; animated illustrated world; accessibility controls; realistic priorities and constraints; do not score subjective choices as objectively wrong without rationale.

### 8.4 Time awareness (`time`)

Choose predicted duration → start counting → stop → display actual time and comparison. **[TARGET]** add task-duration estimation, timeboxing, interruption awareness, calibrated estimates over multiple attempts, and user reflection; report error, not “clinical time-awareness score.”

### 8.5 Calming (`calm`)

Animated breathing sequence → ask self-reported effect → save `help` response. **[TARGET]** opt-in guided grounding, visual relaxation, sensory-friendly silent mode, breathing pace customization, stop at any time, alternative for users who dislike breath-focused activities. Never promise anxiety relief.

### 8.6 Task initiation (`start2`)

Enter real delayed task + first step → 2-minute timer → user confirms first step attempted → save accurate outcome. **[TARGET]** persist exact user text with privacy controls, allow “started / not started / stopped early,” offer follow-up plan, avoid equating timer elapsed with successful real-world completion.

## 9. Challenge expansion backlog — must add more than the current six

**[TARGET]** The challenge catalog must grow substantially. **Selection is based on context and consent, not on randomly cycling category labels.** Each template needs: unique ID, name, supported needs, safety exclusions, inputs, interactive UI, estimated time, difficulty variants, completion rule, score/metrics, XP policy, resume strategy, accessibility support, localization, and content review.

| Proposed ID | Challenge / Saudi title | Actual playable mechanic | Useful context |
|---|---|---|---|
| `attention_scene` | وش اللي تغيّر؟ | Compare two animated scenes; tap subtle differences | Attention practice, short free time |
| `audio_focus` | اسمعها زين | Listen to short original sound sequence; select/reorder events | Auditory attention, only with audio consent |
| `distractor_filter` | لا يشتتك شيء | Tap target symbols while irrelevant animated objects pass | Selective attention, optional low-stimulation mode |
| `switch_rules` | غيّر القاعدة | Sort shapes; rule changes mid-round with explicit cue | Flexible task switching |
| `working_memory` | خلك حافظها | Remember a short sequence while doing simple visual action | Working memory |
| `visual_route` | وين الطريق؟ | Recall illustrated route and choose correct path | Spatial memory |
| `priority_board` | وش أول شيء؟ | Drag realistic tasks onto now/later/not-today board | Overwhelm, prioritization |
| `breakdown` | فكّكها | Convert a big task into draggable small steps | Task initiation, executive support |
| `micro_start` | بس أول خطوة | Choose first tiny step; optional 60–120s timer and check-in | Low energy, procrastination |
| `estimate_compare` | قدّرها | Predict actual time for small user task and compare | Time calibration |
| `time_buffer` | لا تستعجل | Visual timeline with prayer/travel buffer and appointments | Busy days, commuting |
| `routine_builder` | رتّب روتينك | Assemble morning/evening routine with cards | Sleep and routine |
| `grounding_54321` | حولك وش فيه؟ | Guided optional senses-based grounding with interactive scene | User-reported stress; skip if unsuitable |
| `calm_landscape` | خذ لك بريك | Interactive oasis scene with optional calming sound and reflection | Break, fatigue |
| `emotion_map` | وش جوّك؟ | Select feelings, intensity, and what may help; no AI emotion detection | Self-reported mood |
| `thought_sort` | خلنا نفكّر فيها | Sort worries into controllable / uncertain / next action | Everyday worry, not therapy claims |
| `uncertainty_education` | مو لازم أعرف كل شيء | Gentle psychoeducation and user-led uncertainty reflection | OCD-related support **only with reviewed content**, no automated ERP |
| `social_dialogue` | وش ترد؟ | Branching simulated conversation with multiple respectful answers | Social confidence |
| `family_event_plan` | جهّز للعزيمة | Illustrated checklist/timeline with confirmed event time | Family gatherings |
| `study_sprint` | مذاكرة على قدك | Brief study focus session with progress + distraction notes | Study schedules |
| `work_reset` | بين الشغلتين | Short transition ritual after meetings; choose next action | Workday context |
| `sleep_winddown` | هديها قبل النوم | Screen-dimming routine builder; no forced stimulation | Evening, user-selected sleep goal |
| `self_compassion` | كلم نفسك زين | Rewrite harsh self-talk into realistic kinder alternatives | Self-reported discouragement |
| `sensory_preferences` | اختَر راحتك | Configure sound/light/motion scene and predictable sequence | Sensory/accessibility preferences |
| `daily_reflection` | وش ضبط اليوم؟ | Pick meaningful wins, obstacles, next small adjustment | Mission completion |
| `commute_audio` | سوالف الطريق | **Audio-only** optional passive content, never a game or screen interaction while driving | Driving safety; needs legal/safety review |

**Release rule:** prioritize 5–8 additional fully playable templates over 30 superficial “cards.” Each new game requires actual interaction, state persistence, accessible feedback, evidence-based content review where applicable, and automated QA.

### 9.1 Journey-specific design (not diagnoses)

**[CURRENT]** 8 journey definitions:

| ID | Journey name | Currently mapped challenge IDs | Required expansion |
|---|---|---|---|
| `adhd` | التركيز والتنظيم | `video`, `seq`, `time`, `mem`, `start2` | Task initiation, planning, switching, realistic time management |
| `anx` | الهدوء والقلق | `calm`, `video`, `mem` | Self-report, grounding, gentle coping choices, opt-out |
| `ocd` | التعامل مع عدم اليقين | `calm`, `time` | Clinically reviewed education; **no unsupervised ERP** |
| `mood` | المزاج والحماس | `start2`, `calm`, `seq` | Manageable activity planning, self-compassion, no coercion |
| `sleep` | النوم والروتين | `calm`, `seq`, `time` | Wind-down, schedule building, sleep diary optional |
| `soc` | الثقة الاجتماعية | `seq`, `mem` | Actual simulated dialogues and choice feedback |
| `aut` | روتين واضح وهادئ | `seq`, `time`, `calm` | Predictability, visual schedules, sensory preferences; not “fixing autism” |
| `gen` | عافية عامة | `video`, `mem`, `calm`, `time` | Broad wellbeing options |

A user can select multiple journeys. A journey should become an illustrated progression world with levels, varied challenges, achievements, and optional adaptation. **Do not claim all journeys already have unique dedicated gameplay.**

## 10. Daily mission orchestration — exact behavioral contract

### 10.1 Current generator

`genMission()` currently produces three items: `video`, then `seq` if event context exists else `mem`, then `calm` for low energy or `start2` for ADHD/mood selected needs else `time`. `why()` generates simple explanations from low energy, short preference, event, previous accuracy. Difficulty becomes `easy` for low previous accuracy or low-energy non-calm tasks. This is a rule engine, **not AI inference**.

### 10.2 Target mission planner

Input: confirmed profile/preferences, chosen journeys, mood/energy self-report, previous attempts, available time, calendar, prayer protection, driving state, user feedback, content safety metadata. Output structured mission with 1–5 suitable challenges, reasons, durations, difficulty, sequence, rest options, and constraints. Default may be 3. If no reliable data, use gentle starter mission and ask minimal questions. Explain selection in plain Saudi Arabic.

**Planner requirements:** deterministic hard constraints (prayer/driving/accessibility/safety); LLM may propose but server validates against approved challenge catalog; do not let LLM invent challenge IDs or score criteria; user can edit/skip/decline; mission never mandatory.

### 10.3 State machine

Mission: `DRAFT → READY → IN_PROGRESS ↔ PAUSED → COMPLETED / PARTIALLY_COMPLETED / CANCELLED`.

Challenge attempt: `NOT_STARTED → IN_PROGRESS ↔ PAUSED → COMPLETED / SKIPPED / ABANDONED / FAILED_TECHNICAL`.

**[CURRENT]** Uses `NOT_STARTED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `SKIPPED`, `ABANDONED` for challenge items and mission `IN_PROGRESS`, `PAUSED`, `DONE`. **[TARGET]** formalize schema, distinguish partially completed missions and technical errors, use server-authoritative transitions.

**Rules:**

1. Only a challenge-specific verified completion condition yields `COMPLETED`.
2. «إنهاء التحدي» on incomplete task records `ABANDONED` with progress, not `COMPLETED`.
3. «تخطي» records `SKIPPED`, zero XP unless separately approved participation policy.
4. «إيقاف» records `PAUSED`, stops active media/timers, preserves checkpoint.
5. «خروج» pauses mission and restores app navigation.
6. After successful completion: persist → calculate eligible XP once → show reaction → evaluate next challenge → preload → auto-transition; user must be able to pause/exit.
7. Avoid awarding XP twice on refresh, retry, duplicated API request, or race condition.
8. If a mission contains skipped/abandoned items, final copy says “انتهت المهمة” and reports exact completed count, **not** “all completed.”
9. Never silently erase a prior unfinished mission when starting a new one; explicit confirmation required.
10. Timeouts and interrupted animations must not leave dangling timers or wrong status.

### 10.4 Personalization after each challenge

Compare observed result with prior attempts, retries, time, and optional self-report. If repeated difficulty, offer easier next task **with consent**. If user reports fatigue, suggest shorter plan/rest. If progress is good, offer optional increased complexity, never force. When prayer window approaches, pause at a safe transition. On driving, block all interactive tasks and avoid prompts that distract.

### 10.5 Final screen

Animated oasis + mascot celebration + actual completed/total + actual XP + verified achievement + short contextual observation + one optional practical suggestion + optional prayer/schedule reminder + CTA to `خويّك` and `تطوري`. If no measurable pattern, say so. No clinical improvement percentages.

## 11. AI companion — full requirements

### 11.1 Current state

`send()` in HTML uses regex for low energy, late sleep, work/study, family events; requests user confirmation through `cs()` before storing context and/or shortening plan. Other intents: progress summary, greeting, thanks, fallback. Crisis keyword response exists but is rudimentary. This describes the original prototype. The React app adds an optional OpenAI connection (`docs/AI.md`), but still has no retrieval, voice AI, or backend conversation storage.

### 11.2 Target AI capabilities

- Natural Saudi Arabic conversation with optional English support.
- Friendly check-in: day, schedule, self-reported feelings, energy, available time.
- Structured extraction of **user-supplied** facts; explicit confirm/edit/decline before storing sensitive or consequential context.
- Retrieval of permitted user history and recent challenge attempts.
- Tool calls to get plan, modify plan with confirmation, list journeys, summarize performance, and read approved integration results.
- Contextual messages at challenge intro, hints, success, retry, transition, completion, return.
- User-controlled memory, retention, and privacy settings.
- Safe response to distress and human escalation; not a substitute for clinician or friends/family.
- No fabricated observations, hidden profiling, medical diagnosis, or guaranteed therapeutic results.
- Distinguish direct evidence vs inference, explain recommendation provenance.
- No fabricated partner offers or prayer/traffic times.

### 11.3 Suggested tools / contracts

`get_user_profile`, `get_recent_attempts`, `get_active_mission`, `get_user_schedule`, `get_prayer_window`, `get_traffic_eta`, `propose_context_update`, `confirm_context_update`, `propose_mission`, `confirm_mission_change`, `get_progress_summary`, `get_reward_catalog`, `log_user_feedback`, `request_human_support_resources`.

Every tool needs auth, scoped access, schema validation, audit logging, and consent. Write tools require confirmation when changes matter. Never give LLM unrestricted DB write privileges.

### 11.4 Memory model

- Short-term: current conversation, active mission.
- Medium-term: last 7–30 days of consented preferences, context, challenge outcomes.
- Long-term: explicitly approved durable preferences (e.g., prefers short missions, quiet sound, preferred address).
- Sensitive self-reports: restricted, user-visible, deletable, retention-limited.
- Derived patterns: evidence links, sample size, confidence, expiry, user correction.

### 11.5 Example conversation and downstream effect

**User:** «أمس نمت متأخر، واليوم دوامي طويل وعندي عزيمة بالليل.»

**Companion:** «يا بعدي، يومك مليان. فهمت إن نومك كان متأخر وعندك عزيمة. أسجل هالشي لليوم وأخفف المهمة؟»

**User confirms.** Save facts with timestamp/source/consent; propose short mission; show reasons; user starts once; after challenges use actual results in follow-up. **Do not infer ADHD severity, anxiety level, or medical status from this message.**

### 11.6 Safety-critical behavior

If user mentions self-harm or immediate danger, respond supportively, prioritize immediate real-world support and local emergency resources, avoid gamification, and route through reviewed safety policy. Current prototype hardcodes Saudi 997/937 references; verify current emergency guidance and maintain localized, reviewed content before launch. Do not rely only on a regex list for crisis detection. Do not diagnose or offer unreviewed clinical treatment. Explicitly restrict OCD exposure/ERP content to clinically governed programs.

## 12. Saudi context and integration contracts

| Integration | CURRENT | TARGET / implementation notes |
|---|---|---|
| Prayer | City or rounded device location, calculated on the device (Umm al-Qura default, selectable method and Asr), or manual next prayer `HH:MM`, plus post-adhan buffer and a once-per-window check-in | City/time zone and verified prayer-times provider; user-selected calculation method; next five prayers, travel adjustments, protected windows, optional notifications; avoid assuming practice |
| Traffic | Manual “أنا أسوق الحين” and hours driven | Opt-in maps ETA/traffic; no screen interaction while driving; arrival-based suggestions; do not claim access to driving telemetry |
| Calendar | Context tags from confirmed chat only | Google/Microsoft/Apple calendar via authorized integration; least-privilege read; event confirmation; handle private titles carefully |
| Weather | Landing states not connected | Verified forecast provider; adjust optional outdoor suggestions only; cite freshness in UI |
| Work/study | User-selected schedule, basic chat capture | Timetable/calendar, exam/meeting windows, free-time estimation |
| Family events | Confirmed “event” flag | Structured event time/duration, preparation and travel buffers, opt-in reminders |
| Ramadan/Eid | Mentioned in landing | Optional schedule patterns; avoid rigid assumptions about fasting, sleep, prayer practices |
| Notifications | Not active | User-configured push/email/SMS, quiet hours, consent, rate limits, no sensitive lock-screen disclosures |

**Location/privacy:** default to manually selected city, not precise GPS. Request exact location only if required and authorized. Respect Saudi time zone (`Asia/Riyadh`) for display, store UTC timestamps internally. Handle daylight and date boundaries correctly for all external cities/travel.

## 13. Analytics and progress — «تطوري»

**[CURRENT]** total completed, skipped/abandoned, average first-try accuracy, XP, 7-day completion bar chart, per-challenge count/last accuracy/average duration, recent energy check-ins, factual notes; only after ≥4 attempts suggests a tentative short-duration pattern. Empty state is implemented.

**[TARGET]** add history drilldown, weekly/monthly comparison, challenge-type trends, difficulty-normalized metrics, actual attempts and retries, completion vs participation, user-reported helpfulness, mood/energy **as self-report**, plan adherence without guilt, meaningful wins, explainable AI insights with evidence references, and export/delete. Never equate in-app scores with diagnosis or clinical progress.

**Metric definitions:**

- `attempts`: all started attempts, including interrupted, not merely history rows.
- `completion_rate = completed / started` (define timeframe and exclusions).
- `first_try_accuracy = correct_first_try / scored_questions`.
- `retry_rate = attempts_with_retries / completed_attempts` (label carefully).
- `median_duration_seconds`: use actual measured active time; exclude paused time.
- `helpfulness`: self-reported, not inferred.
- `XP`: engagement/participation reward, not a mental health score.
- `streaks`: **avoid punitive streaks**; celebrate returns and rest days.

## 14. XP, levels, achievements and reward system

### 14.1 Current logic

- Base XP: video 30; memory 25; sequencing 25; time 20; calming 15; task start 25.
- On completed attempt: full base XP if accuracy is absent or ≥50%; otherwise half (rounded). Note this may award full XP for unverified self-report-based completion: refine policy.
- Level: `floor(totalXP/100)+1`.
- Current achievements: first step; five challenges; level 2; three distinct games; retry success; comeback after absence.
- Current unlocks: lavender theme at level 3; mascot hat at level 4.
- No real vouchers or monetary redemption; no live external partners.

### 14.2 Target rewards architecture

**Tier 1 — in-app (launch first):** mascot accessories, illustrated scenes, themes, sticker/badge collection, new challenge worlds, celebratory cards, optional downloadable personal progress certificate (avoid clinical claims).

**Tier 2 — user-defined rewards:** user chooses an offline treat after a milestone; app only reminds, does not claim payment.

**Tier 3 — real partners [EXTERNAL]:** verified vouchers, discounts, memberships, event tickets, books, cafes, entertainment, wellness and educational services, subject to signed agreements and available inventory.

**Fairness:** no penalties for rest, no pay-to-win mental health framing, no manipulation through expiring rewards, accessibility parity, anti-fraud and idempotent XP, rate limits, budget limits, clear terms and expiry. Do not reward disclosure of sensitive mental-health information.

### 14.3 Partner collaboration model — how it would actually work

1. Business development contacts potential partner.
2. Validate fit, brand safety, legal/marketing requirements, geography, eligibility, redemption channels, and offer economics.
3. Sign written agreement and data-processing terms as needed.
4. Partner provides offer ID, description, eligible locations, quantity, dates, exclusions, redemption mechanism, financial settlement rules, support owner.
5. Admin verifies and publishes offer; app displays **only verified active offers**.
6. User earns sufficient eligible points and requests redemption.
7. Server atomically reserves points and available inventory; generates single-use code or calls partner API.
8. User receives voucher with clear terms; redemption status is tracked (`RESERVED`, `ISSUED`, `REDEEMED`, `EXPIRED`, `REFUNDED`, `FAILED`).
9. If issuance fails, restore points safely; handle duplicate requests and abuse.
10. Partner reports redemption/settlement; admin dashboard shows aggregates, not sensitive mental-health profiles.
11. User can contact support; all partner data sharing is minimal and consent-based.

**Suggested business models [PROPOSED]:** partner-sponsored offers, funded reward pool, promotional codes, limited allocations, or co-branded wellbeing campaigns. Validate compliance and avoid sensitive health-based targeting.

### 14.4 Potential partners — examples, NOT existing agreements

The concept/reference image discussed brands such as **Starbucks, Dunkin', Fitness Time, Jarir Bookstore, Cenomi, Kinān Cinema, Riyadh Season, and universities** as illustrative Saudi-market reward categories. **None is confirmed as a current Khowayk partner by the supplied HTML or conversation. Do not display their logos as signed partners or promise their discounts.** Some names or availability require separate verification.

| Potential category | Illustrative targets (unconfirmed) | Potential reward | What is needed |
|---|---|---|---|
| Cafés | Starbucks, Dunkin' | Discount / beverage voucher | Commercial agreement, promo-code or POS redemption |
| Fitness/wellness | Fitness Time and similar gyms | Day pass / trial | Eligibility, safety and membership rules |
| Books/learning | Jarir Bookstore, university programs | Book/store credit or workshop | Agreement, voucher mechanics |
| Malls/retail | Cenomi-associated venues | Offer codes | Venue-specific permissions |
| Cinema/entertainment | Cinema operators, events | Tickets/discounts | Inventory API or voucher agreement |
| Events | Riyadh Season organizers/operators | Event benefit | Formal event organizer approval |
| Education | Universities / training providers | Workshop access | Institution-specific agreement |
| Local Saudi SMEs | Cafés, bookstores, studios | City-specific small rewards | Merchant onboarding and support |

**Partner status registry (initial):** `prospective / outreach / negotiating / contracted / integrated / live / paused / ended`. All initial named targets = **prospective only**; do not fabricate contacts, dates, discounts, contracts, or API access.

## 15. Technical architecture — production target

**[CURRENT]** React, TypeScript and Vite, with a small Node server for the optional OpenAI chat. All application state is stored in `localStorage` key `kw2`; no database, authentication, network data connectors, or multi-device sync. See `docs/ARCHITECTURE.md`.

**[TARGET] recommended stack:**

- Frontend: React + TypeScript + Vite/Next.js, Tailwind, accessible component primitives, Framer Motion, Recharts, Canvas/SVG for mini-games; RTL-first design tokens.
- Backend: FastAPI (Python) or NestJS/Node, REST endpoints + optional real-time events.
- Database: PostgreSQL with migrations, encrypted sensitive fields, tenant/user separation.
- Cache/queues: optional Redis and job workers for notifications/reward issuance.
- AI: model adapter, system policy, typed tool calling, structured outputs, eval suite, moderation/safety gates, context consent, audit trail.
- Storage/CDN: licensed media/video assets, signed URLs, accessible subtitles/transcripts.
- Auth: secure sessions, MFA optional, guest-to-account migration, deletion/export.
- Observability: structured logs, traces, privacy-safe metrics, error monitoring.
- Integrations: isolated adapters for prayer, calendar, maps, weather, partner rewards.

### 15.1 Proposed service boundaries

`Auth & Consent` → `User Profile & Preferences` → `Companion Orchestrator` → `Context/Memory` → `Mission Planner` → `Challenge Catalog/Runtime` → `Scoring/XP Ledger` → `Insights` → `Rewards/Partners` → `Notifications/Integrations`.

LLM proposes text/plans only; authoritative server code validates challenge catalog, safety constraints, scoring, and XP. Do not use the LLM as the timer or state machine.

### 15.2 Suggested repository structure

```text
khowayk/
  apps/web/
    src/app/landing/
    src/app/onboarding/
    src/app/home/
    src/app/journeys/
    src/app/challenges/
    src/app/mission/
    src/app/companion/
    src/app/progress/
    src/app/rewards/
    src/app/settings/
    src/components/mascot/
    src/components/ui/
    src/features/challenge-engine/
    src/features/games/{video,memory,sequencing,time,calm,micro-start}/
    src/styles/tokens.css
  services/api/
    app/api/{auth,users,context,chat,missions,challenges,attempts,insights,rewards,integrations}/
    app/domain/{mission,scoring,consent,rewards}/
    app/ai/{prompts,tools,schemas,safety,evaluation}/
    app/integrations/{prayer,calendar,maps,weather,partners}/
    app/db/{models,migrations}/
  packages/shared-schemas/
  content/{challenge-bank,localization,media-manifest}/
  tests/{unit,integration,e2e,accessibility,ai-evals}/
  docs/{PRODUCT_REFERENCE.md,API.md,DATA_MODEL.md,DESIGN_SYSTEM.md,SAFETY.md,PARTNERS.md}
```

## 16. Proposed database model

**Core entities (server-generated UUIDs, UTC timestamps, ownership, migrations):**

| Entity | Key fields / purpose |
|---|---|
| `users` | id, auth_id, created_at, locale, timezone |
| `profiles` | user_id, preferred_name, address_style, selected_city, accessibility_preferences |
| `consents` | user_id, purpose, scope, granted_at, revoked_at, policy_version |
| `journey_preferences` | user_id, journey_id, active, priority |
| `context_facts` | id, user_id, type, value, source, confirmed, confidence, valid_until, consent_id |
| `checkins` | id, user_id, energy, mood_self_report, sleep_self_report, timestamp |
| `conversations` | id, user_id, title, created_at, retention_scope |
| `messages` | id, conversation_id, role, content, created_at, safety_flag |
| `challenge_templates` | id, version, name_ar, category, input_schema, completion_rule, scoring_rule, safety_flags, content_version |
| `missions` | id, user_id, date_local, status, generated_reason, created_at, started_at, ended_at |
| `mission_items` | id, mission_id, challenge_id, position, difficulty, reason, status |
| `challenge_attempts` | id, user_id, mission_item_id, started_at, paused_ms, ended_at, status, result_json, first_try_accuracy, retries |
| `challenge_checkpoints` | attempt_id, state_json, updated_at, version |
| `xp_ledger` | id, user_id, attempt_id, delta, reason, idempotency_key, created_at |
| `achievements` | id, rule, display_name_ar, asset_id |
| `user_achievements` | user_id, achievement_id, awarded_at |
| `rewards` | id, type, cost_xp, availability, partner_id, status, terms, expires_at |
| `reward_redemptions` | id, user_id, reward_id, status, points_ledger_ref, voucher_ref, timestamps |
| `partners` | id, legal_name, category, status, contract_reference, owner |
| `integration_connections` | id, user_id, provider, scopes, status, token_reference, expires_at |
| `audit_events` | actor, action, entity_type, entity_id, timestamp, redacted_metadata |

**Never store tokens, passwords, or voucher secrets in client-visible JSON.** Apply encryption, row-level authorization, retention policies, and deletion propagation. Do not persist all raw chats indefinitely by default.

## 17. API contract (proposed MVP)

```http
POST   /v1/auth/guest
GET    /v1/me
PATCH  /v1/me/preferences
GET    /v1/me/consents
POST   /v1/me/consents
DELETE /v1/me/data
POST   /v1/checkins
GET    /v1/context
POST   /v1/context/proposals
POST   /v1/context/proposals/{id}/confirm
GET    /v1/journeys
GET    /v1/challenges
GET    /v1/challenges/{id}
POST   /v1/missions/generate
GET    /v1/missions/active
POST   /v1/missions/{id}/start
POST   /v1/missions/{id}/pause
POST   /v1/missions/{id}/resume
POST   /v1/attempts/{id}/events
POST   /v1/attempts/{id}/complete
POST   /v1/attempts/{id}/skip
POST   /v1/attempts/{id}/end
GET    /v1/progress/summary
GET    /v1/progress/history
POST   /v1/chat/messages
GET    /v1/rewards/catalog
POST   /v1/rewards/{id}/redeem
GET    /v1/rewards/wallet
GET    /v1/integrations/status
```

**Required:** auth checks on every user resource, request/response schemas, pagination, versioning, safe error contracts, idempotency on complete/redeem, transactional XP ledger, consistent time handling, rate limits, audit logs, OpenAPI docs, and contract tests.

### 17.1 Sample structured mission output (illustrative, not current API)

```json
{
  "mission_date": "YYYY-MM-DD",
  "status": "READY",
  "user_confirmation_required": false,
  "items": [
    {"challenge_id":"video","difficulty":"easy","duration_seconds":90,"reason_code":"short_focus_preference"},
    {"challenge_id":"seq","difficulty":"normal","duration_seconds":120,"reason_code":"confirmed_family_event"},
    {"challenge_id":"calm","difficulty":"easy","duration_seconds":120,"reason_code":"user_reported_low_energy"}
  ],
  "constraints": {"no_interaction_while_driving":true,"respect_prayer_window":true}
}
```

Server must reject unknown challenge IDs, unavailable content, unsafe schedules, and unverified assumptions. Text explanations localized after validation.

## 18. UI/UX screen-by-screen handoff

| Screen | Core UI | Critical interaction / empty/error state |
|---|---|---|
| Landing | Hero, mascot, sections, preview game, CTAs | Working preview; mobile/RTL; no fake partnership |
| Onboarding | Progressive friendly questions, mascot, stepper | Skip optional fields; save/consent; back navigation |
| Home | Greeting, energy check-in, mission timeline, progress, quick actions, day context | Loading/empty plan, resume mission, explain recommendation; driving controls live in settings |
| Journeys | Illustrated worlds and level maps | Multiple selections; accurate level lock; no diagnosis labels |
| Challenges | Browse/filter challenge catalog | Preview mechanics, difficulty, accessibility, solo mode |
| Companion | Chat history, mascot, context confirmation cards | Streaming, errors, consent controls, safe response, input disabled while driving |
| Mission player | Full-screen immersive game, step dots, mascot, controls | One-time start; auto-advance; pause/skip/end/exit; no lost progress |
| Challenge result | Score/XP/retry, mascot animation | Save acknowledged before transition; score explanation |
| Mission completion | Oasis celebration, actual metrics, suggestion | Partial vs full completion accurate; progress/rewards CTAs |
| Progress | Charts, history, check-ins, patterns | Empty state; time range; data provenance; no medical claims |
| Rewards | XP, levels, badges, unlocks, optional offers | Eligibility, verified offers, redemption failures/refunds |
| Profile/settings | Name, preferences, sound, motion, city, consent, integrations | Data export/delete, revoke, privacy, accessible controls |
| Partner/admin (restricted) | Offer catalog, inventory, redemption logs, approvals | RBAC, audit, reconciliation, no access to user health profiles |

**Motion guidelines:** microinteractions 120–300ms; scene transitions ~300–700ms unless accessibility mode; never block user for long unskippable animation. Use gentle reactions on errors, no flashing/strobing. All sound off-able. Focus mode must be low distraction.

## 19. QA strategy and acceptance criteria

### 19.1 End-to-end demo script (must pass)

1. Open landing → mascot reacts → preview memory game works.
2. Complete onboarding, optional inputs skipped correctly.
3. Tell companion about late sleep, work, and an evening family gathering.
4. Companion summarizes exactly and asks permission; decline leaves saved context unchanged.
5. Confirm; mission adjusts and explains why.
6. Start mission **once**.
7. Play video attention; answer wrong → see hint and replay → answer correctly.
8. XP saved exactly once; progress updated.
9. Automatic transition to memory/sequence challenge without returning home or clicking Start again.
10. Pause/resume, test skip and manual end on separate attempts.
11. Next challenge adapts only based on recorded data/confirmed user context.
12. Finish mission → exact completion counts, XP, relevant message, no fake clinical claims.
13. Open Progress → numbers match database.
14. Open Rewards → XP/achievement matches ledger; unlocked theme applies.
15. Chat asks about performance → response cites actual attempts.
16. Refresh/relogin → state restored; incomplete task resume works.
17. Driving mode → interactive challenge blocked.
18. Prayer window → respected based on verified or clearly manual time.
19. Reduced motion and mute → no forced animation/audio.
20. Data deletion → authorized user data removed as documented.

### 19.2 Required test suites

**Functional:** state transitions, start once, auto-advance, skip/end, resume, question validation, scoring, difficulty, timers, video playback, captions, drag/drop and tap alternative, daily reset, journey selection, reward unlocks.

**Data:** local-to-server migration, null/missing values, duplicate attempts, duplicate XP, idempotency, timestamps, stale client, concurrent tabs, partial writes, offline/retry, backend failures, deletion/export.

**AI:** Saudi dialect tone, factual grounding, extraction confirmation, refusal to infer diagnoses, hallucination prevention, no invented events/partners, crisis handling, prompt injection, tool permissions, long-conversation context, Arabic/English mixed input.

**Security/privacy:** IDOR, auth/session, token leakage, sensitive logs, CSRF/XSS, injection, partner voucher abuse, user consent, retention, secure integration OAuth, least privilege.

**Accessibility:** keyboard-only, RTL screen readers, focus order, touch targets, contrast, motion reduction, sound controls, captions, non-drag alternatives, readable Arabic.

**Performance:** mobile low-end device, animations 60fps where feasible, video load, bundle size, offline recovery, API latency, scalable partner redemption.

### 19.3 Known prototype risks to fix

- Entire app is inline JS with global mutable state; fragile event/timer lifecycle.
- `localStorage` is not secure, cross-device, or server-authoritative.
- Regex chatbot cannot robustly understand nuanced emotional language.
- “Video” is 24s generated DOM animation, not real uploaded/streamed video.
- Some `G.stop`, `G.pause`, `G.resume` handlers are inconsistent across games; test pause/resume carefully.
- Timer/async callbacks can outlive screen changes; guard against stale writes.
- Some results do not preserve real task input (`start2`).
- Current mission completion screen may show “mission finished” even if some items skipped; report precise status.
- Scoring and reward eligibility need server validation and idempotency.
- Calculated prayer times cover 20 preset cities only, use one method, and can differ from a local mosque by a minute or two. Manual times are dropped the next day.
- Current driving hours are manually entered; do not infer telemetry.
- Some HTML interpolates user text into markup without robust escaping; **XSS risk** when migrating.
- Current level progress and demo values are illustrative on landing; must stay clearly labeled.
- No production-ready crisis handling or clinical review process.
- Current hard-coded game logic/content may not generalize to adaptive missions.

## 20. Delivery plan and team ownership

### Phase 0 — baseline & decisions

- [ ] Preserve supplied HTML in `/prototype` with version control.
- [ ] Run and document actual baseline behavior; capture screenshots/videos of all screens.
- [ ] Confirm target audience, age policy, clinical boundary, data retention, city/prayer settings, reward budget.
- [ ] Create design tokens, product backlog, acceptance criteria, threat model.

### Phase 1 — premium design system & landing

**Design + Frontend:** mascot asset library, vibrant oasis palette, responsive RTL shell, landing hero, playable preview, animations, accessibility, component library, page states.

### Phase 2 — auth, profile, privacy, backend

**Backend + Security:** API, PostgreSQL schema, auth, consent, check-ins, context facts, challenge catalog, history, server persistence, migrations, privacy controls.

### Phase 3 — challenge engine & gameplay

**Frontend + Game Engineering:** port existing six templates, correct bugs, shared game interface, checkpointing, timers, scoring, hints, animations, audio controls; add 5–8 genuinely playable new templates.

### Phase 4 — mission orchestration

**Backend + Frontend:** state machine, AI-safe planner, automatic progression, adaptive changes, completion summary, resume/recovery, idempotent XP.

### Phase 5 — real companion AI

**AI + Backend + Safety:** LLM integration, structured extraction/confirmation, memory controls, authorized tools, grounding in attempt history, prompt and safety evaluation, Arabic tone review.

### Phase 6 — analytics, rewards, partners

**Data + Product + BD:** verified dashboard, achievements, in-app reward store, partner pipeline, signed offers only, wallet, redemption transaction engine, reconciliation.

### Phase 7 — Saudi integrations and launch

**Integrations + QA:** prayer provider, calendar, traffic, weather, safe notifications, localization, load/security/accessibility testing, clinical content review, privacy/legal readiness.

### Suggested roles

- **Product owner:** priorities, scope decisions, cultural voice, partner approval.
- **UI/UX designer:** journey maps, visual identity, motion, accessible interaction specs.
- **Frontend/game engineer:** playable challenges, mission shell, animations, RTL.
- **Backend engineer:** state, persistence, APIs, auth, XP, redemption.
- **AI engineer:** companion, extraction, planner, safety/evals.
- **QA engineer:** functional, regression, automation, security, data integrity.
- **Content/clinical reviewer:** wellbeing wording, OCD/anxiety material, escalation policy.
- **Partnerships/business development:** partner outreach, legal offers, economics.

## 21. Definition of Done — product-wide

A feature is done only when: (1) implemented end-to-end, (2) data persisted in appropriate storage, (3) empty/loading/error states handled, (4) mobile/desktop RTL tested, (5) keyboard/screen-reader/reduced-motion considered, (6) privacy/consent and security reviewed, (7) unit/integration/E2E tests pass, (8) analytics do not fabricate results, (9) Arabic copy reviewed, (10) product owner accepts working demo.

**Release gates:** No clinical efficacy claims without evidence and approval. No third-party logos/discounts without agreements. No driving distraction. No unreviewed exposure therapy. No duplicate XP/redemptions. No sensitive data leaked to partner. No fake AI when only rules are running.

## 22. Immediate next actions — handoff checklist

1. **Frontend:** recreate current prototype as maintainable React app while preserving all 7 nav tabs, landing, mascot states, 6 games, and mission controls.
2. **Design:** deliver Figma screens for landing, onboarding, home, chat, mission, 6 current games, completion, progress, rewards, profile; include motion prototypes and mobile states.
3. **Backend:** implement auth, PostgreSQL, profile/consent, mission/attempt/XP endpoints and migrations.
4. **AI:** implement conversation extraction with explicit confirmation and retrieval of real results; do not claim “AI understands you” before it is connected and evaluated.
5. **Games:** replace 24s faux video with real licensed video and accurate questions; fix task input persistence; add first 5 new mini-games.
6. **QA:** create traceability matrix from this document, automate full daily mission, test pause/resume and XP idempotency, verify every context claim.
7. **Business:** create prospective partner tracker and reward cost model; **do not announce partnerships**.
8. **Safety/privacy:** clinical review plan, consent, retention/deletion, emergency response review, driving-mode safety.
9. **Product:** approve MVP scope, launch audience, partner launch criteria, measurable non-clinical success metrics.

---

## 23. Reference assets and provenance

**Primary current-state source:** user-provided `خويّك _ Khowayk.html` (reviewed 2026-11-06). The source includes all current app styles, state, mascot, landing, onboarding, chat rules, games, mission player, progress, rewards, and settings. This document distinguishes direct inspection (`CURRENT`) from previously agreed product requirements (`TARGET`) and implementation proposals (`PROPOSED`).

**Product direction:** previously agreed KHOWAYK master prompt in this conversation, including Vibrant Saudi Oasis design, premium landing page, AI companion, connected daily missions, adaptive playable challenges, progress, rewards, and Saudi integrations.

**Illustrative reference image:** conceptual mental-wellness platform screens and partner logos supplied in conversation. It is **design inspiration only**, not proof of product functionality or commercial partnerships.

**Change control:** any feature addition should update (a) current-vs-target matrix, (b) challenge catalog, (c) user flows, (d) data/API schema, (e) acceptance tests, and (f) status of integrations/partners. Keep a `CHANGELOG.md` and decision log; do not silently change scoring, privacy, or clinical boundaries.

**Final product test:** a new engineer should be able to read this file, open the supplied HTML, identify exactly what is working, see what is missing, and start implementing assigned tickets without inventing functionality or assuming partnerships exist.
