import { BUILTIN_CRITERIA, weightedPreview } from './weighted-grading.js'

export default function ActivityGrading({ form, onChange, automatedPoints, frozen }) {
  if (form.gradingMode === 'COMPLETION') return <p className="academic-inline-help">Completion Activities have no numeric grade or rubric.</p>
  const remaining = Math.round((Number(form.totalPoints || 0) - automatedPoints) * 100) / 100
  const criteria = form.rubricCriteria ?? []
  const allocated = criteria.reduce((sum, row) => sum + Math.round(Number(row.maximumPoints || 0) * 100), 0) / 100
  const update = (id, key, value) => onChange('rubricCriteria', criteria.map(row => row.id === id ? { ...row, [key]: value } : row))
  const period = <label>Grading period<select value={form.gradingPeriod ?? ''} disabled={frozen} onChange={event => onChange('gradingPeriod', event.target.value)}><option value="">Unassigned</option><option value="PRELIM">Prelim</option><option value="MIDTERM">Midterm</option><option value="FINAL">Final</option></select></label>
  if (form.gradingConfiguration) {
    const preview = weightedPreview(form.totalPoints, form.gradingConfiguration)
    return <>{period}<h4>Grading allocation</h4><p className="academic-inline-help">Correctness is assessed through Java tests. You award Readability, Organization and Documentation before releasing the result.</p><div className="instructor-form-grid">{BUILTIN_CRITERIA.map(([key, name], index) => <label key={key}>{name} allocation (%)<input type="number" min={key === 'correctness' ? '0.01' : '0'} max="100" step="0.01" value={form.gradingConfiguration.percentages[key]} disabled={frozen} onChange={event => onChange('gradingConfiguration', { ...form.gradingConfiguration, percentages: { ...form.gradingConfiguration.percentages, [key]: event.target.value } })} /><small>{preview.error ? '—' : `${preview.maxima[index]} points${preview.maxima[index] === 0 ? ' · Not graded' : ''}`}</small></label>)}</div><p className="academic-inline-help" role="status">{preview.error || `Total: ${form.totalPoints} points · Correctness: ${preview.maxima[0]} · Instructor: ${Math.round((Number(form.totalPoints) - preview.maxima[0]) * 100) / 100}. Test points are calculated automatically from importance.`}</p></>
  }
  return <>
    <label>Grading period<select value={form.gradingPeriod ?? ''} disabled={frozen} onChange={event => onChange('gradingPeriod', event.target.value)}><option value="">Unassigned</option><option value="PRELIM">Prelim</option><option value="MIDTERM">Midterm</option><option value="FINAL">Final</option></select></label>
    <p className="academic-inline-help">Total: {form.totalPoints || 0} · Automated tests: {automatedPoints} · Available Instructor points: {remaining}</p>
    <h4>Instructor rubric</h4>
    {form.rubricCriteria == null && <p className="academic-inline-help">Legacy aggregate Instructor points. Existing grades remain unchanged.</p>}
    {criteria.map(row => <div className="instructor-form-grid" key={row.id}>
      <label>Criterion name<input value={row.name} maxLength={100} disabled={frozen} onChange={event => update(row.id, 'name', event.target.value)} /></label>
      <label>Criterion maximum<input type="number" min="0.01" max="1000" step="0.01" value={row.maximumPoints} disabled={frozen} onChange={event => update(row.id, 'maximumPoints', event.target.value)} /></label>
      {!frozen && <button type="button" className="student-outline-action" onClick={() => onChange('rubricCriteria', criteria.filter(item => item.id !== row.id))}>Remove criterion</button>}
    </div>)}
    {form.rubricCriteria != null && <p className="academic-inline-help" role="status">Rubric allocation: {allocated} / {remaining}. {Math.round(allocated * 100) !== Math.round(remaining * 100) ? 'Allocate all available Instructor points before publication.' : 'Allocation matches available Instructor points.'}</p>}
    {!frozen && <button type="button" className="student-outline-action" disabled={criteria.length >= 20} onClick={() => onChange('rubricCriteria', [...criteria, { id: crypto.randomUUID(), name: '', maximumPoints: '' }])}>Add rubric criterion</button>}
  </>
}
