import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Trophy,
  Users,
  TrendingUp,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/roster', label: 'Roster', icon: Users },
    { path: '/trends', label: 'Trends', icon: TrendingUp },
    { path: '/admin', label: 'Admin', icon: Shield },
  ]

  const isActive = (path) => location.pathname === path

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-2xl font-bold text-ember">JRPAT Tracker</div>
            <div className="text-sm text-muted">Cedar Hill Fire Department</div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center mx-8">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive(path)
                    ? 'bg-ember text-bg font-semibold'
                    : 'text-muted hover:text-txt hover:bg-surface2'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm">{label}</span>
              </Link>
            ))}
          </nav>

          {/* User menu & mobile toggle */}
          <div className="flex-1 flex items-center justify-end gap-4">
            {user && (
              <button
                onClick={handleSignOut}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-muted hover:text-txt transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            )}
            {user && (
              <div className="hidden sm:block text-xs text-muted">
                {user.email}
              </div>
            )}
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-surface2 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface2 border-t border-border px-4 py-3 flex flex-col gap-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(path)
                    ? 'bg-ember text-bg font-semibold'
                    : 'text-muted hover:text-txt hover:bg-surface'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            ))}
            {user && (
              <>
                <div className="px-4 py-2 text-xs text-muted border-t border-border mt-2 pt-3">
                  {user.email}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted hover:text-txt hover:bg-surface transition-colors"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
        {children}
      </main>

      {/* Bottom Nav - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex items-center justify-around h-16 z-50">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive(path)
                ? 'text-ember bg-surface2'
                : 'text-muted hover:text-txt'
            }`}
            title={label}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Padding for bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </div>
  )
}
