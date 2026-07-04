import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import type { Role } from '../types'

interface NavItem {
  to: string
  label: string
  roles?: Role[]
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    to: '/inventory',
    label: 'Inventory',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: '/stock',
    label: 'Stock',
    roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    to: '/payments',
    label: 'Payments',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Reports',
    roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    to: '/logs',
    label: 'Audit Logs',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Users',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

// ── unified charcoal / white / amber theme ────────────────────────────────────
const colors = {
  bg: '#18181b',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#f4f4f5',
  textMuted: '#71717a',
  amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.14)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.10)',
}
const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"

export const SIDEBAR_RAIL_WIDTH = 72
export const SIDEBAR_EXPANDED_WIDTH = 220

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNav = NAV.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role as Role))
  )

  const width = expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_RAIL_WIDTH

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        width,
        height: '100vh',
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.18s ease',
        boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.35)' : 'none',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: expanded ? '20px 20px 16px' : '20px 0 16px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: expanded ? 'flex-start' : 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ fontFamily: fontDisplay, color: colors.amber, fontSize: expanded ? '22px' : '20px', fontWeight: 600 }}>
          {expanded ? 'AGORA' : 'A'}
        </div>
        {expanded && (
          <div style={{ fontFamily: fontBody, color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>
            Inventory & POS
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={!expanded ? item.label : undefined}
            style={({ isActive }) => ({
              fontFamily: fontBody,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: expanded ? '9px 12px' : '10px',
              justifyContent: expanded ? 'flex-start' : 'center',
              borderRadius: '8px',
              marginBottom: '2px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? colors.amber : colors.textPrimary,
              background: isActive ? colors.amberBg : 'transparent',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            })}
          >
            <span style={{ opacity: 0.9, flexShrink: 0 }}>{item.icon}</span>
            {expanded && item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '12px 8px', borderTop: `1px solid ${colors.border}` }}>
        {expanded && (
          <div style={{ padding: '8px 12px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <div style={{ fontFamily: fontBody, color: colors.textPrimary, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name ?? '—'}
            </div>
            <div style={{ fontFamily: fontBody, color: colors.textMuted, fontSize: '11px', marginTop: '2px' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={!expanded ? 'Sign out' : undefined}
          style={{
            fontFamily: fontBody,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: expanded ? '9px 12px' : '10px',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: colors.textMuted,
            fontSize: '13.5px',
            cursor: 'pointer',
            textAlign: 'left',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.dangerBg
            e.currentTarget.style.color = colors.danger
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = colors.textMuted
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {expanded && 'Sign out'}
        </button>
      </div>
    </div>
  )
}