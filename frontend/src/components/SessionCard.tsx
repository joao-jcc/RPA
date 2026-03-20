import { ExternalLink, MapPin, User, Trash2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SearchSession } from '../types'
import { getStageProgress } from '../types'
import { ProgressTimeline } from './ProgressTimeline'
import { BenefitTracker } from './BenefitTracker'
import { useJobStream } from '../hooks/useJobStream'
import { useApp } from '../context/AppContext'
import { maskCPF, formatDuration } from '../utils/formatters'

interface Props {
  session: SearchSession
}

const statusColors = {
  pending: 'text-white/40 bg-white/[0.04] border-white/[0.06]',
  running: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20',
  done: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20',
  failed: 'text-accent-red bg-accent-red/10 border-accent-red/20',
}

const statusLabels = {
  pending: 'Aguardando',
  running: 'Executando',
  done: 'Concluído',
  failed: 'Falhou',
}

export function SessionCard({ session }: Props) {
  useJobStream(session.job_id, session.status === 'pending' || session.status === 'running')
  const { dispatch } = useApp()

  const progress = getStageProgress(session.events)
  const persona = session.result
  const doneUrl = session.events.find((e) => e.stage === 'done')?.url
  const canDelete = session.status === 'done' || session.status === 'failed'

  const cardBorder =
    session.status === 'done'
      ? 'border-accent-emerald/10'
      : session.status === 'failed'
      ? 'border-accent-red/10'
      : 'border-white/[0.06]'

  return (
    <div className={`rounded-xl border ${cardBorder} bg-navy-800 overflow-hidden animate-fade-slide`}>
      <div className="px-5 pt-4 pb-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User size={13} className="text-white/30 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white truncate">
                {persona?.name ?? session.termo}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/35 flex-wrap">
              {persona?.cpf && <span className="font-mono">{maskCPF(persona.cpf)}</span>}
              {persona?.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {persona.location}
                </span>
              )}
              <span className="font-mono text-white/20">
                {formatDuration(session.started_at, session.finished_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusColors[session.status]}`}>
              {statusLabels[session.status]}
            </span>
            {doneUrl && (
              <a
                href={doneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-accent-blue hover:text-accent-blue/80 bg-accent-blue/10 border border-accent-blue/20 px-2.5 py-1 rounded-full transition-colors duration-150"
              >
                <ExternalLink size={10} />
                Drive
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => dispatch({ type: 'DELETE_SESSION', payload: session.job_id })}
                className="p-1.5 rounded-lg text-white/20 hover:text-accent-red hover:bg-accent-red/10 transition-colors duration-150"
                title="Remover"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — só durante execução */}
        {(session.status === 'running' || session.status === 'pending') && (
          <div className="mb-3">
            <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-blue to-accent-blue/50 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Evento atual — linha única pulsando */}
        <ProgressTimeline events={session.events} status={session.status} />
        <BenefitTracker events={session.events} />

        {/* Resultado resumido — só após concluir */}
        {persona && persona.benefits && persona.benefits.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
            {persona.benefits.map((benefit, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/60 truncate">{benefit.type}</span>
                <span className="text-xs font-mono text-accent-emerald flex-shrink-0">
                  {benefit.total_received}
                </span>
              </div>
            ))}
            <Link
              to="/data"
              className="flex items-center gap-1.5 text-[11px] text-accent-blue/70 hover:text-accent-blue transition-colors duration-150 mt-1"
            >
              Ver tabela completa
              <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}