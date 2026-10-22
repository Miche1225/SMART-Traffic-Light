import { useQueries, useQuery } from '@tanstack/react-query';
import { Car, Gauge, Radar, Timer, TrendingUp, Video, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TypeDonut } from '../components/charts';
import { Async, Card, CongestionBadge, Segmented, SeverityBadge, SignalLight, Skeleton } from '../components/ui';
import { ViolationTable } from '../components/ViolationTable';
import { api, hourlyQuery, useAlerts, useHourly, useIntersections } from '../services/api';
import { OPS, useCan } from '../store/auth';
import { useLive } from '../store/live';
import type { DashboardKpi, Intersection, Paginated, VehicleType, Violation } from '../types';
import { AXIS_STYLE, fmtTime, INT_COLORS, manilaToday, shortHour, TOOLTIP_STYLE } from '../utils/format';

function Kpi({ icon: Icon, label, value, sub, hint }: { icon: LucideIcon; label: string; value: string | number; sub?: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4" title={hint}>
      <div className="flex items-center gap-2 text-xs text-slate-400"><Icon className="size-4" />{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function KpiRow() {
  const q = useQuery({ queryKey: ['kpi'], queryFn: () => api<DashboardKpi>('/dashboard/summary') });
  const k = useLive((s) => s.kpi) ?? q.data;
  if (!k)
    return q.isError ? <Async q={q}>{() => null}</Async> : (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
    );
  const pct = k.vehiclesYesterdaySameTime ? (k.vehiclesToday / k.vehiclesYesterdaySameTime - 1) * 100 : 0;
  const offline = k.offlineCameras.length ? `Offline: ${k.offlineCameras.join(', ')}` : 'All cameras online';
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
      <Kpi icon={Car} label="Vehicles Today" value={k.vehiclesToday.toLocaleString()} sub={`${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% vs yesterday`} />
      <Kpi icon={TrendingUp} label="Current Peak Intersection" value={k.peakIntersection.name} sub={`${k.peakIntersection.perMin} vehicles/min`} hint={k.peakIntersection.name} />
      <Kpi icon={Gauge} label="Over-speeding Today" value={k.overspeedToday} sub={k.lastOverspeedAt ? `latest at ${fmtTime(k.lastOverspeedAt)}` : 'none yet'} />
      <Kpi icon={Video} label="Cameras Online" value={`${k.camerasOnline} / ${k.camerasTotal}`} sub={offline} hint={offline} />
      <Kpi icon={Radar} label="Sensors Online" value={`${k.sensorsOnline} / ${k.sensorsTotal}`} />
      <Kpi icon={Timer} label="Avg. Wait Time" value={`${k.avgWaitSec}s`} sub="across all intersections" />
    </div>
  );
}

function IntersectionCard({ i }: { i: Intersection }) {
  const sig = useLive((s) => s.signals[i.id]);
  const last5 = useLive((s) => Object.values(s.lanes).reduce((n, l) => (l.intersectionId === i.id ? n + l.sensor.countLast5Min : n), 0));
  return (
    <Link to={`/intersections/${i.id}`} className="block rounded-lg border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-600">
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
              <li key={a.id} className="rounded-md border border-slate-800 p-2 text-sm">
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
            <LineChart data={rows} margin={{ right: 8 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hour" {...AXIS_STYLE} />
              <YAxis {...AXIS_STYLE} width={44} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {split === 'split'
                ? ints.map((i, k) => <Line key={i.id} dataKey={i.id} name={i.name} stroke={INT_COLORS[k % INT_COLORS.length]} dot={false} strokeWidth={2} isAnimationActive={false} />)
                : <Line dataKey="ALL" name="All intersections" stroke="#38bdf8" dot={false} strokeWidth={2} isAnimationActive={false} />}
            </LineChart>
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

export default function Dashboard() {
  const evidence = useCan(OPS);
  const ints = useIntersections();
  const recent = useQuery({ queryKey: ['violations', { size: 10 }], queryFn: () => api<Paginated<Violation>>('/violations?size=10') });
  return (
    <div className="space-y-4">
      <h1 className="sr-only">Dashboard</h1>
      <KpiRow />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Intersections" className="xl:col-span-2">
          <Async q={ints} skeleton="h-48">{(list) => <div className="grid gap-3 sm:grid-cols-2">{list.map((i) => <IntersectionCard key={i.id} i={i} />)}</div>}</Async>
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
