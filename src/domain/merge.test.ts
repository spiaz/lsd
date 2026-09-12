import { describe, expect, it } from 'vitest';
import { sampleSchedule } from '../test/fixtures';
import { mergeSchedules } from './merge';
describe('schedule merging', () => {
  it('saves a first import under the active key', () => expect(mergeSchedules(undefined, sampleSchedule(), 'add').metadata.id).toBe('active'));
  it('blocks accidental overlap when adding', () => expect(() => mergeSchedules(sampleSchedule(), sampleSchedule(), 'add')).toThrow('chevauche'));
  it('replaces an entire interval but preserves unrelated history', () => {
    const old = sampleSchedule(), incoming = sampleSchedule(); incoming.days = [{ date: '2026-10-02', status: 'holiday' }]; incoming.metadata.coverageStart = '2026-10-02';
    const merged = mergeSchedules(old, incoming, 'replace');
    expect(merged.days.map(d => d.date)).toEqual(['2026-10-01', '2026-10-02']); expect(merged.days[1].status).toBe('holiday'); expect(old.days).toHaveLength(3); expect(merged.imports).toHaveLength(2);
  });
  it('adds non-overlapping history and expands coverage', () => { const next = sampleSchedule(); next.days = [{ date: '2026-11-01', status: 'rest' }]; next.metadata.coverageStart = next.metadata.coverageEnd = '2026-11-01'; const merged = mergeSchedules(sampleSchedule(), next, 'add'); expect(merged.days).toHaveLength(4); expect(merged.metadata.coverageEnd).toBe('2026-11-01'); expect(merged.metadata.coverageStart).toBe('2026-10-01'); });
});
