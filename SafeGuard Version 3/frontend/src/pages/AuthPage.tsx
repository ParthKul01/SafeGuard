import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { saveAuthSession, type AuthSession } from '../services/auth';

type AuthMode = 'login' | 'register';
function BrandLink() { return <Link to="/" className="inline-flex items-center gap-3 text-white"><span className="grid size-10 place-items-center rounded-[14px] bg-white/10"><ShieldCheck size={21} /></span><span className="text-xl font-bold">SafeGaurd</span></Link>; }

function AuthPage({ mode }: { mode: AuthMode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (isRegister && password !== confirmPassword) { setError('Those passwords do not match. Please try again.'); return; }
    if (isRegister && !accepted) { setError('Please acknowledge the prototype safety notice to continue.'); return; }
    setBusy(true);
    try {
      const result = await api<AuthSession>(isRegister ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(isRegister ? { name, email, password } : { email, password }) });
      saveAuthSession(result);
      const requested = (location.state as { from?: string } | null)?.from;
      navigate(requested && requested !== '/login' ? requested : '/dashboard', { replace: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not complete that request. Please try again.'); }
    finally { setBusy(false); }
  }

  const field = 'mt-2 min-h-12 w-full rounded-xl border border-[#dce3dc] bg-[#fffefa] px-4 text-sm text-[#243d32] outline-none transition placeholder:text-[#a5ada6] focus:border-[#53836a] focus:ring-4 focus:ring-[#53836a]/10';
  return <main className="min-h-screen bg-[#f4f5ef] p-3 sm:p-5 lg:p-8"><div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1320px] overflow-hidden rounded-[30px] bg-[#fffefa] shadow-[0_24px_90px_rgba(23,55,42,.11)] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[.88fr_1.12fr]">
    <section className="relative hidden overflow-hidden bg-[#173d33] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"><div className="absolute -right-24 -top-24 size-[420px] rounded-full border border-white/[.08]" /><div className="absolute -bottom-28 -left-24 size-[360px] rounded-full bg-[#b6d2a9]/[.08] blur-2xl" /><div className="relative"><BrandLink /><div className="mt-24 max-w-lg"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#bad8bf]">Your safety, on your terms</p><h1 className="mt-5 font-serif text-5xl font-medium leading-[1.08] tracking-[-.045em] xl:text-6xl">{isRegister ? 'Start with a space that puts you first.' : 'Welcome back to your safety space.'}</h1><p className="mt-6 max-w-md text-sm leading-7 text-white/65">{isRegister ? 'Bring your trusted contacts and available safety signals together in one thoughtful place.' : 'Your trusted contacts and safety workspace are ready when you need them.'}</p></div></div><div className="relative border-t border-white/15 pt-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><ShieldCheck size={17} /></span><p className="text-xs leading-5 text-white/65">You decide when an alert is confirmed and shared.</p></div></div></section>
    <section className="flex flex-col px-5 py-6 sm:px-10 sm:py-9 lg:px-12 xl:px-20"><div className="flex items-center justify-between"><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#365c4c] lg:hidden"><ArrowLeft size={16} /> SafeGaurd</Link><span className="hidden text-xs font-semibold uppercase tracking-[.14em] text-[#849087] lg:inline">Personal safety workspace</span><Link to="/" className="ml-auto text-xs font-medium text-[#79847c] hover:text-[#173d33]">Back to home</Link></div>
      <div className="mx-auto my-auto w-full max-w-[440px] py-10"><div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6b9278]">{isRegister ? 'Create your account' : 'Sign in securely'}</p><h2 className="mt-3 font-serif text-4xl font-medium tracking-[-.04em] text-[#203a30]">{isRegister ? 'Create an account' : 'Good to see you again'}</h2><p className="mt-3 text-sm leading-6 text-[#7c867e]">{isRegister ? 'A few details to set up your personal workspace.' : 'Enter your details to continue to SafeGaurd.'}</p></div>
        <form onSubmit={submit} className="space-y-4">
          {isRegister && <div><label htmlFor="full-name" className="text-xs font-semibold text-[#40564a]">Full name</label><input id="full-name" className={field} type="text" autoComplete="name" minLength={2} maxLength={80} placeholder="How should we address you?" value={name} onChange={(event) => setName(event.target.value)} required /></div>}
          <div><label htmlFor="email" className="text-xs font-semibold text-[#40564a]">Email address</label><input id="email" className={field} type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div><label htmlFor="password" className="text-xs font-semibold text-[#40564a]">Password</label><div className="relative"><input id="password" className={field + ' pr-12'} type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} maxLength={128} placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#839087] hover:text-[#294d3d]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          {isRegister && <div><label htmlFor="confirm-password" className="text-xs font-semibold text-[#40564a]">Confirm password</label><input id="confirm-password" className={field} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>}
          {isRegister && <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f3f5ef] p-3.5 text-xs leading-5 text-[#68756c]"><input type="checkbox" className="mt-0.5 size-4 accent-[#285c49]" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I understand SafeGaurd is an assistive prototype, not an emergency response service. I will review an alert before it is shared.</span></label>}
          {error && <p role="alert" className="rounded-xl border border-[#e7c6bd] bg-[#fff5f1] px-4 py-3 text-sm text-[#a44736]">{error}</p>}
          <button disabled={busy} type="submit" className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#173d33] px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-[#245548] disabled:cursor-wait disabled:opacity-60">{busy ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'} {!busy && <ArrowRight size={16} />}</button>
        </form>
        <p className="mt-6 text-center text-sm text-[#7b857d]">{isRegister ? 'Already have an account?' : 'New to SafeGaurd?'} <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-[#35634d] underline decoration-[#b7cdbd] underline-offset-4">{isRegister ? 'Log in' : 'Create account'}</Link></p><p className="mt-8 text-center text-[11px] leading-5 text-[#9aa39b]">Your password is stored as a one-way hash. SafeGaurd never asks for emergency details on this screen.</p>
      </div><div className="flex items-center justify-center gap-2 border-t border-[#edf0e9] pt-5 text-[10px] text-[#929c94]"><ShieldCheck size={13} /> Personal safety should always stay in your hands.</div>
    </section>
  </div></main>;
}
export function LoginPage() { return <AuthPage mode="login" />; }
export function RegisterPage() { return <AuthPage mode="register" />; }
