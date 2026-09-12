import { BusFront, CalendarDays, ChevronLeft, ChevronRight, Clock3, Coffee, Route, Signpost } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { statusLabels, type ScheduleDay } from '../domain/schedule';
import { displayTime, duration, formatDate, timeMinutes } from '../domain/time';
export function DayDetail({ date, day, onClose, onMove }: { date: string; day?: ScheduleDay; onClose: () => void; onMove: (offset: number) => void }) {
  const heading = useRef<HTMLHeadingElement>(null), touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { heading.current?.focus(); }, [date]);
  useEffect(() => { const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, [onClose]);
  const shift = day?.status === 'work' ? day.shift : undefined;
  return <section className="panel day-detail" aria-labelledby="day-title" onTouchStart={e => { if (e.touches.length === 1) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => {
    if (!touch.current || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y; touch.current = null;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) onMove(dx < 0 ? 1 : -1);
  }}>
    <div className="toolbar"><button onClick={onClose}><CalendarDays />Calendrier</button><div className="actions"><button aria-label="Jour précédent" onClick={() => onMove(-1)}><ChevronLeft /></button><button aria-label="Jour suivant" onClick={() => onMove(1)}><ChevronRight /></button></div></div>
    <p className="eyebrow">{formatDate(date, { weekday: 'long' })}</p><h2 id="day-title" tabIndex={-1}>{formatDate(date)}</h2>
    <div className="shift-label">{shift ? <BusFront /> : <Coffee />}<span>{shift ? shift.kind === 'split' ? 'SERVICE COUPÉ' : 'SERVICE SIMPLE' : day ? statusLabels[day.status] : 'Aucun planning'}</span></div>
    {!shift && <p className="muted">{day ? day.absenceLabel || 'Aucun service prévu.' : 'Aucun service importé pour cette journée.'}</p>}
    {shift && <>
      <div className="metrics"><div><span><Clock3 />Présence</span><strong>{displayTime(shift.presenceStart)} – {displayTime(shift.presenceEnd)}</strong></div><div><span>Travail</span><strong>{duration(shift.workedMinutes)}</strong></div><div><span><Coffee />RR</span><strong>{duration(shift.rrMinutes)}</strong></div><div><span><Route />Lieux de présence</span><strong>{shift.origin || '—'} → {shift.destination || '—'}</strong></div></div>
      {shift.blocks.map((block, i) => <div key={i}>
        {i > 0 && <p className="pause"><Coffee /> Pause entre les blocs: {duration(timeMinutes(block.start) - timeMinutes(shift.blocks[i - 1].end))}</p>}
        <section className="block" aria-label={`Bloc ${i + 1}`}><div className="section-heading"><h3>{shift.kind === 'split' ? `Bloc ${i + 1}` : 'Vos courses'}</h3><span className="muted">{displayTime(block.start)} – {displayTime(block.end)}</span></div>
          {!block.trips.length && <p className="muted">Aucun détail de course disponible.</p>}
          {block.trips.map((trip, j) => <article className="trip" key={j}><div className="trip-time"><strong>{displayTime(trip.start)}</strong><span>{displayTime(trip.end)}</span></div><div className="trip-route"><strong>{trip.origin || 'Origine indisponible'} → {trip.destination || 'Destination indisponible'}</strong><div className="trip-meta"><span><Signpost />{trip.line || 'Ligne non indiquée'}</span><span><BusFront />{trip.vehicle || 'Véhicule non indiqué'}</span></div></div></article>)}
        </section>
      </div>)}
      {shift.pay && <details><summary>Autres informations du PDF</summary><p>Rémunération indiquée: {shift.pay}</p></details>}
      <p className="muted small">Les horaires avec (+1) correspondent au lendemain.</p>
    </>}
  </section>;
}
