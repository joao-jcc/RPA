import { useState } from 'react'
import { Layers, Activity, CheckCircle2, XCircle } from 'lucide-react'
import { SessionCard } from '../components/SessionCard'
import { useApp } from '../context/AppContext'

type Filter = 'all' | 'running' | 'done' | 'failed'

function StatCard({ icon: Icon, label, count, color, bg, active, onClick }: {
  icon: React.ElementType; label: string; count: number
  color: string; bg: string; active: boolean; onClick: () => void
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all"
      onClick={onClick}
      style={{
        background: active ? bg : 'var(--surface)',
        border: `1px solid ${active ? color + '44' : 'var(--border)'}`,
        boxShadow: active ? `0 0 0 2px ${color}22` : 'none',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
        <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text)' }}>{count}</p>
      </div>
    </div>
  )
}

export function Home() {
  const { state } = useApp()
  const sessions = state.sessions
  const [filter, setFilter] = useState<Filter>('all')

  const total   = sessions.length
  const running = sessions.filter((s) => s.status === 'running' || s.status === 'pending').length
  const done    = sessions.filter((s) => s.status === 'done').length
  const failed  = sessions.filter((s) => s.status === 'failed').length

  const filtered = filter === 'all'     ? sessions
    : filter === 'running' ? sessions.filter((s) => s.status === 'running' || s.status === 'pending')
    : filter === 'done'    ? sessions.filter((s) => s.status === 'done')
    : sessions.filter((s) => s.status === 'failed')

  function toggleFilter(f: Filter) {
    setFilter(prev => prev === f ? 'all' : f)
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Painel de Processos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Visão geral de todos os processos em andamento</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={Layers}       label="Total"      count={0} color="#4F6EF7" bg="rgba(79,110,247,0.10)"  active={false} onClick={() => {}} />
          <StatCard icon={Activity}     label="Ativos"     count={0} color="#F59E0B" bg="rgba(245,158,11,0.10)"  active={false} onClick={() => {}} />
          <StatCard icon={CheckCircle2} label="Concluídos" count={0} color="#10B981" bg="rgba(16,185,129,0.10)"  active={false} onClick={() => {}} />
          <StatCard icon={XCircle}      label="Falharam"   count={0} color="#EF4444" bg="rgba(239,68,68,0.10)"   active={false} onClick={() => {}} />
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'var(--faint)' }}>
          <Layers size={32} />
          <p className="text-sm">Nenhuma pesquisa iniciada</p>
          <p className="text-xs">Use a barra de busca acima para começar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Painel de Processos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Visão geral de todos os processos em andamento</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={Layers}       label="Total"      count={total}   color="#4F6EF7" bg="rgba(79,110,247,0.10)"  active={filter === 'all'}     onClick={() => setFilter('all')} />
        <StatCard icon={Activity}     label="Ativos"     count={running} color="#F59E0B" bg="rgba(245,158,11,0.10)"  active={filter === 'running'} onClick={() => toggleFilter('running')} />
        <StatCard icon={CheckCircle2} label="Concluídos" count={done}    color="#10B981" bg="rgba(16,185,129,0.10)"  active={filter === 'done'}    onClick={() => toggleFilter('done')} />
        <StatCard icon={XCircle}      label="Falharam"   count={failed}  color="#EF4444" bg="rgba(239,68,68,0.10)"   active={filter === 'failed'}  onClick={() => toggleFilter('failed')} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Processos Correntes{' '}
          <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {filtered.length}
          </span>
        </h2>
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} className="text-xs px-2.5 py-1 rounded-lg transition-all" style={{ color: 'var(--muted)', background: 'var(--surface2)' }}>
            Limpar filtro ×
          </button>
        )}
      </div>

      <div className="columns-1 lg:columns-2 xl:columns-3 gap-4">
        {filtered.map((session) => (
          <div key={session.job_id} className="break-inside-avoid mb-4">
            <SessionCard session={session} />
          </div>
        ))}
      </div>
    </div>
  )
}