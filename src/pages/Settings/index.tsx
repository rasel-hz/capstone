import { CalendarOff, CarFront, Download, Palette, ShieldCheck, Trash2, Type, UserRound, Accessibility, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Dialog, IconBadge, PageHeader, Segmented, SettingRow, Toggle } from '../../components/ui/kit';
import { useAppState, useStore } from '../../context/AppStateContext';
import { JOURNEYS } from '../../features/challenges/catalog';
import { level, today } from '../../utils';
import type { Gender, ViewId } from '../../types';
import type { LucideIcon } from 'lucide-react';

const CONTEXT_LABELS = { event: 'عندك عزيمة أو مناسبة', work: 'عندك دوام أو دراسة', sleep: 'نومك كان متأخر' };

const Group = ({ id, title, icon, children }: { id: string; title: string; icon: LucideIcon; children: React.ReactNode }) => (
  <section className="panel set-g" id={id} aria-labelledby={`${id}-t`}>
    <div className="sec-title"><IconBadge icon={icon} tone="lil" /><h2 id={`${id}-t`}>{title}</h2></div>
    {children}
  </section>
);

// Removes only text the user typed into challenges. Scores, XP and dates stay.
const TYPED = ['task', 'step', 'topic', 'notes', 'steps', 'plan', 'now', 'later', 'notToday', 'first'];

export function Settings({ onNavigate }: { onNavigate(v: ViewId): void }) {
  const s = useAppState();
  const store = useStore();
  const [name, setName] = useState(s.name);
  const [prayer, setPrayer] = useState(s.prayer);
  const [ask, setAsk] = useState<'wipe' | 'typed' | null>(null);
  const [saved, setSaved] = useState('');
  const typedCount = s.hist.filter((h) => h.data && typeof h.data === 'object' && TYPED.some((k) => k in (h.data as object))).length;
  const set = (fn: Parameters<typeof store.update>[0]) => store.update(fn);

  function flash(t: string) {
    setSaved(t);
    setTimeout(() => setSaved(''), 2500);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(store.getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'khowayk-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
    flash('حمّلنا نسخة من بياناتك.');
  }

  function clearTyped() {
    set((d) => {
      d.hist.forEach((h) => {
        if (h.data && typeof h.data === 'object') TYPED.forEach((k) => delete (h.data as Record<string, unknown>)[k]);
      });
    });
    setAsk(null);
    flash('مسحنا النصوص اللي كتبتها.');
  }

  function wipe() {
    store.reset();
    location.reload();
  }

  const journeyNames = JOURNEYS.filter((j) => s.needs.includes(j.id)).map((j) => j.n).join('، ') || 'ما اخترت';
  const genders: { value: Gender; label: string }[] = [{ value: 'm', label: 'مذكر' }, { value: 'f', label: 'مؤنث' }];

  return (
    <>
      <PageHeader title="ملفي" sub="كل بياناتك محفوظة على هذا الجهاز بس. ما فيه حساب ولا خادم يحفظها." />
      <p className="sr-status" role="status">{saved}</p>

      <Group id="personal" title="عنك وعن تفضيلاتك" icon={UserRound}>
        <SettingRow title="اسمك أو لقبك">
          <div className="row">
            <input aria-label="الاسم" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            <button type="button" className="btn sm alt" onClick={() => { set((d) => { d.name = name.trim() || d.name; }); flash('حفظنا الاسم.'); }}>حفظ</button>
          </div>
        </SettingRow>
        <SettingRow title="أخاطبك بصيغة"><Segmented label="صيغة المخاطبة" value={s.g} options={genders} onChange={(g) => set((d) => { d.g = g; })} /></SettingRow>
        <SettingRow title="رحلاتي" note={journeyNames}><button type="button" className="btn sm alt" onClick={() => onNavigate('journeys')}>عدّلها</button></SettingRow>
        <SettingRow title="طول المهمة" note="المختصرة تخلي التحديات بنسختها الأسهل.">
          <Segmented label="طول المهمة" value={s.pref === 'short' ? 'short' : 'normal'} options={[{ value: 'normal', label: 'عادية' }, { value: 'short', label: 'مختصرة' }]} onChange={(v) => set((d) => { d.pref = v === 'short' ? 'short' : null; })} />
        </SettingRow>
        <SettingRow title="وقت نشاطك"><Segmented label="وقت نشاطك" value={s.pat || null} options={[{ value: 'am', label: 'صباحي' }, { value: 'pm', label: 'مسائي' }]} onChange={(v) => set((d) => { d.pat = v; })} /></SettingRow>
      </Group>

      <Group id="access" title="راحتك وسهولة الاستخدام" icon={Accessibility}>
        <SettingRow title="أقل حركة" note="يوقف الحركة غير الضرورية. يطبق أيضًا لو جهازك مفعّل الخيار."><Toggle label="أقل حركة" on={!!s.rm} onChange={(v) => set((d) => { d.rm = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title="الأصوات" note="ما فيه شي يعتمد على الصوت لتفهمه."><Toggle label="الأصوات" on={!!s.snd} onChange={(v) => set((d) => { d.snd = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title="خط أكبر"><Toggle label="خط أكبر" on={!!s.largeText} onChange={(v) => set((d) => { d.largeText = v ? 1 : 0; })} /></SettingRow>
      </Group>

      <Group id="day" title="ترتيب يومك" icon={MapPin}>
        <SettingRow title="جدولك"><Segmented label="جدولك" value={s.sched} options={[{ value: 'work', label: 'دوام' }, { value: 'study', label: 'دراسة' }, { value: 'flex', label: 'مرن' }]} onChange={(v) => set((d) => { d.sched = v; })} /></SettingRow>
        <SettingRow title="الصلاة القادمة" note="تدخلها بنفسك لليوم بس. ما فيه ربط بخدمة مواقيت.">
          <div className="row">
            <input type="time" aria-label="وقت الصلاة القادمة" value={prayer} onChange={(e) => setPrayer(e.target.value)} />
            <button type="button" className="btn sm alt" onClick={() => { set((d) => { d.prayer = prayer; d.prayerDay = today(); }); flash('حفظنا وقت الصلاة.'); }}>حفظ</button>
          </div>
        </SettingRow>
        <SettingRow title="حماية بعد الأذان"><Segmented label="مدة الحماية بالدقائق" value={s.pp} options={[0, 20, 30, 45].map((v) => ({ value: v, label: v ? `${v} د` : 'بدون' }))} onChange={(v) => set((d) => { d.pp = v; })} /></SettingRow>
        <div className="set-note"><CarFront size={18} aria-hidden="true" /><div>
          <b>القيادة</b>
          <p className="note flush">لا تفتح التطبيق وأنت تسوق. جهّز هالإعداد قبل تتحرك. التطبيق ما يعرف إذا كنت تسوق من نفسه، ولا يستخدم موقعك.</p>
        </div></div>
        <SettingRow title="أنا أسوق الحين" note="يوقف كل التحديات والكتابة في المحادثة لين تطفيه."><Toggle label="أنا أسوق الحين" on={!!s.driving} onChange={(v) => set((d) => { d.driving = v ? 1 : 0; })} /></SettingRow>
        <SettingRow title="ساعات قيادة اليوم" note="اختياري. إذا سقت واجد، أقترح عليك بريك بعد ما توصل.">
          <input type="number" min={0} max={12} className="num-input" aria-label="ساعات قيادة اليوم" value={s.drive} onChange={(e) => { const v = Math.max(0, Math.min(12, +e.target.value)); set((d) => { d.drive = v; }); }} />
        </SettingRow>
        {s.drive >= 2 && <p className="insight">قلت لي إنك سقت {s.drive} ساعات اليوم. أول ما توصل بالسلامة خذ لك بريك.</p>}
        <div className="set-note"><CalendarOff size={18} aria-hidden="true" /><p className="note flush">التقويم والمرور والطقس غير مربوطين. اللي توافق عليه في المحادثة يظهر تحت.</p></div>
      </Group>

      <Group id="privacy" title="خصوصيتك وبياناتك" icon={ShieldCheck}>
        <SettingRow title="الردود الذكية (OpenAI)" note="لما تكون شغّالة، رسالتك وآخر رسايل المحادثة وملخص نتائجك تنرسل لـ OpenAI عشان يطلع الرد. ما نرسل اسمك ولا رحلاتك ولا اللي تكتبه في التحديات ولا إجابات «وش جوّك».">
          <Toggle label="الردود الذكية" on={s.aiConsent === 1} onChange={(v) => set((d) => { d.aiConsent = v ? 1 : 0; })} />
        </SettingRow>
        <div className="set-sub">
          <b>وش محفوظ عندك</b>
          <ul className="plain">
            <li>{s.hist.length} محاولة، و{s.xp} نقطة (المستوى {level(s)})</li>
            <li>{s.en.length} تسجيل طاقة، و{s.chat.filter((m) => !m.b).length} رسالة كتبتها في المحادثة</li>
            <li>{typedCount} محاولة فيها نص كتبته بنفسك</li>
          </ul>
        </div>
        <div className="set-sub">
          <b>اللي وافقت أسجله عن يومك</b>
          {s.ctx.length ? (
            <div className="tags">{s.ctx.map((c) => <button key={c} type="button" className="tag tag--btn" aria-label={`احذف: ${CONTEXT_LABELS[c]}`} onClick={() => set((d) => { d.ctx = d.ctx.filter((x) => x !== c); })}>{CONTEXT_LABELS[c]} <Trash2 size={13} aria-hidden="true" /></button>)}</div>
          ) : <p className="note flush">ما فيه شي مسجل.</p>}
        </div>
        <div className="row">
          <button type="button" className="btn sm alt" onClick={exportData}><Download size={15} aria-hidden="true" /> حمّل نسخة من بياناتي</button>
          <button type="button" className="btn sm alt" disabled={!typedCount} onClick={() => setAsk('typed')}><Type size={15} aria-hidden="true" /> امسح النصوص اللي كتبتها</button>
          <button type="button" className="btn sm btn--danger" onClick={() => setAsk('wipe')}><Trash2 size={15} aria-hidden="true" /> امسح كل بياناتي</button>
        </div>
      </Group>

      <Group id="app-pref" title="التطبيق" icon={Palette}>
        <SettingRow title="ثيم لافندر" note={level(s) >= 3 ? 'مفتوح لك.' : 'ينفتح عند المستوى ٣.'}>
          {level(s) >= 3
            ? <Toggle label="ثيم لافندر" on={s.theme === 'lilac'} onChange={(v) => set((d) => { d.theme = v ? 'lilac' : ''; })} />
            : <span className="tag tag--soft">مقفل</span>}
        </SettingRow>
        <SettingRow title="الإشعارات" note="غير مفعّلة حاليًا."><span className="tag tag--soft">قريبًا</span></SettingRow>
        <SettingRow title="اللغة" note="العربية السعودية هي المتوفرة حاليًا."><span className="tag tag--soft">العربية</span></SettingRow>
      </Group>

      {ask === 'wipe' && (
        <Dialog label="مسح كل البيانات">
          <h2>تمسح كل بياناتك من هذا الجهاز؟</h2>
          <p>نقاطك ومحاولاتك ورسايلك كلها تنمسح، وما نقدر نرجعها. ما عندنا نسخة ثانية.</p>
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setAsk(null)}>رجوع</button>
            <button type="button" className="btn btn--danger" onClick={wipe}>امسحها</button>
          </div>
        </Dialog>
      )}
      {ask === 'typed' && (
        <Dialog label="مسح النصوص">
          <h2>تمسح النصوص اللي كتبتها؟</h2>
          <p>مهامك وخطواتك وملاحظاتك في التحديات تنمسح. نقاطك ونتائجك تبقى.</p>
          <div className="row row--c">
            <button type="button" className="btn alt" onClick={() => setAsk(null)}>رجوع</button>
            <button type="button" className="btn btn--danger" onClick={clearTyped}>امسحها</button>
          </div>
        </Dialog>
      )}
    </>
  );
}
