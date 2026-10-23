export function deadlineGroup(value, now = new Date()) {
  if (!value || Number.isNaN(Date.parse(value))) return 'No due date'
  const date = new Date(value)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + (7 - ((today.getDay() + 6) % 7)))
  const afterNextWeek = new Date(nextWeek); afterNextWeek.setDate(afterNextWeek.getDate() + 7)
  if (date < today) return 'Earlier'
  if (date < tomorrow) return 'Today'
  if (date < nextWeek) return 'This week'
  if (date < afterNextWeek) return 'Next week'
  return 'Later'
}
