import { describe, expect, it } from 'vitest';
import { addEnergy, addGoals, buddyMood, ENERGY_FULL, energyToday, fullDaysIn, MAX_GOALS, removeGoal, todayGoals, toggleGoal } from '../src/features/buddy/buddy';
import { beginItem, completeItem, createMission } from '../src/features/mission/engine';
import { allDaysDone, currentStep, finishProgram, PROGRAM_DAYS, programSteps, recordProgramDay, startProgram, stepChallenge } from '../src/features/program/program';
import { defaultState, hydrate } from '../src/services/storage';
import { today } from '../src/utils';

const D = (n: number) => `day-${n}`;

describe('journey program', () => {
  it('starts with a rating and adds the journey to what suggestions use', () => {
    const s = defaultState();
    s.needs = ['gen'];
    startProgram(s, 'adhd', 3);
    expect(s.prog).toMatchObject({ id: 'adhd', before: 3, days: [] });
    expect(s.needs).toEqual(['adhd']);
    startProgram(s, 'anx', 9);
    expect(s.prog!.id).toBe('adhd');
  });

  it('has seven steps, repeating short journeys', () => {
    expect(programSteps('adhd')).toHaveLength(PROGRAM_DAYS);
    expect(programSteps('ocd')).toEqual(['calm', 'time', 'calm', 'time', 'calm', 'time', 'calm']);
  });

  it('counts a day only for that day\'s step, once a day, and never resets for a gap', () => {
    const s = defaultState();
    startProgram(s, 'ocd', 2);
    expect(recordProgramDay(s, 'time', D(1))).toBe(false);
    expect(recordProgramDay(s, 'calm', D(1))).toBe(true);
    expect(recordProgramDay(s, 'time', D(1))).toBe(false);
    expect(currentStep(s.prog!, D(1))).toEqual({ day: 1, id: 'calm' });
    // Five days later: nothing lost, the next step was waiting.
    expect(currentStep(s.prog!, D(6))).toEqual({ day: 2, id: 'time' });
    expect(recordProgramDay(s, 'time', D(6))).toBe(true);
    expect(s.prog!.days).toEqual([D(1), D(6)]);
  });

  it('finishes after seven days with a before and after', () => {
    const s = defaultState();
    startProgram(s, 'soc', 2);
    for (let i = 0; i < PROGRAM_DAYS; i++) recordProgramDay(s, stepChallenge('soc', i), D(i));
    expect(allDaysDone(s.prog!)).toBe(true);
    finishProgram(s, 4);
    expect(s.prog).toBeNull();
    expect(s.progDone).toEqual([{ id: 'soc', before: 2, after: 4, end: today() }]);
  });

  it('records the day when the step is completed in a mission', () => {
    const s = defaultState();
    startProgram(s, 'ocd', 3);
    createMission(s, [{ id: 'calm', why: [], diff: 'normal' }], true);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    expect(s.prog!.days).toEqual([today()]);
  });

  it('drops a malformed saved program', () => {
    expect(hydrate({ prog: { id: 'nope', days: [], before: 3 } as never }).prog).toBeNull();
    expect(hydrate({ prog: { id: 'adhd', days: [D(1)], before: 7 } as never }).prog).toBeNull();
    expect(hydrate({ prog: { id: 'adhd', days: [D(1), D(1)], before: 2, started: D(1) } }).prog!.days).toEqual([D(1)]);
  });
});

describe('goals and energy', () => {
  it('keeps goals in the user\'s words, without repeats or past the limit', () => {
    const s = defaultState();
    expect(addGoals(s, ['  reply to   email ', 'Reply to email', '', 'call mum'])).toBe(2);
    expect(todayGoals(s).map((g) => g.text)).toEqual(['reply to email', 'call mum']);
    addGoals(s, Array.from({ length: 10 }, (_, i) => `task ${i}`));
    expect(todayGoals(s)).toHaveLength(MAX_GOALS);
    removeGoal(s, todayGoals(s)[0].id);
    expect(todayGoals(s)).toHaveLength(MAX_GOALS - 1);
  });

  it('starts each day with no goals', () => {
    const s = defaultState();
    addGoals(s, ['a'], 'yesterday');
    expect(todayGoals(s)).toEqual([]);
    expect(hydrate({ goals: { d: 'yesterday', items: [{ id: 'g', text: 'a', done: 0 }] } }).goals).toBeNull();
  });

  it('gives energy once per goal, and unticking takes nothing away', () => {
    const s = defaultState();
    addGoals(s, ['a']);
    const id = todayGoals(s)[0].id;
    expect(toggleGoal(s, id)).toBe(true);
    toggleGoal(s, id);
    expect(toggleGoal(s, id)).toBe(false);
    expect(energyToday(s)).toBe(1);
  });

  it('completing a challenge gives energy, but a self-report check-in does not', () => {
    const s = defaultState();
    createMission(s, [{ id: 'calm', why: [], diff: 'normal' }, { id: 'emotion_map', why: [], diff: 'normal' }], false);
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    s.mission!.idx = 1;
    beginItem(s);
    completeItem(s, { acc: null, retries: 0 });
    expect(energyToday(s)).toBe(1);
  });

  it('fills up to full within a day, and a new day starts fresh', () => {
    const s = defaultState();
    for (let i = 0; i < ENERGY_FULL + 2; i++) addEnergy(s, D(1));
    expect(energyToday(s, D(1))).toBe(ENERGY_FULL);
    expect(energyToday(s, D(2))).toBe(0);
    addEnergy(s, D(2));
    expect(energyToday(s, D(2))).toBe(1);
  });

  it('records a full day once, and only days that filled up', () => {
    const s = defaultState();
    const now = new Date(2026, 10, 7);
    const day = (back: number) => new Date(2026, 10, 7 - back).toDateString();
    for (let i = 0; i < ENERGY_FULL + 3; i++) addEnergy(s, day(0));
    addEnergy(s, day(1));
    for (let i = 0; i < ENERGY_FULL; i++) addEnergy(s, day(3));
    expect(s.fullDays).toEqual([day(0), day(3)]);
    const week = fullDaysIn(s, 7, now);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.full)).toEqual([false, false, false, true, false, false, true]);
  });

  it('shows the buddy sleepy before anything is done, then awake', () => {
    const s = defaultState();
    expect(buddyMood(s, false, D(1))).toBe('resting');
    addEnergy(s, D(1));
    expect(buddyMood(s, false, D(1))).toBe('idle');
    expect(buddyMood(s, true, D(1))).toBe('calm');
    expect(buddyMood(s, false, D(2))).toBe('resting');
  });

  it('cleans bad saved values', () => {
    const s = hydrate({ nrg: 99, nrgD: 5 as never });
    expect(s.nrg).toBe(ENERGY_FULL);
    expect(s.nrgD).toBe('');
  });

  it('says hello after a long gap without taking anything away', () => {
    const now = Date.now();
    const s = hydrate({ hist: [{ id: 'calm' } as never], last: now - 5 * 864e5, nrg: 3, xp: 40 }, now);
    expect(s.missed).toBe(1);
    expect(s.nrg).toBe(3);
    expect(s.xp).toBe(40);
  });
});
