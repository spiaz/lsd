import type { ParseIssue, ParseResult, ScheduleDay, Trip } from '../domain/schedule';
import { validDate } from '../domain/time';
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
  congedo: 'absence', conge: 'absence', maladie: 'absence', absence: 'absence', assenza: 'absence',
  vacances: 'holiday', ferie: 'holiday', feries: 'holiday', feriee: 'holiday', 'jour ferie': 'holiday',
};
/** Layout adapters use column geometry only. No private fixture text is embedded here. */
export function parsePdfItems(pages: PdfPage[], filename: string): ParseResult {
  const days: ScheduleDay[] = [], issues: ParseIssue[] = [];
  let current: ScheduleDay | undefined;
  let anyText = false;
  const warn = (code: string, message: string, reference: string, day = current) => issues.push({ severity: 'warning', code, message, sourceReference: reference, date: day?.date });
  for (const page of pages) {
    const items = page.items.filter(i => i.text.trim()); anyText ||= items.length > 0;
    const dateHeader = items.find(i => clean(i.text) === 'date');
    if (!dateHeader) { issues.push({ severity: 'error', code: 'LAYOUT', message: 'Aucun tableau reconnu sur cette page : utilisez un PDF au format pris en charge.', sourceReference: `Page ${page.number}` }); continue; }
    const headers = items.filter(i => Math.abs(i.y - dateHeader.y) < 2).sort((a, b) => a.x - b.x);
    const get = (label: string) => headers.filter(i => clean(i.text) === label);
    const synthetic = headers.some(i => clean(i.text) === 'pres. debut');
    const starts = get('debut'), ends = get('fin'), origins = get('de'), destinations = get('a');
    if ((!synthetic && (starts.length !== 2 || ends.length !== 2 || origins.length !== 2 || destinations.length !== 2)) || !get('ligne').length || !get('voiture').length) {
      issues.push({ severity: 'error', code: 'LAYOUT', message: 'Colonnes du planning non reconnues.', sourceReference: `Page ${page.number}` }); continue;
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
      const row = rows[r], reference = `Page ${page.number}, ligne ${r + 1}`;
      const invalidDate = row.some(i => /^\d{2}[/.]\d{2}[/.]\d{4}$/.test(i.text.trim()) && !dateValue(i.text));
      if (invalidDate) { issues.push({ severity: 'error', code: 'DATE', message: 'Date non valide dans le PDF. Utilisez une version corrigée.', sourceReference: reference }); current = undefined; continue; }
      const dateItem = row.find(i => dateValue(i.text));
      const date = dateItem && dateValue(dateItem.text);
      if (date) {
        current = { date, status: 'work', sourceReference: reference };
        days.push(current);
      }
      if (!current) continue;
      const a = read(row, presStart), b = read(row, presEnd);
      const tStart = read(row, tripStart), tEnd = read(row, tripEnd);
      const time = (s: string) => /^\d{1,2}:\d{2}$/.test(s);
      if (date && !time(a) && !time(b)) {
        const statusText = synthetic ? read(row, get('type')[0]) : row.filter(i => i.x > dateHeader.x + dateHeader.width && i.x < origins[0].x - 5).map(i => i.text).join(' ').trim();
        const candidates = new Set(row.filter(i => i.x > dateHeader.x + dateHeader.width && i.x < (origins[0]?.x ?? 180) - 5).map(i => statuses[clean(i.text)]).filter(Boolean));
        const status = statuses[clean(statusText)] || (candidates.size === 1 ? [...candidates][0] : undefined);
        current.status = status || 'absence'; current.absenceLabel = statusText;
        if (!status) warn('STATUS', 'Code de journée inconnu : sélectionnez le bon type et vérifiez la journée.', reference);
        continue;
      }
      if (time(a) || time(b)) {
        const shift = current.shift ||= { kind: 'single', presenceStart: a, presenceEnd: b, blocks: [] };
        current.status = 'work';
        shift.presenceEnd = b;
        shift.blocks.push({ ordinal: shift.blocks.length + 1, start: a, end: b, trips: [] });
        shift.kind = shift.blocks.length > 1 ? 'split' : 'single';
        if (!synthetic) {
          shift.origin ||= read(row, origins[0]); shift.destination = read(row, destinations[0]);
          if (!read(row, origins[0]) || !shift.destination) warn('PRESENCE_ROUTE', 'Lieu de début ou de fin de présence non reconnu : vérifiez les champs.', reference);
        }
        const worked = read(row, workHeader), rr = read(row, get('rr')[0]);
        if (worked) { const value = minutes(worked); if (value === undefined) warn('WORKED', 'Durée de travail non reconnue : vérifiez et complétez la valeur.', reference); else shift.workedMinutes = (shift.workedMinutes || 0) + value; }
        if (rr) { const value = minutes(rr); if (value === undefined) warn('RR', 'Durée de RR non reconnue : vérifiez et complétez la valeur.', reference); else shift.rrMinutes = (shift.rrMinutes || 0) + value; }
        const pay = read(row, payHeader); if (pay) shift.pay = shift.pay ? `${shift.pay} + ${pay}` : pay;
        if (synthetic && clean(read(row, get('type')[0])) === 'spezzato') {
          shift.kind = 'split';
          if (!get('bloc').length) warn('SPLIT', 'Service coupé sans limites explicites : indiquez la fin du premier bloc et le début du second, puis affectez les courses.', reference);
        }
      }
      if (time(tStart) || time(tEnd)) {
        if (!current.shift) { warn('ORPHAN_TRIP', 'Course sans présence reconnue : complétez le service.', reference); continue; }
        const trip: Trip = { start: tStart, end: tEnd, line: read(row, get('ligne')[0]), vehicle: read(row, get('voiture')[0]), origin: read(row, synthetic ? origins[0] : origins[1]), destination: read(row, synthetic ? destinations[0] : destinations[1]) };
        if (synthetic && current.shift.kind === 'split' && get('bloc').length) {
          const ordinal = Number(read(row, get('bloc')[0]));
          if (ordinal !== 1 && ordinal !== 2) warn('BLOCK_ID', 'Numéro de bloc inconnu : vérifiez l’affectation de la course.', reference);
          const id = ordinal === 2 ? 2 : 1;
          let block = current.shift.blocks.find(b => b.ordinal === id);
          if (!block) { block = { ordinal: id, start: trip.start, end: trip.end, trips: [] }; current.shift.blocks.push(block); }
          if (!block.trips.length) block.start = trip.start;
          block.end = trip.end; block.trips.push(trip);
        } else current.shift.blocks.at(-1)!.trips.push(trip);
        if (synthetic) { current.shift.origin ||= trip.origin; current.shift.destination = trip.destination; }
        if (!trip.origin || !trip.destination) warn('ROUTE', 'Origine ou destination de la course non reconnue : vérifiez les champs.', reference);
      } else if (read(row, get('ligne')[0]) && read(row, get('voiture')[0])) {
        warn('TRIP', 'Ligne de course incomplète : vérifiez et saisissez les données manquantes.', reference);
      }
    }
  }
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return { issues: [{ severity: 'error', code: anyText ? 'NO_DAYS' : 'SCAN', message: anyText ? 'Aucune journée reconnue. Sélectionnez un planning au format pris en charge.' : 'Ce PDF ne contient pas de texte lisible. Utilisez un PDF avec du texte ; les documents numérisés ne sont pas encore pris en charge.' }, ...issues] };
  return { schedule: { metadata: { id: crypto.randomUUID(), sourceFileName: filename, importedAt: new Date().toISOString(), coverageStart: sorted[0].date, coverageEnd: sorted.at(-1)!.date }, days: sorted }, issues };
}
