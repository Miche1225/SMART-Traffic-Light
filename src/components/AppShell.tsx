import { Bell, ClipboardList, FileBarChart, Gauge, LayoutDashboard, LogOut, Maximize, Menu, Minimize, MonitorPlay, Moon, Search, Settings, Sun, TrafficCone, Video, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { CommandPalette, type Command } from './CommandPalette';
import { cx, Toaster } from './ui';
import { useAlerts } from '../services/api';
import { connectLive } from '../services/ws';
import { ADMIN, OPS, useAuth } from '../store/auth';
import { toggleSound, useLive } from '../store/live';
import type { Role } from '../types';
import { fmtDate, fmtTimeSec } from '../utils/format';

const NAV: { to: string; label: string; icon: typeof Bell; roles?: Role[] }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live', label: 'Live View', icon: Video, roles: OPS },
  { to: '/intersections', label: 'Intersections', icon: TrafficCone },
  { to: '/violations', label: 'Violations', icon: Gauge, roles: OPS },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/alerts', label: 'Alerts', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ADMIN },
];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <time className="hidden tabular-nums text-sm text-slate-300 md:block">{fmtDate(now)} · {fmtTimeSec(now)}</time>;
}

function SystemStatus() {
  const ws = useLive((s) => s.ws);
  const kpi = useLive((s) => s.kpi);
  const [label, dot] =
    ws !== 'open' ? ['Offline', 'bg-red-500']
      : kpi && (kpi.camerasOnline < kpi.camerasTotal || kpi.sensorsOnline < kpi.sensorsTotal) ? ['Degraded', 'bg-yellow-500']
        : ['Online', 'bg-green-500'];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs">
      <span className="relative flex size-2" aria-hidden>
        {ws === 'open' && <span className={cx('absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping', dot)} />}
        <span className={cx('relative size-2 rounded-full', dot)} />
      </span>
      System {label}
    </span>
  );
}

const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

function useFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  return on;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function useTheme() {
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'));
  const toggle = () => {
    const next = document.documentElement.classList.toggle('light');
    setLight(next);
    try { localStorage.setItem('stl-theme', next ? 'light' : 'dark'); } catch { /* per-session only */ }
  };
  return [light, toggle] as const;
}

// shortcut: fixed 30s per page and fixed stops; make them settings when Settings CRUD lands.
const ROTATE_MS = 30_000;
const ROTATE_STOPS = ['/', '/live', '/alerts'];

function Topbar({ onMenu, onSearch, light, onTheme, rotating, onRotate }: { onMenu: () => void; onSearch: () => void; light: boolean; onTheme: () => void; rotating: boolean; onRotate: () => void }) {
  const { user, logout } = useAuth();
  const sound = useLive((s) => s.sound);
  const full = useFullscreen();
  const unread = useAlerts({ ack: 'false' }).data?.length ?? 0;
  useEffect(() => { document.title = `${unread ? `(${unread}) ` : ''}SMART Traffic Light — LGU Dashboard`; }, [unread]);
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800/80 bg-slate-900/70 px-3 backdrop-blur">
      <button onClick={onMenu} aria-label="Toggle sidebar" className="rounded p-1.5 text-slate-400 hover:bg-slate-800"><Menu className="size-5" /></button>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-sky-500 to-indigo-600 text-[10px] font-bold text-white shadow-md shadow-sky-950" aria-label="LGU logo">LGU</span>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">SMART Traffic Light</div>
          <div className="hidden text-xs text-slate-500 sm:block">LGU Monitoring Dashboard</div>
        </div>
      </div>
      <button onClick={onSearch} className="ml-4 hidden w-64 items-center gap-2 rounded-md border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300 md:flex">
        <Search className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-slate-700 px-1.5 text-[10px] font-medium">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <button onClick={onSearch} aria-label="Search" className="rounded p-1.5 text-slate-400 hover:bg-slate-800 md:hidden"><Search className="size-5" /></button>
        <Clock />
        <SystemStatus />
        <button onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Mute critical alerts' : 'Enable critical alert sound and desktop notifications'} title="Critical alert sound & desktop notifications" className="rounded p-1.5 text-slate-400 hover:bg-slate-800">
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
        <button onClick={onTheme} aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'} title="Theme" className="rounded p-1.5 text-slate-400 hover:bg-slate-800">
          {light ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </button>
        <button onClick={onRotate} aria-pressed={rotating} aria-label={rotating ? 'Stop wall-display rotation' : 'Start wall-display rotation'} title="Wall display: rotate pages every 30s" className={cx('rounded p-1.5 hover:bg-slate-800', rotating ? 'text-sky-300' : 'text-slate-400')}>
          <MonitorPlay className={cx('size-5', rotating && 'motion-safe:animate-pulse')} />
        </button>
        <button onClick={toggleFullscreen} aria-pressed={full} aria-label={full ? 'Exit full screen' : 'Full screen (control-room mode)'} title="Full screen" className="rounded p-1.5 text-slate-400 hover:bg-slate-800">
          {full ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
        <Link href="/alerts" aria-label={`${unread} unacknowledged alerts`} className="relative rounded p-1.5 text-slate-400 hover:bg-slate-800">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white tabular-nums ring-2 ring-slate-900">{unread}</span>}
        </Link>
        <div className="hidden text-right text-xs leading-tight sm:block">
          <div className="text-slate-200">{user?.name}</div>
          <div className="text-slate-500">{user?.role}</div>
        </div>
        <button onClick={logout} aria-label="Sign out" title="Sign out" className="rounded p-1.5 text-slate-400 hover:bg-slate-800"><LogOut className="size-5" /></button>
      </div>
    </header>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.token)!;
  const role = useAuth((s) => s.user?.role);
  const ws = useLive((s) => s.ws);
  const pathname = usePathname();
  const router = useRouter();
  const [light, toggleTheme] = useTheme();
  const [rotating, setRotating] = useState(false);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [palette, setPalette] = useState(false);
  const logout = useAuth((s) => s.logout);
  useEffect(() => connectLive(token), [token]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // NavLink semantics: '/' matches exactly, other entries also match their sub-pages.
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  const nav = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
  const stops = ROTATE_STOPS.filter((p) => nav.some((n) => n.to === p));
  // Restarts on every navigation, so a manual page change gets a full 30s too.
  useEffect(() => {
    if (!rotating) return;
    const t = setTimeout(() => router.push(stops[(stops.indexOf(pathname) + 1) % stops.length]), ROTATE_MS);
    return () => clearTimeout(t);
  }, [rotating, pathname, stops.join()]);
  const toggleRotate = () => {
    if (!rotating && !document.fullscreenElement) toggleFullscreen();
    setRotating((r) => !r);
  };
  const commands: Command[] = [
    ...nav.map((n) => ({ id: `page${n.to}`, label: n.label, group: 'Page', icon: <n.icon className="size-4" />, to: n.to })),
    { id: 'act-theme', label: light ? 'Switch to dark theme' : 'Switch to light theme', group: 'Action', icon: light ? <Moon className="size-4" /> : <Sun className="size-4" />, run: toggleTheme },
    { id: 'act-rotate', label: rotating ? 'Stop wall-display rotation' : 'Start wall-display rotation', group: 'Action', icon: <MonitorPlay className="size-4" />, run: toggleRotate },
    { id: 'act-full', label: 'Toggle full screen', group: 'Action', icon: <Maximize className="size-4" />, run: toggleFullscreen },
    { id: 'act-sound', label: 'Toggle critical alert sound & notifications', group: 'Action', icon: <Volume2 className="size-4" />, run: toggleSound },
    { id: 'act-out', label: 'Sign out', group: 'Action', icon: <LogOut className="size-4" />, run: logout },
  ];

  return (
    <div className="flex h-dvh">
      <nav aria-label="Main" className={cx('shrink-0 border-r border-slate-800/80 bg-slate-900/70 py-3 backdrop-blur transition-[width]', collapsed ? 'w-14' : 'w-56')}>
        {nav.map((n) => (
          <Link
            key={n.to}
            href={n.to}
            aria-current={isActive(n.to) ? 'page' : undefined}
            title={n.label}
            className={cx('relative mx-2 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors', isActive(n.to) ? 'bg-sky-500/15 text-sky-300 before:absolute before:inset-y-1.5 before:-left-2 before:w-1 before:rounded-r before:bg-sky-400' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200')}
          >
            <n.icon className="size-5 shrink-0" />
            <span className={cx(collapsed && 'sr-only')}>{n.label}</span>
          </Link>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setCollapsed((c) => !c)} onSearch={() => setPalette(true)} light={light} onTheme={toggleTheme} rotating={rotating} onRotate={toggleRotate} />
        {ws === 'reconnecting' && (
          <div role="status" className="flex items-center gap-2 bg-yellow-900/60 px-4 py-1.5 text-sm text-yellow-200">
            <WifiOff className="size-4" /> Reconnecting to live feed…
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><div key={pathname} className="motion-safe:animate-page-in">{children}</div></main>
      </div>
      <Toaster />
      <CommandPalette open={palette} onClose={() => setPalette(false)} commands={commands} />
    </div>
  );
}
