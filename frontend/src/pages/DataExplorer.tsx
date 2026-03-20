import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, MapPin, ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { maskCPF } from '../utils/formatters'
import type { SearchSession, Benefit, PersonaResponse } from '../types'
import type { SearchRow } from '../api/client'

// ── normalizeRow ──────────────────────────────────────────────────────────────

function normalizeRow(row: unknown): Record<string, string> {
  if (!row || typeof row !== 'object') return {}
  const r = row as Record<string, unknown>
  if ('columns' in r && r.columns && typeof r.columns === 'object') {
    return Object.fromEntries(
      Object.entries(r.columns as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
    )
  }
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
}

// ── BenefitSection ────────────────────────────────────────────────────────────

function BenefitSection({ benefit }: { benefit: Benefit }) {
  const rows    = (benefit.rows ?? []).map(normalizeRow)
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(Boolean) : []
  const [page, setPage] = useState(0)
  const PG         = 10
  const totalPages = Math.ceil(rows.length / PG)
  const pageRows   = rows.slice(page * PG, (page + 1) * PG)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">{benefit.type}</span>
          <span className="text-xs font-mono text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded-full border border-accent-emerald/20">
            {benefit.total_received}
          </span>
          {rows.length > 0 && (
            <span className="text-xs text-white/30">{rows.length} parcela{rows.length > 1 ? 's' : ''}</span>
          )}
        </div>
        {benefit.detail_url && (
          <a href={benefit.detail_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-accent-blue transition-colors">
            <ExternalLink size={11} />Portal
          </a>
        )}
      </div>
      {rows.length === 0 || headers.length === 0 ? (
        <p className="text-xs text-white/30 py-3">Nenhuma parcela encontrada.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-navy-900/50">
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-white/35 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2.5 text-white/55 whitespace-nowrap font-mono">{row[h] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-white/25 font-mono">
                {page * PG + 1}–{Math.min((page + 1) * PG, rows.length)} de {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2.5 py-1 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                  ← Anterior
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  className="px-2.5 py-1 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── SessionRow ────────────────────────────────────────────────────────────────

function SessionRow({ session, persona }: { session: SearchSession | SearchRow; persona: PersonaResponse }) {
  const [open, setOpen] = useState(false)

  const finishedAt = 'finished_at' in session ? session.finished_at : undefined
  const dataHora   = 'data_hora'   in session ? session.data_hora   : undefined

  const totalBenefits = persona.benefits.length
  const totalValue    = persona.benefits
    .map((b) => parseFloat(b.total_received.replace(/[^\d,]/g, '').replace(',', '.')))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => a + b, 0)

  const dateLabel = finishedAt
    ? finishedAt.toLocaleDateString('pt-BR')
    : dataHora
    ? new Date(dataHora).toLocaleDateString('pt-BR')
    : '—'

  return (
    <>
      <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setOpen(!open)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={13} className="text-white/30" /> : <ChevronRight size={13} className="text-white/30" />}
            <span className="text-sm text-white/80 font-medium">{persona.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            {persona.cpf && (
              <span className="text-xs font-mono text-white/50">{maskCPF(persona.cpf)}</span>
            )}
            {persona.nis && (
              <span className="text-[11px] font-mono text-white/30">
                NIS {persona.nis}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <MapPin size={11} />{persona.location || '—'}
          </div>
        </td>
        <td className="px-4 py-3"><span className="text-xs font-mono text-white/50">{totalBenefits}</span></td>
        <td className="px-4 py-3">
          <span className="text-xs font-mono text-accent-emerald">
            {totalValue > 0 ? `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/30 font-mono">{dateLabel}</span>
            {persona.links?.profile && (
              <a href={persona.links.profile} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-white/20 hover:text-accent-blue transition-colors">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={6} className="px-6 py-5 bg-navy-950/60">
            <div className="space-y-6">
              {persona.benefits.map((benefit, i) => <BenefitSection key={i} benefit={benefit} />)}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── DataExplorer ──────────────────────────────────────────────────────────────

export function DataExplorer() {
  const { state } = useApp()

  // Sessões locais da sessão atual (já no cache desde a busca)
  const localSessions = state.sessions.filter((s) => s.status === 'done' && s.result)
  const localIds      = new Set(localSessions.map((s) => s.job_id))

  // Rows do histórico (carregadas via header), sem duplicar locais
  const remoteRows = state.explorer.rows.filter((r) => !localIds.has(r.job_id))

  const hasAny = localSessions.length > 0 || remoteRows.length > 0

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-40">
        <Database size={28} className="text-white/30" />
        <div className="text-center space-y-1">
          <p className="text-sm text-white/50">Nenhum dado disponível</p>
          <p className="text-xs text-white/30">
            Complete uma busca ou carregue o histórico pelo seletor acima
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="bg-navy-800 border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Nome', 'CPF', 'Localidade', 'Benefícios', 'Total recebido', 'Data'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sessões da sessão atual — já no cache */}
              {localSessions.map((session) => (
                session.result && <SessionRow key={session.job_id} session={session} persona={session.result} />
              ))}
              {/* Histórico carregado via header */}
              {remoteRows.map((row) => {
                const persona = state.remoteCache[row.job_id] ?? row.persona as PersonaResponse | null
                if (!persona) return null
                return <SessionRow key={row.job_id} session={row} persona={persona} />
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}