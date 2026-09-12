import { useEffect, useMemo, useRef, useState } from 'react';
import { BusFront, CalendarDays, CalendarArrowDown, ChevronLeft, ChevronRight, FileUp, Languages, Menu, ShieldCheck, Target, X } from 'lucide-react';
import type { ParseResult, Schedule } from './domain/schedule';
import { addDays, formatDate, todayDate } from './domain/time';
import { mergeSchedules, type MergeMode } from './domain/merge';
import { validateSchedule } from './domain/validation';
import { listSchedules, saveSchedule } from './storage/database';
import { parseSchedulePdf } from './parser/schedule-parser';
import { exportScheduleAsIcs } from './export/ics';
import { ImportPreview } from './components/ImportPreview';
import { DayDetail } from './components/DayDetail';
import { intlLocales, isLocale, statusLabel, supportedLocales, translator, type Locale } from './i18n';

export function App() {
  const input = useRef<HTMLInputElement>(null), selectedButton = useRef<HTMLButtonElement>(null);
  const [locale, setLocale] = useState<Locale>(() => { try { const saved = localStorage.getItem('lsd-locale'); return isLocale(saved) ? saved : 'fr'; } catch { return 'fr'; } });
  const t = useMemo(() => translator(locale), [locale]);
  const [schedule, setSchedule] = useState<Schedule>(); const [loading, setLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(false); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResult>(); const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [today, setToday] = useState(todayDate); const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7)); const [detail, setDetail] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('lsd-locale', locale); } catch { /* The choice remains available for this session. */ }
  }, [locale]);
  useEffect(() => {
    let active = true;
    listSchedules().then(saved => { if (active) { setSchedule(saved.find(savedSchedule => savedSchedule.metadata.id === 'active') || saved[0]); setStorageReady(true); } }).catch(() => { if (active) setError(t('error.storage')); }).finally(() => { if (active) setLoading(false); });
    const updateToday = () => setToday(todayDate()); const timer = window.setInterval(updateToday, 60000); document.addEventListener('visibilitychange', updateToday);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', updateToday); };
  }, [t]);

  async function importFile(file?: File) {
    if (!file || busy) return;
    setMenu(false); setError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError(t('error.selectPdf')); return; }
    setBusy(true);
    try { setResult(await parseSchedulePdf(file, locale)); setDetail(false); } catch { setError(t('error.readPdf')); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function confirmImport(incoming: Schedule, mode: MergeMode) {
    if (validateSchedule(incoming, locale).some(issue => issue.severity === 'error')) throw new Error(t('error.fixBeforeSave'));
    const next = mergeSchedules(schedule, incoming, mode, locale);
    try { await saveSchedule(next); } catch { throw new Error(t('error.save')); }
    setSchedule(next); setResult(undefined); setSelected(today); setMonth(today.slice(0, 7)); setDetail(false);
  }
  function exportIcs() {
    if (!schedule) return;
    try {
      const url = URL.createObjectURL(exportScheduleAsIcs(schedule, locale)); const link = document.createElement('a');
      link.href = url; link.download = `LSD-${schedule.metadata.coverageStart}-${schedule.metadata.coverageEnd}.ics`; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 10000); setMenu(false);
    } catch { setError(t('error.export')); }
  }
  const first = `${month}-01`, offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const daysByDate = new Map(schedule?.days.map(day => [day.date, day]));
  const weekdays = Array.from({ length: 7 }, (_, index) => formatDate(addDays('2024-01-01', index), { weekday: 'short' }, locale));
  function moveMonth(delta: number) { const date = new Date(`${first}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); setMonth(date.toISOString().slice(0, 7)); }
  function closeDetail() { setDetail(false); setMonth(selected.slice(0, 7)); window.setTimeout(() => selectedButton.current?.focus(), 0); }

  return <main className="app-shell">
    <header className="brand"><div className="brand-mark" aria-hidden="true">LSD</div><div className="brand-copy"><p className="eyebrow">Lausanne Shift Discovery</p><h1>{t('brand.tagline')}</h1></div><div className="header-actions"><label className="language-picker"><span className="visually-hidden">{t('language.label')}</span><Languages aria-hidden="true" /><select aria-label={t('language.label')} value={locale} onChange={event => setLocale(event.target.value as Locale)}>{supportedLocales.map(code => <option key={code} value={code}>{code.toUpperCase()}</option>)}</select></label>{schedule && !result && <button aria-label={menu ? t('menu.close') : t('menu.open')} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>}</div></header>
    <input ref={input} className="visually-hidden" aria-label={t('import.input')} type="file" accept="application/pdf,.pdf" disabled={busy || loading || !storageReady} onChange={event => void importFile(event.target.files?.[0])} />
    {error && <p role="alert" className="notice error">{error}</p>}
    {loading && <p role="status">{t('loading.schedule')}</p>}
    {busy && <p className="notice" role="status">{t('loading.pdf')}</p>}
    {menu && !result && <section className="panel menu-panel" aria-label={t('menu.label')}><button disabled={busy} onClick={() => input.current?.click()}><FileUp />{t('menu.update')}</button><button onClick={exportIcs}><CalendarArrowDown />{t('menu.export')}</button><p className="muted small">{t('menu.exportHelp')}</p>{schedule && <details><summary>{t('menu.savedImports')}</summary>{(schedule.imports || [schedule.metadata]).map((item, index) => <p key={index} className="small filename">{item.sourceFileName}<br />{formatDate(item.coverageStart, undefined, locale)} – {formatDate(item.coverageEnd, undefined, locale)}<br />{t('menu.importedOn', { date: new Intl.DateTimeFormat(intlLocales[locale]).format(new Date(item.importedAt)) })}</p>)}</details>}</section>}
    {result ? <ImportPreview result={result} hasSchedule={!!schedule} locale={locale} onCancel={() => setResult(undefined)} onSave={confirmImport} /> : !loading && !schedule ? <section className="panel onboarding" aria-labelledby="import-title"><div className="hero-icon"><CalendarDays /></div><p className="eyebrow">{t('onboarding.eyebrow')}</p><h2 id="import-title">{t('onboarding.title1')}<br />{t('onboarding.title2')}</h2><p className="intro">{t('onboarding.intro')}</p><button className="primary-action" disabled={busy || !storageReady} onClick={() => input.current?.click()}><FileUp />{t('onboarding.action')}</button><p className="privacy-note"><ShieldCheck />{t('privacy.localFile')}</p></section> : schedule && <>
      {detail ? <DayDetail date={selected} day={daysByDate.get(selected)} locale={locale} onClose={closeDetail} onMove={dayOffset => setSelected(addDays(selected, dayOffset))} /> : <section className="panel calendar" aria-labelledby="month-title">
        <div className="section-heading"><div><p className="eyebrow">{t('calendar.eyebrow')}</p><h2 id="month-title">{formatDate(first, { month: 'long', year: 'numeric' }, locale)}</h2></div><button onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}><Target />{t('calendar.today')}</button></div>
        <div className="toolbar"><p className="muted small">{t('calendar.hint')}</p><div className="actions"><button aria-label={t('calendar.previousMonth')} onClick={() => moveMonth(-1)}><ChevronLeft /></button><button aria-label={t('calendar.nextMonth')} onClick={() => moveMonth(1)}><ChevronRight /></button></div></div>
        <div className="calendar-grid"><div className="weekdays">{weekdays.map((day, index) => <span key={index}>{day}</span>)}</div><div className="dates">{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: total }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`, day = daysByDate.get(date), marker = day ? day.status !== 'work' ? 'R' : day.shift?.kind === 'split' ? '2' : '1' : '';
          const status = day ? day.status === 'work' ? day.shift?.kind === 'split' ? t('calendar.splitStatus') : t('calendar.singleStatus') : statusLabel(day.status, locale) : t('calendar.noSchedule');
          return <button key={date} ref={date === selected ? selectedButton : undefined} className={`day ${day ? '' : 'outside'} ${date === today ? 'today' : ''} ${date === selected ? 'selected' : ''}`} aria-current={date === today ? 'date' : undefined} aria-label={`${formatDate(date, undefined, locale)}, ${status}`} onClick={() => { setSelected(date); setDetail(true); }}><span className="day-number">{index + 1}</span><span className={`badge ${marker === '2' ? 'split' : marker === 'R' ? 'rest' : ''}`} aria-hidden="true">{marker || '·'}</span></button>;
        })}</div></div>
        <div className="legend"><span><b>1</b> {t('calendar.legendSingle')}</span><span><b>2</b> {t('calendar.legendSplit')}</span><span><b>R</b> {t('calendar.legendRest')}</span></div>
        <div className="coverage"><BusFront /><span>{t('calendar.coverage', { start: formatDate(schedule.metadata.coverageStart, undefined, locale), end: formatDate(schedule.metadata.coverageEnd, undefined, locale) })}</span></div>
        {!schedule.days.some(day => day.date.startsWith(month)) && <div className="empty-month"><p>{t('calendar.emptyMonth')}</p><button onClick={() => setMonth(schedule.metadata.coverageStart.slice(0, 7))}>{t('calendar.showImported')}</button></div>}
      </section>}
      <p className="privacy-note"><ShieldCheck />{t('privacy.savedOffline')}</p>
    </>}
    <footer>LSD <span>·</span> Lausanne Shift Discovery</footer>
  </main>;
}
