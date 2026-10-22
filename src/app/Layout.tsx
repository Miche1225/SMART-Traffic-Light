import { Bell, ClipboardList, FileBarChart, Gauge, LayoutDashboard, LogOut, Menu, Settings, TrafficCone, Video, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cx, Toaster } from '../components/ui';
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs">
      <span className={cx('size-2 rounded-full', dot)} aria-hidden />
      System {label}
    </span>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const sound = useLive((s) => s.sound);
  const unread = useAlerts({ ack: 'false' }).data?.length ?? 0;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-3">
      <button onClick={onMenu} aria-label="Toggle sidebar" className="rounded p-1.5 text-slate-400 hover:bg-slate-800"><Menu className="size-5" /></button>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-sky-600 text-[10px] font-bold text-white" aria-label="LGU logo">LGU</span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">SMART Traffic Light</div>
          <div className="hidden text-xs text-slate-500 sm:block">LGU Monitoring Dashboard</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Clock />
        <SystemStatus />
        <button onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Mute critical alert sound' : 'Enable critical alert sound'} title="Critical alert sound" className="rounded p-1.5 text-slate-400 hover:bg-slate-800">
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
        <Link to="/alerts" aria-label={`${unread} unacknowledged alerts`} className="relative rounded p-1.5 text-slate-400 hover:bg-slate-800">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white tabular-nums">{unread}</span>}
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

export default function Layout() {
  const token = useAuth((s) => s.token)!;
  const role = useAuth((s) => s.user?.role);
  const ws = useLive((s) => s.ws);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  useEffect(() => connectLive(token), [token]);

  return (
    <div className="flex h-dvh">
      <nav aria-label="Main" className={cx('shrink-0 border-r border-slate-800 bg-slate-900 py-3 transition-[width]', collapsed ? 'w-14' : 'w-56')}>
        {NAV.filter((n) => !n.roles || (role && n.roles.includes(role))).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            title={n.label}
            className={({ isActive }) => cx('mx-2 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm', isActive ? 'bg-sky-600/20 text-sky-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200')}
          >
            <n.icon className="size-5 shrink-0" />
            <span className={cx(collapsed && 'sr-only')}>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setCollapsed((c) => !c)} />
        {ws === 'reconnecting' && (
          <div role="status" className="flex items-center gap-2 bg-yellow-900/60 px-4 py-1.5 text-sm text-yellow-200">
            <WifiOff className="size-4" /> Reconnecting to live feed…
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Outlet /></main>
      </div>
      <Toaster />
    </div>
  );
}
