import type { ScheduleDay, ShiftBlock, Trip, WorkShift } from '../domain/schedule';
import { statusLabel, translator, type Locale } from '../i18n';
interface Props { day: ScheduleDay; locale: Locale; onChange: (day: ScheduleDay) => void; onDelete: () => void }
const emptyBlock = (ordinal: number): ShiftBlock => ({ ordinal, start: '', end: '', trips: [] });
const emptyShift = (): WorkShift => ({ kind: 'single', presenceStart: '', presenceEnd: '', blocks: [emptyBlock(1)] });
export function DayEditor({ day, locale, onChange, onDelete }: Props) {
  const t = translator(locale);
  const shift = day.shift;
  const updateShift = (patch: Partial<WorkShift>) => onChange({ ...day, shift: { ...(shift || emptyShift()), ...patch } });
  const updateBlock = (index: number, patch: Partial<ShiftBlock>) => updateShift({ blocks: shift!.blocks.map((b, i) => i === index ? { ...b, ...patch } : b) });
  const field = (label: string, value: string, change: (value: string) => void, type = 'text') => <label>{label}<input type={type} value={value} onChange={e => change(e.target.value)} /></label>;
  return <div className="editor">
    <div className="fields">
      {field(t('editor.date'), day.date, date => onChange({ ...day, date }), 'date')}
      <label>{t('editor.status')}<select value={day.status} onChange={e => onChange({ ...day, status: e.target.value as ScheduleDay['status'], shift: e.target.value === 'work' ? shift || emptyShift() : undefined })}>{(['work', 'rest', 'absence', 'holiday', 'compensatory-rest'] as ScheduleDay['status'][]).map(status => <option key={status} value={status}>{statusLabel(status, locale)}</option>)}</select></label>
    </div>
    {day.absenceLabel && <p className="muted">{t('editor.pdfLabel', { label: day.absenceLabel })}</p>}
    {day.status === 'work' && shift && <>
      <label>{t('editor.shiftType')}<select value={shift.kind} onChange={e => {
        const kind = e.target.value as WorkShift['kind'];
        const blocks = kind === 'split' ? shift.blocks.length === 1 ? [...shift.blocks, emptyBlock(2)] : shift.blocks : [{ ...shift.blocks[0], ordinal: 1, start: shift.presenceStart, end: shift.presenceEnd, trips: shift.blocks.flatMap(b => b.trips) }];
        updateShift({ kind, blocks });
      }}><option value="single">{t('shift.single')}</option><option value="split">{t('shift.split')}</option></select></label>
      <p className="muted">{t('editor.timeHelp')}</p>
      <div className="fields">
        {field(t('editor.presenceStart'), shift.presenceStart, presenceStart => updateShift({ presenceStart }))}
        {field(t('editor.presenceEnd'), shift.presenceEnd, presenceEnd => updateShift({ presenceEnd }))}
        {field(t('editor.presenceOrigin'), shift.origin || '', origin => updateShift({ origin }))}
        {field(t('editor.presenceDestination'), shift.destination || '', destination => updateShift({ destination }))}
        {field(t('editor.workMinutes'), shift.workedMinutes?.toString() || '', value => updateShift({ workedMinutes: value === '' ? undefined : Number(value) }), 'number')}
        {field(t('editor.rrMinutes'), shift.rrMinutes?.toString() || '', value => updateShift({ rrMinutes: value === '' ? undefined : Number(value) }), 'number')}
      </div>
      {shift.kind === 'split' && shift.blocks.length < 2 && <button type="button" onClick={() => updateShift({ blocks: [...shift.blocks, emptyBlock(2)] })}>{t('editor.addSecondBlock')}</button>}
      {shift.blocks.map((block, i) => <fieldset key={i}><legend>{t('day.block', { number: i + 1 })}</legend><div className="fields">
        {field(t('editor.blockStart'), block.start, start => updateBlock(i, { start }))}
        {field(t('editor.blockEnd'), block.end, end => updateBlock(i, { end }))}
      </div>
        {block.trips.map((trip, j) => {
          const updateTrip = (patch: Partial<Trip>) => updateBlock(i, { trips: block.trips.map((t, k) => j === k ? { ...t, ...patch } : t) });
          return <fieldset key={j}><legend>{t('editor.trip', { number: j + 1 })}</legend><div className="fields">
            {field(t('editor.departure'), trip.start, start => updateTrip({ start }))}{field(t('editor.arrival'), trip.end, end => updateTrip({ end }))}
            {field(t('editor.from'), trip.origin || '', origin => updateTrip({ origin }))}{field(t('editor.to'), trip.destination || '', destination => updateTrip({ destination }))}
            {field(t('editor.line'), trip.line || '', line => updateTrip({ line }))}{field(t('editor.vehicle'), trip.vehicle || '', vehicle => updateTrip({ vehicle }))}
          </div><div className="actions">
            {shift.blocks.length === 2 && <button type="button" onClick={() => updateShift({ blocks: shift.blocks.map((b, k) => k === i ? { ...b, trips: b.trips.filter((_, n) => n !== j) } : { ...b, trips: [...b.trips, trip].sort((a, b) => a.start.localeCompare(b.start, undefined, { numeric: true })) }) })}>{t('editor.moveTrip')}</button>}
            <button type="button" className="danger" onClick={() => updateBlock(i, { trips: block.trips.filter((_, k) => k !== j) })}>{t('editor.deleteTrip', { number: j + 1 })}</button>
          </div></fieldset>;
        })}
        <button type="button" onClick={() => updateBlock(i, { trips: [...block.trips, { start: '', end: '' }] })}>{t('editor.addTrip')}</button>
        {shift.blocks.length > 2 && <button type="button" className="danger" onClick={() => updateShift({ blocks: shift.blocks.filter((_, k) => k !== i).map((b, k) => ({ ...b, ordinal: k + 1 })) })}>{t('editor.deleteBlock')}</button>}
      </fieldset>)}
    </>}
    <button type="button" className="danger" onClick={onDelete}>{t('editor.deleteDay')}</button>
  </div>;
}
