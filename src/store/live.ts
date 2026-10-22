import { create } from 'zustand';
import type { DashboardKpi, DetectionFrame, DeviceStatusEvent, LaneStatus, SignalState } from '../types';

export interface Toast { id: number; tone: 'info' | 'success' | 'error' | 'critical'; text: string }

interface LiveState {
  ws: 'connecting' | 'open' | 'reconnecting';
  kpi: DashboardKpi | null;
  signals: Record<string, SignalState>;
  lanes: Record<string, LaneStatus>; // key: laneKey()
  frames: Record<string, DetectionFrame>;
  devices: Record<string, DeviceStatusEvent>;
  toasts: Toast[];
  sound: boolean;
}

const savedSound = () => { try { return localStorage.getItem('stl-sound') === '1'; } catch { return false; } };

export const useLive = create<LiveState>()(() => ({
  ws: 'connecting', kpi: null, signals: {}, lanes: {}, frames: {}, devices: {}, toasts: [], sound: savedSound(),
}));

export const laneKey = (l: { intersectionId: string; approach: string; lane: number }) => `${l.intersectionId}:${l.approach}:${l.lane}`;

export function toggleSound() {
  const sound = !useLive.getState().sound;
  useLive.setState({ sound });
  if (sound && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  try { localStorage.setItem('stl-sound', sound ? '1' : '0'); } catch { /* per-session only */ }
}

let toastSeq = 0;
export const dismissToast = (id: number) => useLive.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
export function pushToast(tone: Toast['tone'], text: string) {
  const id = ++toastSeq;
  useLive.setState((s) => ({ toasts: [...s.toasts, { id, tone, text }].slice(-5) }));
  setTimeout(() => dismissToast(id), tone === 'critical' ? 10_000 : 6000);
}
