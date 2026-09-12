// @vitest-environment node
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openLsdDatabase, saveSchedule, listSchedules } from './database';
import { sampleSchedule } from '../test/fixtures';
import { mergeSchedules } from '../domain/merge';
afterEach(async () => { const db = await openLsdDatabase(); await db.clear('schedules'); db.close(); });
describe('local persistence', () => {
  it('restores a planning through a new database connection', async () => { const s = mergeSchedules(undefined, sampleSchedule(), 'add'); await saveSchedule(s); expect(await listSchedules()).toEqual([s]); });
  it('updates the active record without retaining a second stale planning', async () => { const first = mergeSchedules(undefined, sampleSchedule(), 'add'); await saveSchedule(first); const incoming = sampleSchedule(); incoming.days[2].status = 'holiday'; const next = mergeSchedules(first, incoming, 'replace'); await saveSchedule(next); expect(await listSchedules()).toEqual([next]); });
});
