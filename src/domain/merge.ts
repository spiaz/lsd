import type { Schedule } from './schedule';
import { translator, type Locale } from '../i18n';
export type MergeMode = 'add' | 'replace';
export function mergeSchedules(current: Schedule | undefined, incoming: Schedule, mode: MergeMode, locale: Locale = 'fr'): Schedule {
  if (!current) return { ...incoming, metadata: { ...incoming.metadata, id: 'active' }, imports: [incoming.metadata] };
  const start = incoming.metadata.coverageStart, end = incoming.metadata.coverageEnd;
  if (mode === 'add' && current.days.some(day => day.date >= start && day.date <= end)) throw new Error(translator(locale)('merge.overlap'));
  const days = [...current.days.filter(day => mode !== 'replace' || day.date < start || day.date > end), ...incoming.days].sort((a, b) => a.date.localeCompare(b.date));
  return {
    metadata: { ...incoming.metadata, id: 'active', displayName: incoming.metadata.displayName || current.metadata.displayName,
      coverageStart: current.metadata.coverageStart < start ? current.metadata.coverageStart : start,
      coverageEnd: current.metadata.coverageEnd > end ? current.metadata.coverageEnd : end },
    days, imports: [...(current.imports || [current.metadata]), incoming.metadata],
  };
}
