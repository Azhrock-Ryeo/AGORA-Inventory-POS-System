import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../stores/useAuthStore'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/Orders/Inventory/Stock/Reports/AuditLogs) ─
const BG_BASE = '#18181b'
const BG_CARD = '#1f1f23'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT_PRIMARY = '#f4f4f5'
const TEXT_SECONDARY = '#a1a1aa'
const TEXT_MUTED = '#71717a'
const ACCENT = '#f59e0b'
const SUCCESS = '#34d399'
const SUCCESS_DIM = 'rgba(52,211,153,0.14)'
const DANGER = '#f87171'
const DANGER_DIM = 'rgba(248,113,113,0.14)'

const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER'

interface User {
  id: string
  name: string
  email: string
  user_role: {
    role: {
      role_name: Role
    }
  }
  is_active: boolean
  created_at: string
}

// helper to safely get role string
const getRole = (u: User): Role => {
  return u.user_role?.role?.role_name
}

interface FormState {
  name: string
  email: string
  password: string
  role: Role
}

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER']

const ROLE_STYLE: Record<Role, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg: 'rgba(167,139,250,0.14)', color: '#a78bfa' },
  ADMIN:       { bg: 'rgba(245,158,11,0.14)',  color: ACCENT },
  MANAGER:     { bg: SUCCESS_DIM,              color: SUCCESS },
  CASHIER:     { bg: 'rgba(96,165,250,0.14)',  color: '#60a5fa' },
}

const card: React.CSSProperties = {
  fontFamily: fontBody,
  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden',
}

const inputStyle: React.CSSProperties = {
  fontFamily: fontBody,
  width: '100%', padding: '10px 12px', background: BG_BASE, border: `1px solid ${BORDER}`,
  borderRadius: 8, color: TEXT_PRIMARY, fontSize: 13, boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  fontFamily: fontBody,
  padding: '10px 20px', background: ACCENT, border: 'none', borderRadius: 8,
  color: BG_BASE, fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  fontFamily: fontBody,
  padding: '10px 16px', background: 'transparent', border: `1px solid ${BORDER}`,
  borderRadius: 8, color: TEXT_SECONDARY, fontSize: 13, cursor: 'pointer',
}

export default function UsersPage() {
  const { user: me } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', role: 'CASHIER' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Only SUPER_ADMIN can see/assign the SUPER_ADMIN role
  const availableRoles = ROLES.filter((r) => {
      if (me?.role === 'SUPER_ADMIN') return r !== 'SUPER_ADMIN' // SA can create Admin and below
      if (me?.role === 'ADMIN') return r !== 'SUPER_ADMIN' && r !== 'ADMIN' // Admin can create Manager and below
      return false // Others can't create anyone
    })
const handleDelete = async (u: User) => {
  if (!confirm(`Delete "${u.name}"? This cannot be undone.`)) return
  try {
    await api.delete(`/users/${u.id}`)
    setUsers((prev) => prev.filter((x) => x.id !== u.id))
  } catch (e: any) {
    alert(e.response?.data?.message ?? 'Failed to delete user.')
  }
}
  const load = async () => {
    try {
      const res = await api.get('/users')
      setUsers(Array.isArray(res.data) ? res.data : res.data?.data ?? [])
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    // Default role to CASHIER; if current user is not SUPER_ADMIN, SUPER_ADMIN is not an option anyway
    setForm({ name: '', email: '', password: '', role: 'CASHIER' })
    setError('')
    setModalOpen(true)
  }

const openEdit = (u: User) => {
  // Only SUPER_ADMIN can edit another SUPER_ADMIN
  if (getRole(u) === 'SUPER_ADMIN' && me?.role !== 'SUPER_ADMIN') return
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: getRole(u) })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) {
      setError('Name, email, and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload: any = { name: form.name, email: form.email, role: form.role }
      if (form.password) payload.password = form.password
      if (editing) {
        const res = await api.put(`/users/${editing.id}`, payload)
        setUsers((prev) => prev.map((u) => (u.id === editing.id ? res.data : u)))
      } else {
        const res = await api.post('/users', payload)
        setUsers((prev) => [res.data, ...prev])
      }
      setModalOpen(false)
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (u: User) => {
    try {
      const res = await api.patch(`/users/${u.id}/status`)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.data : x)))
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Failed to update status.')
    }
  }

  return (
    <div className="users-shell" style={{ display: 'flex', flexDirection: 'column', gap: 24, touchAction: 'pan-y' }}>
      <style>{`
        .users-shell { touch-action: pan-y; }
        @media (max-width: 900px) {
          .users-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .users-stats { grid-template-columns: 1fr !important; }
          .users-table-wrap { overflow-x: auto !important; overflow-y: hidden !important; -webkit-overflow-scrolling: touch; }
          .users-table { min-width: 900px; }
          .users-modal { width: min(92vw, 420px) !important; padding: 20px !important; }
        }
      `}</style>
      {/* Header */}
      <div className="users-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 22, fontWeight: 500, margin: 0 }}>Users</h1>
          <p style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Manage system accounts and roles.</p>
        </div>
        <button onClick={openCreate} style={btnPrimary}>+ Add User</button>
      </div>

      {/* Stats row */}
      <div className="users-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {ROLES.filter((role) => {
          if (me?.role === 'SUPER_ADMIN') return role !== 'SUPER_ADMIN'
          if (me?.role === 'ADMIN') return role !== 'SUPER_ADMIN' && role !== 'ADMIN'
              return false
        }).map((role) => {
          const count = users.filter((u) => getRole(u) === role).length
          const s = ROLE_STYLE[role]
          return (
            <div key={role} style={{ ...card, padding: '16px 20px' }}>
              <div style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: TEXT_MUTED }}>
                {role.replace('_', ' ')}
              </div>
              <div style={{ fontFamily: fontBody, fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{count}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="users-table-wrap" style={card}>
        {loading ? (
          <div style={{ fontFamily: fontBody, padding: 40, textAlign: 'center', color: TEXT_MUTED }}>Loading...</div>
        ) : (
          <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: BG_BASE }}>
                {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} style={{ fontFamily: fontBody, padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rs = ROLE_STYLE[getRole(u)] ?? { bg: 'rgba(161,161,170,0.14)', color: TEXT_SECONDARY }
                const isMe = u.id === me?.id
                const isSuperAdmin = getRole(u) === 'SUPER_ADMIN'
                const canEdit = !isSuperAdmin || me?.role === 'SUPER_ADMIN'
                // Cannot deactivate yourself, and cannot deactivate a Super Admin unless you are one
                const canToggle = !isMe && (!isSuperAdmin || me?.role === 'SUPER_ADMIN')
                return (
                  <tr key={u.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ fontFamily: fontBody, padding: '14px 20px', color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {u.name[0].toUpperCase()}
                        </div>
                        {u.name} {isMe && <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 400 }}>(you)</span>}
                      </div>
                    </td>
                    <td style={{ fontFamily: fontBody, padding: '14px 20px', color: TEXT_SECONDARY, fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: rs.bg, color: rs.color }}>
                        {getRole(u).replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: u.is_active ? SUCCESS_DIM : 'rgba(161,161,170,0.14)', color: u.is_active ? SUCCESS : TEXT_MUTED }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontFamily: fontBody, padding: '14px 20px', color: TEXT_MUTED, fontSize: 12 }}>
                      {new Date(u.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canEdit && (
                          <button onClick={() => openEdit(u)} style={{ ...btnGhost, padding: '6px 14px', fontSize: 12 }}>Edit</button>
                        )}
                        {canToggle && (
                          <>
                            <button
                              onClick={() => handleToggle(u)}
                              style={{ ...btnGhost, padding: '6px 14px', fontSize: 12, color: u.is_active ? DANGER : SUCCESS, borderColor: u.is_active ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)' }}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            {me?.role === 'SUPER_ADMIN' && !isMe && !isSuperAdmin && (
                              <button
                                onClick={() => handleDelete(u)}
                                style={{ ...btnGhost, padding: '6px 14px', fontSize: 12, color: DANGER, borderColor: 'rgba(248,113,113,0.3)' }}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ fontFamily: fontBody, padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="users-modal" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw' }}>
            <h2 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 18, fontWeight: 500, margin: '0 0 20px' }}>
              {editing ? 'Edit User' : 'Add User'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Juan Dela Cruz' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'juan@agora.com' },
                { label: editing ? 'New Password (leave blank to keep)' : 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontFamily: fontBody, display: 'block', color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontFamily: fontBody, display: 'block', color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} style={inputStyle}>
                  {availableRoles.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>

              {error && <div style={{ fontFamily: fontBody, background: DANGER_DIM, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: DANGER, fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setModalOpen(false)} style={btnGhost}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}