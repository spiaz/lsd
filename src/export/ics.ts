import type { Schedule } from '../domain/schedule';
import { addDays, displayTime, duration, normalizeOperationalTime } from '../domain/time';
import { validateSchedule } from '../domain/validation';
import { statusLabel, translator, type Locale } from '../i18n';
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
export function foldLine(line: string) {
  const enc = new TextEncoder(); let result = '', length = 0;
  for (const char of line) { const bytes = enc.encode(char).length; if (length + bytes > 75) { result += '\r\n '; length = 1; } result += char; length += bytes; }
  return result;
}
function localStamp(date: string, time: string) {
  const t = normalizeOperationalTime(time);
  return `${addDays(date, t.dayOffset).replace(/-/g, '')}T${String(t.hours).padStart(2, '0')}${String(t.minutes).padStart(2, '0')}00`;
}
export function scheduleIcsText(schedule: Schedule, now = new Date(), locale: Locale = 'fr') {
  const t = translator(locale);
  if (validateSchedule(schedule, locale).some(i => i.severity === 'error')) throw new Error(t('ics.fix'));
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//LSD//Lausanne Shift Discovery//${locale.toUpperCase()}`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:LSD', 'X-WR-TIMEZONE:Europe/Zurich',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Zurich', 'BEGIN:DAYLIGHT', 'DTSTART:19960331T020000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'DTSTART:19961027T030000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  for (const day of schedule.days) {
    const shift = day.shift;
    if (day.status === 'work' && shift) {
      shift.blocks.forEach((block, index) => {
        const origin = block.trips[0]?.origin || shift.origin || '', destination = block.trips.at(-1)?.destination || shift.destination || '';
        const route = [origin, destination].filter(Boolean).join(' → ');
        const summary = [schedule.metadata.displayName || 'LSD', `${displayTime(block.start)}–${displayTime(block.end)}`, route, shift.kind === 'split' ? t('ics.block', { number: index + 1 }) : ''].filter(Boolean).join(' · ');
        const description = [`${t('ics.date')}: ${day.date}`, shift.kind === 'split' ? t('shift.split') : t('shift.single'), `${t('ics.presence')}: ${displayTime(shift.presenceStart)}–${displayTime(shift.presenceEnd)}`, `${t('ics.dayWork')}: ${duration(shift.workedMinutes)}`, `${t('ics.dayRr')}: ${duration(shift.rrMinutes)}`, ...block.trips.map(trip => `${displayTime(trip.start)}–${displayTime(trip.end)} | ${trip.origin || '—'} → ${trip.destination || '—'} | ${t('ics.line')} ${trip.line || '—'} | ${t('ics.vehicle')} ${trip.vehicle || '—'}`)].join('\n');
        lines.push('BEGIN:VEVENT', `UID:lsd-${day.date}-${index + 1}@lausanne-shift-driver`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `DTSTART;TZID=Europe/Zurich:${localStamp(day.date, block.start)}`, `DTEND;TZID=Europe/Zurich:${localStamp(day.date, block.end)}`, `SUMMARY:${escape(summary)}`, `DESCRIPTION:${escape(description)}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${t('ics.reminder')}`, 'END:VALARM', 'END:VEVENT');
      });
    } else {
      lines.push('BEGIN:VEVENT', `UID:lsd-${day.date}-day@lausanne-shift-driver`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(day.date, 1).replace(/-/g, '')}`, `SUMMARY:${escape([schedule.metadata.displayName, statusLabel(day.status, locale)].filter(Boolean).join(' · '))}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
  }
  return [...lines, 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
}
export function exportScheduleAsIcs(schedule: Schedule, locale: Locale = 'fr'): Blob { return new Blob([scheduleIcsText(schedule, new Date(), locale)], { type: 'text/calendar;charset=utf-8' }); }
