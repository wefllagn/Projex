const classTerms = ['First Semester', 'Second Semester', 'Short Term']

function academicYears(currentValue = '', year = new Date().getFullYear()) {
  const years = Array.from({ length: 7 }, (_, index) => `${year - 2 + index}-${year - 1 + index}`)
  return currentValue && !years.includes(currentValue) ? [currentValue, ...years] : years
}

// Retain saved legacy values when correcting other fields; new Classes use only
// the standardized options. Server validation remains authoritative.
export default function AcademicFields({ semester = '', schoolYear = '', onChange, legacy = false, disabled = false }) {
  return <>
    <label>Semester / Term<select name="semester" required disabled={disabled} {...(onChange ? { value: semester, onChange: (event) => onChange('semester', event.target.value) } : { defaultValue: semester })}>
      <option value="" disabled hidden>{legacy ? 'Not set' : 'Choose term'}</option>
      {legacy && semester && !classTerms.includes(semester) ? <option value={semester}>{semester} (current)</option> : null}
      {classTerms.map((term) => <option key={term} value={term}>{term}</option>)}
    </select></label>
    <label>Academic year<select name="schoolYear" required disabled={disabled} {...(onChange ? { value: schoolYear, onChange: (event) => onChange('schoolYear', event.target.value) } : { defaultValue: schoolYear })}>
      <option value="">Select academic year</option>
      {academicYears(legacy ? schoolYear : '').map((year) => <option key={year} value={year}>{year}</option>)}
    </select></label>
  </>
}
