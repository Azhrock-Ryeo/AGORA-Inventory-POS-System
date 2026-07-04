import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import api from '../../services/api'
import { useAuthStore } from '../../stores/useAuthStore'

const peso = (v: number) =>
  `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface Order {
  id: string
  status: string
  total: number
  discount: number
  created_at: string
  cashier?: { name: string }
  items?: { product_id: string; quantity: number; unit_price: number; product?: { name: string } }[]
}

interface StockLevel {
  id: string
  quantity: number
  low_stock_threshold: number
  product: { id: string; name: string; sku: string }
}

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar) ──────────
const colors = {
  ink: '#18181b',
  cardBg: '#1f1f23',
  cardBorder: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.06)',
  paper: '#f4f4f5',
  sand: '#d4d4d8',
  sandMuted: '#71717a',
  marigold: '#f59e0b',
  marigoldBg: 'rgba(245,158,11,0.14)',
  jade: '#34d399',
  jadeBg: 'rgba(52,211,153,0.14)',
  brick: '#ef4444',
  brickBg: 'rgba(239,68,68,0.12)',
}

const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// ── small helpers ────────────────────────────────────────────────────────────
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: colors.cardBg,
  border: `0.5px solid ${colors.cardBorder}`,
  borderRadius: '10px',
  padding: '20px',
  ...extra,
})

const label: React.CSSProperties = {
  fontFamily: fontBody,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.sandMuted,
  marginBottom: '6px',
}

// ── chart tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label: lbl }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: colors.ink, border: `0.5px solid ${colors.cardBorder}`, borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontFamily: fontBody, color: colors.sandMuted, fontSize: 12, marginBottom: 6 }}>{lbl}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontFamily: fontMono, color: colors.marigold, fontSize: 13, fontWeight: 500 }}>
          {p.name}: {peso(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [todayOrdersRes, recentRes, stockRes, productsRes] = await Promise.all([
          api.get(`/orders?status=COMPLETED&limit=200`),
          api.get('/orders?limit=6'),
          api.get('/stock/levels?limit=50'),
          api.get('/products?limit=1'),
        ])

        const todayOrders: Order[] = todayOrdersRes.data?.data ?? todayOrdersRes.data ?? []
        const recent: Order[] = recentRes.data?.data ?? recentRes.data ?? []
        const s: StockLevel[] = Array.isArray(stockRes.data) ? stockRes.data : stockRes.data?.data ?? []

        setOrders(todayOrders)
        setRecentOrders(recent)
        setStockLevels(s)
        const p = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.data ?? []
        setTotalProducts(productsRes.data?.total ?? p.length)
      } catch {
        setError('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── derived stats ───────────────────────────────────────────────────────────
  const todayCompleted = orders
  const todaySales = todayCompleted.reduce((s, o) => s + Number(o.total), 0)
  const lowStock = stockLevels.filter((s) => s.quantity <= s.low_stock_threshold)

  // ── last 7 days chart data ──────────────────────────────────────────────────
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
    const ds = d.toDateString()
    const revenue = orders
      .filter((o) => o.status === 'COMPLETED' && new Date(o.created_at).toDateString() === ds)
      .reduce((s, o) => s + Number(o.total), 0)
    return { label, Revenue: revenue }
  })

  // ── top selling products ────────────────────────────────────────────────────
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
  orders
    .filter((o) => o.status === 'COMPLETED')
    .forEach((o) => {
      o.items?.forEach((item) => {
        const name = item.product?.name ?? item.product_id
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { name, qty: 0, revenue: 0 }
        }
        productSales[item.product_id].qty += item.quantity
        productSales[item.product_id].revenue += Number(item.unit_price) * item.quantity
      })
    })
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${colors.marigold}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontFamily: fontBody, background: colors.brickBg, border: `0.5px solid ${colors.brick}`, borderRadius: 10, padding: 24, textAlign: 'center', color: colors.brick }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: fontDisplay, color: colors.paper, fontSize: 24, fontWeight: 500, margin: 0 }}>
          {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p style={{ fontFamily: fontBody, color: colors.sandMuted, fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards — color encodes meaning, not decoration: marigold = revenue, jade = healthy, brick = attention, sand = neutral count */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: "Today's sales", value: peso(todaySales), sub: 'Completed orders today', color: colors.marigold },
          { label: 'Orders today', value: String(todayCompleted.length), sub: 'Completed transactions', color: colors.paper },
          { label: 'Low stock', value: String(lowStock.length), sub: 'Items below threshold', color: lowStock.length > 0 ? colors.brick : colors.jade },
          { label: 'Total products', value: String(totalProducts), sub: 'In catalog', color: colors.paper },
        ].map((kpi) => (
          <div key={kpi.label} style={card()}>
            <div style={label}>{kpi.label}</div>
            <div style={{ fontFamily: fontMono, fontSize: 26, fontWeight: 500, color: kpi.color, lineHeight: 1.15 }}>
              {kpi.value}
            </div>
            <div style={{ fontFamily: fontBody, fontSize: 12, color: colors.sandMuted, marginTop: 6 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + Recent Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>

        {/* Sales Chart */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={label}>Sales overview</div>
              <div style={{ fontFamily: fontMono, color: colors.paper, fontSize: 22, fontWeight: 500 }}>
                {peso(orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + Number(o.total), 0))}
              </div>
              <div style={{ fontFamily: fontBody, color: colors.sandMuted, fontSize: 12 }}>All time revenue</div>
            </div>
            <span style={{ fontFamily: fontBody, background: colors.marigoldBg, color: colors.marigold, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
              Last 7 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: colors.sandMuted, fontSize: 11, fontFamily: fontBody }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: colors.sandMuted, fontSize: 11, fontFamily: fontBody }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Revenue" fill={colors.marigold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Orders */}
        <div style={card({ padding: 0, overflow: 'hidden' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `0.5px solid ${colors.cardBorder}` }}>
            <span style={{ fontFamily: fontBody, color: colors.paper, fontSize: 14, fontWeight: 500 }}>Recent orders</span>
            <button
              onClick={() => navigate('/orders')}
              style={{ fontFamily: fontBody, background: 'none', border: 'none', color: colors.marigold, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              View all →
            </button>
          </div>
          <div>
            {recentOrders.length === 0 ? (
              <div style={{ fontFamily: fontBody, padding: '32px', textAlign: 'center', color: colors.sandMuted, fontSize: 13 }}>No orders yet.</div>
            ) : (
              recentOrders.map((o) => {
                const statusColor = o.status === 'COMPLETED' ? colors.jade : o.status === 'VOIDED' ? colors.brick : colors.marigold
                const statusBg = o.status === 'COMPLETED' ? colors.jadeBg : o.status === 'VOIDED' ? colors.brickBg : colors.marigoldBg
                return (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: `0.5px solid ${colors.divider}` }}>
                    <div>
                      <div style={{ fontFamily: fontMono, color: colors.paper, fontSize: 13, fontWeight: 500 }}>#{o.id.slice(-6).toUpperCase()}</div>
                      <div style={{ fontFamily: fontBody, color: colors.sandMuted, fontSize: 11, marginTop: 2 }}>
                        {o.cashier?.name ?? 'Cashier'} · {new Date(o.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: fontMono, color: colors.paper, fontSize: 13, fontWeight: 500 }}>{peso(Number(o.total))}</div>
                      <span style={{
                        fontFamily: fontBody, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, marginTop: 3, display: 'inline-block',
                        background: statusBg, color: statusColor,
                      }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Low Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

        {/* Top Selling Products */}
        <div style={card({ padding: 0, overflow: 'hidden' })}>
          <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${colors.cardBorder}` }}>
            <span style={{ fontFamily: fontBody, color: colors.paper, fontSize: 14, fontWeight: 500 }}>Top selling products</span>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ fontFamily: fontBody, padding: 32, textAlign: 'center', color: colors.sandMuted, fontSize: 13 }}>
              No sales data yet. Process some orders to see top products.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.ink }}>
                  {['Product', 'Units sold', 'Revenue'].map((h) => (
                    <th key={h} style={{ fontFamily: fontBody, padding: '10px 20px', textAlign: h === 'Product' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: colors.sandMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} style={{ borderTop: `0.5px solid ${colors.divider}` }}>
                    <td style={{ fontFamily: fontBody, padding: '12px 20px', color: colors.paper, fontSize: 13 }}>{p.name}</td>
                    <td style={{ fontFamily: fontMono, padding: '12px 20px', color: colors.sand, fontSize: 13, textAlign: 'right' }}>{p.qty}</td>
                    <td style={{ fontFamily: fontMono, padding: '12px 20px', color: colors.marigold, fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{peso(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div style={card({ padding: 0, overflow: 'hidden' })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `0.5px solid ${colors.cardBorder}` }}>
            <span style={{ fontFamily: fontBody, color: colors.paper, fontSize: 14, fontWeight: 500 }}>Low stock alerts</span>
            <button
              onClick={() => navigate('/stock')}
              style={{ fontFamily: fontBody, background: 'none', border: 'none', color: colors.marigold, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              Manage →
            </button>
          </div>
          {lowStock.length === 0 ? (
            <div style={{ fontFamily: fontBody, padding: 32, textAlign: 'center', color: colors.jade, fontSize: 13 }}>
              ✓ All stock levels are healthy
            </div>
          ) : (
            lowStock.slice(0, 6).map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: `0.5px solid ${colors.divider}` }}>
                <div>
                  <div style={{ fontFamily: fontBody, color: colors.paper, fontSize: 13, fontWeight: 500 }}>{s.product.name}</div>
                  <div style={{ fontFamily: fontMono, color: colors.sandMuted, fontSize: 11, marginTop: 2 }}>{s.product.sku}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: fontMono, color: colors.brick, fontSize: 15, fontWeight: 500 }}>{s.quantity}</div>
                  <div style={{ fontFamily: fontBody, color: colors.sandMuted, fontSize: 11 }}>min {s.low_stock_threshold}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}