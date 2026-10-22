/** Expected count for `hour`: mean of that hour over the past days that have data. An estimate, not a model. */
export function forecastHour(pastDays: (number[] | undefined)[], hour: number) {
  const v = pastDays.map((d) => d?.[hour % 24]).filter((n): n is number => n != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Peak, top-3 and quietest hour from 24 hourly totals; hours after `lastHour` (today, not yet happened) are ignored. */
export function peakStats(totals: number[], lastHour = 23) {
  const hours = totals.slice(0, lastHour + 1).map((count, hour) => ({ hour, count }));
  const sorted = [...hours].sort((a, b) => b.count - a.count || a.hour - b.hour);
  return { peakHour: sorted[0], top3Hours: sorted.slice(0, 3), quietestHour: sorted[sorted.length - 1] };
}
