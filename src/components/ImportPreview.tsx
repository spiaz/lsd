import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Save, X } from 'lucide-react';
import { statusLabels, type ParseResult, type Schedule, type ScheduleDay } from '../domain/schedule';
import { formatDate, validDate } from '../domain/time';
import { validateSchedule } from '../domain/validation';
import type { MergeMode } from '../domain/merge';
import { DayEditor } from './DayEditor';
interface Props { result: ParseResult; hasSchedule: boolean; onCancel: () => void; onSave: (s: Schedule, mode: MergeMode) => Promise<void> }
export function ImportPreview({ result, hasSchedule, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState(result.schedule);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [missingConfirmed, setMissingConfirmed] = useState(false);
  const [mode, setMode] = useState<MergeMode>('add');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const validation = useMemo(() => draft ? validateSchedule(draft) : [], [draft]);
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
    <div className="section-heading"><div><p className="eyebrow">Avant d’enregistrer</p><h2 id="preview-title">Vérifiez le planning</h2></div><button aria-label="Annuler l’import" disabled={saving} onClick={onCancel}><X /></button></div>
    {parserErrors.map((issue, i) => <p role="alert" className="notice error" key={i}><AlertTriangle />{issue.sourceReference}: {issue.message}</p>)}
    {draft && <>
      <p className="muted filename">{draft.metadata.sourceFileName}</p>
      <div className="fields"><label>Nom affiché dans l’export<input value={draft.metadata.displayName || ''} placeholder="Facultatif" onChange={e => setDraft({ ...draft, metadata: { ...draft.metadata, displayName: e.target.value } })} /></label>
        <label>Début de la période<input type="date" value={draft.metadata.coverageStart} onChange={e => { setDraft({ ...draft, metadata: { ...draft.metadata, coverageStart: e.target.value } }); setMissingConfirmed(false); }} /></label>
        <label>Fin de la période<input type="date" value={draft.metadata.coverageEnd} onChange={e => { setDraft({ ...draft, metadata: { ...draft.metadata, coverageEnd: e.target.value } }); setMissingConfirmed(false); }} /></label>
      </div>
      <div className="stats"><div><strong>{draft.days.filter(d => d.status === 'work').length}</strong>Travail</div><div><strong>{draft.days.filter(d => d.shift?.kind === 'single' && d.status === 'work').length}</strong>Simples</div><div><strong>{draft.days.filter(d => d.shift?.kind === 'split' && d.status === 'work').length}</strong>Coupés</div><div><strong>{draft.days.filter(d => d.status !== 'work').length}</strong>Repos / absences</div></div>
      {warnings.length > 0 && <div className="notice warning"><AlertTriangle /><div><strong>{pending.length} signalements à vérifier</strong><p>Vérifiez le PDF et corrigez les journées. Confirmez chaque vérification ci-dessous : les données ne sont pas enregistrées automatiquement.</p>
        {warnings.map((issue, i) => { const key = String(i); return <label className="check-row" key={i}><input type="checkbox" checked={reviewed.has(key)} onChange={e => setReviewed(prev => { const next = new Set(prev); if (e.target.checked) next.add(key); else next.delete(key); return next; })} /><span>{issue.date ? formatDate(issue.date) : issue.sourceReference} — {issue.message}</span></label>; })}
      </div></div>}
      {errors.length > 0 && <div className="notice error" role="alert"><AlertTriangle /><div><strong>Corrections nécessaires</strong><ul>{errors.map((i, k) => <li key={k}>{i.date && `${formatDate(i.date)}: `}{i.message}</li>)}</ul></div></div>}
      {missing.length > 0 && <div className="notice warning"><AlertTriangle /><div><p>{missing.length} dates manquantes. Ajoutez-les ci-dessous ou conservez-les comme journées sans planning.</p><details><summary>Afficher les dates manquantes</summary><p>{missing.map(i => formatDate(i.date!)).join(', ')}</p></details><label className="check-row"><input type="checkbox" checked={missingConfirmed} onChange={e => setMissingConfirmed(e.target.checked)} />J’ai vérifié les dates manquantes.</label></div></div>}
      <p className="muted">Ouvrez une journée pour vérifier ou corriger la présence, les blocs et les courses.</p>
      <div className="preview-days">{draft.days.map((day, i) => <details key={i}><summary><span>{formatDate(day.date)}</span><span>{day.status === 'work' ? day.shift?.kind === 'split' ? 'SERVICE COUPÉ' : 'SERVICE SIMPLE' : statusLabels[day.status]}</span></summary><DayEditor day={day} onChange={day => changeDay(i, day)} onDelete={() => changeDay(i)} /></details>)}</div>
      <button onClick={() => { setDraft({ ...draft, days: [...draft.days, { date: validDate(draft.metadata.coverageStart) ? draft.metadata.coverageStart : '', status: 'rest' }] }); setMissingConfirmed(false); }}>Ajouter une journée manquante</button>
      {hasSchedule && <fieldset><legend>Mise à jour</legend><label className="check-row"><input type="radio" name="merge" checked={mode === 'add'} onChange={() => setMode('add')} />Ajouter une nouvelle période</label><label className="check-row"><input type="radio" name="merge" checked={mode === 'replace'} onChange={() => setMode('replace')} />Remplacer la période qui se chevauche</label><p className="muted">Le remplacement supprime les journées enregistrées sur toute la période indiquée, y compris celles absentes du nouveau PDF. L’historique hors de cette période est conservé.</p></fieldset>}
      {error && <p role="alert" className="notice error">{error}</p>}
      {!disabled && <p className="success"><Check /> Vérifications terminées. Le planning peut être enregistré.</p>}
    </>}
    <div className="actions sticky-actions"><button disabled={saving} onClick={onCancel}>Annuler</button><button className="primary-action" disabled={disabled} onClick={async () => { if (!draft) return; setSaving(true); setError(''); try { await onSave(draft, mode); } catch (e) { setError(e instanceof Error ? e.message : 'Échec de l’enregistrement.'); } finally { setSaving(false); } }}><Save />{saving ? 'Enregistrement…' : 'Enregistrer le planning'}</button></div>
  </section>;
}
