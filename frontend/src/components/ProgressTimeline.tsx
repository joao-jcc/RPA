import { Loader2 } from 'lucide-react'
import type { StageEvent, Stage } from '../types'
import { STAGE_LABELS } from '../types'

interface Props {
  events: StageEvent[]
  status: string
}

// Dado mais relevante de cada stage — o que aparece em destaque
function extractHighlight(event: StageEvent): string | null {
  const { stage, message } = event
  if (stage === 'found') {
    const match = message.match(/Encontrado:\s*(.+?)(?:\s*—|$)/)
    return match?.[1]?.trim() ?? null
  }
  if (stage === 'discovered') {
    const match = message.match(/^(\d+\s+benefício[s]?\s+encontrado[s]?)/)
    return match?.[1] ?? null
  }
  if (stage === 'benefit_start') {
    const match = message.match(/Extraindo\s+(.+?)\.\.\. \((\d+\/\d+)\)/)
    return match ? `${match[1]} (${match[2]})` : null
  }
  if (stage === 'benefit_done') {
    const match = message.match(/^(.+?) concluído \((\d+\/\d+)\)/)
    return match ? `${match[1]} ✓ ${match[2]}` : null
  }
  if (stage === 'uploading') return 'Salvando no Google Drive...'
  if (stage === 'done') return 'Concluído'
  if (stage === 'error') return message
  return null
}

const stageColor: Partial<Record<Stage, string>> = {
  found: 'text-white',
  discovered: 'text-accent-blue',
  benefit_start: 'text-accent-amber',
  benefit_done: 'text-accent-emerald',
  uploading: 'text-accent-amber',
  done: 'text-accent-emerald',
  error: 'text-accent-red',
}

export function ProgressTimeline({ events, status }: Props) {
  const isRunning = status === 'running' || status === 'pending'

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 py-1 min-h-[22px]">
        <Loader2 size={11} className="text-white/25 animate-spin flex-shrink-0" />
        <span className="text-xs text-white/25">Iniciando...</span>
      </div>
    )
  }

  const last = events[events.length - 1]
  const highlight = extractHighlight(last)
  const color = stageColor[last.stage] ?? 'text-white/50'
  const isError = last.stage === 'error'
  const isDone = last.stage === 'done'

  return (
    <div className="flex items-center gap-2 py-1 min-h-[22px] overflow-hidden">
      {isRunning && !isError
        ? <Loader2 size={11} className="text-accent-blue animate-spin flex-shrink-0" />
        : isDone
        ? <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald flex-shrink-0" />
        : isError
        ? <span className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0" />
        : <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
      }

      <span className="text-[11px] text-white/30 flex-shrink-0 whitespace-nowrap">
        {STAGE_LABELS[last.stage]}
      </span>

      {highlight && (
        <>
          <span className="text-white/15 flex-shrink-0">·</span>
          <span className={`text-xs font-medium truncate transition-all duration-300 ${color}`}>
            {highlight}
          </span>
        </>
      )}
    </div>
  )
}