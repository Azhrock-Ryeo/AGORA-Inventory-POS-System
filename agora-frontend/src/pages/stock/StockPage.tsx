import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/Orders/Inventory) ─
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
// Low stock reuses ACCENT (amber already means "needs attention" everywhere
// else in the app — a separate near-identical amber shade was redundant)

const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: BG_CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  fontFamily: fontBody,
  ...extra,
})

const labelStyle: React.CSSProperties = {
  fontFamily: fontBody,
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: TEXT_MUTED,
  marginBottom: '6px',
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  fontFamily: fontBody,
  background: BG_BASE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: TEXT_PRIMARY,
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
}

interface StockLevel {
  id: string
  product_id: string
  quantity: number
  low_stock_threshold: number
  products: { id: string; name: string; sku: string; categories?: { name: string } }
}

interface StockMovement {
  id: string
  product_id: string
  type: 'STOCK_IN' | 'STOCK_OUT'
  quantity: number
  reason: string
  user_id: string
  created_at: string
  products?: { name: string; sku: string }
}

interface Product { id: string; name: string; sku: string }

type ActiveTab = 'levels' | 'in' | 'out' | 'history'

export default function StockPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('levels')

  const [levelsSearch, setLevelsSearch] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const [inProductId, setInProductId] = useState('')
  const [inQuantity, setInQuantity] = useState<number>(0)
  const [inReason, setInReason] = useState('')
  const [inError, setInError] = useState('')
  const [inSuccess, setInSuccess] = useState(false)

  const [outProductId, setOutProductId] = useState('')
  const [outQuantity, setOutQuantity] = useState<number>(0)
  const [outReason, setOutReason] = useState('')
  const [outError, setOutError] = useState('')
  const [outSuccess, setOutSuccess] = useState(false)

  const [historySearch, setHistorySearch] = useState('')
  const [historyType, setHistoryType] = useState<'all' | 'STOCK_IN' | 'STOCK_OUT'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: stockLevels = [], isLoading: levelsLoading } = useQuery<StockLevel[]>({
    queryKey: ['stock-levels', levelsSearch, showLowStockOnly],
    queryFn: async () => {
      const res = await api.get('/stock/levels', {
        params: { search: levelsSearch, low_stock: showLowStockOnly || undefined },
      })
      const raw = res.data?.data ?? res.data ?? []
      return Array.isArray(raw) ? raw : []
    },
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-dropdown'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { status: 'active', limit: 500 } })
      return res.data?.data ?? res.data ?? []
    },
  })

  const { data: movements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ['stock-movements', historySearch, historyType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get('/stock/movements', {
        params: {
          search: historySearch,
          type: historyType === 'all' ? undefined : historyType,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      const raw = res.data?.data ?? res.data ?? []
      return Array.isArray(raw) ? raw : []
    },
    enabled: activeTab === 'history',
  })

  const stockInMutation = useMutation({
    mutationFn: async (payload: object) => (await api.post('/stock/in', payload)).data,
    onSuccess: () => {
      setInSuccess(true); setInProductId(''); setInQuantity(0); setInReason(''); setInError('')
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      setTimeout(() => setInSuccess(false), 3000)
    },
    onError: (err: any) => setInError(err?.response?.data?.message ?? 'Failed to record stock-in'),
  })

  const stockOutMutation = useMutation({
    mutationFn: async (payload: object) => (await api.post('/stock/out', payload)).data,
    onSuccess: () => {
      setOutSuccess(true); setOutProductId(''); setOutQuantity(0); setOutReason(''); setOutError('')
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      setTimeout(() => setOutSuccess(false), 3000)
    },
    onError: (err: any) => setOutError(err?.response?.data?.message ?? 'Failed to record stock-out'),
  })

  const handleStockIn = () => {
    setInError('')
    if (!inProductId) return setInError('Please select a product')
    if (!inQuantity || inQuantity <= 0) return setInError('Quantity must be greater than 0')
    if (!inReason.trim()) return setInError('Reason is required')
    stockInMutation.mutate({ product_id: inProductId, quantity: inQuantity, reason: inReason })
  }

  const handleStockOut = () => {
    setOutError('')
    if (!outProductId) return setOutError('Please select a product')
    if (!outQuantity || outQuantity <= 0) return setOutError('Quantity must be greater than 0')
    if (!outReason.trim()) return setOutError('Reason is required')
    stockOutMutation.mutate({ product_id: outProductId, quantity: outQuantity, reason: outReason })
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'levels', label: 'Stock Levels' },
    { key: 'in', label: 'Stock In' },
    { key: 'out', label: 'Stock Out' },
    { key: 'history', label: 'Movement History' },
  ]

  const lowStockCount = stockLevels.filter((s) => s.quantity <= s.low_stock_threshold).length

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 22, fontWeight: 500, margin: 0 }}>Stock Management</h1>
          <p style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Track inventory levels and movements</p>
        </div>
        {lowStockCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DANGER_DIM, border: `1px solid ${DANGER}`, borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: DANGER, display: 'inline-block' }} />
            <span style={{ fontFamily: fontBody, fontSize: 13, color: DANGER, fontWeight: 600 }}>
              {lowStockCount} low stock {lowStockCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              fontFamily: fontBody,
              position: 'relative',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === t.key ? ACCENT : TEXT_MUTED,
              transition: 'color 0.15s',
            }}
          >
            {t.label}
            {activeTab === t.key && (
              <span style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 2, background: ACCENT }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Stock Levels ── */}
      {activeTab === 'levels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              value={levelsSearch}
              onChange={(e) => setLevelsSearch(e.target.value)}
              placeholder="Search products…"
              style={{ ...inputStyle, width: 240 }}
            />
            <label style={{ fontFamily: fontBody, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: TEXT_SECONDARY, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                style={{ accentColor: ACCENT }}
              />
              Low stock only
            </label>
          </div>

          <div style={card({ overflow: 'hidden', padding: 0 })}>
            {levelsLoading ? (
              <div style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'SKU', 'Category', 'Quantity', 'Threshold', 'Status'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.map((level) => {
                    const prod = (level as any).products ?? (level as any).product ?? {}
                    const productName = prod.name ?? (level as any).product_name ?? '—'
                    const productSku  = prod.sku  ?? (level as any).sku ?? '—'
                    const categoryName = prod.categories?.name ?? prod.category?.name ?? '—'
                    const isOut = level.quantity === 0
                    const isLow = !isOut && level.quantity <= level.low_stock_threshold
                    return (
                      <tr key={level.id}
                        onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 600 }}>{productName}</td>
                        <td style={{ ...tdStyle, color: TEXT_SECONDARY, fontFamily: 'monospace', fontSize: 12 }}>{productSku}</td>
                        <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{categoryName}</td>
                        <td style={{ ...tdStyle }}>
                          <span style={{ fontFamily: fontBody, fontWeight: 800, fontSize: 16, color: isOut ? DANGER : isLow ? ACCENT : SUCCESS }}>
                            {level.quantity}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: TEXT_MUTED }}>{level.low_stock_threshold}</td>
                        <td style={{ ...tdStyle }}>
                          <span style={{
                            fontFamily: fontBody,
                            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: isOut ? DANGER_DIM : isLow ? ACCENT_DIM : SUCCESS_DIM,
                            color: isOut ? DANGER : isLow ? ACCENT : SUCCESS,
                          }}>
                            {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {stockLevels.length === 0 && (
                    <tr><td colSpan={6} style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No products found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Stock In ── */}
      {activeTab === 'in' && (
        <div style={{ maxWidth: 480 }}>
          <div style={card({ padding: 28 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 20, marginBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: SUCCESS_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: SUCCESS, fontWeight: 800 }}>+</div>
              <div>
                <div style={{ fontFamily: fontBody, color: TEXT_PRIMARY, fontSize: 15, fontWeight: 700 }}>Record Stock In</div>
                <div style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>Add new inventory from a supplier</div>
              </div>
            </div>

            {inSuccess && (
              <div style={{ fontFamily: fontBody, background: SUCCESS_DIM, border: `1px solid ${SUCCESS}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: SUCCESS, marginBottom: 16 }}>
                ✓ Stock-in recorded successfully
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Product <span style={{ color: DANGER }}>*</span></label>
                <select value={inProductId} onChange={(e) => setInProductId(e.target.value)} style={inputStyle}>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity <span style={{ color: DANGER }}>*</span></label>
                <input type="number" min={1} value={inQuantity || ''} onChange={(e) => setInQuantity(Number(e.target.value))} placeholder="e.g. 50" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Reason / Source <span style={{ color: DANGER }}>*</span></label>
                <textarea value={inReason} onChange={(e) => setInReason(e.target.value)} placeholder="e.g. Delivery from Supplier ABC" rows={3}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>
              {inError && <p style={{ fontFamily: fontBody, color: DANGER, fontSize: 13, margin: 0 }}>{inError}</p>}
              <button onClick={handleStockIn} disabled={stockInMutation.isPending}
                style={{ fontFamily: fontBody, background: stockInMutation.isPending ? BORDER : SUCCESS, border: 'none', borderRadius: 8, padding: '12px', color: BG_BASE, fontSize: 13, fontWeight: 700, cursor: stockInMutation.isPending ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                {stockInMutation.isPending ? 'Recording…' : 'Record Stock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Out ── */}
      {activeTab === 'out' && (
        <div style={{ maxWidth: 480 }}>
          <div style={card({ padding: 28 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 20, marginBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: DANGER_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: DANGER, fontWeight: 800 }}>−</div>
              <div>
                <div style={{ fontFamily: fontBody, color: TEXT_PRIMARY, fontSize: 15, fontWeight: 700 }}>Record Stock Out</div>
                <div style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>Manually deduct stock (e.g. damage, loss)</div>
              </div>
            </div>

            {outSuccess && (
              <div style={{ fontFamily: fontBody, background: SUCCESS_DIM, border: `1px solid ${SUCCESS}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: SUCCESS, marginBottom: 16 }}>
                ✓ Stock-out recorded successfully
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Product <span style={{ color: DANGER }}>*</span></label>
                <select value={outProductId} onChange={(e) => setOutProductId(e.target.value)} style={inputStyle}>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity <span style={{ color: DANGER }}>*</span></label>
                <input type="number" min={1} value={outQuantity || ''} onChange={(e) => setOutQuantity(Number(e.target.value))} placeholder="e.g. 5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Reason <span style={{ color: DANGER }}>*</span></label>
                <textarea value={outReason} onChange={(e) => setOutReason(e.target.value)} placeholder="e.g. Damaged goods, expired items" rows={3}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>
              {outError && <p style={{ fontFamily: fontBody, color: DANGER, fontSize: 13, margin: 0 }}>{outError}</p>}
              <button onClick={handleStockOut} disabled={stockOutMutation.isPending}
                style={{ fontFamily: fontBody, background: stockOutMutation.isPending ? BORDER : DANGER, border: 'none', borderRadius: 8, padding: '12px', color: BG_BASE, fontSize: 13, fontWeight: 700, cursor: stockOutMutation.isPending ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                {stockOutMutation.isPending ? 'Recording…' : 'Record Stock Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Movement History ── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by product…" style={{ ...inputStyle, width: 220 }} />
            <select value={historyType} onChange={(e) => setHistoryType(e.target.value as 'all' | 'STOCK_IN' | 'STOCK_OUT')} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            <span style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13 }}>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>

          <div style={card({ overflow: 'hidden', padding: 0 })}>
            {movementsLoading ? (
              <div style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'SKU', 'Type', 'Quantity', 'Reason', 'Date'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const mp = (m as any).products ?? (m as any).product ?? {}
                    return (
                      <tr key={m.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 600 }}>{mp.name ?? m.product_id ?? '—'}</td>
                      <td style={{ ...tdStyle, color: TEXT_SECONDARY, fontFamily: 'monospace', fontSize: 12 }}>{mp.sku ?? '—'}</td>
                      <td style={{ ...tdStyle }}>
                        <span style={{
                          fontFamily: fontBody,
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: m.type === 'STOCK_IN' ? SUCCESS_DIM : DANGER_DIM,
                          color: m.type === 'STOCK_IN' ? SUCCESS : DANGER,
                        }}>
                          {m.type === 'STOCK_IN' ? '↑ Stock In' : '↓ Stock Out'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 700 }}>{m.quantity}</td>
                      <td style={{ ...tdStyle, color: TEXT_SECONDARY, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.reason}</td>
                      <td style={{ ...tdStyle, color: TEXT_MUTED, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(m.created_at).toLocaleString('en-PH')}
                      </td>
                    </tr>
                    )
                  })}
                  {movements.length === 0 && (
                    <tr><td colSpan={6} style={{ fontFamily: fontBody, padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No movements found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}