import { Search, Loader2, Activity, CheckCircle2, XCircle, RefreshCcw, Sun, Moon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { submitJob, checkGoogleAuth, streamSearches, type SearchRow } from '../../api/client'
import type { PersonaResponse } from '../../types'
import type { Theme } from '../../hooks/useTheme'

interface HeaderProps {
  onToggleTheme: () => void
  theme: Theme
}

export function Header({ onToggleTheme, theme }: HeaderProps) {
  const { state, dispatch } = useApp()
  const location = useLocation()
  const isData = location.pathname === '/data'

  const running = state.sessions.filter((s) => s.status === 'running' || s.status === 'pending').length
  const done    = state.sessions.filter((s) => s.status === 'done').length
  const failed  = state.sessions.filter((s) => s.status === 'failed').length

  const [termo, setTermo]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = termo.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      const auth = await checkGoogleAuth()
      if (!auth.authorized) { setAuthError(auth.reason ?? 'Google Drive não autorizado.'); return }
      setAuthError(null)
      const { job_id } = await submitJob(trimmed)
      dispatch({ type: 'ADD_SESSION', payload: { job_id, termo: trimmed, status: 'pending', events: [], started_at: new Date() } })
      setTermo('')
    } catch {
      setAuthError('Falha ao iniciar busca. Verifique o servidor.')
    } finally {
      setLoading(false)
    }
  }

  const { fromRow, toRow } = state.explorer
  const [streaming, setStreaming] = useState(false)

  const setFromRow = (v: number) =>
    dispatch({ type: 'EXPLORER_SET_RANGE', payload: { fromRow: v, toRow: state.explorer.toRow } })
  const setToRow = (v: number) =>
    dispatch({ type: 'EXPLORER_SET_RANGE', payload: { fromRow: state.explorer.fromRow, toRow: v } })

  function handleLoad() {
    if (streaming) return
    setStreaming(true)
    dispatch({ type: 'EXPLORER_RESET_ROWS' })
    streamSearches(fromRow, toRow,
      (row: SearchRow) => {
        if (row.persona) dispatch({ type: 'CACHE_REMOTE', payload: { job_id: row.job_id, persona: row.persona as PersonaResponse } })
        dispatch({ type: 'EXPLORER_ADD_ROW', payload: row })
      },
      (_count: number) => {},
      (_total: number) => { dispatch({ type: 'EXPLORER_SET_FETCHED' }); setStreaming(false) },
      (_msg: string)   => { dispatch({ type: 'EXPLORER_SET_FETCHED' }); setStreaming(false) },
    )
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center gap-4 px-5 z-20"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="w-[220px] flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="10" width="14" height="10" rx="2" fill="white" fillOpacity="0.9"/>
              <rect x="8" y="7" width="8" height="4" rx="1.5" fill="white" fillOpacity="0.7"/>
              <circle cx="12" cy="5" r="1.5" fill="white" fillOpacity="0.7"/>
              <circle cx="9.5" cy="14" r="1.2" fill="#4F6EF7"/>
              <circle cx="14.5" cy="14" r="1.2" fill="#4F6EF7"/>
              <rect x="10" y="17" width="4" height="1.2" rx="0.6" fill="#4F6EF7"/>
              <line x1="3" y1="14" x2="5" y2="14" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
              <line x1="19" y1="14" x2="21" y2="14" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>RoboGov</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--muted)' }}>Portal da Transparência</p>
          </div>
        </div>

        {/* Search / Range */}
        <div className="flex-1 max-w-lg">
          {!isData ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 transition-all" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              {loading
                ? <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
                : <Search size={14} className="flex-shrink-0" style={{ color: 'var(--faint)' }} />
              }
              <input
                type="text" value={termo} onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar nome, CPF ou NIS"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text)' }}
                disabled={loading}
              />
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--faint)' }}>#</span>
                <input type="number" min={1} value={fromRow}
                  onChange={(e) => setFromRow(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 bg-transparent text-sm font-mono text-center outline-none" style={{ color: 'var(--text)' }}
                  placeholder="Linha X"
                />
              </div>
              <span className="text-sm" style={{ color: 'var(--faint)' }}>até</span>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--faint)' }}>#</span>
                <input type="number" min={fromRow} value={toRow}
                  onChange={(e) => setToRow(Math.max(fromRow, parseInt(e.target.value) || fromRow))}
                  className="w-14 bg-transparent text-sm font-mono text-center outline-none" style={{ color: 'var(--text)' }}
                  placeholder="Linha Y"
                />
              </div>
              <button onClick={handleLoad} disabled={streaming}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}>
                <RefreshCcw size={13} className={streaming ? 'animate-spin' : ''} />
                {streaming ? 'Sincronizando...' : 'Carregar Drive'}
              </button>
              {streaming && <span className="text-xs font-mono" style={{ color: 'var(--faint)' }}>{state.explorer.rows.length} / {toRow - fromRow + 1}</span>}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Counters */}
          {[
            { icon: Activity, count: running, active: running > 0, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
            { icon: CheckCircle2, count: done, active: done > 0, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
            { icon: XCircle, count: failed, active: failed > 0, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
          ].map(({ icon: Icon, count, active, color, bg }, i) => (
            <div key={i}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all"
              style={{
                background: active ? bg : 'var(--surface2)',
                border: `1px solid ${active ? color + '33' : 'var(--border)'}`,
                color: active ? color : 'var(--faint)',
              }}
            >
              <Icon size={12} />{count}
            </div>
          ))}

          <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />

          {/* Theme toggle */}
          <button onClick={onToggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {authError && (
        <div className="fixed top-14 left-[220px] right-0 px-5 py-2 flex items-center justify-between z-10"
          style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-xs" style={{ color: '#EF4444' }}>{authError}</span>
          <button
            onClick={async () => { const { authorizeGoogle } = await import('../../api/client'); await authorizeGoogle(); setAuthError(null) }}
            className="text-xs font-medium px-3 py-1 rounded-lg ml-4"
            style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            Autorizar agora
          </button>
        </div>
      )}
    </>
  )
}