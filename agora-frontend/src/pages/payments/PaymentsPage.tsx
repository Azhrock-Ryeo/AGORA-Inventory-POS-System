import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/Orders/Inventory/Stock) ─
const BG_BASE = '#18181b'
const BG_CARD = '#1f1f23'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT_PRIMARY = '#f4f4f5'
const TEXT_SECONDARY = '#a1a1aa'
const TEXT_MUTED = '#71717a'
const ACCENT = '#f59e0b'
const ACCENT_DIM = 'rgba(245,158,11,0.14)'
const SUCCESS = '#34d399'
const SUCCESS_DIM = 'rgba(52,211,153,0.14)'
const DANGER = '#f87171'
const DANGER_DIM = 'rgba(248,113,113,0.14)'
const NEUTRAL_BG = 'rgba(255,255,255,0.06)'

const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: BG_CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  fontFamily: fontBody,
  ...extra,
})

const peso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Transaction {
  id: string
  order_id: string
  amount_paid: number
  payment_method: string
  change: number
  status: string
  created_at: string
  order?: {
    id: string
    total: number
    cashier?: { name: string }
  }
}

export default function PaymentsPage() {

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions')
      return res.data?.data ?? res.data ?? []
    },
  })

  const totalRevenue = transactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((s, t) => s + Number(t.amount_paid), 0)

  const todayCount = transactions.filter(
    (t) => new Date(t.created_at).toDateString() === new Date().toDateString()
  ).length

  const statusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'completed') return { bg: SUCCESS_DIM, color: SUCCESS }
    if (s === 'failed' || s === 'unpaid') return { bg: DANGER_DIM, color: DANGER }
    if (s === 'voided' || s === 'cancelled') return { bg: NEUTRAL_BG, color: TEXT_SECONDARY }
    return { bg: ACCENT_DIM, color: ACCENT }
  }

  const thStyle: React.CSSProperties = {
    fontFamily: fontBody,
    padding: '12px 20px',
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
    padding: '14px 20px',
    fontSize: 13,
    borderTop: `1px solid ${BORDER}`,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 22, fontWeight: 500, margin: 0 }}>Payments</h1>
        <p style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Transaction history and payment records</p>
      </div>

      {/* KPI strip — color encodes meaning: amber = revenue, neutral = plain counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Revenue', value: peso(totalRevenue), sub: 'All paid transactions', accent: ACCENT },
          { label: "Today's Transactions", value: String(todayCount), sub: 'Processed today', accent: TEXT_PRIMARY },
          { label: 'Total Transactions', value: String(transactions.length), sub: 'All time', accent: TEXT_PRIMARY },
        ].map((kpi) => (
          <div key={kpi.label} style={card({ padding: 20 })}>
            <div style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT_MUTED, marginBottom: 6 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: fontBody, fontSize: 28, fontWeight: 700, color: kpi.accent, lineHeight: 1.1 }}>{kpi.value}</div>
            <div style={{ fontFamily: fontBody, fontSize: 12, color: TEXT_MUTED, marginTop: 6 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={card({ overflow: 'hidden', padding: 0 })}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: fontBody, color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600 }}>Transaction History</span>
        </div>
        {isLoading ? (
          <div style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Transaction ID', 'Order ID', 'Cashier', 'Amount Paid', 'Change', 'Method', 'Status', 'Date'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const sc = statusColor(t.status)
                return (
                  <tr key={t.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, color: TEXT_MUTED }}>
                      #{t.id.slice(-8).toUpperCase()}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, color: TEXT_SECONDARY }}>
                      #{t.order_id.slice(-8).toUpperCase()}
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{t.order?.cashier?.name ?? '—'}</td>
                    <td style={{ ...tdStyle, color: ACCENT, fontWeight: 700 }}>{peso(t.amount_paid)}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{peso(t.change)}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY, textTransform: 'capitalize' }}>{t.payment_method}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: fontBody, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_MUTED, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(t.created_at).toLocaleString('en-PH')}
                    </td>
                  </tr>
                )
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}