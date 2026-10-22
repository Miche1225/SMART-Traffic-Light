// Run with `npm run check` (Node 22.18+/24 strips the types).
import assert from 'node:assert/strict';
import { force, phasesOf, stepSignal, type Ctl } from '../src/mocks/signal.ts';
import { forecastHour, peakStats } from '../src/utils/report.ts';

const g = () => 20;

// Normal cycle: green -> 3s yellow -> 2s all-red -> other axis green.
const c: Ctl = { axis: 'NS', stage: 'GREEN', remaining: 2 };
const seen: string[] = [];
for (let i = 0; i < 8; i++) { stepSignal(c, 'ADAPTIVE', g); seen.push(`${c.axis}:${c.stage}`); }
assert.deepEqual(seen, ['NS:GREEN', 'NS:YELLOW', 'NS:YELLOW', 'NS:YELLOW', 'NS:ALLRED', 'NS:ALLRED', 'EW:GREEN', 'EW:GREEN']);
const n = phasesOf(c, g).find((p) => p.approach === 'N')!;
assert.deepEqual([n.color, n.remainingSec], ['RED', 19 + 3 + 2]);

// Manual mode holds green; forcing the other approach still passes through yellow and all-red.
const m: Ctl = { axis: 'NS', stage: 'GREEN', remaining: 1 };
for (let i = 0; i < 5; i++) stepSignal(m, 'MANUAL', g);
assert.deepEqual([m.axis, m.stage], ['NS', 'GREEN']);
force(m, 'E', 20);
assert.equal(m.stage, 'YELLOW');
for (let i = 0; i < 5; i++) stepSignal(m, 'MANUAL', g);
assert.deepEqual([m.axis, m.stage], ['EW', 'GREEN']);

// Forecast averages the same hour across days with data, wraps 23 -> 0, and is null with no history.
const day = (n: number) => Array.from({ length: 24 }, (_, h) => n + h);
assert.equal(forecastHour([day(100), day(200), undefined], 5), 155);
assert.equal(forecastHour([day(100)], 24), 100);
assert.equal(forecastHour([undefined], 3), null);

// Peak stats ignore hours that haven't happened yet.
const totals = Array.from({ length: 24 }, (_, h) => (h === 8 ? 900 : h === 18 ? 1000 : h === 12 ? 500 : 10 + h));
assert.equal(peakStats(totals).peakHour.hour, 18);
assert.deepEqual(peakStats(totals).top3Hours.map((x) => x.hour), [18, 8, 12]);
assert.equal(peakStats(totals, 10).peakHour.hour, 8);
assert.equal(peakStats(totals).quietestHour.hour, 0);

console.log('selfcheck ok');
