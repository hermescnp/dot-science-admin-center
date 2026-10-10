const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60],
  ['month', 30 * 24 * 60],
  ['week', 7 * 24 * 60],
  ['day', 24 * 60],
  ['hour', 60],
  ['minute', 1]
];

/** "3 hours ago", "yesterday", "Just now". Differs between server and client renders near unit boundaries. */
export function relativeTime(iso: string) {
  const minutes = (new Date(iso).getTime() - Date.now()) / 60_000;
  if (Math.abs(minutes) < 1) return 'Just now';
  const [unit, size] = units.find(([, size]) => Math.abs(minutes) >= size) ?? units.at(-1)!;
  return relativeFormat.format(Math.round(minutes / size), unit);
}
