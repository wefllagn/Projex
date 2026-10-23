const PROGRAMS = [['INFORMATION_TECHNOLOGY', 'Information Technology'], ['COMPUTER_SCIENCE', 'Computer Science']]
export default function ProgramField({ value = '', onChange, disabled = false, required = false }) {
  return <label>Program<select name="program" value={value ?? ''} onChange={event => onChange(event.target.value)} disabled={disabled} required={required}><option value="" disabled>{required ? 'Choose Program' : 'Not set'}</option>{PROGRAMS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
}
