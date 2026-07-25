// Reusable Intl formatters, constructed once at module load. Building an
// Intl.DateTimeFormat is expensive; toLocale* creates one internally on every
// call, so hoisting avoids rebuilding a formatter per card, per render.
const timeFmt = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat([], { weekday: 'short' });
const monthDayFmt = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' });

// Friendly "Today 9:00 AM" / "Tomorrow 6:00 PM" / "Sun 11:00 AM" labels.
export function startLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = timeFmt.format(d);

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);

  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Tomorrow ${time}`;
  if (dayDiff > 1 && dayDiff < 7) return `${weekdayFmt.format(d)} ${time}`;
  return `${monthDayFmt.format(d)} ${time}`;
}

// Short relative time for chat: "now", "5m", "2h", "3d"
export function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86_400)}d`;
}

// "Starts in 3 hours" / "Starts in 25 min" / "Starting now"
export function startsInLabel(iso: string): string {
  const mins = (new Date(iso).getTime() - Date.now()) / 60_000;
  if (mins <= 15) return 'Starting now';
  if (mins < 60) return `Starts in ${Math.round(mins)} min`;
  const hrs = mins / 60;
  return `Starts in ${Math.round(hrs)} hour${Math.round(hrs) === 1 ? '' : 's'}`;
}
