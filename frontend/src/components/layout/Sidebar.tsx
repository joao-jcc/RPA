import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Database } from 'lucide-react'
import { authorizeGoogle } from '../../api/client'

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/data', label: 'Dados', icon: Database },
]

export function Sidebar() {
  async function handleAuth() {
    try {
      await authorizeGoogle()
      alert('Google Drive autorizado com sucesso!')
    } catch {
      alert('Falha ao autorizar. Verifique o servidor.')
    }
  }

  return (
    <aside
      className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-[220px] flex flex-col z-10"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--faint)' }}>
          Principal
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive ? 'active-nav' : ''
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--accent-light)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              if (!el.classList.contains('active-nav')) {
                el.style.background = 'var(--hover)'
                el.style.color = 'var(--text)'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              if (!el.classList.contains('active-nav')) {
                el.style.background = 'transparent'
                el.style.color = 'var(--muted)'
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} style={{ color: isActive ? 'var(--accent)' : undefined }} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Auth button */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleAuth}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Autorizar Google Drive
        </button>
      </div>
    </aside>
  )
}
