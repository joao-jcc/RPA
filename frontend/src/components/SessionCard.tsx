import { ExternalLink, MapPin, Trash2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SearchSession } from '../types'
import { getStageProgress } from '../types'
import { ProgressTimeline } from './ProgressTimeline'
import { useJobStream } from '../hooks/useJobStream'
import { useApp } from '../context/AppContext'
import { useNow } from '../hooks/useNow'
import { maskCPF, formatDuration } from '../utils/formatters'

interface Props {
  session: SearchSession
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Aguardando', color: 'var(--muted)',  bg: 'var(--surface2)', dot: 'var(--faint)' },
  running: { label: 'Ativo',      color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', dot: '#F59E0B' },
  done:    { label: 'Concluído',  color: '#10B981', bg: 'rgba(16,185,129,0.10)', dot: '#10B981' },
  failed:  { label: 'Falhou',     color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  dot: '#EF4444' },
}

export function SessionCard({ session }: Props) {
  useJobStream(session.job_id, session.status === 'pending' || session.status === 'running')
  const { dispatch } = useApp()
  const now = useNow()

  const progress  = getStageProgress(session.events)
  const persona   = session.result
  const doneUrl   = session.events.find((e) => e.stage === 'done')?.url
  const govLink   = session.result?.links?.profile
  const canDelete = session.status === 'done' || session.status === 'failed'
  const isRunning = session.status === 'running' || session.status === 'pending'

  const liveBenefits: { name: string; total: string }[] = []
  if (isRunning) {
    for (const e of session.events) {
      if (e.stage === 'benefit_done') {
        const name = e.benefit_name ?? e.message.match(/^(.+?) concluído/)?.[1] ?? ''
        const total = e.total_received ?? ''
        if (name) liveBenefits.push({ name, total })
      }
    }
  }

  const benefitsToShow = persona?.benefits?.length
    ? persona.benefits.map((b) => ({ name: b.type, total: b.total_received }))
    : liveBenefits

  const cfg = statusConfig[session.status] ?? statusConfig.pending

  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Progress bar — always present, fills on events */}
      <div className="h-0.5" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${session.status === 'done' ? 100 : isRunning ? progress : 0}%`,
            background: session.status === 'done' ? '#10B981'
              : session.status === 'failed' ? '#EF4444'
              : 'var(--accent)',
          }}
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Status + actions row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: cfg.dot }}
            />
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {govLink && (
              <a href={govLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid transparent' }}
              >
                <ExternalLink size={11} />Gov.br
              </a>
            )}
            {doneUrl && (
              <a href={doneUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <ExternalLink size={11} />Drive
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => dispatch({ type: 'DELETE_SESSION', payload: session.job_id })}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--faint)', background: 'transparent' }}
                title="Remover"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Name + meta */}
        <div>
          <h3 className="text-base font-bold truncate mb-1" style={{ color: 'var(--text)' }}>
            {persona?.name ?? session.termo}
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {persona?.cpf && (
              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{maskCPF(persona.cpf)}</span>
            )}
            {persona?.nis && (
              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>NIS {persona.nis}</span>
            )}
            {persona?.location && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                <MapPin size={11} />{persona.location}
              </span>
            )}
            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--faint)' }}>
              {formatDuration(session.started_at, session.finished_at ?? now)}
            </span>
          </div>
        </div>

        {/* Progress label */}
        {isRunning && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Progresso</span>
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%`, background: 'var(--accent)' }}
              />
            </div>
          </div>
        )}

        {/* Stage timeline */}
        <ProgressTimeline events={session.events} status={session.status} />

        {/* Benefits */}
        {benefitsToShow.length > 0 && (
          <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex flex-wrap gap-1.5">
              {benefitsToShow.map((benefit, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{benefit.name}</span>
                  {benefit.total && (
                    <span className="text-xs font-mono font-bold" style={{ color: '#10B981' }}>{benefit.total}</span>
                  )}
                </div>
              ))}
            </div>
            {!isRunning && (
              <Link to="/data" className="inline-flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--faint)' }}>
                Ver tabela completa <ArrowRight size={11} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
