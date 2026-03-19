import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react'
import { clearToken, getUser } from '../lib/auth'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '220px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0',
        }}
      >
        {/* Brand */}
        <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'var(--primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Personal Scrum
          </div>
          {user && (
            <div
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}
            >
              {user.name}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => navLinkStyle(isActive)}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/projects"
            style={({ isActive }) => navLinkStyle(isActive)}
          >
            <FolderKanban size={16} />
            Projects
          </NavLink>
        </nav>

        {/* Logout */}
        <div style={{ padding: '0.75rem' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface2)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '1.75rem 2rem',
        }}
      >
        {children}
      </main>
    </div>
  )
}

function navLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
    background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
    transition: 'all 0.15s',
  }
}
