import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Database, ExternalLink } from 'lucide-react'
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
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-[260px] bg-navy-900 border-r border-white/[0.06] flex flex-col z-10">
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] text-white border-l-2 border-accent-blue pl-[14px]'
                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.04]'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 border-t border-white/[0.06] pt-3 flex-shrink-0">
        <button
          onClick={handleAuth}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-white/35 hover:text-white/65 hover:bg-white/[0.04] transition-all duration-150"
        >
          <ExternalLink size={15} />
          Autorizar Drive
        </button>
      </div>
    </aside>
  )
}