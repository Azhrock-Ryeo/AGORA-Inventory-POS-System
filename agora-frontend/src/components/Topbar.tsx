import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/stock': 'Stock',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/logs': 'Audit Logs',
  '/users': 'Users',
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  ADMIN:       { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  MANAGER:     { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  CASHIER:     { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
}

export function Topbar() {
  const location = useLocation()
  const { user } = useAuthStore()

  const title = PAGE_TITLES[location.pathname] ?? 'AGORA'
  const roleStyle = ROLE_COLORS[user?.role ?? ''] ?? { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' }

  return (
    <div
      style={{
        height: '56px',
        minHeight: '56px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <h1 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 600, margin: 0 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '20px',
            background: roleStyle.bg,
            color: roleStyle.color,
            letterSpacing: '0.3px',
          }}
        >
          {user?.role?.replace('_', ' ')}
        </span>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </div>
  )
}