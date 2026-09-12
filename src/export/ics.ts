import { statusLabels, type Schedule } from '../domain/schedule';
import { addDays, displayTime, duration, normalizeOperationalTime } from '../domain/time';
import { validateSchedule } from '../domain/validation';
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
export function scheduleIcsText(schedule: Schedule, now = new Date()) {
  if (validateSchedule(schedule).some(i => i.severity === 'error')) throw new Error('Corrigez le planning avant de l’exporter.');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LSD//Lausanne Shift Discovery//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:LSD', 'X-WR-TIMEZONE:Europe/Zurich',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Zurich', 'BEGIN:DAYLIGHT', 'DTSTART:19960331T020000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'DTSTART:19961027T030000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'];
  for (const day of schedule.days) {
    const shift = day.shift;
    if (day.status === 'work' && shift) {
      shift.blocks.forEach((block, index) => {
        const origin = block.trips[0]?.origin || shift.origin || '', destination = block.trips.at(-1)?.destination || shift.destination || '';
        const route = [origin, destination].filter(Boolean).join(' → ');
        const summary = [schedule.metadata.displayName || 'LSD', `${displayTime(block.start)}–${displayTime(block.end)}`, route, shift.kind === 'split' ? `Bloc ${index + 1}/2` : ''].filter(Boolean).join(' · ');
        const description = [`Date: ${day.date}`, shift.kind === 'split' ? 'SERVICE COUPÉ' : 'SERVICE SIMPLE', `Présence: ${displayTime(shift.presenceStart)}–${displayTime(shift.presenceEnd)}`, `Travail de la journée: ${duration(shift.workedMinutes)}`, `RR de la journée: ${duration(shift.rrMinutes)}`, ...block.trips.map(t => `${displayTime(t.start)}–${displayTime(t.end)} | ${t.origin || '—'} → ${t.destination || '—'} | Ligne ${t.line || '—'} | Véhicule ${t.vehicle || '—'}`)].join('\n');
        lines.push('BEGIN:VEVENT', `UID:lsd-${day.date}-${index + 1}@lausanne-shift-driver`, `DTSTAMP:${stamp}`, `LAST-MODIFIED:${stamp}`, `DTSTART;TZID=Europe/Zurich:${localStamp(day.date, block.start)}`, `DTEND;TZID=Europe/Zurich:${localStamp(day.date, block.end)}`, `SUMMARY:${escape(summary)}`, `DESCRIPTION:${escape(description)}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Le service commence dans deux heures', 'END:VALARM', 'END:VEVENT');
      });
    } else {
      lines.push('BEGIN:VEVENT', `UID:lsd-${day.date}-day@lausanne-shift-driver`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(day.date, 1).replace(/-/g, '')}`, `SUMMARY:${escape([schedule.metadata.displayName, statusLabels[day.status]].filter(Boolean).join(' · '))}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
  }
  return [...lines, 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
}
export function exportScheduleAsIcs(schedule: Schedule): Blob { return new Blob([scheduleIcsText(schedule)], { type: 'text/calendar;charset=utf-8' }); }
