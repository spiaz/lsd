import { statusLabels, type ScheduleDay, type ShiftBlock, type Trip, type WorkShift } from '../domain/schedule';
interface Props { day: ScheduleDay; onChange: (day: ScheduleDay) => void; onDelete: () => void }
const emptyBlock = (ordinal: number): ShiftBlock => ({ ordinal, start: '', end: '', trips: [] });
const emptyShift = (): WorkShift => ({ kind: 'single', presenceStart: '', presenceEnd: '', blocks: [emptyBlock(1)] });
export function DayEditor({ day, onChange, onDelete }: Props) {
  const shift = day.shift;
  const updateShift = (patch: Partial<WorkShift>) => onChange({ ...day, shift: { ...(shift || emptyShift()), ...patch } });
  const updateBlock = (index: number, patch: Partial<ShiftBlock>) => updateShift({ blocks: shift!.blocks.map((b, i) => i === index ? { ...b, ...patch } : b) });
  const field = (label: string, value: string, change: (value: string) => void, type = 'text') => <label>{label}<input type={type} value={value} onChange={e => change(e.target.value)} /></label>;
  return <div className="editor">
    <div className="fields">
      {field('Date', day.date, date => onChange({ ...day, date }), 'date')}
      <label>Statut<select value={day.status} onChange={e => onChange({ ...day, status: e.target.value as ScheduleDay['status'], shift: e.target.value === 'work' ? shift || emptyShift() : undefined })}>{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    </div>
    {day.absenceLabel && <p className="muted">Indication dans le PDF: {day.absenceLabel}</p>}
    {day.status === 'work' && shift && <>
      <label>Type de service<select value={shift.kind} onChange={e => {
        const kind = e.target.value as WorkShift['kind'];
        const blocks = kind === 'split' ? shift.blocks.length === 1 ? [...shift.blocks, emptyBlock(2)] : shift.blocks : [{ ...shift.blocks[0], ordinal: 1, start: shift.presenceStart, end: shift.presenceEnd, trips: shift.blocks.flatMap(b => b.trips) }];
        updateShift({ kind, blocks });
      }}><option value="single">SERVICE SIMPLE</option><option value="split">SERVICE COUPÉ</option></select></label>
      <p className="muted">Horaires au format HH:MM. Pour le lendemain, utilisez 24:00, 25:31…</p>
      <div className="fields">
        {field('Début de présence', shift.presenceStart, presenceStart => updateShift({ presenceStart }))}
        {field('Fin de présence', shift.presenceEnd, presenceEnd => updateShift({ presenceEnd }))}
        {field('Lieu de début de présence', shift.origin || '', origin => updateShift({ origin }))}
        {field('Lieu de fin de présence', shift.destination || '', destination => updateShift({ destination }))}
        {field('Travail (minutes)', shift.workedMinutes?.toString() || '', value => updateShift({ workedMinutes: value === '' ? undefined : Number(value) }), 'number')}
        {field('RR (minutes)', shift.rrMinutes?.toString() || '', value => updateShift({ rrMinutes: value === '' ? undefined : Number(value) }), 'number')}
      </div>
      {shift.kind === 'split' && shift.blocks.length < 2 && <button type="button" onClick={() => updateShift({ blocks: [...shift.blocks, emptyBlock(2)] })}>Ajouter un second bloc</button>}
      {shift.blocks.map((block, i) => <fieldset key={i}><legend>Bloc {i + 1}</legend><div className="fields">
        {field('Début du bloc', block.start, start => updateBlock(i, { start }))}
        {field('Fin du bloc', block.end, end => updateBlock(i, { end }))}
      </div>
        {block.trips.map((trip, j) => {
          const updateTrip = (patch: Partial<Trip>) => updateBlock(i, { trips: block.trips.map((t, k) => j === k ? { ...t, ...patch } : t) });
          return <fieldset key={j}><legend>Course {j + 1}</legend><div className="fields">
            {field('Départ', trip.start, start => updateTrip({ start }))}{field('Arrivée', trip.end, end => updateTrip({ end }))}
            {field('De', trip.origin || '', origin => updateTrip({ origin }))}{field('À', trip.destination || '', destination => updateTrip({ destination }))}
            {field('Ligne', trip.line || '', line => updateTrip({ line }))}{field('Véhicule', trip.vehicle || '', vehicle => updateTrip({ vehicle }))}
          </div><div className="actions">
            {shift.blocks.length === 2 && <button type="button" onClick={() => updateShift({ blocks: shift.blocks.map((b, k) => k === i ? { ...b, trips: b.trips.filter((_, n) => n !== j) } : { ...b, trips: [...b.trips, trip].sort((a, b) => a.start.localeCompare(b.start, undefined, { numeric: true })) }) })}>Déplacer vers l’autre bloc</button>}
            <button type="button" className="danger" onClick={() => updateBlock(i, { trips: block.trips.filter((_, k) => k !== j) })}>Supprimer la course {j + 1}</button>
          </div></fieldset>;
        })}
        <button type="button" onClick={() => updateBlock(i, { trips: [...block.trips, { start: '', end: '' }] })}>Ajouter une course</button>
        {shift.blocks.length > 2 && <button type="button" className="danger" onClick={() => updateShift({ blocks: shift.blocks.filter((_, k) => k !== i).map((b, k) => ({ ...b, ordinal: k + 1 })) })}>Supprimer le bloc</button>}
      </fieldset>)}
    </>}
    <button type="button" className="danger" onClick={onDelete}>Supprimer cette journée de l’import</button>
  </div>;
}
