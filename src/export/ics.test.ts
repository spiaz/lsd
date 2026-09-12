import { describe, expect, it } from 'vitest';
import { sampleSchedule } from '../test/fixtures';
import { foldLine, scheduleIcsText } from './ics';
describe('ICS export', () => {
  it('exports operational overnight time on the following date in Zurich', () => { const ics = scheduleIcsText(sampleSchedule()); expect(ics).toContain('DTEND;TZID=Europe/Zurich:20261002T013100'); expect(ics).toContain('BEGIN:VTIMEZONE'); expect(ics).toContain('TZOFFSETTO:+0200'); expect(ics).toContain('TZOFFSETTO:+0100'); });
  it('exports two separate split events, and reminders only for timed events', () => { const ics = scheduleIcsText(sampleSchedule()); expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4); expect(ics.match(/TRIGGER:-PT2H/g)).toHaveLength(3); expect(ics).toContain('DTSTART;TZID=Europe/Zurich:20261002T140000'); });
  it('uses exclusive next-day all-day end', () => { const ics = scheduleIcsText(sampleSchedule()); expect(ics).toContain('DTSTART;VALUE=DATE:20261003'); expect(ics).toContain('DTEND;VALUE=DATE:20261004'); });
  it('escapes content and prevents injected ICS properties', () => { const s = sampleSchedule(); s.metadata.displayName = 'Demo,;\\\nEND:VEVENT'; const ics = scheduleIcsText(s); expect(ics).toContain('Demo\\,\\;\\\\\\nEND:VEVENT'); expect(ics.match(/\r\nEND:VEVENT/g)).toHaveLength(4); });
  it('folds UTF-8 lines without splitting characters or exceeding 75 bytes', () => { const text = 'SUMMARY:' + 'è🚍'.repeat(40); const folded = foldLine(text); expect(folded.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true); expect(folded.replace(/\r\n /g, '')).toBe(text); });
  it('keeps event identity stable across revisions', () => { const s = sampleSchedule(); const old = scheduleIcsText(s); s.days[0].shift!.origin = 'Nuovo'; expect(scheduleIcsText(s).match(/UID:.*/g)).toEqual(old.match(/UID:.*/g)); });
  it('handles month and year rollover', () => { const s = sampleSchedule(); s.days = [s.days[0]]; s.days[0].date = s.metadata.coverageStart = s.metadata.coverageEnd = '2026-12-31'; expect(scheduleIcsText(s)).toContain('DTEND;TZID=Europe/Zurich:20270101T013100'); });
  it('refuses invalid schedules', () => { const s = sampleSchedule(); s.days[0].shift!.presenceEnd = ''; expect(() => scheduleIcsText(s)).toThrow(); });
  it('localises generated event content', () => { const ics = scheduleIcsText(sampleSchedule(), new Date(), 'de'); expect(ics).toContain('GETEILTER DIENST'); expect(ics).toContain('DESCRIPTION:Der Dienst beginnt in zwei Stunden'); expect(ics).toContain('SUMMARY:Demo · Ausgleichsruhe'); });
});
