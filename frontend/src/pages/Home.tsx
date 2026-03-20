import { Bot } from 'lucide-react'
import { SessionCard } from '../components/SessionCard'
import { useApp } from '../context/AppContext'

export function Home() {
  const { state } = useApp()
  const sessions = state.sessions

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="flex flex-col items-center gap-3 opacity-30">
          <Bot size={28} className="text-white/40" />
          <p className="text-sm text-white/40">Nenhuma pesquisa encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pt-6">
      <div className="columns-1 lg:columns-2 xl:columns-2 gap-4">
        {sessions.map((session) => (
          <div key={session.job_id} className="break-inside-avoid mb-4">
            <SessionCard session={session} />
          </div>
        ))}
      </div>
    </div>
  )
}