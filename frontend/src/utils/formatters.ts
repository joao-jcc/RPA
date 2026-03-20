export function timeAgo(date: Date, now: Date = new Date()): string {
  const secs = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (secs < 60) return `${secs}s atrás`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h atrás`
}

export function maskCPF(cpf: string): string {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.$2.$3-**')
}

export function formatDuration(start: Date, end?: Date): string {
  const ms = (end ?? new Date()).getTime() - start.getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}