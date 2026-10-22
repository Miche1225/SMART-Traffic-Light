import { create } from 'zustand';
import { qc } from '../services/queryClient';
import type { Role, User } from '../types';

const KEY = 'stl-auth';
const read = (): { token: string; user: User } | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
};

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User, remember: boolean) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()((set) => ({
  token: read()?.token ?? null,
  user: read()?.user ?? null,
  login: (token, user, remember) => {
    try {
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify({ token, user }));
    } catch { /* storage blocked: session lasts until reload */ }
    set({ token, user });
  },
  logout: () => {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } catch { /* nothing stored */ }
    set({ token: null, user: null });
    qc.clear();
  },
}));

export const OPS: Role[] = ['ADMIN', 'OPERATOR'];
export const ADMIN: Role[] = ['ADMIN'];
export const useCan = (roles: Role[]) => useAuth((s) => !!s.user && roles.includes(s.user.role));
