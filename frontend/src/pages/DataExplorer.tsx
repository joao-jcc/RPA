import { useState } from 'react'
import { ChevronDown, ChevronUp, Database, MapPin, ExternalLink, User, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { maskCPF } from '../utils/formatters'
import type { SearchSession, Benefit, PersonaResponse } from '../types'
import type { SearchRow } from '../api/client'

function normalizeRow(row: unknown): Record<string, string> {
  if (!row || typeof row !== 'object') return {}
  const r = row as Record<string, unknown>
  if ('columns' in r && r.columns && typeof r.columns === 'object') {
    return Object.fromEntries(Object.entries(r.columns as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]))
  }
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
}

function BenefitSection({ benefit }: { benefit: Benefit }) {
  const [open, setOpen] = useState(true)
  const rows    = (benefit.rows ?? []).map(normalizeRow)
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(Boolean) : []
  const [page, setPage] = useState(0)
  const PG = 10
  const totalPages = Math.ceil(rows.length / PG)
  const pageRows   = rows.slice(page * PG, (page + 1) * PG)

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Benefit header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        style={{ borderBottom: open ? '1px solid var(--border)' : 'none' }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-light)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{benefit.type}</p>

          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {rows.length} linha{rows.length !== 1 ? 's' : ''}
          </span>
          {benefit.total_received && (
            <span className="text-xs font-mono font-bold" style={{ color: '#10B981' }}>{benefit.total_received}</span>
          )}
          {open ? <ChevronUp size={16} style={{ color: 'var(--faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--faint)' }} />}
        </div>
      </div>

      {open && (
        <>
          {rows.length === 0 || headers.length === 0 ? (
            <p className="px-5 py-4 text-xs" style={{ color: 'var(--faint)' }}>Nenhuma parcela encontrada.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      {headers.map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--faint)', fontSize: '10px' }}>{h}</th>
                      ))}

                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {headers.map((h) => (
                          <td key={h} className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: 'var(--muted)' }}>{row[h] ?? '—'}</td>
                        ))}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs font-mono" style={{ color: 'var(--faint)' }}>
                    {page * PG + 1}–{Math.min((page + 1) * PG, rows.length)} de {rows.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                      className="px-3 py-1 rounded-lg text-xs transition-all disabled:opacity-30"
                      style={{ color: 'var(--muted)', background: 'var(--surface2)' }}>← Anterior</button>
                    <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                      className="px-3 py-1 rounded-lg text-xs transition-all disabled:opacity-30"
                      style={{ color: 'var(--muted)', background: 'var(--surface2)' }}>Próxima →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function PersonaDetail({ persona, driveUrl, onClose }: { persona: PersonaResponse; driveUrl?: string; onClose: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      {/* Persona header */}
      <div className="p-5" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {persona.name?.[0] ?? '?'}
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{persona.name}</h2>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {persona.cpf && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}># {maskCPF(persona.cpf)}</span>}
                {persona.nis && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>NIS {persona.nis}</span>}
                {persona.location && <span className="text-xs" style={{ color: 'var(--muted)' }}>{persona.location}</span>}
                {persona.links?.profile && (
                  <a href={persona.links.profile} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                    <ExternalLink size={11} /> Gov.br
                  </a>
                )}
                {driveUrl && (
                  <a href={driveUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md"
                    style={{ color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <ExternalLink size={11} /> Drive
                  </a>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--faint)', background: 'var(--surface2)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Benefit tabs */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {persona.benefits.map((b, i) => (
            <span key={i} className="text-xs font-medium px-3 py-1 rounded-full cursor-pointer" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {b.type}
            </span>
          ))}
        </div>
      </div>

      {/* Benefit tables */}
      <div className="p-5">
        {persona.benefits.map((benefit, i) => (
          <BenefitSection key={i} benefit={benefit} />
        ))}
      </div>
    </div>
  )
}

function PersonaListItem({ name, cpf, benefitCount, isSelected, onClick, letter }: {
  name: string; cpf: string; benefitCount: number
  isSelected: boolean; onClick: () => void; letter: string
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all"
      style={{
        background: isSelected ? 'var(--accent-light)' : 'var(--surface)',
        border: `1px solid ${isSelected ? 'rgba(79,110,247,0.2)' : 'var(--border)'}`,
        marginBottom: '8px',
      }}
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
        style={{ background: isSelected ? 'var(--accent)' : 'var(--surface2)', color: isSelected ? 'white' : 'var(--muted)' }}>
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{name}</p>
        <p className="text-xs font-mono truncate" style={{ color: 'var(--muted)' }}>{cpf}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{benefitCount} benefícios</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--faint)', flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

export function DataExplorer() {
  const { state } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const localSessions = state.sessions.filter((s) => s.status === 'done' && s.result)
  const localIds      = new Set(localSessions.map((s) => s.job_id))
  const remoteRows    = state.explorer.rows.filter((r) => !localIds.has(r.job_id))

  // Build unified list
  type Entry = { id: string; persona: PersonaResponse; driveUrl?: string }
  const entries: Entry[] = [
    ...localSessions.map((s) => ({ id: s.job_id, persona: s.result!, driveUrl: s.events.find((e) => e.stage === 'done')?.url })),
    ...remoteRows.map((r) => ({ id: r.job_id, persona: (state.remoteCache[r.job_id] ?? r.persona) as PersonaResponse })).filter((e) => e.persona),
  ]

  const selected = entries.find((e) => e.id === selectedId)

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4" style={{ opacity: 0.4, color: 'var(--muted)' }}>
        <Database size={28} />
        <div className="text-center space-y-1">
          <p className="text-sm">Nenhum dado disponível</p>
          <p className="text-xs" style={{ color: 'var(--faint)' }}>Complete uma busca ou carregue o histórico pelo seletor acima</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]" style={{ background: 'var(--bg)' }}>
      {/* Left panel — person list */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto p-4" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="mb-4">
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Pessoas</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Clique para ver os processos</p>
        </div>
        {entries.map(({ id, persona }) => (
          <PersonaListItem
            key={id}
            name={persona.name ?? '—'}
            cpf={maskCPF(persona.cpf ?? '')}
            benefitCount={persona.benefits?.length ?? 0}
            letter={(persona.name?.[0] ?? '?').toUpperCase()}
            isSelected={selectedId === id}
            onClick={() => setSelectedId(selectedId === id ? null : id)}
          />
        ))}
      </div>

      {/* Right panel */}
      {selected ? (
        <PersonaDetail persona={selected.persona} driveUrl={selected.driveUrl} onClose={() => setSelectedId(null)} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--faint)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
            <User size={28} style={{ color: 'var(--faint)' }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>Selecione uma pessoa</p>
          <p className="text-sm text-center max-w-xs" style={{ color: 'var(--muted)' }}>
            Clique em um nome na lista para visualizar seus processos organizados por benefício
          </p>
        </div>
      )}
    </div>
  )
}