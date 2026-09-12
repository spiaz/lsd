import { BusFront, CalendarDays, ChevronLeft, ChevronRight, Clock3, Coffee, Route, Signpost } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ScheduleDay } from '../domain/schedule';
import { displayTime, duration, formatDate, timeMinutes } from '../domain/time';
import { statusLabel, translator, type Locale } from '../i18n';
export function DayDetail({ date, day, locale, onClose, onMove }: { date: string; day?: ScheduleDay; locale: Locale; onClose: () => void; onMove: (offset: number) => void }) {
  const t = translator(locale);
  const heading = useRef<HTMLHeadingElement>(null), touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { heading.current?.focus(); }, [date]);
  useEffect(() => { const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, [onClose]);
  const shift = day?.status === 'work' ? day.shift : undefined;
  return <section className="panel day-detail" aria-labelledby="day-title" onTouchStart={e => { if (e.touches.length === 1) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => {
    if (!touch.current || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y; touch.current = null;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.5) onMove(dx < 0 ? 1 : -1);
  }}>
    <div className="toolbar"><button onClick={onClose}><CalendarDays />{t('day.calendar')}</button><div className="actions"><button aria-label={t('day.previous')} onClick={() => onMove(-1)}><ChevronLeft /></button><button aria-label={t('day.next')} onClick={() => onMove(1)}><ChevronRight /></button></div></div>
    <p className="eyebrow">{formatDate(date, { weekday: 'long' }, locale)}</p>
    <div className="day-heading"><h2 id="day-title" tabIndex={-1}>{formatDate(date, undefined, locale)}</h2>{shift?.pay && <div className="pay-highlight">{t('day.pay', { pay: shift.pay })}</div>}</div>
    <div className="shift-label">{shift ? <BusFront /> : <Coffee />}<span>{shift ? shift.kind === 'split' ? t('shift.split') : t('shift.single') : day ? statusLabel(day.status, locale) : t('day.none')}</span></div>
    {!shift && <p className="muted">{day ? day.absenceLabel || t('day.noShift') : t('day.notImported')}</p>}
    {shift && <>
      <div className="metrics"><div><span><Clock3 />{t('day.presence')}</span><strong>{displayTime(shift.presenceStart)} – {displayTime(shift.presenceEnd)}</strong></div><div><span>{t('day.work')}</span><strong>{duration(shift.workedMinutes)}</strong></div><div><span><Coffee />RR</span><strong>{duration(shift.rrMinutes)}</strong></div><div><span><Route />{t('day.presencePlaces')}</span><strong>{shift.origin || '—'} → {shift.destination || '—'}</strong></div></div>
      {shift.blocks.map((block, i) => <div key={i}>
        {i > 0 && <p className="pause"><Coffee /> {t('day.pause', { duration: duration(timeMinutes(block.start) - timeMinutes(shift.blocks[i - 1].end)) })}</p>}
        <section className="block" aria-label={t('day.block', { number: i + 1 })}><div className="section-heading"><h3>{shift.kind === 'split' ? t('day.block', { number: i + 1 }) : t('day.yourTrips')}</h3><span className="muted">{displayTime(block.start)} – {displayTime(block.end)}</span></div>
          {!block.trips.length && <p className="muted">{t('day.noTrip')}</p>}
          {block.trips.map((trip, j) => <article className="trip" key={j}><div className="trip-time"><strong>{displayTime(trip.start)}</strong><span>{displayTime(trip.end)}</span></div><div className="trip-route"><strong>{trip.origin || t('day.unknownOrigin')} → {trip.destination || t('day.unknownDestination')}</strong><div className="trip-meta"><span><Signpost />{trip.line || t('day.unknownLine')}</span><span><BusFront />{trip.vehicle || t('day.unknownVehicle')}</span></div></div></article>)}
        </section>
      </div>)}
      <p className="muted small">{t('day.nextDayHelp')}</p>
    </>}
  </section>;
}
