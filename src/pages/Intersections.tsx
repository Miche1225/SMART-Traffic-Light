import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Async, Card, CongestionBadge, cx, input, StatusBadge, td, th } from '../components/ui';
import { hourlyQuery, useCameras, useIntersections, useSensors } from '../services/api';
import { manilaToday } from '../utils/format';

export default function Intersections() {
  const ints = useIntersections();
  const cams = useCameras().data ?? [];
  const sensors = useSensors().data ?? [];
  const today = manilaToday();
  const hourly = useQueries({ queries: (ints.data ?? []).map((i) => hourlyQuery(i.id, today)) });
  const [q, setQ] = useState('');
  const [brgy, setBrgy] = useState('');
  const [status, setStatus] = useState('');
  const barangays = [...new Set(ints.data?.map((i) => i.barangay))];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Intersections</h1>
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <input type="search" placeholder="Search name…" aria-label="Search intersections" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
          <select aria-label="Barangay" value={brgy} onChange={(e) => setBrgy(e.target.value)} className={input}>
            <option value="">All barangays</option>
            {barangays.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
            <option value="">All statuses</option>
            <option value="ONLINE">Online</option>
            <option value="DEGRADED">Degraded</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
        <Async q={ints} empty={(d) => !d.length}>
          {(list) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800">
                  <tr>
                    {['Name', 'Barangay', 'Approaches', 'Cameras', 'Sensors', 'Status', 'Congestion', 'Vehicles today'].map((h) => <th key={h} className={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {list
                    .map((i, k) => ({ i, today: hourly[k]?.data?.reduce((s, h) => s + h.total, 0) }))
                    .filter(({ i }) => i.name.toLowerCase().includes(q.toLowerCase()) && (!brgy || i.barangay === brgy) && (!status || i.status === status))
                    .map(({ i, today: n }) => (
                      <tr key={i.id} className="hover:bg-slate-800/40">
                        <td className={td}><Link to={`/intersections/${i.id}`} className="font-medium text-sky-300 hover:underline">{i.name}</Link></td>
                        <td className={td}>{i.barangay}</td>
                        <td className={cx(td, 'tabular-nums')}>{i.approaches.length}</td>
                        <td className={cx(td, 'tabular-nums')}>{cams.filter((c) => c.intersectionId === i.id).length}</td>
                        <td className={cx(td, 'tabular-nums')}>{sensors.filter((s) => s.intersectionId === i.id).length}</td>
                        <td className={td}><StatusBadge status={i.status} /></td>
                        <td className={td}><CongestionBadge level={i.congestion} /></td>
                        <td className={cx(td, 'tabular-nums')}>{n?.toLocaleString() ?? '…'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </Card>
    </div>
  );
}
