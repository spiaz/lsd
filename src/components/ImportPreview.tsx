import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Save, X } from 'lucide-react';
import type { ParseResult, Schedule, ScheduleDay } from '../domain/schedule';
import { formatDate, validDate } from '../domain/time';
import { validateSchedule } from '../domain/validation';
import type { MergeMode } from '../domain/merge';
import { DayEditor } from './DayEditor';
import { statusLabel, translator, type Locale } from '../i18n';
interface Props { result: ParseResult; hasSchedule: boolean; locale: Locale; onCancel: () => void; onSave: (s: Schedule, mode: MergeMode) => Promise<void> }
export function ImportPreview({ result, hasSchedule, locale, onCancel, onSave }: Props) {
  const t = translator(locale);
  const [draft, setDraft] = useState(result.schedule);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [missingConfirmed, setMissingConfirmed] = useState(false);
  const [mode, setMode] = useState<MergeMode>('add');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const validation = useMemo(() => draft ? validateSchedule(draft, locale) : [], [draft, locale]);
  const parserErrors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const pending = warnings.filter((_, index) => !reviewed.has(String(index)));
  const missing = validation.filter(i => i.code === 'MISSING');
  const errors = validation.filter(i => i.severity === 'error');
  const disabled = !draft || parserErrors.length > 0 || errors.length > 0 || pending.length > 0 || (missing.length > 0 && !missingConfirmed) || saving;
  function changeDay(index: number, day?: ScheduleDay) {
    setDraft(s => s && ({ ...s, days: day ? s.days.map((d, i) => i === index ? day : d) : s.days.filter((_, i) => i !== index) }));
    setReviewed(new Set()); setMissingConfirmed(false);
  }
  return <section className="panel" aria-labelledby="preview-title">
    <div className="section-heading"><div><p className="eyebrow">{t('preview.eyebrow')}</p><h2 id="preview-title">{t('preview.title')}</h2></div><button aria-label={t('preview.cancelImport')} disabled={saving} onClick={onCancel}><X /></button></div>
    {parserErrors.map((issue, i) => <p role="alert" className="notice error" key={i}><AlertTriangle />{issue.sourceReference}: {issue.message}</p>)}
    {draft && <>
      <p className="muted filename">{draft.metadata.sourceFileName}</p>
      <div className="fields"><label>{t('preview.displayName')}<input value={draft.metadata.displayName || ''} placeholder={t('preview.optional')} onChange={e => setDraft({ ...draft, metadata: { ...draft.metadata, displayName: e.target.value } })} /></label>
        <label>{t('preview.coverageStart')}<input type="date" value={draft.metadata.coverageStart} onChange={e => { setDraft({ ...draft, metadata: { ...draft.metadata, coverageStart: e.target.value } }); setMissingConfirmed(false); }} /></label>
        <label>{t('preview.coverageEnd')}<input type="date" value={draft.metadata.coverageEnd} onChange={e => { setDraft({ ...draft, metadata: { ...draft.metadata, coverageEnd: e.target.value } }); setMissingConfirmed(false); }} /></label>
      </div>
      <div className="stats"><div><strong>{draft.days.filter(d => d.status === 'work').length}</strong>{t('preview.work')}</div><div><strong>{draft.days.filter(d => d.shift?.kind === 'single' && d.status === 'work').length}</strong>{t('preview.single')}</div><div><strong>{draft.days.filter(d => d.shift?.kind === 'split' && d.status === 'work').length}</strong>{t('preview.split')}</div><div><strong>{draft.days.filter(d => d.status !== 'work').length}</strong>{t('preview.rest')}</div></div>
      {warnings.length > 0 && <div className="notice warning"><AlertTriangle /><div><strong>{t('preview.reviewCount', { count: pending.length })}</strong><p>{t('preview.reviewHelp')}</p>
        {warnings.map((issue, i) => { const key = String(i); return <label className="check-row" key={i}><input type="checkbox" checked={reviewed.has(key)} onChange={e => setReviewed(prev => { const next = new Set(prev); if (e.target.checked) next.add(key); else next.delete(key); return next; })} /><span>{issue.date ? formatDate(issue.date, undefined, locale) : issue.sourceReference} — {issue.message}</span></label>; })}
      </div></div>}
      {errors.length > 0 && <div className="notice error" role="alert"><AlertTriangle /><div><strong>{t('preview.corrections')}</strong><ul>{errors.map((issue, index) => <li key={index}>{issue.date && `${formatDate(issue.date, undefined, locale)}: `}{issue.message}</li>)}</ul></div></div>}
      {missing.length > 0 && <div className="notice warning"><AlertTriangle /><div><p>{t('preview.missingCount', { count: missing.length })}</p><details><summary>{t('preview.showMissing')}</summary><p>{missing.map(issue => formatDate(issue.date!, undefined, locale)).join(', ')}</p></details><label className="check-row"><input type="checkbox" checked={missingConfirmed} onChange={e => setMissingConfirmed(e.target.checked)} />{t('preview.missingChecked')}</label></div></div>}
      <p className="muted">{t('preview.editHelp')}</p>
      <div className="preview-days">{draft.days.map((day, i) => <details key={i}><summary><span>{formatDate(day.date, undefined, locale)}</span><span>{day.status === 'work' ? day.shift?.kind === 'split' ? t('shift.split') : t('shift.single') : statusLabel(day.status, locale)}</span></summary><DayEditor day={day} locale={locale} onChange={updatedDay => changeDay(i, updatedDay)} onDelete={() => changeDay(i)} /></details>)}</div>
      <button onClick={() => { setDraft({ ...draft, days: [...draft.days, { date: validDate(draft.metadata.coverageStart) ? draft.metadata.coverageStart : '', status: 'rest' }] }); setMissingConfirmed(false); }}>{t('preview.addMissing')}</button>
      {hasSchedule && <fieldset><legend>{t('preview.update')}</legend><label className="check-row"><input type="radio" name="merge" checked={mode === 'add'} onChange={() => setMode('add')} />{t('preview.addPeriod')}</label><label className="check-row"><input type="radio" name="merge" checked={mode === 'replace'} onChange={() => setMode('replace')} />{t('preview.replaceOverlap')}</label><p className="muted">{t('preview.replaceHelp')}</p></fieldset>}
      {error && <p role="alert" className="notice error">{error}</p>}
      {!disabled && <p className="success"><Check /> {t('preview.ready')}</p>}
    </>}
    <div className="actions sticky-actions"><button disabled={saving} onClick={onCancel}>{t('common.cancel')}</button><button className="primary-action" disabled={disabled} onClick={async () => { if (!draft) return; setSaving(true); setError(''); try { await onSave(draft, mode); } catch (e) { setError(e instanceof Error ? e.message : t('error.saveShort')); } finally { setSaving(false); } }}><Save />{saving ? t('common.saving') : t('common.save')}</button></div>
  </section>;
}
