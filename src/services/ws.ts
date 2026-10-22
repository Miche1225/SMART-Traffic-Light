import { laneKey, pushToast, useLive } from '../store/live';
import type { WsEvent } from '../types';
import { qc } from './queryClient';

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

let audio: AudioContext | undefined;
function beep() {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.1;
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.25);
  } catch { /* audio is blocked until the user interacts with the page */ }
}

export function handleEvent(e: WsEvent) {
  const set = useLive.setState;
  switch (e.event) {
    case 'detection.frame': set((s) => ({ frames: { ...s.frames, [e.data.cameraId]: e.data } })); break;
    case 'signal.state': set((s) => ({ signals: { ...s.signals, [e.data.intersectionId]: e.data } })); break;
    case 'lane.status': set((s) => ({ lanes: { ...s.lanes, [laneKey(e.data)]: e.data } })); break;
    case 'sensor.reading':
      set((s) => {
        const k = Object.keys(s.lanes).find((key) => s.lanes[key].sensor.sensorId === e.data.sensorId);
        return k ? { lanes: { ...s.lanes, [k]: { ...s.lanes[k], sensor: e.data } } } : {};
      });
      break;
    case 'dashboard.kpi': set({ kpi: e.data }); break;
    case 'device.status':
      set((s) => ({ devices: { ...s.devices, [e.data.id]: e.data } }));
      qc.invalidateQueries({ queryKey: [e.data.kind === 'camera' ? 'cameras' : 'sensors'] });
      qc.invalidateQueries({ queryKey: ['intersections'] });
      break;
    case 'violation.new':
      qc.invalidateQueries({ queryKey: ['violations'] });
      pushToast('info', `Over-speeding: ${e.data.vehicleType} at ${e.data.speedKph} km/h (limit ${e.data.limitKph}) — ${e.data.intersectionName}`);
      break;
    case 'alert.new':
      qc.invalidateQueries({ queryKey: ['alerts'] });
      if (e.data.severity === 'CRITICAL') {
        pushToast('critical', e.data.message);
        if (useLive.getState().sound) beep();
      }
      break;
  }
}

const channels = new Set(['dashboard', 'alerts']);
let socket: WebSocket | null = null;

/** Add channels (e.g. `intersection:INT-001`, `camera:CAM-001-1`); re-sent on every reconnect. */
export function subscribe(list: string[]) {
  const fresh = list.filter((c) => !channels.has(c));
  fresh.forEach((c) => channels.add(c));
  if (fresh.length && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ action: 'subscribe', channels: fresh }));
}

/** Connect the live feed; returns a disconnect function. Reconnects with exponential backoff. */
export function connectLive(token: string) {
  if (USE_MOCKS) {
    useLive.setState({ ws: 'open' });
    let off: (() => void) | undefined;
    let dead = false;
    import('../mocks').then((m) => { if (!dead) off = m.onMockEvent(handleEvent); });
    return () => { dead = true; off?.(); };
  }

  let retry = 0;
  let timer = 0;
  let stopped = false;
  const open = () => {
    const ws = (socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${encodeURIComponent(token)}`));
    ws.onopen = () => {
      retry = 0;
      useLive.setState({ ws: 'open' });
      ws.send(JSON.stringify({ action: 'subscribe', channels: [...channels] }));
    };
    ws.onmessage = (m) => {
      try { handleEvent(JSON.parse(m.data)); } catch { /* ignore malformed message */ }
    };
    ws.onclose = () => {
      if (stopped) return;
      useLive.setState({ ws: 'reconnecting' });
      timer = window.setTimeout(open, Math.min(30_000, 1000 * 2 ** retry++));
    };
  };
  open();
  return () => {
    stopped = true;
    clearTimeout(timer);
    socket?.close();
    socket = null;
  };
}
