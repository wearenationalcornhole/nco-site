export function formatEventDate(value?: string | null) {
  if (!value) return 'TBD'

  const trimmed = value.trim()
  if (!trimmed) return 'TBD'

  const plainDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (plainDate) {
    const year = Number(plainDate[1])
    const month = Number(plainDate[2])
    const day = Number(plainDate[3])
    const date = new Date(Date.UTC(year, month - 1, day))

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return 'TBD'

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
