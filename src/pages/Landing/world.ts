import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BASE_IMAGE, CLIPS, type MascotState } from '../../components/mascot/manifest';

// The landing page's living world, ported from the design prototype. One ZAHO for the whole page: it flies
// between empty "slots" that each scene reserves, so it never covers text or buttons, and shrinks to a corner
// badge when no slot is in view. Plain DOM and GSAP, started once per page and fully undone by destroy().

gsap.registerPlugin(ScrollTrigger);

export type Translate = (key: string, opts?: Record<string, unknown>) => string;
export interface World {
  show(state: MascotState, once?: boolean): void;
  say(text: string, ms?: number): void;
  celebrate(big: boolean): void;
  excite(): void;
  burstAt(el: Element, kind: 'spark' | 'heart', n?: number): void;
  /** Whether ZAHO is sitting in this slot now, so a scene's reaction only plays when it's seen. */
  docked(slot: Element | null): boolean;
  /** The state a slot asks for; shown at once if ZAHO is there. */
  setSlot(slot: Element | null, state: MascotState): void;
  relayout(): void;
  destroy(): void;
}

const PAL = ['#ffd36b', '#a57ff0', '#7fd9a8', '#ff9fb0', '#8ecbee'];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
// Dawn, morning, sunset and night: one sky for each moment of the day.
const SKY = [['#f6c9b6', '#e9b9c9', '#e5c9a2'], ['#bfe0f7', '#e3f2fb', '#ecd2a2'], ['#f1a07a', '#f6c49a', '#c99168'], ['#141a3d', '#2b3266', '#3a3550']];
const DAY_STATE: MascotState[] = ['calm', 'thinking', 'listening', 'resting'];
const LAST_DAY = SKY.length - 1;
const HOW_STATE: MascotState[] = ['listening', 'thinking', 'happy', 'encouraging', 'celebrating'];
function mix(a: string, b: string, k: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}

export function startWorld({ root, t, reduce }: { root: HTMLElement; t: Translate; reduce: boolean }): World {
  const q = <E extends Element = HTMLElement>(s: string) => root.querySelector<E & Element>(`[data-zw="${s}"]`) as unknown as E;
  const qa = <E extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll<E & Element>(sel)] as unknown as E[];
  const coarse = matchMedia('(pointer: coarse)').matches;
  const isPhone = () => innerWidth <= 760;
  const fxScale = () => (coarse || isPhone() ? 0.5 : 1);
  // Safari and iOS can't show transparent WebM, so there ZAHO stays the still image and hops instead.
  const canAlpha = !/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent) && !/iPad|iPhone|iPod/.test(navigator.userAgent);
  const rtl = () => getComputedStyle(root).direction === 'rtl';

  const Z = q('zaho');
  const zv = q<HTMLVideoElement>('zvid');
  const ztilt = q('ztilt');
  const zhop = q('zhop');
  const zshadow = q('zshadow');
  const bubble = q('bubble');
  const ringP = q<SVGCircleElement>('ringP');
  const pl = q<SVGGElement>('pl');
  const pr = q<SVGGElement>('pr');
  const prog = q('prog');
  const nav = q('nav');
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const off: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(target: Window | Document | Element, ev: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
    target.addEventListener(ev, fn as EventListener, opts);
    off.push(() => target.removeEventListener(ev, fn as EventListener, opts));
  };

  const Zs = { state: 'idle' as MascotState, once: null as MascotState | null, x: 0, y: 0, s: 100, look: { x: 0, y: 0 }, lean: 0 };

  function show(state: MascotState, once = false) {
    if (once) Zs.once = state;
    else Zs.state = state;
    const want = Zs.once || Zs.state;
    const clip = CLIPS[want];
    if (want === 'idle' || !canAlpha || !clip) {
      Z.classList.remove('is-clip');
      zv.pause();
      zv.dataset.src = '';
      Zs.once = null;
      if (!canAlpha && want !== 'idle') cssReact(want);
      return;
    }
    if (zv.dataset.src === clip.src) { zv.loop = !Zs.once; return; }
    zv.dataset.src = clip.src;
    zv.src = clip.src;
    zv.loop = !Zs.once;
    zv.onplaying = () => Z.classList.add('is-clip');
    zv.onended = () => { if (Zs.once) { Zs.once = null; show(Zs.state); } };
    zv.play().catch(() => {});
  }
  function cssReact(state: MascotState) {
    const k = ({ happy: 1, celebrating: 1.4, encouraging: 0.8, greeting: 1 } as Partial<Record<MascotState, number>>)[state];
    if (k) hop(k);
    later(() => { Zs.once = null; }, 1200);
  }
  function hop(k = 1) {
    if (reduce) return;
    zhop.animate([{ transform: 'none' }, { transform: 'scale(1.14,.84)', offset: 0.15 }, { transform: `translateY(${-60 * k}%) scale(.93,1.1) rotate(-6deg)`, offset: 0.5 }, { transform: 'scale(1.1,.88)', offset: 0.82 }, { transform: 'none' }], { duration: 850, easing: 'ease-in-out' });
  }
  // Blinking, with an occasional double blink.
  function blink() {
    if (!Z.classList.contains('is-clip') && !reduce) {
      for (const [k, from] of [['lidL', -170], ['lidR', -180]] as const) {
        q(k).animate([{ transform: `translate(0px, ${from}px)` }, { transform: 'translate(0px, 0px)', offset: 0.45 }, { transform: 'translate(0px, 0px)', offset: 0.55 }, { transform: `translate(0px, ${from}px)` }], { duration: 170, easing: 'ease-in-out' });
      }
    }
    later(blink, Math.random() < 0.2 ? 240 : 2200 + Math.random() * 3200);
  }
  function say(text: string, ms = 2800) {
    if (!text) return;
    bubble.textContent = text;
    bubble.getAnimations().forEach((a) => a.cancel());
    bubble.animate([{ opacity: 0, transform: 'translateY(8px) scale(.7)' }, { opacity: 1, transform: 'none', offset: 0.1 }, { opacity: 1, transform: 'none', offset: 0.9 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: ms, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  }
  function burst(cls: string, n: number, x: number, y: number, colors: string[], a0: number, a1: number, dur: number, grav: number) {
    if (reduce) return;
    n = Math.round(n * fxScale());
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = `zw-fx zw-${cls}`;
      s.style.setProperty('--c', colors[i % colors.length]);
      document.body.appendChild(s);
      const a = ((a0 + Math.random() * (a1 - a0)) * Math.PI) / 180;
      const v = 80 + Math.random() * 130;
      const ex = Math.cos(a) * v;
      const ey = Math.sin(a) * v;
      s.animate([{ transform: `translate(${x}px,${y}px) scale(0)`, opacity: 1 }, { transform: `translate(${x + ex}px,${y + ey}px) scale(1) rotate(200deg)`, opacity: 1, offset: 0.45 }, { transform: `translate(${x + ex * 1.3}px,${y + ey * 0.3 + grav}px) scale(.5) rotate(420deg)`, opacity: 0 }],
        { duration: dur + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => s.remove();
    }
  }
  const zc = () => [Zs.x + Zs.s / 2, Zs.y + Zs.s * 0.45];
  function celebrate(big: boolean) {
    const [x, y] = zc();
    show('celebrating', true);
    hop(1.2);
    burst(big ? 'conf' : 'spark', big ? 70 : 22, x, y, PAL, big ? 200 : 0, big ? 340 : 360, big ? 1600 : 900, big ? 260 : 30);
  }
  function excite() {
    const [x, y] = zc();
    show('happy', true);
    hop(0.8);
    burst('heart', 10, x, y - Zs.s * 0.2, ['#ff8fab', '#ffb3c6', '#a57ff0'], 220, 320, 1100, -40);
  }

  // The eyes follow the pointer or finger.
  let px = -1;
  let py = -1;
  let lastMove = 0;
  const track = (e: PointerEvent) => { px = e.clientX; py = e.clientY; lastMove = performance.now(); };
  on(window, 'pointermove', track, { passive: true });
  on(window, 'pointerdown', track, { passive: true });

  const scenes = qa('[data-scene]');
  on(q('zhit'), 'click', () => {
    // The small corner ZAHO takes you to the next scene.
    if (Z.classList.contains('is-mini')) {
      scenes.find((s) => s.getBoundingClientRect().top > 80)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    const lines = [1, 2, 3, 4].map((n) => t(`landing.poke.${n}`));
    say(lines[Math.floor(Math.random() * lines.length)], 1800);
    celebrate(false);
  });

  // ---------- docking: one ZAHO, many places ----------
  const slots = qa('.zw-slot');
  let dock: Element | 'mini' | null = null;
  let flight: { from: { x: number; y: number; s: number }; t0: number; dur: number } | null = null;
  let entering = true;
  let lastSaid = 'hero';
  let endDone = false;
  const slotRect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, s: r.width }; };
  function chooseDock(vh: number) {
    let best: Element | null = null;
    let bd = 1e9;
    const top = (isPhone() ? 60 : 64) + 4;
    for (const el of slots) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const vis = (Math.min(r.bottom, vh) - Math.max(r.top, top)) / r.height;
      if (vis < 0.72) continue;
      const d = Math.abs(r.top + r.height / 2 - vh * 0.45);
      if (d < bd) { bd = d; best = el; }
    }
    return best;
  }
  function miniRect(vh: number) {
    const s = isPhone() ? 64 : 76;
    const sab = parseFloat(getComputedStyle(root).getPropertyValue('--zw-sab')) || 0;
    return { x: rtl() ? 18 : innerWidth - s - 18, y: vh - s - 18 - sab, s };
  }

  // ---------- the frame loop ----------
  const layers = qa('[data-zw-d]');
  let hx = 0;
  let hy = 0;
  let running = true;
  let raf = 0;
  let lastY = scrollY;
  let scrollV = 0;
  function frame(now: number) {
    if (!running) return;
    const vh = innerHeight;
    const sy = scrollY;
    scrollV = lerp(scrollV, sy - lastY, 0.2);
    lastY = sy;
    const max = document.documentElement.scrollHeight - vh;
    const p = max > 0 ? sy / max : 0;
    prog.style.transform = `scaleX(${p})`;
    nav.classList.toggle('is-solid', sy > 30);
    ringP.setAttribute('stroke-dasharray', `${p * 100} 100`);

    if (!entering) {
      const d = chooseDock(vh);
      const target = d ? slotRect(d) : miniRect(vh);
      const key = d || 'mini';
      if (key !== dock) {
        const prev = dock;
        dock = key;
        Zs.once = null;
        flight = reduce ? null : { from: { x: Zs.x, y: Zs.y, s: Zs.s }, t0: now, dur: 750 };
        Z.classList.toggle('is-mini', !d);
        if (d) {
          show(((d as HTMLElement).dataset.state || 'idle') as MascotState);
          const scene = d.closest<HTMLElement>('[data-scene]')?.dataset.scene;
          if (prev !== null && scene && scene !== lastSaid) { lastSaid = scene; later(() => say(t(`landing.say.${scene}`)), 420); }
          if (scene === 'end' && !endDone) { endDone = true; later(() => celebrate(true), 700); }
        } else show('idle');
      }
      let { x, y, s } = target;
      if (flight) {
        const k = clamp((now - flight.t0) / flight.dur, 0, 1);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const dist = Math.hypot(x - flight.from.x, y - flight.from.y);
        x = lerp(flight.from.x, x, e);
        s = lerp(flight.from.s, s, e);
        y = lerp(flight.from.y, y, e) - Math.sin(Math.PI * e) * Math.min(160, dist * 0.35);
        zhop.style.scale = k < 0.15 ? `${1 + k} ${1 - k}` : k > 0.85 && k < 1 ? `${1 + (1 - k)} ${1 - (1 - k)}` : '';
        if (k >= 1) { flight = null; zhop.style.scale = ''; }
      }
      Zs.x = x; Zs.y = y; Zs.s = s;
      Z.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      Z.style.width = Z.style.height = `${s}px`;
    }

    // Lean into the scroll, and bob while moving.
    const v = clamp(scrollV, -40, 40);
    Zs.lean = lerp(Zs.lean, reduce ? 0 : clamp(-v * 0.5, -10, 10), 0.12);
    ztilt.style.transform = `rotate(${Zs.lean}deg) translateY(${reduce ? 0 : -Math.abs(Math.sin(now / 120)) * Math.min(Math.abs(v), 12)}px)`;
    zshadow.style.opacity = Z.classList.contains('is-mini') ? '0' : '1';

    // Eyes: follow the pointer; after a while without input they look around.
    const [cx, cy] = zc();
    let tx = 0;
    let ty = 0;
    if (px >= 0 && now - lastMove < 4000) {
      const dx = px - cx;
      const dy = py - cy;
      const dd = Math.hypot(dx, dy) || 1;
      const m = Math.min(1, dd / 260);
      tx = (dx / dd) * m;
      ty = (dy / dd) * m;
    } else { tx = Math.sin(now / 2300) * 0.5; ty = Math.cos(now / 3100) * 0.25 + 0.15; }
    Zs.look.x = lerp(Zs.look.x, tx, 0.14);
    Zs.look.y = lerp(Zs.look.y, ty, 0.14);
    pl.setAttribute('transform', `translate(${Zs.look.x * 16 - 4} ${Zs.look.y * 13 - 3})`);
    pr.setAttribute('transform', `translate(${Zs.look.x * 13} ${Zs.look.y * 11 - 2})`);

    // Hero parallax, from the pointer and the scroll.
    if (sy < vh * 1.2) {
      const nx = px < 0 ? 0 : (px / innerWidth) * 2 - 1;
      const ny = py < 0 ? 0 : (py / vh) * 2 - 1;
      hx = lerp(hx, nx, 0.05);
      hy = lerp(hy, ny, 0.05);
      for (const l of layers) { const dd = reduce ? 0 : +(l.dataset.zwD ?? 0); l.style.transform = `translate3d(${-hx * dd}px, ${-hy * dd * 0.4 + (sy * dd) / 90}px, 0)`; }
    }
    // The bubble sits over ZAHO, kept on screen.
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    bubble.style.left = `${clamp(cx - bw / 2, 12, innerWidth - bw - 12)}px`;
    bubble.style.top = `${clamp(Zs.y - bh - 8, 70, vh - bh - 12)}px`;
    raf = requestAnimationFrame(frame);
  }
  on(document, 'visibilitychange', () => {
    running = !document.hidden;
    if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  });

  // ---------- how: the road ----------
  const howSection = q('how');
  const roadBox = q('roadBox');
  const roadDone = q<SVGPathElement>('roadDone');
  const walker = q('walker');
  const stops = () => qa('.zw-stop');
  let roadLen = 1;
  let howP = 0;
  let lastStop = -1;
  const stopFr = [0, 0.25, 0.5, 0.75, 1];
  function layoutRoad() {
    const vert = innerWidth < 1025;
    howSection.classList.toggle('is-vert', vert);
    const W = roadBox.clientWidth;
    const H = roadBox.clientHeight;
    const r = rtl();
    let d: string;
    if (!vert) {
      const y = H * 0.42;
      const a = 60;
      const x0 = r ? W - 110 : 110;
      const x1 = r ? 110 : W - 110;
      const n = 4;
      const seg = (x1 - x0) / n;
      d = `M${x0} ${y}`;
      for (let i = 0; i < n; i++) { const xa = x0 + seg * i; const xb = xa + seg; const s = i % 2 ? 1 : -1; d += ` C${xa + seg * 0.5} ${y + s * a} ${xb - seg * 0.5} ${y + s * a} ${xb} ${y}`; }
    } else {
      const x = r ? W - 52 : 52;
      const n = 4;
      const seg = (H - 80) / n;
      d = `M${x} 40`;
      for (let i = 0; i < n; i++) { const ya = 40 + seg * i; const yb = ya + seg; const s = (i % 2 ? 1 : -1) * (r ? -1 : 1); d += ` C${x + s * 22} ${ya + seg * 0.5} ${x + s * 22} ${yb - seg * 0.5} ${x} ${yb}`; }
    }
    for (const k of ['roadBg', 'roadDash', 'roadDone']) q(k).setAttribute('d', d);
    roadLen = roadDone.getTotalLength();
    roadDone.style.strokeDasharray = `${roadLen}`;
    stops().forEach((s, i) => {
      const pt = roadDone.getPointAtLength(roadLen * (stopFr[i] * 0.92 + 0.04));
      s.style.left = `${pt.x}px`;
      s.style.top = `${pt.y}px`;
      s.style.setProperty('--tw', `${Math.max(160, W - 40 - 46 - 16)}px`);
    });
    setHow(howP, true);
  }
  function setHow(p: number, silent = false) {
    howP = p;
    const along = roadLen * (p * 0.92 + 0.04);
    roadDone.style.strokeDashoffset = `${roadLen - along}`;
    const pt = roadDone.getPointAtLength(along);
    const s = walker.offsetWidth;
    walker.style.left = `${pt.x - s / 2}px`;
    walker.style.top = `${pt.y - s * 0.92}px`;
    let reached = -1;
    stops().forEach((st, i) => { const ok = p >= stopFr[i] - 0.02; st.classList.toggle('is-on', ok); if (ok) reached = i; });
    if (reached !== lastStop && !silent) {
      lastStop = reached;
      const st = HOW_STATE[reached];
      if (st) {
        walker.dataset.state = st === 'celebrating' ? 'happy' : st;
        if (dock === walker) { show(walker.dataset.state as MascotState); if (st === 'celebrating') celebrate(false); }
      }
    }
  }

  // ---------- meet: the moods around ZAHO ----------
  // On every screen, in a circle around ZAHO. Each mood is kept inside the stage, so on a phone the circle
  // tightens instead of spilling off the side.
  function layoutMoods() {
    const st = q('stage');
    const W = st.clientWidth;
    const H = st.clientHeight;
    const cx = W / 2;
    const cy = H * 0.46;
    const rx = Math.min(330, W * 0.42);
    const ry = Math.min(200, H * 0.4);
    qa('.zw-mood').forEach((m, i) => {
      const a = ((-90 + i * 60 + 30) * Math.PI) / 180;
      const half = m.offsetWidth / 2 + 6;
      m.style.left = `${clamp(cx + Math.cos(a) * rx, half, W - half)}px`;
      m.style.top = `${cy + Math.sin(a) * ry}px`;
      m.style.animationDelay = `${i * -0.8}s`;
    });
  }

  // ---------- your Saudi day: the sky follows the day ----------
  let dayIdx = 0;
  const daySlot = q('s-saudi');
  function setDay(p: number) {
    const f = clamp(p, 0, 0.9999) * SKY.length;
    const i = Math.floor(f);
    const k = f - i;
    const j = Math.min(LAST_DAY, i + 1);
    q('daySky').style.background = `linear-gradient(${mix(SKY[i][0], SKY[j][0], k)}, ${mix(SKY[i][1], SKY[j][1], k)})`;
    q('dayGround').style.background = mix(SKY[i][2], SKY[j][2], k);
    const pin = q('dayPin');
    const W = pin.clientWidth;
    const H = pin.clientHeight;
    const a = Math.PI * clamp(p * 1.15, 0, 1);
    const ox = rtl() ? W * 0.92 - ((1 - Math.cos(a)) / 2) * W * 0.84 : W * 0.08 + ((1 - Math.cos(a)) / 2) * W * 0.84;
    const orb = q('orb');
    orb.style.left = `${ox}px`;
    orb.style.top = `${H * 0.78 - Math.sin(a) * H * 0.62}px`;
    orb.classList.toggle('is-moon', i >= LAST_DAY);
    pin.classList.toggle('is-night', i >= LAST_DAY || (i === LAST_DAY - 1 && k > 0.6));
    if (i !== dayIdx) {
      dayIdx = i;
      qa('.zw-moment').forEach((m, n) => m.classList.toggle('is-on', n === i));
      qa('.zw-dots i').forEach((dd, n) => dd.classList.toggle('is-on', n === i));
      daySlot.dataset.state = DAY_STATE[i];
      if (dock === daySlot) show(DAY_STATE[i]);
    }
  }

  // ---------- the hero water ----------
  const oasis = q('oasis');
  function ripple(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const r = document.createElement('div');
      r.className = 'zw-ring';
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      oasis.appendChild(r);
      r.animate([{ width: '10px', height: '4px', margin: '-2px -5px', opacity: 0.9 }, { width: '300px', height: '70px', margin: '-35px -150px', opacity: 0 }], { duration: 1400, delay: i * 200, easing: 'ease-out', fill: 'both' }).onfinish = () => r.remove();
    }
  }
  on(oasis, 'pointerdown', (e: PointerEvent) => {
    const r = oasis.getBoundingClientRect();
    ripple(e.clientX - r.left, e.clientY - r.top);
    if (dock === q('s-hero')) show('curious', true);
  });

  // ---------- the night sky at the end ----------
  const end = q('end');
  for (let i = 0; i < (coarse ? 40 : 80); i++) {
    const s = document.createElement('i');
    s.className = 'zw-star';
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${35 + Math.random() * 65}%`;
    s.style.animationDelay = `${Math.random() * 3}s`;
    s.style.opacity = `${Math.random()}`;
    end.appendChild(s);
  }
  for (let i = 0; i < (coarse ? 6 : 12); i++) {
    const l = document.createElement('i');
    l.className = 'zw-lantern';
    l.style.left = `${5 + Math.random() * 90}%`;
    l.style.setProperty('--dx', `${Math.random() * 80 - 40}px`);
    l.style.animationDuration = `${14 + Math.random() * 12}s`;
    l.style.animationDelay = `${-Math.random() * 20}s`;
    l.style.scale = `${0.6 + Math.random() * 0.6}`;
    end.appendChild(l);
  }

  // What's off screen doesn't animate.
  const offIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('zw-paused', !e.isIntersecting)));
  scenes.forEach((s) => offIO.observe(s));

  // ---------- scroll stories ----------
  const ctx = gsap.context(() => {
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 1025px) and (min-height: 560px)', narrow: '(max-width: 1024px), (max-height: 559px)' }, (c) => {
      layoutRoad();
      if (c.conditions?.wide) ScrollTrigger.create({ trigger: q('howPin'), start: 'top top', end: '+=150%', pin: true, scrub: true, onUpdate: (s) => setHow(s.progress) });
      else ScrollTrigger.create({ trigger: roadBox, start: 'top 70%', end: 'bottom 60%', scrub: true, onUpdate: (s) => setHow(s.progress) });
      setHow(0, true);
    });
    // Pinned on phones too, as on a laptop. Only a screen too short to hold a moment (a phone on its side) gets the list.
    mm.add({ desk: '(min-height: 500px)', phone: '(max-height: 499px)' }, (c) => {
      if (c.conditions?.desk) {
        ScrollTrigger.create({ trigger: q('dayPin'), start: 'top top', end: '+=180%', pin: true, scrub: true, onUpdate: (s) => setDay(s.progress) });
      } else {
        ScrollTrigger.create({ trigger: q('moments'), start: 'top 60%', end: 'bottom 60%', scrub: true, onUpdate: (s) => { daySlot.dataset.state = DAY_STATE[clamp(Math.floor(s.progress * SKY.length), 0, LAST_DAY)]; } });
        if (!reduce) qa('.zw-moment').forEach((m) => gsap.from(m, { y: 40, opacity: 0, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: m, start: 'top 88%' } }));
      }
      setDay(0);
    });
    if (reduce) return;
    qa('.zw-title, .zw-lead, .zw-kicker').forEach((el) => gsap.from(el, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
    ScrollTrigger.batch(qa('.zw-peb'), { start: 'top 92%', onEnter: (b) => gsap.fromTo(b, { y: 40, scale: 0.8, rotate: () => gsap.utils.random(-8, 8), opacity: 0 }, { y: 0, scale: 1, rotate: 0, opacity: 1, stagger: 0.06, duration: 0.8, ease: 'back.out(1.8)', clearProps: 'transform,opacity' }) });
    gsap.fromTo(qa('.zw-mood'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'back.out(2)', clearProps: 'transform,opacity,scale', scrollTrigger: { trigger: q('stage'), start: 'top 80%' } });
    gsap.from(q('orbit'), { scale: 0.4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: q('stage'), start: 'top 75%' } });
    gsap.from(q('play'), { y: 60, rotate: -2, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q('play'), start: 'top 85%' } });
    ScrollTrigger.create({ trigger: q('shield'), start: 'top 85%', onEnter: () => q('shield').classList.add('is-in') });
    gsap.from(q('endTitle'), { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: end, start: 'top 55%' } });
  }, root);
  if (reduce) q('shield').classList.add('is-in');
  const onRefresh = () => { layoutRoad(); layoutMoods(); };
  ScrollTrigger.addEventListener('refresh', onRefresh);
  on(window, 'resize', onRefresh);

  // ---------- entrance: ZAHO jumps out of the water into the hero ----------
  async function enter() {
    entering = true;
    const slot = q('s-hero');
    const r = slotRect(slot);
    Zs.x = r.x; Zs.y = r.y; Zs.s = r.s;
    Z.style.width = Z.style.height = `${r.s}px`;
    if (!reduce) {
      // Inside the page's context, so stopping the page (or React starting it twice in development) undoes it cleanly.
      ctx.add(() => {
        gsap.timeline()
          .from(q('heroCopy'), { y: 40, opacity: 0, duration: 1, ease: 'expo.out' }, 0.1)
          .from(qa('.zw-h1 .zw-w'), { y: 40, opacity: 0, filter: 'blur(8px)', rotate: 4, stagger: 0.07, duration: 0.9, ease: 'expo.out' }, 0.3)
          .to(qa('.zw-h1 .zw-hl path'), { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }, 1.1)
          .from(qa('.zw-hero-copy > p, .zw-ctas > *, .zw-login'), { y: 18, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out' }, 0.8)
          .from(q('cue'), { opacity: 0, duration: 0.6 }, 1.6);
      });
      const o = oasis.getBoundingClientRect();
      const wx = o.left + o.width * (rtl() ? 0.3 : 0.7);
      const wy = o.top + o.height * 0.45;
      later(() => { ripple(wx - o.left, wy - o.top); burst('drop', 18, wx, wy, ['#fff'], 200, 340, 1000, 80); }, 260);
      const L2 = (x: number, y: number) => `translate3d(${x - r.s / 2}px, ${y - r.s * 0.8}px, 0)`;
      const ex = r.x + r.s / 2;
      const ey = r.y + r.s * 0.8;
      const fly = Z.animate([
        { transform: L2(wx, wy + r.s), opacity: 0 }, { transform: L2(wx, wy), opacity: 1, offset: 0.2 }, { transform: L2(lerp(wx, ex, 0.5), Math.min(wy, ey) - r.s * 1.1), offset: 0.52 },
        { transform: L2(ex, ey - 20), offset: 0.7 }, { transform: L2(ex, ey), offset: 0.78 }, { transform: L2(ex, ey) }], { duration: 1800, easing: 'ease-in-out' });
      zhop.animate([{ transform: 'scale(.35)' }, { transform: 'scale(.55,.68)', offset: 0.2 }, { transform: 'scale(.85,1.12) rotate(-14deg)', offset: 0.52 }, { transform: 'scale(.96,1.06) rotate(5deg)', offset: 0.7 }, { transform: 'scale(1.18,.8)', offset: 0.78 }, { transform: 'scale(.95,1.06) translateY(-10%)', offset: 0.88 }, { transform: 'none' }], { duration: 1800, easing: 'ease-in-out' });
      try { await fly.finished; } catch { return; }
    } else {
      qa<SVGPathElement>('.zw-h1 .zw-hl path').forEach((p) => { p.style.strokeDashoffset = '0'; });
    }
    if (destroyed) return;
    const r2 = slotRect(slot);
    Zs.x = r2.x; Zs.y = r2.y;
    Z.style.transform = `translate3d(${r2.x}px, ${r2.y}px, 0)`;
    dock = slot;
    entering = false;
    show('idle');
    show('greeting', true);
    say(t('landing.say.hero'), 3200);
  }

  let destroyed = false;
  (q('zimg') as HTMLImageElement).src = BASE_IMAGE;
  layoutMoods();
  ScrollTrigger.refresh();
  raf = requestAnimationFrame(frame);
  void enter();
  later(blink, 1800);

  return {
    show,
    say,
    celebrate,
    excite,
    burstAt(el, kind, n) {
      const r = el.getBoundingClientRect();
      if (kind === 'heart') burst('heart', n ?? 10, r.left + r.width / 2, r.top, ['#ff8fab', '#ffb3c6', '#a57ff0'], 220, 320, 1100, -40);
      else burst('spark', n ?? 16, r.left + r.width / 2, r.top + r.height / 2, PAL, 0, 360, 800, 0);
    },
    docked: (slot) => !!slot && dock === slot,
    setSlot(slot, state) {
      if (!slot) return;
      (slot as HTMLElement).dataset.state = state;
      if (dock === slot) show(state);
    },
    relayout: onRefresh,
    destroy() {
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      off.forEach((f) => f());
      offIO.disconnect();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      ctx.revert();
      zv.pause();
      document.querySelectorAll('.zw-fx').forEach((e) => e.remove());
      root.querySelectorAll('.zw-star, .zw-lantern').forEach((e) => e.remove());
    },
  };
}
