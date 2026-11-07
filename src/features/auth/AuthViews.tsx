import { Eye, EyeOff, LogOut, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Mascot } from '../../components/mascot/Mascot';
import { useMascot } from '../../components/mascot/useMascot';
import { Dialog } from '../../components/ui/kit';
import { iso } from '../../i18n';
import { useBackHandler } from '../../services/native';
import { validateRegister } from '../../services/auth';
import type { Gender } from '../../types';
import { useAuth } from './AuthProvider';

const errCode = (e: unknown) => (e as { code?: string })?.code ?? 'generic';

// A password field with a show/hide toggle, shared by sign-up and log-in.
function PasswordField({ id, label, hint, value, onChange, autoComplete }: { id: string; label: string; hint?: string; value: string; onChange(v: string): void; autoComplete: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="auth-f">
      <label htmlFor={id}>{label}</label>
      <div className="auth-pw">
        <input id={id} type={show ? 'text' : 'password'} dir="ltr" value={value} maxLength={72} autoComplete={autoComplete} aria-describedby={hint ? `${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="auth-pw__t" aria-label={t(show ? 'auth.register.hidePassword' : 'auth.register.showPassword')} aria-pressed={show} onClick={() => setShow(!show)}>
          {show ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {hint && <span id={`${id}-h`} className="note">{hint}</span>}
    </div>
  );
}

function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="auth-f">
      <label htmlFor={id}>{label}</label>
      <input id={id} dir="ltr" aria-describedby={hint ? `${id}-h` : undefined} {...rest} />
      {hint && <span id={`${id}-h`} className="note">{hint}</span>}
    </div>
  );
}

const SuccessBurst = ({ text }: { text: string }) => (
  <div className="auth-ok" role="status">
    <span className="auth-spark auth-spark--a" aria-hidden="true"><Sparkles size={22} /></span>
    <span className="auth-spark auth-spark--b" aria-hidden="true"><Sparkles size={16} /></span>
    <span className="auth-spark auth-spark--c" aria-hidden="true"><Sparkles size={18} /></span>
    <h2>{text}</h2>
  </div>
);

const SUCCESS_MS = 1900;

/** The "let's get to know each other" onboarding tab: creates the account, then hands back to onboarding. */
export function AccountStep({ firstName, addressForm, onCreated, onCelebrate }: { firstName: string; addressForm: Gender; onCreated(): void; onCelebrate(): void }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const created = useRef(onCreated);
  created.current = onCreated;

  // A short celebration, then on to the next tab.
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => created.current(), SUCCESS_MS);
    return () => clearTimeout(id);
  }, [success]);

  if (success) return <SuccessBurst text={t('auth.register.success')} />;

  // Came back to this tab after creating the account: nothing more to do here.
  if (auth.status === 'signedIn' && auth.profile) {
    return <SuccessBurst text={t('auth.register.created', { username: iso(auth.profile.username) })} />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const input = { username, email, password, firstName, addressForm };
    const invalid = validateRegister(input);
    if (invalid) return setError(invalid);
    setError('');
    setBusy(true);
    try {
      const r = await auth.register(input);
      if (r === 'needsConfirmation') {
        setError('needsConfirmation');
      } else {
        setSuccess(true);
        onCelebrate();
      }
    } catch (err) {
      setError(errCode(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{t('auth.register.title', { firstName: iso(firstName) })}</h1>
      <p>{t('auth.register.text')}</p>
      <p className="note">{t('auth.register.support')}</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="rg-user" label={t('auth.register.username')} hint={t('auth.register.usernameHint')} value={username} maxLength={20} autoComplete="username" autoCapitalize="none" spellCheck={false} onChange={(e) => setUsername(e.target.value)} />
        <Field id="rg-email" type="email" label={t('auth.register.email')} hint={t('auth.register.emailHint')} value={email} maxLength={254} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        <PasswordField id="rg-pass" label={t('auth.register.password')} hint={t('auth.register.passwordHint')} value={password} onChange={setPassword} autoComplete="new-password" />
        <p className="hint auth-err" role="alert">{error ? t(`auth.errors.${error}`) : ''}</p>
        <button type="submit" className="btn btn--lg" disabled={busy || !auth.configured}>{t(busy ? 'auth.register.saving' : 'auth.register.submit')}</button>
        {!auth.configured && <p className="note">{t('auth.errors.notConfigured')}</p>}
        <button type="button" className="btn-link" onClick={() => setLoginOpen(true)}>{t('auth.register.haveAccount')}</button>
      </form>
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} />}
    </>
  );
}

/** Log-in for a returning user, from the welcome screen or the sign-up tab. */
export function LoginDialog({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const mascot = useMascot('listening');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);
  useBackHandler(onClose);

  useEffect(() => {
    mascot.play('greeting');
    // After the dialog's own focus handling, so typing can start straight away.
    const id = setTimeout(() => first.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [mascot.play]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) return setError('invalidCredentials');
    setError('');
    setBusy(true);
    try {
      // On success the app switches to Home and this dialog closes with it.
      await auth.login(username, password);
    } catch (err) {
      setError(errCode(err));
      mascot.play('encouraging');
      setBusy(false);
    }
  }

  return (
    <Dialog label={t('auth.login.title')}>
      <div className="auth-dlg">
        <Mascot state={mascot.state} size={88} />
        <h2>{t('auth.login.title')}</h2>
        <p>{t('auth.login.text')}</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="auth-f">
            <label htmlFor="lg-user">{t('auth.login.username')}</label>
            <input ref={first} id="lg-user" dir="ltr" value={username} maxLength={20} autoComplete="username" autoCapitalize="none" spellCheck={false} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <PasswordField id="lg-pass" label={t('auth.login.password')} value={password} onChange={setPassword} autoComplete="current-password" />
          <p className="hint auth-err" role="alert">{error ? t(`auth.errors.${error}`) : ''}</p>
          <button type="submit" className="btn btn--lg" disabled={busy || !auth.configured}>{t(busy ? 'auth.login.checking' : 'auth.login.submit')}</button>
          {!auth.configured && <p className="note">{t('auth.errors.notConfigured')}</p>}
          <button type="button" className="btn-link" onClick={onClose}>{t('auth.login.close')}</button>
        </form>
      </div>
    </Dialog>
  );
}

/** Shown once after an interactive log-in, never after a reload. */
export function WelcomeBack({ name, onContinue }: { name: string; onContinue(): void }) {
  const { t } = useTranslation();
  const mascot = useMascot('happy');
  useBackHandler(onContinue);
  useEffect(() => {
    mascot.play('greeting');
  }, [mascot.play]);
  return (
    <Dialog label={t('auth.welcome.title', { firstName: iso(name) })} top>
      <div className="wb">
        <div className="wb__m">
          <span className="auth-spark auth-spark--a" aria-hidden="true"><Sparkles size={22} /></span>
          <span className="auth-spark auth-spark--b" aria-hidden="true"><Sparkles size={15} /></span>
          <span className="auth-spark auth-spark--c" aria-hidden="true"><Sparkles size={18} /></span>
          <Mascot state={mascot.state} size={120} />
        </div>
        <h2>{t('auth.welcome.title', { firstName: iso(name) })}</h2>
        <p>{t('auth.welcome.text')}</p>
        <p className="note">{t('auth.welcome.support')}</p>
        <button type="button" className="btn btn--lg" onClick={onContinue}>{t('auth.welcome.button')}</button>
      </div>
    </Dialog>
  );
}

/** Sits next to the language switcher, and looks like it. */
export function LogoutButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={`lang-sw logout-btn ${className}`} disabled={busy} aria-label={t('auth.logoutLabel')} onClick={() => { setBusy(true); void auth.logout(); }}>
      <LogOut size={17} className="flip" aria-hidden="true" />
      <span>{t('auth.logout')}</span>
    </button>
  );
}

/** While the saved session is checked, so nothing private flashes on screen. */
export function AuthLoading() {
  const { t } = useTranslation();
  return (
    <div className="ob-wrap auth-loading" role="status">
      <Mascot state="idle" size={110} still />
      <p className="note">{t('auth.loading')}</p>
    </div>
  );
}
