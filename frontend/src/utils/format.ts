import { formatDistanceToNow, format, parseISO } from 'date-fns'

export const formatRelativeTime = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export const formatDate = (date: string | Date, fmt = 'MMM d, yyyy') => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export const formatMeetingId = (id: string) =>
  id.replace(/(.{4})/g, '$1 ').trim()
