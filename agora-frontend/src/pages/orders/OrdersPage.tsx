import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import CameraScanner from '../../components/CameraScanner'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  price: number
  status: string
  stock_level?: { quantity: number }
  category?: { name: string }
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

interface OrderItem {
  product: { id: string; name: string; sku?: string }
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  cashier_id: string
  total: number
  discount: number
  status: string
  created_at: string
  cashier?: { name: string }
  items?: OrderItem[]
  order_items?: OrderItem[]
  transaction?: {
    amount_paid: number
    change: number
    payment_method: string
  } | null
}

type DiscountType = 'flat' | 'percentage'
type ActiveTab = 'pos' | 'history'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/Dashboard/Login) ─
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

const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"

const peso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
}

// stock status helper — traffic-light style for fast scanning
const stockStatus = (stock: number) => {
  if (stock <= 0) return { label: 'Out', dot: DANGER, bg: DANGER_DIM, color: DANGER }
  if (stock <= 5) return { label: `${stock} left`, dot: ACCENT, bg: ACCENT_DIM, color: ACCENT }
  return { label: `${stock} left`, dot: SUCCESS, bg: SUCCESS_DIM, color: SUCCESS }
}

export default function OrdersPage() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const [cart, setCart] = useState<CartItem[]>([])
  const [discountType, setDiscountType] = useState<DiscountType>('flat')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [showPayment, setShowPayment] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')
  // ── NEW: visible checkout failure state (this was the actual bug — mutation had no onError) ──
  const [checkoutError, setCheckoutError] = useState('')
  // ── NEW: micro-interaction state ──
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  const [cartBump, setCartBump] = useState(false)

  const { data: products = [], isFetching: isSearching } = useQuery<Product[]>({
    queryKey: ['products', debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/products', { params: { search: debouncedSearch, status: 'ACTIVE' } })
      return res.data?.data ?? res.data ?? []
    },
  })

  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
  } = useQuery<Order[]>({
    queryKey: ['orders', historySearch],
    queryFn: async () => {
      const res = await api.get('/orders', { params: { search: historySearch } })
      return res.data?.data ?? res.data ?? []
    },
    enabled: activeTab === 'history',
  })

  const createOrder = useMutation({
    mutationFn: async (payload: object) => {
      const res = await api.post('/orders', payload)
      return res.data as Order
    },
    onSuccess: (data) => {
      setCheckoutError('')
      setCompletedOrder(data)
      setShowPayment(false)
      setShowReceipt(true)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    // ── FIX: this was completely missing before. A failed checkout (network error,
    // stock conflict, server 500, etc.) previously produced NO feedback at all —
    // the cashier just saw the button re-enable with no explanation. ──
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status
          ? `Checkout failed (error ${err.response.status}). Please try again.`
          : 'Unable to reach the server. Check your connection and try again.')
      setCheckoutError(msg)
    },
  })

  // ✅ FIX: Stock validation when adding to cart
  const addToCart = (product: Product) => {
    const stock = product.stock_level?.quantity ?? 0
    if (stock <= 0) {
      setScanError(`Product "${product.name}" is out of stock`)
      setTimeout(() => setScanError(''), 3000)
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= stock) {
          setScanError(`Cannot add more. Only ${stock} in stock.`)
          setTimeout(() => setScanError(''), 3000)
          return prev
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1, unit_price: product.price }]
    })
    // micro-animations: pop the card, bump the cart badge
    setJustAddedId(product.id)
    setTimeout(() => setJustAddedId(null), 220)
    setCartBump(true)
    setTimeout(() => setCartBump(false), 260)
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.product.id !== productId))
    else
      setCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
      )
  }

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((i) => i.product.id !== productId))

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const discountAmount =
    discountType === 'flat' ? discountValue : (subtotal * discountValue) / 100
  const total = Math.max(0, subtotal - discountAmount)
  const change = amountPaid - total

  const handleCheckout = () => {
    if (cart.length === 0) return
    setAmountPaid(0)
    setCheckoutError('')
    setShowPayment(true)
  }

  // ✅ FIX: Only send discount if value > 0, send amount_paid properly
  const handleConfirmPayment = () => {
    if (amountPaid < total) return
    setCheckoutError('')
    createOrder.mutate({
      items: cart.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      discount_type: discountValue > 0 ? discountType.toUpperCase() : undefined,
      discount_value: discountValue > 0 ? discountValue : undefined,
      amount_paid: amountPaid,
      payment_method: 'cash',
    })
  }

  const handleNewOrder = () => {
    setCart([])
    setDiscountValue(0)
    setDiscountType('flat')
    setShowReceipt(false)
    setCompletedOrder(null)
    setAmountPaid(0)
    setCheckoutError('')
  }

  // ✅ NEW: Download receipt PDF using fetch (more reliable than axios for blobs)
  const downloadReceiptPDF = async (orderId: string) => {
    try {
      const response = await api.get(`/orders/${orderId}/receipt/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `receipt-${orderId.slice(-8)}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Failed to download PDF:', err)
      setScanError(err.response?.data?.message || 'Failed to download PDF receipt')
      setTimeout(() => setScanError(''), 4000)
    }
  }

  // ✅ NEW: Get proper discount label for receipt
  const getDiscountLabel = () => {
    if (!completedOrder || completedOrder.discount <= 0) return null
    if (discountType === 'flat') return `₱${discountValue.toFixed(2)} Flat Off`
    if (discountType === 'percentage') return `${discountValue}% Off`
    return 'Discount'
  }

  const statusColors = (status: string) => {
    if (status === 'COMPLETED' || status === 'completed')
      return { bg: SUCCESS_DIM, color: SUCCESS }
    if (status === 'VOIDED' || status === 'cancelled')
      return { bg: DANGER_DIM, color: DANGER }
    return { bg: ACCENT_DIM, color: ACCENT }
  }

  const getOrderItems = (order: Order): OrderItem[] =>
    order.items ?? order.order_items ?? []

  const receiptAmountPaid =
    completedOrder?.transaction?.amount_paid ?? amountPaid
  const receiptChange =
    completedOrder?.transaction?.change ?? (amountPaid - (completedOrder?.total ?? 0))

  // ── keyboard shortcuts: Enter → checkout, Esc → clear search / close, F2 → focus search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        if (showPayment) { setShowPayment(false); setCheckoutError('') }
        else if (showOrderDetail) setShowOrderDetail(false)
        else if (search) setSearch('')
        return
      }
      if (e.key === 'Enter' && !isTyping && activeTab === 'pos' && !showPayment && !showReceipt) {
        if (cart.length > 0) handleCheckout()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showPayment, showOrderDetail, search, activeTab, cart, showReceipt])

  return (
    <div className="orders-shell" style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', minHeight: 0, fontFamily: fontBody }}>

      {/* Local keyframes for micro-animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes popIn { 0% { transform: scale(1); } 40% { transform: scale(0.94); } 100% { transform: scale(1); } }
        @keyframes cartBump { 0% { transform: scale(1); } 35% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        .product-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        .product-card:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5); border-color: ${ACCENT} !important; }
        .product-card:not(:disabled):active { transform: translateY(-1px) scale(0.98); }
        .pop-added { animation: popIn 0.22s ease; }
        .cart-item-in { animation: fadeSlideIn 0.2s ease; }
        .btn-glow { transition: box-shadow 0.18s ease, transform 0.12s ease, background 0.15s ease; }
        .btn-glow:not(:disabled):hover { box-shadow: 0 6px 18px -4px rgba(245,158,11,0.45); }
        .btn-glow:not(:disabled):active { transform: scale(0.97); }
        @media (max-width: 960px) {
          .orders-shell { gap: 12px !important; }
          .orders-pos { flex-direction: column !important; overflow: visible !important; }
          .orders-product-panel { width: 100% !important; min-width: 0 !important; overflow: visible !important; min-height: auto !important; }
          .orders-cart-panel { width: 100% !important; max-width: none !important; flex: 0 0 auto !important; min-height: 320px !important; }
        }
        @media (max-width: 640px) {
          .orders-header { flex-direction: column !important; align-items: flex-start !important; }
          .orders-tab-row { width: 100% !important; }
          .orders-tab-row button { flex: 1; justify-content: center; }
          .orders-search-row { flex-direction: column !important; }
          .orders-scan-btn { width: 100% !important; }
          .orders-product-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; }
          .orders-cart-footer { padding: 12px !important; }
          .orders-history-search { width: 100% !important; }
          .orders-history-table { display: block; overflow-x: auto; white-space: nowrap; }
        }
      `}</style>

      {/* Error Toast (scan/stock/PDF errors) */}
      {scanError && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 100,
          background: DANGER_DIM, border: `1px solid ${DANGER}`,
          borderRadius: 8, padding: '12px 16px', color: DANGER,
          fontSize: 13, fontWeight: 600, maxWidth: 300,
          animation: 'toastIn 0.2s ease',
          boxShadow: '0 8px 20px -6px rgba(0,0,0,0.5)',
        }}>
          {scanError}
        </div>
      )}

      {/* Header */}
      <div className="orders-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 22, fontWeight: 500, margin: 0 }}>Orders</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Point of Sale &amp; Order History</p>
        </div>
        <div className="orders-tab-row" style={{ display: 'flex', gap: 8 }}>
          {(['pos', 'history'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="btn-glow"
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: activeTab === tab ? ACCENT : BG_CARD,
                color: activeTab === tab ? BG_BASE : TEXT_SECONDARY,
              }}
            >
              {tab === 'pos' ? 'POS' : 'Order History'}
            </button>
          ))}
        </div>
      </div>

      {/* POS Tab */}
      {activeTab === 'pos' && (
        <div className="orders-pos" style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Product Grid */}
          <div className="orders-product-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflow: 'visible' }}>
            <div className="orders-search-row" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 14, color: searchFocused ? ACCENT : TEXT_MUTED, transition: 'color 0.15s', pointerEvents: 'none',
                }}>
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search products by name or SKU…  (F2)"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: BG_CARD,
                    border: `1px solid ${searchFocused ? ACCENT : BORDER}`,
                    borderRadius: 8, padding: '11px 14px 11px 38px', color: TEXT_PRIMARY,
                    fontSize: 13, outline: 'none',
                    boxShadow: searchFocused ? `0 0 0 3px ${ACCENT_DIM}` : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="btn-glow orders-scan-btn"
                style={{
                  background: ACCENT_DIM, border: `1px solid ${ACCENT}`,
                  borderRadius: 8, padding: '10px 16px', color: ACCENT,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                }}
              >
                📷 Scan
              </button>
            </div>
            <div className="orders-product-grid" style={{
              flex: 1, overflowY: 'auto', display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14, alignContent: 'start',
              maxHeight: 'none',
            }}>
              {products.map((product) => {
                const stock = product.stock_level?.quantity ?? 0
                const outOfStock = stock <= 0
                const st = stockStatus(stock)
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={`product-card${justAddedId === product.id ? ' pop-added' : ''}`}
                    style={{
                      ...card({ padding: 20, textAlign: 'left', cursor: outOfStock ? 'not-allowed' : 'pointer', opacity: outOfStock ? 0.45 : 1 }),
                      background: BG_CARD,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  >
                    <span style={{
                      display: 'inline-block', fontSize: 10, fontWeight: 700, color: TEXT_MUTED,
                      background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 20,
                      padding: '2px 9px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
                    }}>
                      {product.category?.name ?? 'Uncategorized'}
                    </span>
                    <div style={{ fontSize: 17, fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1.3, marginBottom: 12 }}>
                      {product.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: ACCENT, fontWeight: 800, fontSize: 20 }}>{peso(product.price)}</span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                        background: st.bg, color: st.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
                        {st.label}
                      </span>
                    </div>
                  </button>
                )
              })}
              {isSearching && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: TEXT_MUTED }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', marginBottom: 12 }} />
                  <p style={{ fontSize: 13 }}>Searching…</p>
                </div>
              )}
              {!isSearching && products.length === 0 && (
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: TEXT_MUTED }}>
                  <span style={{ fontSize: 36, marginBottom: 10 }}>📦</span>
                  <p style={{ fontSize: 13 }}>No products found</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Panel */}
          <div className="orders-cart-panel" style={card({ display: 'flex', flexDirection: 'column', width: 300, flexShrink: 0, overflow: 'visible', padding: 0, boxShadow: '0 4px 16px -6px rgba(0,0,0,0.4)' })}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600 }}>Cart</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>{cart.length} item(s)</div>
              </div>
              {cart.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 24, height: 24, padding: '0 6px', borderRadius: 20,
                  background: ACCENT, color: BG_BASE, fontSize: 12, fontWeight: 800,
                  animation: cartBump ? 'cartBump 0.26s ease' : undefined,
                }}>
                  {cart.reduce((n, i) => n + i.quantity, 0)}
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cart.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: TEXT_MUTED, textAlign: 'center', padding: '0 20px' }}>
                  <span style={{ fontSize: 34, marginBottom: 10 }}>🛒</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY, margin: '0 0 4px' }}>No products added yet</p>
                  <p style={{ fontSize: 12, margin: 0 }}>Click a product or scan a barcode</p>
                </div>
              )}
              {cart.map((item) => (
                <div key={item.product.id} className="cart-item-in" style={{ background: BG_BASE, borderRadius: 8, padding: 12, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>
                      {item.product.name}
                    </span>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 16, cursor: 'pointer', lineHeight: 1, transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = DANGER)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                    >×</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {([-1, null, 1] as (number | null)[]).map((delta, idx) =>
                        delta === null ? (
                          <span key="qty" style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, width: 20, textAlign: 'center' }}>{item.quantity}</span>
                        ) : (
                          <button
                            key={idx}
                            onClick={() => updateQty(item.product.id, item.quantity + (delta as number))}
                            style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${BORDER}`, background: BG_CARD, color: TEXT_SECONDARY, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s, color 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_SECONDARY }}
                          >
                            {delta === -1 ? '−' : '+'}
                          </button>
                        )
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{peso(item.unit_price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="orders-cart-footer" style={{ borderTop: `1px solid ${BORDER}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelStyle}>Discount</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', color: TEXT_PRIMARY, fontSize: 12, outline: 'none' }}
                  >
                    <option value="flat">₱ Flat</option>
                    <option value="percentage">% Off</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    style={{ flex: 1, background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px', color: TEXT_PRIMARY, fontSize: 13, outline: 'none' }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: TEXT_MUTED }}>
                  <span>Subtotal</span>
                  <span>{peso(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: SUCCESS }}>
                    <span>Discount</span>
                    <span>−{peso(discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                  <span>Total</span>
                  <span style={{ color: ACCENT }}>{peso(total)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="btn-glow"
                style={{
                  background: cart.length === 0 ? BORDER : ACCENT,
                  color: cart.length === 0 ? TEXT_MUTED : BG_BASE,
                  border: 'none', borderRadius: 8, padding: '13px',
                  fontSize: 13, fontWeight: 700,
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Proceed to Payment {cart.length > 0 && '(Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: 16 }}>
            <input
              className="orders-history-search"
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search orders…"
              style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', color: TEXT_PRIMARY, fontSize: 13, outline: 'none', width: 280 }}
            />
          </div>

          {/* NEW: loading state for order history */}
          {ordersLoading && (
            <div style={card({ padding: 48, textAlign: 'center', color: TEXT_MUTED })}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, margin: 0 }}>Loading orders…</p>
            </div>
          )}

          {/* NEW: error state if order list fails to fetch */}
          {!ordersLoading && ordersError && (
            <div style={{ ...card({ padding: 32, textAlign: 'center' }), background: DANGER_DIM, border: `1px solid ${DANGER}` }}>
              <p style={{ color: DANGER, fontSize: 13, margin: 0 }}>Failed to load order history. Please try again.</p>
            </div>
          )}

          {!ordersLoading && !ordersError && (
            <div style={card({ overflow: 'hidden', padding: 0 })}>
              <table className="orders-history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: BG_BASE }}>
                    {['Order ID', 'Date', 'Cashier', 'Total', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const sc = statusColors(order.status)
                    return (
                      <tr key={order.id}
                        onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        style={{ borderTop: `1px solid ${BORDER}`, transition: 'background 0.12s' }}>
                        <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 12, color: TEXT_SECONDARY }}>#{order.id.slice(-8).toUpperCase()}</td>
                        <td style={{ padding: '14px 20px', color: TEXT_SECONDARY, fontSize: 13 }}>{new Date(order.created_at).toLocaleString('en-PH')}</td>
                        <td style={{ padding: '14px 20px', color: TEXT_SECONDARY, fontSize: 13 }}>{order.cashier?.name ?? '—'}</td>
                        <td style={{ padding: '14px 20px', color: ACCENT, fontSize: 13, fontWeight: 700 }}>{peso(order.total)}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{order.status}</span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <button onClick={() => { setSelectedOrder(order); setShowOrderDetail(true) }} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View →</button>
                        </td>
                      </tr>
                    )
                  })}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card({ padding: 28, width: '100%', maxWidth: 380 }), animation: 'fadeSlideIn 0.18s ease' }}>
            <h2 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 18, fontWeight: 500, margin: '0 0 20px' }}>Payment</h2>

            {/* NEW: visible checkout failure banner — this is the fix for the actual bug */}
            {checkoutError && (
              <div style={{ background: DANGER_DIM, border: `1px solid ${DANGER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ color: DANGER, fontSize: 13, margin: 0, fontWeight: 600 }}>{checkoutError}</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: TEXT_SECONDARY }}>
                <span>Total Amount</span>
                <span style={{ fontWeight: 800, color: TEXT_PRIMARY, fontSize: 18 }}>{peso(total)}</span>
              </div>
              <div>
                <div style={labelStyle}>Amount Paid</div>
                <input
                  type="number"
                  min={0}
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder="Enter amount"
                  style={{ width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', color: TEXT_PRIMARY, fontSize: 20, fontWeight: 700, textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>
              {amountPaid >= total && amountPaid > 0 && (
                <div style={{ background: SUCCESS_DIM, border: `1px solid rgba(52,211,153,0.3)`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', animation: 'fadeSlideIn 0.18s ease' }}>
                  <span style={{ color: SUCCESS, fontSize: 13 }}>Change</span>
                  <span style={{ color: SUCCESS, fontWeight: 800, fontSize: 18 }}>{peso(change)}</span>
                </div>
              )}
              {amountPaid > 0 && amountPaid < total && (
                <div style={{ background: DANGER_DIM, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 8, padding: '12px 16px', animation: 'fadeSlideIn 0.18s ease' }}>
                  <p style={{ color: DANGER, fontSize: 13, margin: 0 }}>Insufficient — need {peso(total - amountPaid)} more</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowPayment(false); setCheckoutError('') }} style={{ flex: 1, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px', color: TEXT_SECONDARY, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmPayment} disabled={amountPaid < total || createOrder.isPending} className="btn-glow" style={{ flex: 1, background: amountPaid < total ? BORDER : ACCENT, border: 'none', borderRadius: 8, padding: '12px', color: BG_BASE, fontSize: 13, fontWeight: 700, cursor: amountPaid < total ? 'not-allowed' : 'pointer' }}>
                {createOrder.isPending ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card({ padding: 28, width: '100%', maxWidth: 380 }), animation: 'fadeSlideIn 0.2s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: ACCENT, letterSpacing: '0.05em' }}>AGORA</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Inventory &amp; POS System</div>
              <div style={{ marginTop: 12, width: 40, height: 40, borderRadius: '50%', background: SUCCESS_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px auto 6px', fontSize: 20, animation: 'popIn 0.3s ease' }}>✓</div>
              <h2 style={{ color: TEXT_PRIMARY, fontSize: 16, fontWeight: 700, margin: '4px 0 0' }}>Payment Received</h2>
            </div>
            <div style={{ borderTop: `1px dashed ${BORDER}`, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[{ label: 'Order #', value: `#${completedOrder.id.slice(-8).toUpperCase()}` }, { label: 'Date', value: new Date(completedOrder.created_at ?? Date.now()).toLocaleString('en-PH') }, { label: 'Cashier', value: completedOrder.cashier?.name ?? '—' }].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_MUTED }}>
                  <span>{label}</span>
                  <span style={{ color: TEXT_SECONDARY }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px dashed ${BORDER}`, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {getOrderItems(completedOrder).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: TEXT_SECONDARY }}>
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>{peso(Number(item.unit_price) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {completedOrder.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: SUCCESS }}>
                  <span>{getDiscountLabel() || 'Discount'}</span>
                  <span>−{peso(completedOrder.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY }}>
                <span>Total</span>
                <span>{peso(completedOrder.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: TEXT_SECONDARY }}>
                <span>Paid</span>
                <span>{peso(receiptAmountPaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: SUCCESS }}>
                <span>Change</span>
                <span>{peso(receiptChange)}</span>
              </div>
            </div>
            <div style={{ borderTop: `1px dashed ${BORDER}`, marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>Thank you for shopping!</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Please come again 🙂</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => window.print()} style={{ flex: 1, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px', color: TEXT_SECONDARY, fontSize: 13, cursor: 'pointer' }}>Print</button>
              <button onClick={() => downloadReceiptPDF(completedOrder.id)} className="btn-glow" style={{ flex: 1, background: BG_BASE, border: `1px solid ${ACCENT}`, borderRadius: 8, padding: '12px', color: ACCENT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Download PDF</button>
              <button onClick={handleNewOrder} className="btn-glow" style={{ flex: 1, background: ACCENT, border: 'none', borderRadius: 8, padding: '12px', color: BG_BASE, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>New Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card({ padding: 28, width: '100%', maxWidth: 420 }), animation: 'fadeSlideIn 0.18s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 18, fontWeight: 500, margin: 0 }}>Order Detail</h2>
                <p style={{ color: TEXT_MUTED, fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>#{selectedOrder.id.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={() => setShowOrderDetail(false)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ label: 'Date', value: new Date(selectedOrder.created_at).toLocaleString('en-PH') }, { label: 'Cashier', value: selectedOrder.cashier?.name ?? '—' }].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: TEXT_MUTED }}>{label}</span>
                  <span style={{ color: TEXT_SECONDARY }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: TEXT_MUTED }}>Status</span>
                <span style={{ ...statusColors(selectedOrder.status), fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontSize: 11 }}>{selectedOrder.status}</span>
              </div>
            </div>
            {getOrderItems(selectedOrder).length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                <div style={labelStyle}>Items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {getOrderItems(selectedOrder).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: TEXT_SECONDARY }}>
                      <span>{item.product.name} × {item.quantity}</span>
                      <span>{peso(Number(item.unit_price) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedOrder.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: SUCCESS }}>
                  <span>Discount</span>
                  <span>−{peso(selectedOrder.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: TEXT_PRIMARY }}>
                <span>Total</span>
                <span style={{ color: ACCENT }}>{peso(selectedOrder.total)}</span>
              </div>
            </div>
            <button onClick={() => setShowOrderDetail(false)} style={{ marginTop: 20, width: '100%', background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* Camera Scanner */}
      {showScanner && (
        <CameraScanner
          onProductFound={(product: Product) => {
            addToCart(product)
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}