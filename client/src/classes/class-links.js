export function classHref(path, classId) {
  if (!classId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}classId=${encodeURIComponent(classId)}`
}

export function classInitial(classRecord) {
  return classRecord?.className?.trim().charAt(0).toUpperCase() || 'C'
}

export function classOfferingLabel(classRecord) {
  if (classRecord?.officialClassCode) {
    const period = classRecord.academicPeriod === 'FIRST_SEMESTER' ? '1st Semester' : classRecord.academicPeriod === 'SECOND_SEMESTER' ? '2nd Semester' : null
    return [classRecord.courseNumber, classRecord.officialClassCode, period, classRecord.schoolYear].filter(Boolean).join(' · ')
  }
  return [classRecord?.section, classRecord?.semester, classRecord?.schoolYear].filter(Boolean).join(' · ') || 'Informal class'
}

export function firstName(fullName) {
  return fullName?.trim().split(/\s+/)[0] || 'there'
}
