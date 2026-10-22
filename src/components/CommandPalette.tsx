import { CornerDownLeft, MapPin, Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntersections } from '../services/api';
import { cx, Dialog } from './ui';

export interface Command { id: string; label: string; group: string; icon: ReactNode; to?: string; run?: () => void }

/** Ctrl/⌘+K jump-to: pages, intersections and quick actions, fully keyboard driven. */
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const nav = useNavigate();
  const ints = useIntersections().data ?? [];
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  useEffect(() => { if (open) { setQ(''); setSel(0); } }, [open]);

  const all: Command[] = [
    ...commands,
    ...ints.map((i) => ({ id: i.id, label: i.name, group: `Intersection · Brgy. ${i.barangay}`, icon: <MapPin className="size-4" />, to: `/intersections/${i.id}` })),
  ];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = all.filter((c) => words.every((w) => `${c.label} ${c.group}`.toLowerCase().includes(w)));
  const run = (c?: Command) => {
    if (!c) return;
    onClose();
    if (c.to) nav(c.to);
    c.run?.();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(hits[sel]); }
  };

  return (
    <Dialog open={open} title="Go to…" onClose={onClose}>
      <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-2.5 focus-within:border-sky-600">
        <Search className="size-4 text-slate-500" />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="cmd-list"
          aria-activedescendant={hits[sel] ? `cmd-${hits[sel].id}` : undefined}
          placeholder="Search pages, intersections, actions…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={onKey}
          className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-500"
        />
      </div>
      <ul id="cmd-list" role="listbox" className="mt-3 max-h-80 space-y-0.5 overflow-y-auto">
        {hits.map((c, k) => (
          <li
            key={c.id}
            id={`cmd-${c.id}`}
            role="option"
            aria-selected={k === sel}
            onMouseMove={() => setSel(k)}
            onClick={() => run(c)}
            className={cx('flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm', k === sel ? 'bg-sky-500/15 text-sky-200' : 'text-slate-300')}
          >
            <span className="text-slate-400">{c.icon}</span>
            <span className="min-w-0 flex-1 truncate">{c.label}</span>
            <span className="text-xs text-slate-500">{c.group}</span>
            {k === sel && <CornerDownLeft className="size-3.5 text-sky-300" aria-hidden />}
          </li>
        ))}
        {!hits.length && <li className="py-6 text-center text-sm text-slate-500">No matches</li>}
      </ul>
      <p className="mt-3 text-xs text-slate-500">↑ ↓ to move · Enter to open · Esc to close</p>
    </Dialog>
  );
}
