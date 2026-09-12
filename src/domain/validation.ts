import type { ParseIssue, Schedule } from './schedule';
import { addDays, timeMinutes, validDate } from './time';
import { translator, type Locale } from '../i18n';
export function validateSchedule(schedule: Schedule, locale: Locale = 'fr'): ParseIssue[] {
  const t = translator(locale);
  const issues: ParseIssue[] = [];
  const issue = (message: string, code: string, date?: string) => issues.push({ severity: 'error', code, message, date });
  const { coverageStart: start, coverageEnd: end } = schedule.metadata;
  if (!validDate(start) || !validDate(end) || start > end) { issue(t('validation.coverage'), 'COVERAGE'); return issues; }
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 1096) { issue(t('validation.coverageLong'), 'COVERAGE'); return issues; }
  const seen = new Set<string>();
  for (const day of schedule.days) {
    const d = day.date;
    if (!validDate(d)) { issue(t('validation.date'), 'DATE', d); continue; }
    if (seen.has(d)) issue(t('validation.duplicate'), 'DUPLICATE', d);
    seen.add(d);
    if (d < start || d > end) issue(t('validation.outside'), 'OUTSIDE', d);
    if (day.status !== 'work') continue;
    const shift = day.shift;
    if (!shift) { issue(t('validation.shift'), 'SHIFT', d); continue; }
    function range(a: string, b: string) {
      try {
        const start = timeMinutes(a), end = timeMinutes(b);
        if (end <= start || end - start > 1440) throw new Error();
        return [start, end];
      } catch { issue(t('validation.time'), 'TIME', d); return null; }
    }
    const presence = range(shift.presenceStart, shift.presenceEnd);
    if (shift.blocks.length !== (shift.kind === 'single' ? 1 : 2)) issue(t('validation.blocks'), 'BLOCKS', d);
    let previous = -1;
    for (const block of shift.blocks) {
      const span = range(block.start, block.end);
      if (span) {
        if (span[0] < previous || (presence && (span[0] < presence[0] || span[1] > presence[1]))) issue(t('validation.blockRange'), 'BLOCK_RANGE', d);
        previous = span[1];
      }
      let tripEnd = -1;
      for (const trip of block.trips) {
        const leg = range(trip.start, trip.end);
        if (leg) {
          if (leg[0] < tripEnd || (span && (leg[0] < span[0] || leg[1] > span[1]))) issue(t('validation.tripRange'), 'TRIP_RANGE', d);
          tripEnd = leg[1];
        }
      }
    }
    for (const value of [shift.workedMinutes, shift.rrMinutes]) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0 || (presence && value > presence[1] - presence[0]))) issue(t('validation.duration'), 'DURATION', d);
    }
  }
  for (let d = start; d <= end; d = addDays(d, 1)) if (!seen.has(d)) issues.push({ severity: 'warning', code: 'MISSING', message: t('validation.missing'), date: d });
  if (!schedule.days.length) issue(t('validation.empty'), 'EMPTY');
  return issues;
}
