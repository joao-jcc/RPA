import { useState, useRef, type FormEvent } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { submitJob } from '../api/client'
import { useApp } from '../context/AppContext'

interface SearchBarProps {
  inputRef?: React.RefObject<HTMLInputElement>
}

export function SearchBar({ inputRef }: SearchBarProps) {
  const [termo, setTermo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { dispatch } = useApp()
  const internalRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? internalRef

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = termo.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError('')
    try {
      const { job_id } = await submitJob(trimmed)
      dispatch({
        type: 'ADD_SESSION',
        payload: {
          job_id,
          termo: trimmed,
          status: 'pending',
          events: [],
          started_at: new Date(),
        },
      })
      setTermo('')
    } catch {
      setError('Falha ao iniciar busca. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-3 bg-navy-800 border border-white/[0.08] hover:border-white/[0.15] focus-within:border-accent-blue/50 rounded-xl px-4 py-3 transition-all duration-200">
        {loading ? (
          <Loader2 size={16} className="text-accent-blue animate-spin flex-shrink-0" />
        ) : (
          <Search size={16} className="text-white/30 flex-shrink-0" />
        )}
        <input
          ref={ref}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome, CPF ou NIS..."
          className="flex-1 bg-transparent text-white placeholder-white/25 text-sm outline-none font-sans"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!termo.trim() || loading}
          className="bg-accent-blue/20 hover:bg-accent-blue/30 disabled:opacity-30 disabled:cursor-not-allowed text-accent-blue text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 flex-shrink-0"
        >
          Buscar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-accent-red">{error}</p>}
    </form>
  )
}
