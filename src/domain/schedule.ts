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

/**
 * The paid working time is the time spent in service blocks, less the RR
 * (meal/rest) time recorded for the shift.  It intentionally excludes the
 * gap between split blocks: that gap is not part of a driver's work day.
 *
 * Return undefined for incomplete times, so callers can retain an explicitly
 * entered value rather than silently manufacturing one.
 */
export function effectiveWorkedMinutes(shift: WorkShift): number | undefined {
  try {
    const blockMinutes = shift.blocks.reduce((total, block) => {
      const minutes = timeMinutes(block.end) - timeMinutes(block.start);
      if (minutes < 0) throw new Error('Invalid block range');
      return total + minutes;
    }, 0);
    return Math.max(0, blockMinutes - (shift.rrMinutes || 0));
  } catch {
    return undefined;
  }
}

/** A derived duration is safe only when blocks cover the full presence span. */
export function hasCompleteBlockCoverage(shift: WorkShift): boolean {
  if (!shift.blocks.length) return false;
  try {
    return timeMinutes(shift.blocks[0].start) === timeMinutes(shift.presenceStart)
      && timeMinutes(shift.blocks.at(-1)!.end) === timeMinutes(shift.presenceEnd);
  } catch {
    return false;
  }
}

/** Split at every pause of at least 30 minutes, including within previously saved blocks. */
export function inferSplitBlocks(shift: WorkShift): WorkShift {
  let changed = false;
  const blocks = shift.blocks.flatMap(block => {
    if (block.trips.length < 2) return [block];
    const trips = [...block.trips].sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
    const groups: Trip[][] = [[trips[0]]];
    for (const trip of trips.slice(1)) {
      const previous = groups.at(-1)!;
      if (timeMinutes(trip.start) - timeMinutes(previous.at(-1)!.end) >= 30) groups.push([]);
      groups.at(-1)!.push(trip);
    }
    if (groups.length === 1) return [block];
    changed = true;
    return groups.map(group => ({ ordinal: 0, start: group[0].start, end: group.at(-1)!.end, trips: group }));
  });
  return changed ? { ...shift, kind: 'split', blocks: blocks.map((block, i) => ({ ...block, ordinal: i + 1 })) } : shift;
}

export function normalizeScheduleBlocks(schedule: Schedule): Schedule {
  return { ...schedule, days: schedule.days.map(day => day.shift ? { ...day, shift: inferSplitBlocks(day.shift) } : day) };
}
