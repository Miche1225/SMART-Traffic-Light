import { useQueries, useQuery } from '@tanstack/react-query';
import { Activity, Car, Gauge, Radar, Timer, TrendingUp, Video, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TypeDonut } from '../components/charts';
import { Async, Card, CongestionBadge, cx, Segmented, SeverityBadge, SignalLight, Skeleton } from '../components/ui';
import { ViolationTable } from '../components/ViolationTable';
import { api, hourlyQuery, useAlerts, useHourly, useIntersections } from '../services/api';
import { OPS, useAuth, useCan } from '../store/auth';
import { useLive } from '../store/live';
import type { DashboardKpi, Intersection, Paginated, VehicleType, Violation } from '../types';
import { forecastHour } from '../utils/report';
import { addDays, AXIS_STYLE, fmtDay, fmtTime, GRID, INT_COLORS, manilaHour, manilaToday, shortHour, TOOLTIP_STYLE } from '../utils/format';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Eases from the previous value to the new one, so live KPI updates visibly tick. */
function CountUp({ n }: { n: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (reduceMotion()) { from.current = n; setShown(n); return; }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 800);
      from.current = Math.round(start + (n - start) * (1 - (1 - p) ** 3));
      setShown(from.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{shown.toLocaleString()}</>;
}

const ACCENT = {
  sky: ['bg-sky-500/10 text-sky-300 ring-sky-500/20', 'bg-sky-500', 'text-sky-400'],
  violet: ['bg-violet-500/10 text-violet-300 ring-violet-500/20', 'bg-violet-500', 'text-violet-400'],
  red: ['bg-red-500/10 text-red-300 ring-red-500/20', 'bg-red-500', 'text-red-400'],
  emerald: ['bg-emerald-500/10 text-emerald-300 ring-emerald-500/20', 'bg-emerald-500', 'text-emerald-400'],
  amber: ['bg-amber-500/10 text-amber-300 ring-amber-500/20', 'bg-amber-500', 'text-amber-400'],
  cyan: ['bg-cyan-500/10 text-cyan-300 ring-cyan-500/20', 'bg-cyan-500', 'text-cyan-400'],
};

/** Tiny trend line, no axes; the tile's number carries the value. */
function Sparkline({ values, className }: { values: number[]; className: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cx('mt-2 h-8 w-full', className)} aria-hidden>
      <polygon points={`0,30 ${pts} 100,30`} fill="currentColor" opacity="0.15" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Kpi({ icon: Icon, label, value, sub, hint, accent = 'sky', spark }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; hint?: string; accent?: keyof typeof ACCENT; spark?: number[] }) {
  const [chip, glow, line] = ACCENT[accent];
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-lg shadow-black/10 backdrop-blur transition-colors hover:border-slate-700" title={hint}>
      <span className={cx('pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40', glow)} aria-hidden />
      <div className="relative flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className={cx('grid size-7 place-items-center rounded-lg ring-1 ring-inset', chip)}><Icon className="size-4" /></span>
        {label}
      </div>
      <div className="relative mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="relative mt-0.5 truncate text-xs text-slate-500">{sub}</div>}
      {spark && <Sparkline values={spark} className={cx('relative', line)} />}
    </div>
  );
}

function KpiRow() {
  const q = useQuery({ queryKey: ['kpi'], queryFn: () => api<DashboardKpi>('/dashboard/summary') });
  const k = useLive((s) => s.kpi) ?? q.data;
  const hourly = useHourly('ALL', manilaToday()).data?.slice(0, manilaHour() + 1).map((h) => h.total);
  if (!k)
    return q.isError ? <Async q={q}>{() => null}</Async> : (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
    );
  const pct = k.vehiclesYesterdaySameTime ? (k.vehiclesToday / k.vehiclesYesterdaySameTime - 1) * 100 : 0;
  const offline = k.offlineCameras.length ? `Offline: ${k.offlineCameras.join(', ')}` : 'All cameras online';
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
      <Kpi icon={Car} label="Vehicles Today" spark={hourly} value={<CountUp n={k.vehiclesToday} />} sub={<><span className={pct >= 0 ? 'text-green-400' : 'text-red-400'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%</span> vs yesterday</>} />
      <Kpi accent="violet" icon={TrendingUp} label="Current Peak Intersection" value={k.peakIntersection.name} sub={`${k.peakIntersection.perMin} vehicles/min`} hint={k.peakIntersection.name} />
      <Kpi accent="red" icon={Gauge} label="Over-speeding Today" value={<CountUp n={k.overspeedToday} />} sub={k.lastOverspeedAt ? `latest at ${fmtTime(k.lastOverspeedAt)}` : 'none yet'} />
      <Kpi accent="emerald" icon={Video} label="Cameras Online" value={`${k.camerasOnline} / ${k.camerasTotal}`} sub={offline} hint={offline} />
      <Kpi accent="cyan" icon={Radar} label="Sensors Online" value={`${k.sensorsOnline} / ${k.sensorsTotal}`} />
      <Kpi accent="amber" icon={Timer} label="Avg. Wait Time" value={`${k.avgWaitSec}s`} sub="across all intersections" />
    </div>
  );
}

const FORECAST_DAYS = 7;

/** Per intersection: expected vehicles this hour and next, from the same hours over the past week. */
function useForecast(ints: Intersection[]) {
  const today = manilaToday();
  const days = Array.from({ length: FORECAST_DAYS }, (_, k) => addDays(today, -1 - k));
  // Past days never change, so fetch once per session.
  const qs = useQueries({ queries: ints.flatMap((i) => days.map((d) => ({ ...hourlyQuery(i.id, d), refetchInterval: false as const, staleTime: Infinity }))) });
  const h = manilaHour();
  return Object.fromEntries(ints.map((i, n) => {
    const past = qs.slice(n * FORECAST_DAYS, (n + 1) * FORECAST_DAYS).map((q) => q.data?.map((x) => x.total));
    return [i.id, { now: forecastHour(past, h), next: forecastHour(past, h + 1) }];
  }));
}

function Forecast({ f }: { f?: { now: number | null; next: number | null } }) {
  if (f?.next == null) return null;
  const delta = f.now ? (f.next / f.now - 1) * 100 : 0;
  const tone = delta > 10 ? 'text-orange-400' : delta < -10 ? 'text-green-400' : 'text-slate-400';
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-slate-900/60 px-2 py-1 text-xs" title={`Average of the same hour over the past ${FORECAST_DAYS} days`}>
      <span className="text-slate-400">Next hour <span className="text-slate-500">(est.)</span></span>
      <span>
        <b className="tabular-nums text-slate-200">~{f.next.toLocaleString()}</b>
        <span className={cx('ml-1.5', tone)}>{delta > 10 ? '▲ busier' : delta < -10 ? '▼ quieter' : '≈ steady'}</span>
      </span>
    </div>
  );
}

function IntersectionCard({ i, forecast }: { i: Intersection; forecast?: { now: number | null; next: number | null } }) {
  const sig = useLive((s) => s.signals[i.id]);
  const last5 = useLive((s) => Object.values(s.lanes).reduce((n, l) => (l.intersectionId === i.id ? n + l.sensor.countLast5Min : n), 0));
  return (
    <Link to={`/intersections/${i.id}`} className="block rounded-lg border border-slate-800 bg-slate-950/50 p-3 transition hover:-translate-y-0.5 hover:border-sky-700/60 hover:bg-slate-950/80 hover:shadow-lg hover:shadow-black/30 motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{i.name}</div>
          <div className="text-xs text-slate-500">Brgy. {i.barangay} · {i.mode}</div>
        </div>
        <CongestionBadge level={i.congestion} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {sig ? sig.phases.map((p) => <SignalLight key={p.approach} color={p.color} label={p.approach} sec={p.remainingSec} />) : <Skeleton className="col-span-2 h-10" />}
      </div>
      <div className="mt-2 text-xs text-slate-400"><span className="tabular-nums text-slate-200">{last5}</span> vehicles in last 5 min</div>
      <Forecast f={forecast} />
    </Link>
  );
}

function AlertsFeed() {
  const q = useAlerts();
  return (
    <Card title="Live alerts" actions={<Link to="/alerts" className="text-xs text-sky-300 hover:underline">View all</Link>}>
      <Async q={q} empty={(d) => !d.length} skeleton="h-72">
        {(alerts) => (
          <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {alerts.slice(0, 20).map((a) => (
              <li key={a.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 text-sm transition-colors hover:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <SeverityBadge severity={a.severity} />
                  <time className="text-xs tabular-nums text-slate-500">{fmtTime(a.timestamp)}</time>
                </div>
                <p className={a.acknowledged ? 'mt-1 text-slate-500' : 'mt-1'}>{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}

function VolumeCard() {
  const [split, setSplit] = useState<'agg' | 'split'>('agg');
  const today = manilaToday();
  const ints = useIntersections().data ?? [];
  const all = useHourly('ALL', today);
  const per = useQueries({ queries: (split === 'split' ? ints : []).map((i) => hourlyQuery(i.id, today)) });
  const rows = all.data?.map((h, idx) => ({
    hour: shortHour(h.hour),
    ALL: h.total,
    ...Object.fromEntries(per.map((p, k) => [ints[k].id, p.data?.[idx].total])),
  }));
  return (
    <Card
      title="Traffic volume today (vehicles/hour)"
      className="xl:col-span-2"
      actions={<Segmented label="Series" value={split} onChange={setSplit} options={[{ value: 'agg', label: 'Aggregated' }, { value: 'split', label: 'Per intersection' }]} />}
    >
      <Async q={all} skeleton="h-64">
        {() => (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows} margin={{ right: 8 }}>
              <defs>
                <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="hour" {...AXIS_STYLE} />
              <YAxis {...AXIS_STYLE} width={44} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {split === 'split'
                ? ints.map((i, k) => <Line key={i.id} dataKey={i.id} name={i.name} stroke={INT_COLORS[k % INT_COLORS.length]} dot={false} strokeWidth={2} isAnimationActive={false} />)
                : <Area dataKey="ALL" name="All intersections" type="monotone" stroke="#38bdf8" fill="url(#volFill)" strokeWidth={2} isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Async>
    </Card>
  );
}

function DonutCard() {
  const q = useHourly('ALL', manilaToday());
  return (
    <Card title="Vehicle types today">
      <Async q={q} skeleton="h-64">
        {(hours) => {
          const byType: Partial<Record<VehicleType, number>> = {};
          for (const h of hours) for (const [t, n] of Object.entries(h.byType) as [VehicleType, number][]) byType[t] = (byType[t] ?? 0) + n;
          return <TypeDonut byType={byType} />;
        }}
      </Async>
    </Card>
  );
}

function Hero() {
  const name = useAuth((s) => s.user?.name)?.split(' ')[0];
  const ws = useLive((s) => s.ws);
  const unread = useAlerts({ ack: 'false' }).data;
  const critical = unread?.filter((a) => a.severity === 'CRITICAL').length ?? 0;
  const h = manilaHour();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-linear-to-br from-sky-950/60 via-slate-900/80 to-indigo-950/50 p-5 shadow-lg shadow-black/20">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-sky-500/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-sky-300/80">{fmtDay(manilaToday())}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">{greet}{name && `, ${name}`}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {unread == null ? 'Checking city traffic…'
              : critical ? <><b className="text-red-300">{critical} critical</b> of {unread.length} open alerts need attention.</>
                : unread.length ? `${unread.length} open alerts, none critical.` : 'All clear. No open alerts across the network.'}
          </p>
        </div>
        <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset', ws === 'open' ? 'bg-green-500/10 text-green-300 ring-green-500/30' : 'bg-yellow-500/10 text-yellow-200 ring-yellow-500/30')}>
          <Activity className="size-3.5" />{ws === 'open' ? 'Live feed connected' : 'Live feed reconnecting'}
        </span>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const evidence = useCan(OPS);
  const ints = useIntersections();
  const forecast = useForecast(ints.data ?? []);
  const recent = useQuery({ queryKey: ['violations', { size: 10 }], queryFn: () => api<Paginated<Violation>>('/violations?size=10') });
  return (
    <div className="space-y-4">
      <Hero />
      <KpiRow />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Intersections" className="xl:col-span-2">
          <Async q={ints} skeleton="h-48">{(list) => <div className="grid gap-3 sm:grid-cols-2">{list.map((i) => <IntersectionCard key={i.id} i={i} forecast={forecast[i.id]} />)}</div>}</Async>
        </Card>
        <AlertsFeed />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <VolumeCard />
        <DonutCard />
      </div>
      <Card title="Recent violations" actions={evidence && <Link to="/violations" className="text-xs text-sky-300 hover:underline">View all</Link>}>
        <Async q={recent} empty={(d) => !d.data.length}>{(d) => <ViolationTable rows={d.data} evidence={evidence} />}</Async>
      </Card>
    </div>
  );
}
