import { Link } from 'react-router-dom';
import type { Violation } from '../types';
import { APPROACH_LABEL, fmtDateTime } from '../utils/format';
import { cx, td, th, ViolationStatusBadge } from './ui';

const excessTone = (n: number) => (n > 20 ? 'text-red-400' : n > 10 ? 'text-orange-400' : 'text-yellow-300');

/** `evidence` false hides thumbnails/plates and detail links (viewers, RA 10173). */
export function ViolationTable({ rows, evidence = true, selected, onSelect }: { rows: Violation[]; evidence?: boolean; selected?: Set<string>; onSelect?: (ids: string[], on: boolean) => void }) {
  const all = selected && rows.length > 0 && rows.every((r) => selected.has(r.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-800">
          <tr>
            {onSelect && (
              <th className={th}>
                <input type="checkbox" aria-label="Select all on page" checked={!!all} onChange={(e) => onSelect(rows.map((r) => r.id), e.target.checked)} />
              </th>
            )}
            {evidence && <th className={th}>Image</th>}
            <th className={th}>Date/Time</th>
            <th className={th}>Intersection</th>
            <th className={th}>Approach</th>
            <th className={th}>Vehicle</th>
            <th className={cx(th, 'text-right')}>Speed (km/h)</th>
            <th className={cx(th, 'text-right')}>Limit (km/h)</th>
            <th className={cx(th, 'text-right')}>Excess</th>
            {evidence && <th className={th}>Plate No.</th>}
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {rows.map((v) => {
            const excess = v.speedKph - v.limitKph;
            return (
              <tr key={v.id} className="hover:bg-slate-800/40">
                {onSelect && (
                  <td className={td}>
                    <input type="checkbox" aria-label={`Select ${v.id}`} checked={selected?.has(v.id) ?? false} onChange={(e) => onSelect([v.id], e.target.checked)} />
                  </td>
                )}
                {evidence && (
                  <td className={td}>
                    <Link to={`/violations/${v.id}`}><img src={v.imageUrl} alt={`Evidence ${v.id}`} className="h-10 w-16 rounded object-cover" /></Link>
                  </td>
                )}
                <td className={cx(td, 'whitespace-nowrap')}>
                  {evidence ? <Link to={`/violations/${v.id}`} className="text-sky-300 hover:underline">{fmtDateTime(v.timestamp)}</Link> : fmtDateTime(v.timestamp)}
                </td>
                <td className={td}>{v.intersectionName}</td>
                <td className={td}>{APPROACH_LABEL[v.approach]}</td>
                <td className={cx(td, 'capitalize')}>{v.vehicleType}</td>
                <td className={cx(td, 'text-right tabular-nums font-semibold')}>{v.speedKph}</td>
                <td className={cx(td, 'text-right tabular-nums text-slate-400')}>{v.limitKph}</td>
                <td className={cx(td, 'text-right tabular-nums font-semibold', excessTone(excess))}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800" aria-hidden>
                      <span className="block h-full rounded-full bg-current" style={{ width: `${Math.min(100, (excess / 30) * 100)}%` }} />
                    </span>
                    +{excess}
                  </span>
                </td>
                {evidence && <td className={cx(td, 'font-mono')}>{v.plateNumber ?? '—'}</td>}
                <td className={td}><ViolationStatusBadge status={v.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
