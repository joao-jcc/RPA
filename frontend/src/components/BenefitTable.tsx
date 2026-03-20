import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { Benefit } from '../types'

interface Props {
  benefit: Benefit
}

function normalizeRow(row: unknown): Record<string, string> {
  if (!row || typeof row !== 'object') return {}
  const r = row as Record<string, unknown>
  // formato com wrapper columns: { columns: { ... } }
  if ('columns' in r && r.columns && typeof r.columns === 'object') {
    return Object.fromEntries(
      Object.entries(r.columns as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
    )
  }
  // formato flat: { "Mês de disponibilização": "11/2020", ... }
  return Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, String(v ?? '')])
  )
}

export function BenefitTable({ benefit }: Props) {
  const [open, setOpen] = useState(true)

  const rawRows = benefit.rows ?? []
  const rows = rawRows.map(normalizeRow)
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(Boolean) : []

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-navy-800 hover:bg-navy-700 transition-colors duration-150 text-left"
      >
        <div className="flex items-center gap-3">
          {open
            ? <ChevronDown size={14} className="text-white/40" />
            : <ChevronRight size={14} className="text-white/40" />}
          <span className="text-sm font-medium text-white/80">{benefit.type}</span>
          <span className="text-xs font-mono text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded-full border border-accent-emerald/20">
            {benefit.total_received}
          </span>
          {rows.length > 0 && (
            <span className="text-xs text-white/30">
              {rows.length} parcela{rows.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {benefit.detail_url && (
          <a
            href={benefit.detail_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-accent-blue transition-colors"
          >
            <ExternalLink size={11} />
            Portal
          </a>
        )}
      </button>

      {open && (
        <div className="overflow-x-auto">
          {rows.length === 0 || headers.length === 0 ? (
            <p className="px-4 py-6 text-xs text-white/30 text-center">
              Nenhuma parcela encontrada. ({rawRows.length} rows brutas)
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {headers.map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium text-white/40 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    {headers.map((h) => (
                      <td key={h} className="px-4 py-2.5 text-white/60 whitespace-nowrap font-mono">
                        {row[h] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}