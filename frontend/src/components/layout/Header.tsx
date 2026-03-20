import { Search, Loader2, Activity, CheckCircle2, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useApp } from '../../context/AppContext'
import { submitJob, checkGoogleAuth } from '../../api/client'

export function Header() {
  const { state, dispatch } = useApp()
  const [termo, setTermo] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const running = state.sessions.filter((s) => s.status === 'running' || s.status === 'pending').length
  const done    = state.sessions.filter((s) => s.status === 'done').length
  const failed  = state.sessions.filter((s) => s.status === 'failed').length

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = termo.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      const auth = await checkGoogleAuth()
      if (!auth.authorized) {
        setAuthError(auth.reason ?? 'Google Drive não autorizado.')
        return
      }
      setAuthError(null)
      const { job_id } = await submitJob(trimmed)
      dispatch({
        type: 'ADD_SESSION',
        payload: { job_id, termo: trimmed, status: 'pending', events: [], started_at: new Date() },
      })
      setTermo('')
    } catch {
      setAuthError('Falha ao iniciar busca. Verifique o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-navy-900 border-b border-white/[0.06] flex items-center gap-6 z-20 pr-6">

      {/* Logo */}
      <div className="w-[260px] flex items-center gap-3 flex-shrink-0 border-r border-white/[0.06] h-full pl-6 pr-6">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-accent-blue" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <path d="M12 11V7"/>
          <circle cx="12" cy="5" r="2"/>
          <path d="M8 15h.01M12 15h.01M16 15h.01"/>
          <path d="M3 16H1M23 16H21"/>
        </svg>
        <span className="text-base font-semibold text-white tracking-tight">RoboGov</span>
      </div>

      {/* Search — centro */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 max-w-xl flex items-center gap-2.5 bg-navy-800 border border-white/[0.08] hover:border-white/[0.14] focus-within:border-accent-blue/40 rounded-xl px-4 py-2.5 transition-all duration-200"
      >
        {loading
          ? <Loader2 size={14} className="text-accent-blue animate-spin flex-shrink-0" />
          : <Search size={14} className="text-white/30 flex-shrink-0" />
        }
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome, CPF ou NIS..."
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          disabled={loading}
        />
      </form>

      {/* Auth error banner */}
      {authError && (
        <div className="absolute top-16 left-[260px] right-0 bg-accent-red/10 border-b border-accent-red/20 px-6 py-2.5 flex items-center justify-between z-10">
          <span className="text-xs text-accent-red">{authError}</span>
          <button
            onClick={async () => {
              const { authorizeGoogle } = await import('../../api/client')
              await authorizeGoogle()
              setAuthError(null)
            }}
            className="text-xs font-medium text-accent-red border border-accent-red/30 px-3 py-1 rounded-lg hover:bg-accent-red/10 transition-colors ml-4 flex-shrink-0"
          >
            Autorizar agora
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Contadores */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
          running > 0
            ? 'bg-accent-amber/10 border-accent-amber/25 text-accent-amber'
            : 'bg-white/[0.03] border-white/[0.05] text-white/20'
        }`}>
          <Activity size={13} />
          <span className="text-xs font-mono font-medium">{running}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
          done > 0
            ? 'bg-accent-emerald/10 border-accent-emerald/25 text-accent-emerald'
            : 'bg-white/[0.03] border-white/[0.05] text-white/20'
        }`}>
          <CheckCircle2 size={13} />
          <span className="text-xs font-mono font-medium">{done}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
          failed > 0
            ? 'bg-accent-red/10 border-accent-red/25 text-accent-red'
            : 'bg-white/[0.03] border-white/[0.05] text-white/20'
        }`}>
          <XCircle size={13} />
          <span className="text-xs font-mono font-medium">{failed}</span>
        </div>
      </div>
    </header>
  )
}