import { ExternalLink, MapPin, User, Trash2, ArrowRight } from 'lucide-react'
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

const statusColors = {
  pending: 'text-white/40 bg-white/[0.04] border-white/[0.08]',
  running: 'text-accent-amber bg-accent-amber/10 border-accent-amber/25',
  done: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/25',
  failed: 'text-accent-red bg-accent-red/10 border-accent-red/25',
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
  const now = useNow()

  const progress = getStageProgress(session.events)
  const persona = session.result
  const doneUrl = session.events.find((e) => e.stage === 'done')?.url
  const canDelete = session.status === 'done' || session.status === 'failed'
  const isRunning = session.status === 'running' || session.status === 'pending'

  // Benefícios incrementais — extraídos dos eventos SSE em tempo real
  const liveBenefits: { name: string; total: string }[] = []
  if (isRunning) {
    for (const e of session.events) {
      if (e.stage === 'benefit_done') {
        const name = e.benefit_name
          ?? e.message.match(/^(.+?) concluído/)?.[1]
          ?? ''
        const total = e.total_received ?? ''
        if (name) liveBenefits.push({ name, total })
      }
    }
  }

  // Combina: durante execução usa liveBenefits, após concluir usa persona.benefits
  const benefitsToShow = persona?.benefits?.length
    ? persona.benefits.map((b) => ({ name: b.type, total: b.total_received }))
    : liveBenefits

  const cardBorder =
    session.status === 'done'
      ? 'border-accent-emerald/15'
      : session.status === 'failed'
      ? 'border-accent-red/15'
      : 'border-white/[0.08]'

  return (
    <div className={`rounded-2xl border ${cardBorder} bg-navy-800 overflow-hidden animate-fade-slide`}>

      {/* Top accent bar when running */}
      {isRunning && (
        <div className="h-0.5 bg-navy-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-blue via-accent-blue/70 to-transparent rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="px-6 pt-5 pb-5 space-y-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <User size={14} className="text-white/25 flex-shrink-0" />
              <h3 className="text-base font-semibold text-white truncate leading-tight">
                {persona?.name ?? session.termo}
              </h3>
            </div>
            <div className="flex items-center gap-3 flex-wrap pl-[22px]">
              {persona?.cpf && (
                <span className="text-xs font-mono text-white/40">{maskCPF(persona.cpf)}</span>
              )}
              {persona?.location && (
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <MapPin size={11} />
                  {persona.location}
                </span>
              )}
              <span className="text-xs font-mono text-white/20">
                {formatDuration(session.started_at, session.finished_at ?? now)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${statusColors[session.status]}`}>
              {statusLabels[session.status]}
            </span>
            {doneUrl && (
              <a
                href={doneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80 bg-accent-blue/10 border border-accent-blue/20 px-3 py-1.5 rounded-full transition-colors"
              >
                <ExternalLink size={11} />
                Drive
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => dispatch({ type: 'DELETE_SESSION', payload: session.job_id })}
                className="p-2 rounded-xl text-white/20 hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stage line */}
        <div className="pl-[22px]">
          <ProgressTimeline events={session.events} status={session.status} />
        </div>

        {/* Benefits — incremental during run, full after done */}
        {benefitsToShow.length > 0 && (
          <div className="pt-3 border-t border-white/[0.06] space-y-3">
            <div className="flex flex-wrap gap-2">
              {benefitsToShow.map((benefit, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-accent-emerald/[0.07] border border-accent-emerald/20 rounded-xl px-3.5 py-2 animate-fade-slide"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald flex-shrink-0" />
                  <span className="text-xs text-white/70 font-medium">{benefit.name}</span>
                  {benefit.total && (
                    <span className="text-xs font-mono text-accent-emerald font-semibold">
                      {benefit.total}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!isRunning && (
              <Link
                to="/data"
                className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-accent-blue transition-colors"
              >
                Ver tabela completa
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}