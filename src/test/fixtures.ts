import type { Schedule } from '../domain/schedule';
export function sampleSchedule(): Schedule {
  return { metadata: { id: 'synthetic', displayName: 'Demo', sourceFileName: 'synthetic.pdf', importedAt: '2026-09-01T12:00:00Z', coverageStart: '2026-10-01', coverageEnd: '2026-10-03' }, days: [
    { date: '2026-10-01', status: 'work', shift: { kind: 'single', presenceStart: '21:00', presenceEnd: '25:31', workedMinutes: 240, rrMinutes: 31, pay: '12.34', origin: 'Alfa', destination: 'Beta', blocks: [{ ordinal: 1, start: '21:00', end: '25:31', trips: [{ start: '21:10', end: '25:20', origin: 'Alfa', destination: 'Beta', line: 'D1', vehicle: 'V-001' }] }] } },
    { date: '2026-10-02', status: 'work', shift: { kind: 'split', presenceStart: '06:00', presenceEnd: '18:00', workedMinutes: 420, rrMinutes: 60, blocks: [{ ordinal: 1, start: '06:00', end: '10:00', trips: [] }, { ordinal: 2, start: '14:00', end: '18:00', trips: [] }] } },
    { date: '2026-10-03', status: 'compensatory-rest' },
  ] };
}
