export interface NormalizedTime { dayOffset: number; hours: number; minutes: number; display: string }
export function normalizeOperationalTime(value: string): NormalizedTime {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match || Number(match[2]) > 59 || Number(match[1]) > 47) throw new Error('Horaire non valide : utilisez HH:MM entre 00:00 et 47:59.');
  const rawHours = Number(match[1]), minutes = Number(match[2]);
  const dayOffset = Math.floor(rawHours / 24), hours = rawHours % 24;
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { dayOffset, hours, minutes, display: dayOffset ? `${clock} (+${dayOffset})` : clock };
}
export function timeMinutes(value: string) {
  const t = normalizeOperationalTime(value); return (t.dayOffset * 24 + t.hours) * 60 + t.minutes;
}
export function displayTime(value: string) { try { return normalizeOperationalTime(value).display; } catch { return value || '—'; } }
export function duration(value?: number) { return value === undefined ? '—' : `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}`; }
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(value: string, days: number) {
  const d = new Date(`${value}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function todayDate() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date()); }
export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return validDate(date) ? new Intl.DateTimeFormat('fr-CH', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : date;
}
