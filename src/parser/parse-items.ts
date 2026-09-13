import { inferSplitBlocks, type ParseIssue, type ParseResult, type ScheduleDay, type Trip } from '../domain/schedule';
import { validDate } from '../domain/time';
import { translator, type Locale } from '../i18n';
export interface PdfItem { text: string; x: number; y: number; width: number }
export interface PdfPage { number: number; items: PdfItem[] }
const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function dateValue(text: string) {
  const m = /^(\d{2})[/.](\d{2})[/.](\d{4})$/.exec(text.trim());
  if (!m) return undefined;
  const value = `${m[3]}-${m[2]}-${m[1]}`; return validDate(value) ? value : undefined;
}
function minutes(text: string) {
  const m = /^(\d{1,2})\s*[:h]\s*(\d{2})$/.exec(text.trim());
  return m && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}
const statuses: Record<string, ScheduleDay['status']> = {
  riposo: 'rest', repos: 'rest', r: 'rest', rr: 'compensatory-rest', 'repos compensatoire': 'compensatory-rest',
  congedo: 'absence', conge: 'absence', c: 'absence', maladie: 'absence', absence: 'absence', assenza: 'absence',
  vacances: 'holiday', vap: 'holiday', ferie: 'holiday', feries: 'holiday', feriee: 'holiday', 'jour ferie': 'holiday',
};
/** Layout adapters use column geometry only. No private fixture text is embedded here. */
export function parsePdfItems(pages: PdfPage[], filename: string, locale: Locale = 'fr'): ParseResult {
  const t = translator(locale);
  const days: ScheduleDay[] = [], issues: ParseIssue[] = [];
  let current: ScheduleDay | undefined;
  let currentServiceId = '';
  let pendingUnknownStatus: { day: ScheduleDay; reference: string } | undefined;
  let anyText = false;
  const warn = (code: string, message: string, reference: string, day = current) => issues.push({ severity: 'warning', code, message, sourceReference: reference, date: day?.date });
  const flushUnknownStatus = () => {
    if (!pendingUnknownStatus) return;
    warn('STATUS', t('parser.status'), pendingUnknownStatus.reference, pendingUnknownStatus.day);
    pendingUnknownStatus = undefined;
  };
  for (const page of pages) {
    const items = page.items.filter(i => i.text.trim()); anyText ||= items.length > 0;
    const dateHeader = items.find(i => clean(i.text) === 'date');
    if (!dateHeader) { issues.push({ severity: 'error', code: 'LAYOUT', message: t('parser.layout'), sourceReference: t('parser.page', { page: page.number }) }); continue; }
    const headers = items.filter(i => Math.abs(i.y - dateHeader.y) < 2).sort((a, b) => a.x - b.x);
    const get = (label: string) => headers.filter(i => clean(i.text) === label);
    const synthetic = headers.some(i => clean(i.text) === 'pres. debut');
    const starts = get('debut'), ends = get('fin'), origins = get('de'), destinations = get('a');
    if ((!synthetic && (starts.length !== 2 || ends.length !== 2 || origins.length !== 2 || destinations.length !== 2)) || !get('ligne').length || !get('voiture').length) {
      issues.push({ severity: 'error', code: 'LAYOUT', message: t('parser.columns'), sourceReference: t('parser.page', { page: page.number }) }); continue;
    }
    const rows: PdfItem[][] = [];
    for (const item of items.filter(i => i.y < dateHeader.y - 3).sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows[rows.length - 1];
      if (row && Math.abs(row[0].y - item.y) < 2) row.push(item); else rows.push([item]);
    }
    // Synthetic fixture uses left-aligned cells. The operational layout uses centred numeric cells.
    const read = (row: PdfItem[], header?: PdfItem) => {
      if (!header) return '';
      const index = headers.indexOf(header), prev = headers[index - 1], next = headers[index + 1];
      const center = header.x + header.width / 2;
      const lo = synthetic ? header.x - 2 : prev ? (prev.x + prev.width / 2 + center) / 2 : -Infinity;
      const hi = synthetic ? (next?.x ?? Infinity) - 2 : next ? (next.x + next.width / 2 + center) / 2 : Infinity;
      return row.filter(i => { const x = synthetic ? i.x : i.x + i.width / 2; return x >= lo && x < hi; }).sort((a, b) => a.x - b.x).map(i => i.text).join(' ').trim();
    };
    const presStart = synthetic ? get('pres. debut')[0] : starts[0];
    const presEnd = synthetic ? (get('pres. fin')[0] || get('p. fin')[0]) : ends[0];
    const tripStart = synthetic ? starts[0] : starts[1], tripEnd = synthetic ? ends[0] : ends[1];
    const workHeader = headers.find(i => clean(i.text).startsWith('trav'));
    const payHeader = headers.find(i => clean(i.text).startsWith('pay'));
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], reference = t('parser.row', { page: page.number, row: r + 1 });
      const invalidDate = row.some(i => /^\d{2}[/.]\d{2}[/.]\d{4}$/.test(i.text.trim()) && !dateValue(i.text));
      if (invalidDate) { flushUnknownStatus(); issues.push({ severity: 'error', code: 'DATE', message: t('parser.date'), sourceReference: reference }); current = undefined; continue; }
      const dateItem = row.find(i => dateValue(i.text));
      const date = dateItem && dateValue(dateItem.text);
      if (date) {
        flushUnknownStatus();
        current = { date, status: 'work', sourceReference: reference };
        currentServiceId = '';
        days.push(current);
      }
      if (!current) continue;
      const a = read(row, presStart), b = read(row, presEnd);
      const tStart = read(row, tripStart), tEnd = read(row, tripEnd);
      const serviceId = read(row, get('service')[0]);
      const time = (s: string) => /^\d{1,2}:\d{2}$/.test(s);
      if (date && !time(a) && !time(b)) {
        const statusText = synthetic ? read(row, get('type')[0]) : row.filter(i => i.x > dateHeader.x + dateHeader.width && i.x < origins[0].x - 5).map(i => i.text).join(' ').trim();
        const candidates = new Set(row.filter(i => i.x > dateHeader.x + dateHeader.width && i.x < (origins[0]?.x ?? 180) - 5).map(i => statuses[clean(i.text)]).filter(Boolean));
        const status = statuses[clean(statusText)] || (candidates.size === 1 ? [...candidates][0] : undefined);
        if (!status && serviceId) currentServiceId = serviceId;
        current.status = status || 'absence'; current.absenceLabel = statusText;
        if (status) pendingUnknownStatus = undefined;
        else pendingUnknownStatus = { day: current, reference };
        continue;
      }
      if (time(a) || time(b)) {
        currentServiceId ||= serviceId;
        if (pendingUnknownStatus?.day === current) pendingUnknownStatus = undefined;
        const shift = current.shift ||= { kind: 'single', presenceStart: a, presenceEnd: b, serviceId: currentServiceId || undefined, blocks: [] };
        shift.serviceId ||= currentServiceId || undefined;
        current.status = 'work';
        shift.presenceEnd = b;
        shift.blocks.push({ ordinal: shift.blocks.length + 1, start: a, end: b, trips: [] });
        shift.kind = shift.blocks.length > 1 ? 'split' : 'single';
        if (!synthetic) {
          shift.origin ||= read(row, origins[0]); shift.destination = read(row, destinations[0]);
          if (!read(row, origins[0]) || !shift.destination) warn('PRESENCE_ROUTE', t('parser.presenceRoute'), reference);
        }
        const worked = read(row, workHeader), rr = read(row, get('rr')[0]);
        if (worked) { const value = minutes(worked); if (value === undefined) warn('WORKED', t('parser.worked'), reference); else shift.workedMinutes = (shift.workedMinutes || 0) + value; }
        if (rr) { const value = minutes(rr); if (value === undefined) warn('RR', t('parser.rr'), reference); else shift.rrMinutes = (shift.rrMinutes || 0) + value; }
        const pay = read(row, payHeader); if (pay) shift.pay = shift.pay ? `${shift.pay} + ${pay}` : pay;
        if (synthetic && clean(read(row, get('type')[0])) === 'spezzato') {
          shift.kind = 'split';
          if (!get('bloc').length) warn('SPLIT', t('parser.split'), reference);
        }
      }
      if (time(tStart) || time(tEnd)) {
        if (!current.shift) { warn('ORPHAN_TRIP', t('parser.orphanTrip'), reference); continue; }
        const trip: Trip = { start: tStart, end: tEnd, line: read(row, get('ligne')[0]), vehicle: read(row, get('voiture')[0]), origin: read(row, synthetic ? origins[0] : origins[1]), destination: read(row, synthetic ? destinations[0] : destinations[1]) };
        if (synthetic && current.shift.kind === 'split' && get('bloc').length) {
          const ordinal = Number(read(row, get('bloc')[0]));
          if (ordinal !== 1 && ordinal !== 2) warn('BLOCK_ID', t('parser.blockId'), reference);
          const id = ordinal === 2 ? 2 : 1;
          let block = current.shift.blocks.find(b => b.ordinal === id);
          if (!block) { block = { ordinal: id, start: trip.start, end: trip.end, trips: [] }; current.shift.blocks.push(block); }
          if (!block.trips.length) block.start = trip.start;
          block.end = trip.end; block.trips.push(trip);
        } else current.shift.blocks.at(-1)!.trips.push(trip);
        if (synthetic) { current.shift.origin ||= trip.origin; current.shift.destination = trip.destination; }
        if (!trip.origin || !trip.destination) warn('ROUTE', t('parser.route'), reference);
      } else if (read(row, get('ligne')[0]) && read(row, get('voiture')[0])) {
        warn('TRIP', t('parser.trip'), reference);
      }
    }
  }
  flushUnknownStatus();
  // Operational PDFs have no block-number column, so infer the split from trip gaps.
  for (const day of days) if (day.shift) day.shift = inferSplitBlocks(day.shift);
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return { issues: [{ severity: 'error', code: anyText ? 'NO_DAYS' : 'SCAN', message: anyText ? t('parser.noDays') : t('parser.scan') }, ...issues] };
  return { schedule: { metadata: { id: crypto.randomUUID(), sourceFileName: filename, importedAt: new Date().toISOString(), coverageStart: sorted[0].date, coverageEnd: sorted.at(-1)!.date }, days: sorted }, issues };
}
