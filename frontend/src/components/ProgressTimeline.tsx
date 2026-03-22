import { Loader2 } from 'lucide-react'
import type { StageEvent, Stage } from '../types'
import { STAGE_LABELS } from '../types'

interface Props {
  events: StageEvent[]
  status: string
}

function extractHighlight(event: StageEvent): string | null {
  const { stage, message } = event
  if (stage === 'found') return message.match(/Encontrado:\s*(.+?)(?:\s*—|$)/)?.[1]?.trim() ?? null
  if (stage === 'discovered') return message.match(/^(\d+\s+benefício[s]?\s+encontrado[s]?)/)?.[1] ?? null
  if (stage === 'benefit_start') { const m = message.match(/Extraindo\s+(.+?)\.\.\.\s*\((\d+\/\d+)\)/); return m ? `${m[1]} (${m[2]})` : null }
  if (stage === 'benefit_done')  { const m = message.match(/^(.+?) concluído \((\d+\/\d+)\)/); return m ? `${m[1]} ✓ ${m[2]}` : null }
  if (stage === 'uploading') return message
  if (stage === 'done')  return 'Concluído'
  if (stage === 'error') return message
  return null
}

const stageColor: Partial<Record<Stage, string>> = {
  found:         'var(--text)',
  discovered:    'var(--accent)',
  benefit_start: '#F59E0B',
  benefit_done:  '#10B981',
  uploading:     '#F59E0B',
  done:          '#10B981',
  error:         '#EF4444',
}

export function ProgressTimeline({ events, status }: Props) {
  const isRunning = status === 'running' || status === 'pending'

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <Loader2 size={11} className="animate-spin flex-shrink-0" style={{ color: 'var(--faint)' }} />
        <span className="text-xs" style={{ color: 'var(--faint)' }}>Iniciando...</span>
      </div>
    )
  }

  const last      = events[events.length - 1]
  const highlight = extractHighlight(last)
  const color     = stageColor[last.stage] ?? 'var(--muted)'
  const isError   = last.stage === 'error'
  const isDone    = last.stage === 'done'

  return (
    <div className="flex items-center gap-2 py-0.5 overflow-hidden">
      {isRunning && !isError
        ? <Loader2 size={11} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
        : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
            background: isDone ? '#10B981' : isError ? '#EF4444' : 'var(--faint)'
          }} />
      }
      <span className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
        {STAGE_LABELS[last.stage]}
      </span>
      {highlight && (
        <>
          <span style={{ color: 'var(--border)' }} className="flex-shrink-0">·</span>
          <span className="text-xs font-medium truncate" style={{ color }}>
            {highlight}
          </span>
        </>
      )}
    </div>
  )
}
