import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GameProps } from '../types';

export const FEELINGS: [string, string, string][] = [
  ['calm', 'هادي', '#8DBFA3'], ['happy', 'مبسوط', '#FFD36E'], ['excited', 'متحمس', '#FFC6A8'], ['tired', 'تعبان', '#B9AFA3'],
  ['tense', 'متوتر', '#FF8E83'], ['upset', 'مضايق', '#A78BFA'], ['lost', 'ضايع شوي', '#8BCDF1'], ['unsure', 'ما أدري', '#E9DFFF'],
];
export const HELPS: [string, string][] = [
  ['walk', 'أمشي شوي'], ['talk', 'أكلم أحد أثق فيه'], ['break', 'آخذ راحة'], ['small', 'أسوي شي صغير'], ['breath', 'أهدّي نفسي شوي'], ['unsure', 'ما أدري'],
];
export const INTENSITY = ['خفيف', 'شوي', 'وسط', 'واضح', 'قوي'];

// Self-report only. Nothing here is inferred, it stays on the device, and it earns no XP (reference 14.2).
export function EmotionMapGame({ env, onDone }: GameProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feel, setFeel] = useState<string[]>([]);
  const [level, setLevel] = useState<number | null>(null);
  const [help, setHelp] = useState<string[]>([]);

  useEffect(() => {
    env.round(step, 3, 'الخطوة');
    if (step === 1) env.say('listening', 'خذ راحتك. تقدر تتخطى أي شي.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggle = (v: string, set: React.Dispatch<React.SetStateAction<string[]>>) => set((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));

  function finish() {
    env.sfx('ok');
    const names = FEELINGS.filter(([k]) => feel.includes(k)).map(([, l]) => l).join('، ');
    onDone({
      acc: null,
      retries: 0,
      mood: 'calm',
      say: `قلت لي: ${names}. شكرًا إنك شاركتني.`,
      note: 'هذا كلامك أنت، ومحفوظ على جهازك بس. وإذا الوضع ثقيل عليك، كلّم شخص تثق فيه أو مختص.',
      data: { feelings: feel, intensity: level, help },
    });
  }

  if (step === 1) {
    return (
      <div className="scene form">
        <h2 className="q__t">وش تحس فيه الحين؟</h2>
        <p className="note center">تقدر تختار أكثر من وحدة. أنا ما أخمّن، وهذا كلامك أنت.</p>
        <div className="feel">
          {FEELINGS.map(([k, l, c]) => (
            <button key={k} type="button" className={`feel__b ${feel.includes(k) ? 'on' : ''}`} aria-pressed={feel.includes(k)} onClick={() => toggle(k, setFeel)}>
              <i style={{ background: c }} aria-hidden="true" />{l}
            </button>
          ))}
        </div>
        <p className="note"><Lock size={13} aria-hidden="true" /> إجاباتك تبقى على جهازك، وما تنرسل لخدمة الذكاء الاصطناعي، وما عليها نقاط.</p>
        <div className="row row--c"><button type="button" className="btn" disabled={!feel.length} onClick={() => setStep(2)}>التالي</button></div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="scene form">
        <h2 className="q__t">كم قوته؟ (اختياري)</h2>
        <div className="scale" role="group" aria-label="القوة">
          {INTENSITY.map((l, i) => (
            <button key={l} type="button" className={`scale__b ${level === i + 1 ? 'on' : ''}`} aria-pressed={level === i + 1} onClick={() => setLevel(i + 1)}>
              <i style={{ height: 10 + i * 8 }} aria-hidden="true" />{l}
            </button>
          ))}
        </div>
        <div className="row row--c">
          <button type="button" className="btn alt" onClick={() => setStep(1)}>رجوع</button>
          <button type="button" className="btn" onClick={() => setStep(3)}>{level ? 'التالي' : 'تخطى'}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="scene form">
      <h2 className="q__t">وش تتوقع يفيدك؟ (اختياري)</h2>
      <div className="tags tags--c">
        {HELPS.map(([k, l]) => <button key={k} type="button" className={`tag tag--btn ${help.includes(k) ? 'on' : ''}`} aria-pressed={help.includes(k)} onClick={() => toggle(k, setHelp)}>{l}</button>)}
      </div>
      <div className="row row--c">
        <button type="button" className="btn alt" onClick={() => setStep(2)}>رجوع</button>
        <button type="button" className="btn" onClick={finish}>خلصت</button>
      </div>
    </div>
  );
}
