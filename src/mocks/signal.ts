import type { Approach, SignalMode, SignalState } from '../types';

// Two-phase controller (N/S vs E/W) used by the mock backend. Pure, so scripts/selfcheck.ts can test it.
export type Axis = 'NS' | 'EW';
export interface Ctl { axis: Axis; stage: 'GREEN' | 'YELLOW' | 'ALLRED'; remaining: number; want?: Axis }

export const AXIS: Record<Approach, Axis> = { N: 'NS', S: 'NS', E: 'EW', W: 'EW' };
export const YELLOW = 3;
export const ALLRED = 2;
const other = (a: Axis): Axis => (a === 'NS' ? 'EW' : 'NS');

/** Advance one second. In MANUAL mode a green holds until an operator forces a change. */
export function stepSignal(c: Ctl, mode: SignalMode, greenFor: (a: Axis) => number) {
  if (mode === 'MANUAL' && c.stage === 'GREEN') return;
  if (--c.remaining > 0) return;
  if (c.stage === 'GREEN') Object.assign(c, { stage: 'YELLOW', remaining: YELLOW });
  else if (c.stage === 'YELLOW') Object.assign(c, { stage: 'ALLRED', remaining: ALLRED });
  else {
    c.axis = c.want ?? other(c.axis);
    c.want = undefined;
    c.stage = 'GREEN';
    c.remaining = greenFor(c.axis);
  }
}

/** Give green to an approach. Ends the current green through yellow and all-red, never skipping them. */
export function force(c: Ctl, a: Approach, green: number) {
  const target = AXIS[a];
  if (c.stage === 'GREEN' && c.axis === target) { c.remaining = green; return; }
  c.want = target;
  if (c.stage === 'GREEN') Object.assign(c, { stage: 'YELLOW', remaining: YELLOW });
}

export function extend(c: Ctl, sec: number) {
  if (c.stage === 'GREEN') c.remaining += sec;
}

export function phasesOf(c: Ctl, greenFor: (a: Axis) => number): SignalState['phases'] {
  const next = c.stage === 'ALLRED' ? c.want ?? other(c.axis) : other(c.axis);
  return (['N', 'S', 'E', 'W'] as Approach[]).map((approach) => {
    const ax = AXIS[approach];
    if (c.stage === 'ALLRED')
      return { approach, color: 'RED', remainingSec: ax === next ? c.remaining : c.remaining + greenFor(next) + YELLOW + ALLRED };
    if (ax === c.axis) return { approach, color: c.stage, remainingSec: c.remaining };
    return { approach, color: 'RED', remainingSec: c.remaining + (c.stage === 'GREEN' ? YELLOW : 0) + ALLRED };
  });
}
