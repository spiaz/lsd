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
  pay?: string; origin?: string; destination?: string; blocks: ShiftBlock[];
}
export interface ScheduleDay {
  date: string; status: DayStatus; absenceLabel?: string; shift?: WorkShift; sourceReference?: string;
}
export interface Schedule { metadata: ScheduleMetadata; days: ScheduleDay[]; imports?: ScheduleMetadata[] }
export interface ParseIssue {
  severity: 'warning' | 'error'; code: string; message: string; sourceReference?: string; date?: string;
}
export interface ParseResult { schedule?: Schedule; issues: ParseIssue[] }
export const statusLabels: Record<DayStatus, string> = {
  work: 'Travail', rest: 'Repos', absence: 'Congé / absence', holiday: 'Vacances / jour férié', 'compensatory-rest': 'Repos compensatoire',
};
