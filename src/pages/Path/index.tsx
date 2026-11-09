import { Coffee, Library, Pencil, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { useAppState, useStore } from '../../context/AppStateContext';
import { currentItem, hasOpenMission } from '../../features/mission/engine';
import { useMissions } from '../../features/mission/MissionProvider';
import { JourneyNode } from '../../features/path/map/JourneyNode';
import { LevelSheet } from '../../features/path/map/LevelSheet';
import { NumoWalker } from '../../features/path/map/NumoWalker';
import { OasisWorld } from '../../features/path/map/OasisWorld';
import { useJourneyTravel } from '../../features/path/map/useJourneyTravel';
import { buildPlan, completeReflect, currentNode, extendPlan, nodeState, pathItem, replan, type NodeState, type PathNode, type PathPlan } from '../../features/path/planner';
import { chapterProgress, layoutWorld, WORLD_W } from '../../features/path/world';
import { ProfileQuestions } from '../../features/profile/ProfileQuestions';
import type { LifeProfile } from '../../features/profile/questions';
import { StreakChip } from '../../features/streak/StreakBits';
import { canRest, takeRest } from '../../features/streak/streak';
import { useBackHandler } from '../../services/native';
import type { ViewId } from '../../types';

export function PathPage({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const [editing, setEditing] = useState(false);

  function saveAnswers(p: LifeProfile) {
    store.update((d) => {
      d.prof = p;
      // Finished steps always stay. Only what hasn't happened yet changes.
      d.path = d.path ? replan(d.path, p) : buildPlan(p);
    });
    setEditing(false);
  }

  if (editing || !s.path) {
    return (
      <div className="pm-setup">
        {!editing && <Mascot state="curious" size={110} label={t('common.brand')} />}
        <h1>{t(editing ? 'path.editTitle' : 'path.setupTitle')}</h1>
        <p className="note">{t(editing ? 'path.editText' : 'path.setupText')}</p>
        <div className="ob-card"><ProfileQuestions initial={s.prof} onBack={editing ? () => setEditing(false) : () => onNavigate('home')} onDone={saveAnswers} /></div>
      </div>
    );
  }
  return <JourneyMap plan={s.path} onNavigate={onNavigate} onEdit={() => setEditing(true)} />;
}

function JourneyMap({ plan, onNavigate, onEdit }: { plan: PathPlan; onNavigate(v: ViewId): void; onEdit(): void }) {
  const { t } = useTranslation();
  const s = useAppState();
  const store = useStore();
  const missions = useMissions();
  const [selKey, setSelKey] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const cur = currentNode(plan);

  // The world is rebuilt only when the steps themselves change, never while scrolling or on a tick.
  const shape = plan.nodes.map((n) => n.key).join('|') + plan.themes.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const world = useMemo(() => layoutWorld(plan), [shape]);
  const doneKeys = plan.nodes.filter((n) => n.done).map((n) => n.key).join('|');

  const { run, stand, mood, reduced } = useJourneyTravel(plan, store, missions.playing, !!s.rm);
  const mascot = useMascot(mood);
  const standStop = world.stops.find((x) => x.key === stand) ?? world.stops[0];
  const prog = chapterProgress(plan);

  const nameOf = useCallback((n: PathNode) => (n.kind === 'play' && n.id
    ? (n.id === 'seq' && n.cfg ? t('games.plan.title') : t(`challenges.items.${n.id}.name`))
    : t(`path.node.${n.kind}`)), [t]);

  const scrollTo = useCallback((key: string, smooth: boolean) => {
    mapRef.current?.querySelector(`[data-stop="${key}"]`)?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Opens near the current step, with a small hello that isn't a celebration.
  useEffect(() => {
    scrollTo(stand, false);
    if (!run) mascot.play(doneKeys ? 'encouraging' : 'greeting');
    // Runs once when the map opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follows Numo after a finished step, and after coming back from a challenge.
  const phase = run?.phase;
  useEffect(() => {
    if (missions.playing) return;
    if (phase === 'walk' && run?.to) scrollTo(run.to, !reduced);
    else if (phase === 'cheer' && run) scrollTo(run.from, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, missions.playing]);

  useBackHandler(() => setSelKey(null), !!selKey);

  const closeSheet = useCallback(() => setSelKey(null), []);
  const openSheet = useCallback((key: string) => setSelKey(key), []);
  useEffect(() => {
    if (selKey && selKey === cur?.key) mascot.play('encouraging');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  // During the celebration the next step stays closed, then opens as Numo sets off.
  const shownState = (n: PathNode): NodeState => (run?.phase === 'cheer' && n.key === run.to ? 'locked' : nodeState(plan, n));
  const resumeKey = hasOpenMission(s) ? currentItem(s)?.jn : undefined;
  const sel = selKey ? plan.nodes.find((n) => n.key === selKey) : undefined;

  function startNode(n: PathNode) {
    setSelKey(null);
    if (resumeKey === n.key) missions.start();
    else missions.start([pathItem(store.getState(), n)]);
  }
  function replayNode(n: PathNode) {
    setSelKey(null);
    missions.start([{ id: n.id!, why: [{ k: 'path' }], diff: 'normal' }]);
  }

  return (
    <div className="jm">
      <header className="jh">
        <div className="jh__row">
          <div className="grow">
            <p className="eyebrow">{t('path.chapter', { n: prog.ch + 1 })}</p>
            <h1 dir="auto">{t(`path.themes.${prog.theme}`)}</h1>
          </div>
          <span className="pm__chips">
            <StreakChip />
            <span className="sk-chip" aria-label={t('path.xpLabel', { n: s.xp })}><Sparkles size={14} aria-hidden="true" /> <b>{s.xp}</b></span>
          </span>
        </div>
        <div className="jh__bar" role="progressbar" aria-valuemin={0} aria-valuemax={prog.total} aria-valuenow={prog.done} aria-label={t('path.overall', { done: prog.done, total: prog.total })}><i style={{ width: `${(prog.done / prog.total) * 100}%` }} /></div>
      </header>

      <div className="jw" ref={mapRef} style={{ aspectRatio: `${WORLD_W} / ${world.height}` }}>
        <OasisWorld world={world} doneKeys={doneKeys} />

        {world.chapters.map((c) => (
          <div key={c.ch} className="jw__ch" style={{ top: `${(c.bannerY / world.height) * 100}%` }}>
            <span className="eyebrow">{t('path.chapter', { n: c.ch + 1 })}</span>
            <h2 dir="auto">{t(`path.themes.${plan.themes[c.ch] ?? 'gentle'}`)}</h2>
          </div>
        ))}

        <ol className="jw__list" aria-label={t('path.listLabel')}>
          {world.stops.map((st) => {
            const n = plan.nodes[st.i];
            return <JourneyNode key={st.key} stop={st} node={n} state={shownState(n)} name={nameOf(n)} height={world.height} fresh={run?.from === n.key} resume={resumeKey === n.key} onOpen={openSheet} />;
          })}
        </ol>

        {standStop && <NumoWalker stop={standStop} height={world.height} mood={mascot.state} label={t('common.brand')} reduced={reduced} />}
      </div>

      {!cur && (
        <section className="next jm__end">
          <h2>{t('path.allDone')}</h2>
          <p className="note">{t('path.allDoneText')}</p>
          <button type="button" className="btn" onClick={() => store.update((d) => extendPlan(d, d.prof))}>{t('path.more')}</button>
        </section>
      )}

      <div className="jm__foot">
        <button type="button" className="btn-link" onClick={onEdit}><Pencil size={14} aria-hidden="true" /> {t('path.edit')}</button>
        <button type="button" className="btn-link" onClick={() => onNavigate('chal')}><Library size={14} aria-hidden="true" /> {t('path.library')}</button>
        {!!s.streakOn && canRest(s) && <button type="button" className="btn-link" onClick={() => store.update((d) => { takeRest(d); })}><Coffee size={14} aria-hidden="true" /> {t('streak.rest')}</button>}
      </div>

      {sel && (
        <LevelSheet
          node={sel}
          state={nodeState(plan, sel)}
          name={nameOf(sel)}
          position={plan.nodes.indexOf(sel) + 1}
          total={plan.nodes.length}
          resume={resumeKey === sel.key}
          rm={!!s.rm}
          onClose={closeSheet}
          onStart={() => startNode(sel)}
          onReplay={() => replayNode(sel)}
          onTalk={() => { setSelKey(null); onNavigate('chat'); }}
          onReflect={() => { store.update((d) => { completeReflect(d, sel.key); }); setSelKey(null); }}
        />
      )}
    </div>
  );
}
