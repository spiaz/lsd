import { BusFront, CalendarDays, Clock3, Coffee, Hash, Route, Signpost, Timer, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { ScheduleDay } from '../domain/schedule';
import { addDays, displayTime, duration, formatDate, timeMinutes } from '../domain/time';
import { statusLabel, translator, type Locale } from '../i18n';

type Props = {
  date: string;
  days: ScheduleDay[];
  coverageStart: string;
  coverageEnd: string;
  locale: Locale;
  onClose: () => void;
  onDateChange: (date: string) => void;
};

function distance(touches: TouchList) {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function DayCard({ date, day, locale }: { date: string; day?: ScheduleDay; locale: Locale }) {
  const t = translator(locale);
  const shift = day?.status === 'work' ? day.shift : undefined;
  const daySpan = shift ? timeMinutes(shift.presenceEnd) - timeMinutes(shift.presenceStart) : undefined;
  return <article className="day-card" data-date={date} aria-label={formatDate(date, undefined, locale)}>
    <div className="day-card-heading">
      <div><p className="eyebrow">{formatDate(date, { weekday: 'long' }, locale)}</p><h2>{formatDate(date, undefined, locale)}</h2></div>
      {shift && <span className={`shift-kind-pill ${shift.kind}`}><BusFront />{shift.kind === 'split' ? t('day.blocks', { count: shift.blocks.length }) : t('day.oneBlock')}</span>}
    </div>
    <div className="shift-label">{shift ? <BusFront /> : <Coffee />}<span>{shift ? shift.kind === 'split' ? t('shift.split') : t('shift.single') : day ? statusLabel(day.status, locale) : t('day.none')}</span>{shift?.serviceId && <strong className="service-id"><Hash />{shift.serviceId}</strong>}</div>
    {!shift && <p className="muted">{day ? day.absenceLabel || t('day.noShift') : t('day.notImported')}</p>}
    {shift && <>
      <div className="day-metrics">
        <div className="wide"><span><Clock3 />{t('day.presence')}</span><strong>{displayTime(shift.presenceStart)} – {displayTime(shift.presenceEnd)}</strong></div>
        <div><span><Hash />ID</span><strong>{shift.serviceId || '—'}</strong></div>
        <div><span><Timer />{t('day.work')}</span><strong>{duration(shift.workedMinutes)}</strong></div>
        <div><span><Coffee />RR</span><strong>{duration(shift.rrMinutes)}</strong></div>
        <div><span><WalletCards />{t('day.payLabel')}</span><strong>{shift.pay || '—'}</strong></div>
        <div><span><Clock3 />{t('day.total')}</span><strong>{duration(daySpan)}</strong></div>
        <div className="wide route-metric"><span><Route />{t('day.presencePlaces')}</span><strong>{shift.origin || '—'} → {shift.destination || '—'}</strong></div>
      </div>
      {shift.blocks.map((block, i) => <div key={i}>
        {i > 0 && <div className="pause"><Coffee /><span>{t('day.pauseLabel')}</span><strong>{duration(timeMinutes(block.start) - timeMinutes(shift.blocks[i - 1].end))}</strong></div>}
        <section className={`block ${shift.kind === 'split' ? 'split-block' : ''}`} aria-label={t('day.block', { number: i + 1 })}><div className="section-heading"><h3>{shift.kind === 'split' && <b className="block-number">{i + 1}</b>}{shift.kind === 'split' ? t('day.block', { number: i + 1 }) : t('day.yourTrips')}</h3><strong className="block-time">{displayTime(block.start)} – {displayTime(block.end)}</strong></div>
          {!block.trips.length && <p className="muted">{t('day.noTrip')}</p>}
          {block.trips.map((trip, j) => <article className="trip" key={j}><div className="trip-time"><strong>{displayTime(trip.start)}</strong><span>{displayTime(trip.end)}</span></div><div className="trip-route"><strong>{trip.origin || t('day.unknownOrigin')} → {trip.destination || t('day.unknownDestination')}</strong><div className="trip-meta"><span><Signpost />{trip.line || t('day.unknownLine')}</span><span><BusFront />{trip.vehicle || t('day.unknownVehicle')}</span></div></div></article>)}
        </section>
      </div>)}
    </>}
  </article>;
}

export function DayDetail({ date, days, coverageStart, coverageEnd, locale, onClose, onDateChange }: Props) {
  const t = translator(locale);
  const view = useRef<HTMLElement>(null);
  const initialDate = useRef(date);
  const lastReportedDate = useRef(date);
  const pinchStart = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const daysByDate = useMemo(() => new Map(days.map(day => [day.date, day])), [days]);
  const dates = useMemo(() => {
    const output: string[] = [];
    for (let current = coverageStart; current <= coverageEnd; current = addDays(current, 1)) output.push(current);
    if (initialDate.current < coverageStart) output.unshift(initialDate.current);
    if (initialDate.current > coverageEnd) output.push(initialDate.current);
    return output;
  }, [coverageEnd, coverageStart]);

  useEffect(() => {
    const target = view.current?.querySelector<HTMLElement>(`[data-date="${initialDate.current}"]`);
    // jsdom (used by the test suite) does not implement scrolling APIs.
    // Guarding this also keeps the detail view usable in limited web views.
    target?.scrollIntoView?.({ block: 'start' });
  }, []);

  useEffect(() => {
    const element = view.current;
    if (!element) return;
    const onTouchStart = (event: TouchEvent) => { if (event.touches.length === 2) pinchStart.current = distance(event.touches); };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStart.current) return;
      event.preventDefault();
      const current = distance(event.touches);
      if (current / pinchStart.current < 0.72) { pinchStart.current = null; onClose(); }
    };
    const onTouchEnd = () => { pinchStart.current = null; };
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { element.removeEventListener('touchstart', onTouchStart); element.removeEventListener('touchmove', onTouchMove); element.removeEventListener('touchend', onTouchEnd); };
  }, [onClose]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  function updateCurrentDate() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const container = view.current;
      if (!container) return;
      const top = container.getBoundingClientRect().top + 86;
      const cards = [...container.querySelectorAll<HTMLElement>('[data-date]')];
      const nearest = cards.reduce<HTMLElement | undefined>((best, card) => !best || Math.abs(card.getBoundingClientRect().top - top) < Math.abs(best.getBoundingClientRect().top - top) ? card : best, undefined);
      const currentDate = nearest?.dataset.date;
      if (currentDate && currentDate !== lastReportedDate.current) {
        lastReportedDate.current = currentDate;
        onDateChange(currentDate);
      }
    });
  }

  return <section ref={view} className="day-stream" aria-label={t('day.calendar')} onScroll={updateCurrentDate}>
    <header className="day-stream-header"><button onClick={onClose}><CalendarDays />{t('day.calendar')}</button><span>{formatDate(date, { month: 'long', year: 'numeric' }, locale)}</span></header>
    <div className="day-stream-list">{dates.map(itemDate => <DayCard key={itemDate} date={itemDate} day={daysByDate.get(itemDate)} locale={locale} />)}</div>
  </section>;
}
