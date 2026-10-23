export default function ActivityGrading({ form, onChange, automatedPoints, frozen }) {
  if (form.gradingMode === 'COMPLETION') return <p className="academic-inline-help">Completion Activities have no numeric grade or rubric.</p>
  const remaining = Math.round((Number(form.totalPoints || 0) - automatedPoints) * 100) / 100
  const criteria = form.rubricCriteria ?? []
  const allocated = criteria.reduce((sum, row) => sum + Math.round(Number(row.maximumPoints || 0) * 100), 0) / 100
  const update = (id, key, value) => onChange('rubricCriteria', criteria.map(row => row.id === id ? { ...row, [key]: value } : row))
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
