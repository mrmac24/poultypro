import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Egg,
  DollarSign,
  BarChart3,
  Menu,
  X,
  User,
  LogOut,
  Package,
  Heart
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase/supabase'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/flocks', label: 'Flock Management', icon: Users },
  { path: '/eggs', label: 'Egg Tracking', icon: Egg },
  { path: '/sales', label: 'Sales & Accounting', icon: DollarSign },
  { path: '/feed', label: 'Feed Management', icon: Package },
  { path: '/health', label: 'Health Tracker', icon: Heart },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchProfile()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile()
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Try to get from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single()

        if (data && data.first_name) {
          setUserProfile(data)
        } else if (user.user_metadata?.first_name) {
          // Fallback to metadata
          setUserProfile({ first_name: user.user_metadata.first_name })
        }
      }
    } catch (error) {
      console.error('Error fetching profile in Layout:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem' }}>
          <img src="/logo.png" alt="PoultryPro Logo" style={{ width: '32px', height: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
          <h1 className="sidebar-logo" style={{ margin: 0, padding: 0 }}>PoultryPro</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-menu">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `nav-link user-link ${isActive ? 'active' : ''}`
              }
            >
              <User size={20} />
              <span>{userProfile?.first_name ? `${userProfile.first_name}'s Profile` : 'My Profile'}</span>
            </NavLink>
            <button onClick={handleLogout} className="nav-link logout-link">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            © 2026 PoultryPro
          </p>
        </div>
      </aside>

      {/* Mobile Menu Toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 200,
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.5rem',
          cursor: 'pointer',
        }}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Navigation */}
      <nav className="mobile-nav">
        <ul className="mobile-nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `mobile-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <User size={20} />
              <span>{userProfile?.first_name ? `${userProfile.first_name}'s Profile` : 'Profile'}</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}