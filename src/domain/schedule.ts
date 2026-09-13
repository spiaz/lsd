import { timeMinutes } from './time';

export const ZURICH_TIME_ZONE = 'Europe/Zurich' as const;
export type DayStatus = 'work' | 'rest' | 'absence' | 'holiday' | 'compensatory-rest';
export type ShiftKind = 'single' | 'split';
export interface ScheduleMetadata {
  id: string; displayName?: string; sourceFileName: string; importedAt: string;
  coverageStart: string; coverageEnd: string;
}
export interface Trip {
  line?: string; vehicle?: string; start: string; end: string; origin?: string; destination?: string;
}
export interface ShiftBlock { ordinal: number; start: string; end: string; trips: Trip[] }
export interface WorkShift {
  kind: ShiftKind; presenceStart: string; presenceEnd: string; workedMinutes?: number; rrMinutes?: number;
  serviceId?: string; pay?: string; origin?: string; destination?: string; blocks: ShiftBlock[];
}
export interface ScheduleDay {
  date: string; status: DayStatus; absenceLabel?: string; shift?: WorkShift; sourceReference?: string;
}
export interface Schedule { metadata: ScheduleMetadata; days: ScheduleDay[]; imports?: ScheduleMetadata[] }
export interface ParseIssue {
  severity: 'warning' | 'error'; code: string; message: string; sourceReference?: string; date?: string;
}
export interface ParseResult { schedule?: Schedule; issues: ParseIssue[] }

/** Preserve the original MVP rule for operational PDFs that do not expose block IDs. */
export function inferSplitBlocks(shift: WorkShift): WorkShift {
  if (shift.blocks.length !== 1 || shift.blocks[0].trips.length < 2) return shift;
  const trips = [...shift.blocks[0].trips].sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
  let splitAt = -1, largestGap = 59;
  for (let i = 1; i < trips.length; i++) {
    const gap = timeMinutes(trips[i].start) - timeMinutes(trips[i - 1].end);
    if (gap >= 60 && gap > largestGap) { largestGap = gap; splitAt = i; }
  }
  if (splitAt < 0) return shift;
  const first = trips.slice(0, splitAt), second = trips.slice(splitAt);
  return { ...shift, kind: 'split', blocks: [
    { ordinal: 1, start: first[0].start, end: first.at(-1)!.end, trips: first },
    { ordinal: 2, start: second[0].start, end: second.at(-1)!.end, trips: second },
  ] };
}

export function normalizeScheduleBlocks(schedule: Schedule): Schedule {
  return { ...schedule, days: schedule.days.map(day => day.shift ? { ...day, shift: inferSplitBlocks(day.shift) } : day) };
}
