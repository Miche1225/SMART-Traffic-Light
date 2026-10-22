import { useMutation } from '@tanstack/react-query';
import { BellRing, Gauge, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { btnPrimary, cx, input, Logo } from '../components/ui';
import { api } from '../services/api';
import { USE_MOCKS } from '../services/ws';
import { useAuth } from '../store/auth';
import type { User } from '../types';

/** `?from=` set by middleware; only same-site paths, so the login page can't be used as an open redirect. */
const returnTo = () => {
  const from = new URLSearchParams(window.location.search).get('from') ?? '/';
  return from.startsWith('/') && !from.startsWith('//') ? from : '/';
};

export default function Login() {
  const { token, login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const m = useMutation({
    mutationFn: () => api<{ token: string; user: User }>('/auth/login', { method: 'POST', json: { username: form.username, password: form.password } }),
    onSuccess: (r) => { login(r.token, r.user, form.remember); router.replace(returnTo()); },
  });
  // Only for arriving already signed in; a fresh login navigates in onSuccess.
  useEffect(() => { if (useAuth.getState().token) router.replace(returnTo()); }, [router]);
  if (token) return null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden bg-[#10203d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative text-xs font-semibold uppercase tracking-wider text-[#fbbf24]">Local Government Unit · Traffic Management</div>
        <div className="relative flex items-center gap-12">
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/60" aria-hidden>
            <span className="size-14 rounded-full bg-red-500 shadow-[0_0_28px_6px] shadow-red-500/60 motion-safe:animate-lamp-red" />
            <span className="size-14 rounded-full bg-yellow-400 opacity-15 shadow-[0_0_28px_6px] shadow-yellow-400/60 motion-safe:animate-lamp-yellow" />
            <span className="size-14 rounded-full bg-green-500 opacity-15 shadow-[0_0_28px_6px] shadow-green-500/60 motion-safe:animate-lamp-green" />
          </div>
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">Smarter signals.<br />Safer streets.</h2>
            <ul className="mt-6 space-y-3 text-[15px] text-white/80">
              <li className="flex items-center gap-3"><Video className="size-4 text-[#fbbf24]" />Live AI vehicle detection on every camera</li>
              <li className="flex items-center gap-3"><Gauge className="size-4 text-[#fbbf24]" />Automatic over-speeding evidence capture</li>
              <li className="flex items-center gap-3"><BellRing className="size-4 text-[#fbbf24]" />Real-time alerts for faults and congestion</li>
            </ul>
          </div>
        </div>
        <p className="relative text-xs text-white/50">Data handled in accordance with RA 10173 (Data Privacy Act).</p>
      </aside>
      <div className="grid place-items-center p-4">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SMART Traffic Light</h1>
            <p className="text-sm text-slate-400">LGU Monitoring Dashboard</p>
          </div>
        </div>
        <label className="block text-sm">
          Username
          <input required autoFocus autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={cx(input, 'mt-1 w-full')} />
        </label>
        <label className="block text-sm">
          Password
          <input required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={cx(input, 'mt-1 w-full')} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
          Remember me
        </label>
        {m.isError && <p role="alert" className="text-sm text-red-400">{m.error.message}</p>}
        <button type="submit" disabled={m.isPending} className={cx(btnPrimary, 'w-full')}>{m.isPending ? 'Signing in…' : 'Sign in'}</button>
        {USE_MOCKS && (
          <p className="text-xs text-slate-500">Demo accounts: <b>admin</b>, <b>operator</b>, <b>viewer</b> — password <b>password</b></p>
        )}
      </form>
      </div>
    </div>
  );
}
