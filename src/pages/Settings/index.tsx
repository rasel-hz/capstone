import { useState } from 'react';
import { useAppState, useStore } from '../../context/AppStateContext';
import type { Gender } from '../../types';

export function Settings() {
  const s = useAppState();
  const store = useStore();
  const [name, setName] = useState(s.name);
  const genders: [Gender, string][] = [['m', 'ذكر'], ['f', 'أنثى']];

  function wipe() {
    if (window.confirm('تمسح كل بياناتك من هذا الجهاز؟')) {
      store.reset();
      location.reload();
    }
  }

  return (
    <>
      <h1>ملفي</h1>
      <div className="card">
        <h3>الاسم</h3>
        <div className="row">
          <input aria-label="الاسم" className="grow" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" className="btn sm" onClick={() => store.update((d) => { d.name = name || d.name; })}>حفظ</button>
        </div>
        <p>أخاطبك كـ {genders.map(([g, l]) => <button key={g} type="button" className={`chip ${s.g === g ? 'on' : ''}`} aria-pressed={s.g === g} onClick={() => store.update((d) => { d.g = g; })}>{l}</button>)}</p>
        <p>حماية بعد الأذان: {[0, 20, 30, 45].map((v) => <button key={v} type="button" className={`chip ${s.pp === v ? 'on' : ''}`} aria-pressed={s.pp === v} onClick={() => store.update((d) => { d.pp = v; })}>{v}</button>)} دقيقة</p>
        <p>
          الصوت <button type="button" className={`chip ${s.snd ? 'on' : ''}`} aria-pressed={!!s.snd} onClick={() => store.update((d) => { d.snd = d.snd ? 0 : 1; })}>{s.snd ? 'شغّال' : 'مقفل'}</button>{' '}
          أقل حركة <button type="button" className={`chip ${s.rm ? 'on' : ''}`} aria-pressed={!!s.rm} onClick={() => store.update((d) => { d.rm = d.rm ? 0 : 1; })}>{s.rm ? 'نعم' : 'لا'}</button>
        </p>
      </div>
      <div className="card">
        <h3>بياناتك</h3>
        <p className="note">كل شي محفوظ على جهازك فقط. تقدر تمسحه بالكامل.</p>
        <button type="button" className="btn cor sm" onClick={wipe}>مسح بياناتي</button>
      </div>
    </>
  );
}
