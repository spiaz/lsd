import { describe, expect, it } from 'vitest';
import { sampleSchedule } from '../test/fixtures';
import { validateSchedule } from './validation';
describe('schedule validation', () => {
  it('accepts single, overnight, split and all-day records', () => expect(validateSchedule(sampleSchedule())).toEqual([]));
  it('rejects duplicates', () => { const s = sampleSchedule(); s.days.push(s.days[0]); expect(validateSchedule(s).some(i => i.code === 'DUPLICATE')).toBe(true); });
  it('reports missing days without converting them to rest', () => { const s = sampleSchedule(); s.days.splice(1, 1); expect(validateSchedule(s)).toEqual([expect.objectContaining({ code: 'MISSING', severity: 'warning', date: '2026-10-02' })]); });
  it('does not infer an overnight end from an earlier clock time', () => { const s = sampleSchedule(); s.days[0].shift!.presenceEnd = '01:31'; expect(validateSchedule(s).some(i => i.code === 'TIME')).toBe(true); });
  it('rejects invalid dates', () => { const s = sampleSchedule(); s.days[0].date = '2026-02-30'; expect(validateSchedule(s).some(i => i.code === 'DATE')).toBe(true); });
  it('rejects overlapping blocks', () => { const s = sampleSchedule(); s.days[1].shift!.blocks[1].start = '09:00'; expect(validateSchedule(s).some(i => i.code === 'BLOCK_RANGE')).toBe(true); });
  it('rejects trips outside their block', () => { const s = sampleSchedule(); s.days[0].shift!.blocks[0].trips[0].end = '26:00'; expect(validateSchedule(s).some(i => i.code === 'TRIP_RANGE')).toBe(true); });
  it('requires explicit split boundaries', () => { const s = sampleSchedule(); s.days[1].shift!.blocks.pop(); expect(validateSchedule(s).some(i => i.code === 'BLOCKS')).toBe(true); });
  it('bounds malformed or excessive coverage', () => { const s = sampleSchedule(); s.metadata.coverageEnd = '2099-01-01'; expect(validateSchedule(s)).toEqual([expect.objectContaining({ code: 'COVERAGE' })]); });
});
