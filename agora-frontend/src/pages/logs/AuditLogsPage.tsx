import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/Orders/Inventory/Stock/Reports) ─
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

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: BG_CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  fontFamily: fontBody,
  ...extra,
})

const inputStyle: React.CSSProperties = {
  fontFamily: fontBody,
  background: BG_BASE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '9px 13px',
  color: TEXT_PRIMARY,
  fontSize: 13,
  outline: 'none',
}

interface AuditLog {
  id: string
  user_id: string
  username?: string
  user_role?: string
  module: string
  action: string
  description: string
  old_value?: string
  new_value?: string
  ip_address?: string
  status: 'Success' | 'Failed'
  created_at: string
}

const ACTION_PALETTE: Record<string, { bg: string; color: string }> = {
  CREATE:  { bg: SUCCESS_DIM,                          color: SUCCESS },
  UPDATE:  { bg: 'rgba(99,102,241,0.14)',              color: '#a5b4fc' },
  DELETE:  { bg: DANGER_DIM,                           color: DANGER },
  LOGIN:   { bg: 'rgba(245,158,11,0.14)',              color: ACCENT },
  LOGOUT:  { bg: 'rgba(161,161,170,0.14)',             color: TEXT_SECONDARY },
  EXPORT:  { bg: 'rgba(168,85,247,0.14)',              color: '#c4b5fd' },
  VOID:    { bg: 'rgba(251,146,60,0.14)',              color: '#fb923c' },
  ADJUST:  { bg: 'rgba(34,211,238,0.14)',              color: '#67e8f9' },
  FAILED:  { bg: DANGER_DIM,                           color: DANGER },
}

const MODULES = ['Order Module', 'Inventory Module', 'Stock Module', 'Payment Module', 'User Module', 'Reports Module', 'Auth']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VOID', 'ADJUST', 'FAILED']

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', search, filterModule, filterAction, filterStatus, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get('/audit-logs', {
        params: {
          search: search || undefined,
          module: filterModule || undefined,
          action: filterAction || undefined,
          status: filterStatus || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      return res.data?.data ?? res.data ?? []
    },
  })

  const clearFilters = () => {
    setSearch(''); setFilterModule(''); setFilterAction('')
    setFilterStatus(''); setDateFrom(''); setDateTo('')
  }

  const hasFilters = search || filterModule || filterAction || filterStatus || dateFrom || dateTo

  const thStyle: React.CSSProperties = {
    fontFamily: fontBody,
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: BG_BASE,
  }

  const tdStyle: React.CSSProperties = {
    fontFamily: fontBody,
    padding: '12px 16px',
    fontSize: 12,
    borderTop: `1px solid ${BORDER}`,
  }

  return (
    <div className="audit-shell" style={{ display: 'flex', flexDirection: 'column', gap: 24, touchAction: 'pan-y' }}>
      <style>{`
        .audit-shell { touch-action: pan-y; }
        @media (max-width: 900px) {
          .audit-filters { flex-direction: column !important; align-items: stretch !important; }
          .audit-filters > input,
          .audit-filters > select,
          .audit-filters > div,
          .audit-filters > button {
            width: 100% !important;
          }
          .audit-filters .date-range {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .audit-table-wrap { overflow-x: auto !important; overflow-y: hidden !important; -webkit-overflow-scrolling: touch; }
          .audit-table { min-width: 960px; }
          .audit-modal-grid { grid-template-columns: 1fr !important; }
          .audit-modal-meta { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 22, fontWeight: 500, margin: 0 }}>Audit Logs</h1>
        <p style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
          Complete activity trail — read-only, retained for 12 months
        </p>
      </div>

      {/* Filters */}
      <div style={card({ padding: 16 })}>
        <div className="audit-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or user…"
            style={{ ...inputStyle, width: 220 }}
          />
          <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} style={inputStyle}>
            <option value="">All Modules</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={inputStyle}>
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
            <option value="">All Status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <div className="date-range" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
            <span style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13 }}>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ fontFamily: fontBody, background: 'none', border: 'none', color: ACCENT, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="audit-table-wrap" style={card({ overflow: 'hidden', padding: 0 })}>
        {isLoading ? (
          <div style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading logs…</div>
        ) : (
          <table className="audit-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Timestamp', 'User', 'Module', 'Action', 'Description', 'Status', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const ap = ACTION_PALETTE[log.action] ?? { bg: 'rgba(161,161,170,0.14)', color: TEXT_SECONDARY }
                return (
                  <tr key={log.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, color: TEXT_MUTED, whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('en-PH')}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>{log.username ?? log.user_id}</div>
                      {log.user_role && <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{log.user_role}</div>}
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{log.module}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: fontBody, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ap.bg, color: ap.color }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.description}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontFamily: fontBody,
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: log.status === 'Success' ? SUCCESS_DIM : DANGER_DIM,
                        color: log.status === 'Success' ? SUCCESS : DANGER,
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {(log.old_value || log.new_value) && (
                        <button onClick={() => setSelectedLog(log)}
                          style={{ fontFamily: fontBody, background: 'none', border: 'none', color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Diff →
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                    No logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Diff Modal */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={card({ padding: 28, width: '100%', maxWidth: 560 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 18, fontWeight: 500, margin: 0 }}>Change Detail</h2>
                <p style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 12, marginTop: 4 }}>{selectedLog.description}</p>
              </div>
              <button onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div className="audit-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Before', value: selectedLog.old_value, dimBg: DANGER_DIM, dimBorder: 'rgba(248,113,113,0.2)' },
                { label: 'After', value: selectedLog.new_value, dimBg: SUCCESS_DIM, dimBorder: 'rgba(52,211,153,0.2)' },
              ].map(({ label, value, dimBg, dimBorder }) => (
                <div key={label}>
                  <p style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</p>
                  <pre style={{ fontFamily: fontBody, background: dimBg, border: `1px solid ${dimBorder}`, borderRadius: 8, padding: 12, fontSize: 11, color: TEXT_SECONDARY, overflow: 'auto', maxHeight: 220, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {value ? JSON.stringify(JSON.parse(value), null, 2) : '—'}
                  </pre>
                </div>
              ))}
            </div>

            <div className="audit-modal-meta" style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'User', value: selectedLog.username ?? selectedLog.user_id },
                { label: 'Role', value: selectedLog.user_role ?? '—' },
                { label: 'IP', value: selectedLog.ip_address ?? '—' },
                { label: 'Time', value: new Date(selectedLog.created_at).toLocaleString('en-PH') },
              ].map(({ label, value }) => (
                <div key={label} style={{ fontFamily: fontBody, fontSize: 12, color: TEXT_SECONDARY }}>
                  <span style={{ color: TEXT_MUTED, fontWeight: 600 }}>{label}:</span> {value}
                </div>
              ))}
            </div>

            <button onClick={() => setSelectedLog(null)}
              style={{ fontFamily: fontBody, marginTop: 20, width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}