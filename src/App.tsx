import { useEffect, useRef, useState } from 'react';
import { BusFront, CalendarDays, CalendarArrowDown, ChevronLeft, ChevronRight, FileUp, Menu, ShieldCheck, Target, X } from 'lucide-react';
import type { ParseResult, Schedule } from './domain/schedule';
import { statusLabels } from './domain/schedule';
import { addDays, formatDate, todayDate } from './domain/time';
import { mergeSchedules, type MergeMode } from './domain/merge';
import { validateSchedule } from './domain/validation';
import { listSchedules, saveSchedule } from './storage/database';
import { parseSchedulePdf } from './parser/schedule-parser';
import { exportScheduleAsIcs } from './export/ics';
import { ImportPreview } from './components/ImportPreview';
import { DayDetail } from './components/DayDetail';
export function App() {
  const input = useRef<HTMLInputElement>(null), selectedButton = useRef<HTMLButtonElement>(null);
  const [schedule, setSchedule] = useState<Schedule>(); const [loading, setLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(false); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResult>(); const [error, setError] = useState('');
  const [menu, setMenu] = useState(false); const [install, setInstall] = useState(() => { try { return !localStorage.getItem('lsd-install-dismissed'); } catch { return true; } });
  const [today, setToday] = useState(todayDate); const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7)); const [detail, setDetail] = useState(false);
  useEffect(() => {
    let active = true;
    listSchedules().then(saved => { if (active) { setSchedule(saved.find(s => s.metadata.id === 'active') || saved[0]); setStorageReady(true); } }).catch(() => { if (active) setError('Stockage local indisponible. Autorisez le stockage dans votre navigateur et rechargez l’application.'); }).finally(() => { if (active) setLoading(false); });
    const updateToday = () => setToday(todayDate()); const timer = window.setInterval(updateToday, 60000); document.addEventListener('visibilitychange', updateToday);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', updateToday); };
  }, []);
  async function importFile(file?: File) {
    if (!file || busy) return;
    setMenu(false); setError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError('Sélectionnez un fichier PDF.'); return; }
    setBusy(true);
    try { setResult(await parseSchedulePdf(file)); setDetail(false); } catch { setError('Lecture du PDF impossible. Essayez un autre fichier.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function confirmImport(incoming: Schedule, mode: MergeMode) {
    if (validateSchedule(incoming).some(i => i.severity === 'error')) throw new Error('Corrigez les anomalies avant d’enregistrer.');
    const next = mergeSchedules(schedule, incoming, mode);
    try { await saveSchedule(next); } catch { throw new Error('Échec de l’enregistrement. Le planning précédent est conservé. Vérifiez l’espace disponible sur votre appareil.'); }
    setSchedule(next); setResult(undefined); setSelected(today); setMonth(today.slice(0, 7)); setDetail(false);
  }
  function exportIcs() {
    if (!schedule) return;
    try {
      const url = URL.createObjectURL(exportScheduleAsIcs(schedule)); const link = document.createElement('a');
      link.href = url; link.download = `LSD-${schedule.metadata.coverageStart}-${schedule.metadata.coverageEnd}.ics`; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 10000); setMenu(false);
    } catch { setError('Le planning contient des données non valides pour l’export. Importez une version corrigée.'); }
  }
  const first = `${month}-01`, offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const daysByDate = new Map(schedule?.days.map(d => [d.date, d]));
  function moveMonth(delta: number) { const d = new Date(`${first}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + delta); setMonth(d.toISOString().slice(0, 7)); }
  function closeDetail() { setDetail(false); setMonth(selected.slice(0, 7)); window.setTimeout(() => selectedButton.current?.focus(), 0); }
  return <main className="app-shell">
    <header className="brand"><div className="brand-mark" aria-hidden="true">LSD</div><div className="brand-copy"><p className="eyebrow">Lausanne Shift Discovery</p><h1>A smoother trip through every shift.</h1></div>{schedule && !result && <button aria-label={menu ? 'Fermer le menu du planning' : 'Ouvrir le menu du planning'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>}</header>
    <input ref={input} className="visually-hidden" aria-label="Importer le PDF du planning" type="file" accept="application/pdf,.pdf" disabled={busy || loading || !storageReady} onChange={e => void importFile(e.target.files?.[0])} />
    {error && <p role="alert" className="notice error">{error}</p>}
    {loading && <p role="status">Ouverture du planning…</p>}
    {busy && <p className="notice" role="status">Lecture du PDF sur votre appareil…</p>}
    {menu && !result && <section className="panel menu-panel" aria-label="Menu planning"><button disabled={busy} onClick={() => input.current?.click()}><FileUp />Mettre à jour le planning</button><button onClick={exportIcs}><CalendarArrowDown />Exporter le calendrier (.ics)</button><button onClick={() => { setInstall(true); setMenu(false); }}>Comment installer LSD</button><p className="muted small">L’export est un instantané du planning : après une révision, mettez à jour ou remplacez votre import dans le calendrier. Les services coupés génèrent un événement par bloc.</p>{schedule && <details><summary>Imports enregistrés</summary>{(schedule.imports || [schedule.metadata]).map((item, i) => <p key={i} className="small filename">{item.sourceFileName}<br />{formatDate(item.coverageStart)} – {formatDate(item.coverageEnd)}<br />Importé le {new Date(item.importedAt).toLocaleDateString('fr-CH')}</p>)}</details>}</section>}
    {result ? <ImportPreview result={result} hasSchedule={!!schedule} onCancel={() => setResult(undefined)} onSave={confirmImport} /> : !loading && !schedule ? <section className="panel onboarding" aria-labelledby="import-title"><div className="hero-icon"><CalendarDays /></div><p className="eyebrow">Votre prochain service en un coup d’œil</p><h2 id="import-title">Votre planning devient<br />votre calendrier.</h2><p className="intro">Importez le PDF de vos services. Vérifiez le résultat et retrouvez horaires, courses et repos, même sans connexion.</p><button className="primary-action" disabled={busy || !storageReady} onClick={() => input.current?.click()}><FileUp />Importer le PDF de votre planning</button><p className="privacy-note"><ShieldCheck />Le fichier reste sur votre appareil. Aucun compte.</p></section> : schedule && <>
      {detail ? <DayDetail date={selected} day={daysByDate.get(selected)} onClose={closeDetail} onMove={n => setSelected(addDays(selected, n))} /> : <section className="panel calendar" aria-labelledby="month-title">
        <div className="section-heading"><div><p className="eyebrow">Votre planning</p><h2 id="month-title">{formatDate(first, { month: 'long', year: 'numeric' })}</h2></div><button onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}><Target />Aujourd’hui</button></div>
        <div className="toolbar"><p className="muted small">Touchez une date pour voir les détails</p><div className="actions"><button aria-label="Mois précédent" onClick={() => moveMonth(-1)}><ChevronLeft /></button><button aria-label="Mois suivant" onClick={() => moveMonth(1)}><ChevronRight /></button></div></div>
        <div className="calendar-grid"><div className="weekdays">{['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(d => <span key={d}>{d}</span>)}</div><div className="dates">{Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: total }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`, day = daysByDate.get(date), marker = day ? day.status !== 'work' ? 'R' : day.shift?.kind === 'split' ? '2' : '1' : '';
          const status = day ? day.status === 'work' ? day.shift?.kind === 'split' ? 'service coupé' : 'service simple' : statusLabels[day.status] : 'aucun planning';
          return <button key={date} ref={date === selected ? selectedButton : undefined} className={`day ${day ? '' : 'outside'} ${date === today ? 'today' : ''} ${date === selected ? 'selected' : ''}`} aria-current={date === today ? 'date' : undefined} aria-label={`${formatDate(date)}, ${status}`} onClick={() => { setSelected(date); setDetail(true); }}><span className="day-number">{i + 1}</span><span className={`badge ${marker === '2' ? 'split' : marker === 'R' ? 'rest' : ''}`} aria-hidden="true">{marker || '·'}</span></button>;
        })}</div></div>
        <div className="legend"><span><b>1</b> Simple</span><span><b>2</b> Coupé</span><span><b>R</b> Repos / absence</span></div>
        <div className="coverage"><BusFront /><span>Planning du {formatDate(schedule.metadata.coverageStart)} au {formatDate(schedule.metadata.coverageEnd)}</span></div>
        {!schedule.days.some(d => d.date.startsWith(month)) && <div className="empty-month"><p>Aucune journée importée pour ce mois.</p><button onClick={() => setMonth(schedule.metadata.coverageStart.slice(0, 7))}>Voir le planning importé</button></div>}
      </section>}
      <p className="privacy-note"><ShieldCheck />Enregistré sur cet appareil · disponible hors ligne</p>
    </>}
    {install && !result && <aside className="install-tip"><div className="section-heading"><strong>LSD toujours à portée de main</strong><button aria-label="Fermer les instructions d’installation" onClick={() => { setInstall(false); try { localStorage.setItem('lsd-install-dismissed', '1'); } catch { /* Dismissal can remain session-only. */ } }}><X /></button></div><p>{/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'Sur iPhone et iPad, ouvrez LSD dans Safari, touchez Partager puis “Sur l’écran d’accueil”.' : 'Dans le menu du navigateur, choisissez “Installer l’application” ou “Ajouter à l’écran d’accueil”. Sur Safari pour Mac, choisissez Fichier puis “Ajouter au Dock”.'}</p><p className="small muted">Les données restent dans ce navigateur. Effacer les données du site supprime le planning enregistré.</p></aside>}
    <footer>LSD <span>·</span> Lausanne Shift Discovery</footer>
  </main>;

}
