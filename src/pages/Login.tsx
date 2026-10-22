import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { btnPrimary, cx, input } from '../components/ui';
import { api } from '../services/api';
import { USE_MOCKS } from '../services/ws';
import { useAuth } from '../store/auth';
import type { User } from '../types';

export default function Login() {
  const { token, login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const m = useMutation({
    mutationFn: () => api<{ token: string; user: User }>('/auth/login', { method: 'POST', json: { username: form.username, password: form.password } }),
    onSuccess: (r) => { login(r.token, r.user, form.remember); nav(from, { replace: true }); },
  });
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-950 p-4">
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-sky-600 text-xs font-bold text-white" aria-hidden>LGU</span>
          <div>
            <h1 className="text-lg font-semibold">SMART Traffic Light</h1>
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
  );
}
