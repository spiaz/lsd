import type { Schedule } from '../domain/schedule';

export function exportScheduleAsIcs(_schedule: Schedule): Blob {
  throw new Error('ICS export is not implemented yet.');
}
