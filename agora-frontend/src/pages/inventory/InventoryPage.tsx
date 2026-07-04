import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import type { Product, Category, Supplier } from '../../types/inventory'

type Tab = 'products' | 'categories' | 'suppliers'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/OrdersPage) ─
const BG_BASE    = '#18181b'
const BG_CARD    = '#1f1f23'
const BORDER     = 'rgba(255,255,255,0.08)'
const TEXT_PRIMARY   = '#f4f4f5'
const TEXT_SECONDARY = '#a1a1aa'
const TEXT_MUTED     = '#71717a'
const ACCENT     = '#f59e0b'
const SUCCESS    = '#34d399'
const SUCCESS_DIM = 'rgba(52,211,153,0.14)'
const DANGER     = '#f87171'
const DANGER_DIM  = 'rgba(248,113,113,0.14)'

const fontDisplay = "'Fraunces', serif"
const fontBody = "'Inter', sans-serif"

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: BG_CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  fontFamily: fontBody,
  ...extra,
})

const inputBase: React.CSSProperties = {
  fontFamily: fontBody,
  background: BG_BASE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: TEXT_PRIMARY,
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: fontBody,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: TEXT_MUTED,
  marginBottom: 6,
  display: 'block',
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

const peso = (v: number) =>
  `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Overlay Modal wrapper ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={card({ padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' })}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 18, fontWeight: 500, margin: 0 }}>{title}</h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Form buttons ──────────────────────────────────────────────────────────────
function FormActions({ onCancel, loading, label }: { onCancel: () => void; loading: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
      <button onClick={onCancel}
        style={{ fontFamily: fontBody, flex: 1, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '11px', color: TEXT_SECONDARY, fontSize: 13, cursor: 'pointer' }}>
        Cancel
      </button>
      <button type="submit" disabled={loading}
        style={{ fontFamily: fontBody, flex: 1, background: ACCENT, border: 'none', borderRadius: 8, padding: '11px', color: BG_BASE, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Saving…' : label}
      </button>
    </div>
  )
}

// ── Product Form ──────────────────────────────────────────────────────────────
function ProductForm({ product, categories, suppliers, onSave, onClose }: {
  product: Product | null
  categories: Category[]
  suppliers: Supplier[]
  onSave: (data: Partial<Product>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    categoryId: product?.categoryId ?? '',
    supplierId: product?.supplierId ?? '',
    price: product?.price ?? 0,
    status: product?.status ?? 'active',
    description: product?.description ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Product name is required.'); return }
    if (!form.sku.trim()) { setError('SKU is required.'); return }
    if (!form.categoryId) { setError('Please select a category.'); return }
    if (!form.supplierId) { setError('Please select a supplier.'); return }
    if (Number(form.price) <= 0) { setError('Price must be greater than 0.'); return }
    setLoading(true)
    setError('')
    try {
      await onSave({ ...form, price: Number(form.price) })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save product.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && (
        <div style={{ fontFamily: fontBody, background: DANGER_DIM, border: `1px solid ${DANGER}`, borderRadius: 8, padding: '10px 14px', color: DANGER, fontSize: 13 }}>
          {error}
        </div>
      )}
      <Field label="Product name">
        <input style={inputBase} value={form.name} onChange={set('name')} placeholder="e.g. Coca-Cola 1.5L" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="SKU">
          <input style={inputBase} value={form.sku} onChange={set('sku')} placeholder="e.g. CC-1500" />
        </Field>
        <Field label="Barcode / QR (optional)">
          <input style={inputBase} value={form.barcode} onChange={set('barcode')} placeholder="e.g. 4901427030505" />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Category">
          <select style={inputBase} value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Supplier">
          <select style={inputBase} value={form.supplierId} onChange={set('supplierId')}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Price (₱)">
          <input style={inputBase} type="number" min={0} step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
        </Field>
        <Field label="Status">
          <select style={inputBase} value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={set('description')} placeholder="Short product description…" />
      </Field>
      <FormActions onCancel={onClose} loading={loading} label={product ? 'Save changes' : 'Add product'} />
    </form>
  )
}

// ── Category Form ─────────────────────────────────────────────────────────────
function CategoryForm({ category, onSave, onClose }: {
  category: Category | null
  onSave: (data: Partial<Category>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ name: category?.name ?? '', description: category?.description ?? '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setLoading(true); setError('')
    try { await onSave(form) } catch { setError('Failed to save category.'); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div style={{ fontFamily: fontBody, background: DANGER_DIM, border: `1px solid ${DANGER}`, borderRadius: 8, padding: '10px 14px', color: DANGER, fontSize: 13 }}>{error}</div>}
      <Field label="Name">
        <input style={inputBase} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Canned Goods" />
      </Field>
      <Field label="Description (optional)">
        <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short description…" />
      </Field>
      <FormActions onCancel={onClose} loading={loading} label={category ? 'Save changes' : 'Add category'} />
    </form>
  )
}

// ── Supplier Form ─────────────────────────────────────────────────────────────
function SupplierForm({ supplier, onSave, onClose }: {
  supplier: Supplier | null
  onSave: (data: Partial<Supplier>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    contact_name: (supplier as any)?.contact_name ?? '',
    email: (supplier as any)?.email ?? '',
    phone: (supplier as any)?.phone ?? '',
    address: supplier?.address ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setLoading(true); setError('')
    try { await onSave(form) } catch { setError('Failed to save supplier.'); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div style={{ fontFamily: fontBody, background: DANGER_DIM, border: `1px solid ${DANGER}`, borderRadius: 8, padding: '10px 14px', color: DANGER, fontSize: 13 }}>{error}</div>}
      <Field label="Supplier name">
        <input style={inputBase} value={form.name} onChange={set('name')} placeholder="e.g. Unilever Philippines" />
      </Field>
      <Field label="Contact name">
        <input style={inputBase} value={form.contact_name} onChange={set('contact_name')} placeholder="e.g. Juan dela Cruz" />
      </Field>
      <Field label="Email">
        <input style={inputBase} type="email" value={form.email} onChange={set('email')} placeholder="e.g. supplier@email.com" />
      </Field>
      <Field label="Phone">
        <input style={inputBase} value={form.phone} onChange={set('phone')} placeholder="e.g. +63 917 123 4567" />
      </Field>
      <Field label="Address (optional)">
        <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 72 }} value={form.address} onChange={set('address')} placeholder="Business address…" />
      </Field>
      <FormActions onCancel={onClose} loading={loading} label={supplier ? 'Save changes' : 'Add supplier'} />
    </form>
  )
}

// ── Confirm Delete dialog ─────────────────────────────────────────────────────
function ConfirmModal({ open, message, onConfirm, onCancel }: {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={card({ padding: 28, width: '100%', maxWidth: 360 })}>
        <p style={{ color: TEXT_PRIMARY, fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Are you sure?</p>
        <p style={{ color: TEXT_SECONDARY, fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 11, color: TEXT_SECONDARY, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, background: DANGER_DIM, border: `1px solid ${DANGER}`, borderRadius: 8, padding: 11, color: DANGER, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('products')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // modal state
  const [productModal, setProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [categoryModal, setCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [supplierModal, setSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  // confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {})

  const askConfirm = (msg: string, action: () => void) => {
    setConfirmMsg(msg)
    setConfirmAction(() => action)
    setConfirmOpen(true)
  }

  // ── API queries ──────────────────────────────────────────────────────────
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products')
      return res.data?.data ?? res.data ?? []
    },
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories')
      return res.data?.data ?? res.data ?? []
    },
  })

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers')
      return res.data?.data ?? res.data ?? []
    },
  })

  // ── API mutations ─────────────────────────────────────────────────────────
  const saveProduct = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const payload = {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode || undefined,
        category_id: data.categoryId,
        supplier_id: data.supplierId,
        price: Number(data.price),
        status: (data.status as string)?.toUpperCase(),
        description: data.description || undefined,
      }
      if (editingProduct?.id) {
        await api.put(`/products/${editingProduct.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setProductModal(false) },
  })

  const toggleProductStatus = useMutation({
  mutationFn: async (product: Product) => {
    const currentStatus = (product as any).status?.toUpperCase()
    await api.put(`/products/${product.id}`, {
      status: currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
  },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const saveCategory = useMutation({
    mutationFn: async (data: Partial<Category>) => {
      if (editingCategory?.id) {
        await api.put(`/categories/${editingCategory.id}`, data)
      } else {
        await api.post('/categories', data)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setCategoryModal(false) },
  })

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  const saveSupplier = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      if (editingSupplier?.id) {
        await api.put(`/suppliers/${editingSupplier.id}`, data)
      } else {
        await api.post('/suppliers', data)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setSupplierModal(false) },
  })

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  // ── Delete guards ─────────────────────────────────────────────────────────
  const handleDeleteCategory = (c: Category) => {
  const inUse = products.some((p) => (p as any).category_id === c.id)
  if (inUse) {
    askConfirm(
      `"${c.name}" is assigned to ${products.filter((p) => (p as any).category_id === c.id).length} product(s). Reassign those products before deleting.`,
      () => setConfirmOpen(false)
    )
    return
  }
  askConfirm(`Delete category "${c.name}"? This cannot be undone.`, () => {
    deleteCategory.mutate(c.id)
    setConfirmOpen(false)
  })
}

  const handleDeleteSupplier = (s: Supplier) => {
    const inUse = products.some((p) => (p as any).supplier_id === s.id)
    if (inUse) {
      askConfirm(
        `"${s.name}" is linked to ${products.filter((p) => p.supplierId === s.id).length} product(s). Reassign those products before deleting.`,
        () => setConfirmOpen(false)
      )
      return
    }
    askConfirm(`Delete supplier "${s.name}"? This cannot be undone.`, () => {
      deleteSupplier.mutate(s.id)
      setConfirmOpen(false)
    })
  }

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(search)
      const matchCat = !categoryFilter || (p as any).category_id === categoryFilter
      return matchSearch && matchCat
    })
  }, [products, search, categoryFilter])

  const TABS: Tab[] = ['products', 'categories', 'suppliers']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: fontDisplay, color: TEXT_PRIMARY, fontSize: 22, fontWeight: 500, margin: 0 }}>Inventory</h1>
        <p style={{ fontFamily: fontBody, color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
          Manage your product catalog, categories, and suppliers.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              fontFamily: fontBody,
              position: 'relative', padding: '10px 18px', fontSize: 13, fontWeight: 600,
              textTransform: 'capitalize', background: 'none', border: 'none',
              cursor: 'pointer', color: tab === t ? ACCENT : TEXT_MUTED, transition: 'color 0.15s',
            }}>
            {t}
            {tab === t && (
              <span style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 2, background: ACCENT }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Products ── */}
      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, SKU, or barcode"
                  style={{ fontFamily: fontBody, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', paddingLeft: 34, color: TEXT_PRIMARY, fontSize: 13, outline: 'none', width: 240 }} />
              </div>
              {/* Category filter */}
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ fontFamily: fontBody, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', color: categoryFilter ? TEXT_PRIMARY : TEXT_MUTED, fontSize: 13, outline: 'none' }}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {(search || categoryFilter) && (
                <button onClick={() => { setSearch(''); setCategoryFilter('') }}
                  style={{ fontFamily: fontBody, background: 'none', border: 'none', color: TEXT_MUTED, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  Clear filters
                </button>
              )}
            </div>
            <button
              onClick={() => { setEditingProduct(null); setProductModal(true) }}
              style={{ fontFamily: fontBody, background: ACCENT, color: BG_BASE, border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Add product
            </button>
          </div>

          {/* Table */}
          <div style={{ ...card({ overflow: 'hidden', padding: 0 }), position: 'relative' }}>
            {loadingProducts && (
              <div style={{ fontFamily: fontBody, padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>Loading…</div>
            )}
            {!loadingProducts && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Product', 'SKU / Barcode', 'Category', 'Supplier', 'Price', 'Status', ''].map((h, i) => (
                      <th key={h} style={{ ...thStyle, textAlign: i >= 4 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 600 }}>{p.name}</td>
                      <td style={tdStyle}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT_SECONDARY }}>{p.sku}</div>
                        {p.barcode && <div style={{ fontFamily: fontBody, fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{p.barcode}</div>}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{(p as any).category?.name ?? '—'}</td>
                      <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{(p as any).supplier?.name ?? '—'}</td>
                      <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 700, textAlign: 'right' }}>{peso(p.price)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{
                          fontFamily: fontBody,
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: p.status?.toUpperCase() === 'ACTIVE' ? SUCCESS_DIM : 'rgba(255,255,255,0.08)',
                          color: p.status?.toUpperCase() === 'ACTIVE' ? SUCCESS : TEXT_MUTED,
                        }}>
                          {p.status?.toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => { setEditingProduct(p); setProductModal(true) }}
                            style={{ fontFamily: fontBody, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}>
                            Edit
                          </button>
                          <button
                            onClick={() => toggleProductStatus.mutate(p)}
                            style={{
                              fontFamily: fontBody,
                              background: 'none',
                              border: `1px solid ${p.status?.toUpperCase() === 'ACTIVE' ? DANGER : SUCCESS}`,
                              borderRadius: 6, padding: '4px 10px', fontSize: 12,
                              color: p.status?.toUpperCase() === 'ACTIVE' ? DANGER : SUCCESS,
                              cursor: 'pointer',
                            }}>
                            {p.status?.toUpperCase() === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ fontFamily: fontBody, padding: 48, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                        {search || categoryFilter ? 'No products match your filters.' : 'No products yet. Add one to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      {tab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditingCategory(null); setCategoryModal(true) }}
              style={{ fontFamily: fontBody, background: ACCENT, color: BG_BASE, border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Add category
            </button>
          </div>
          <div style={card({ overflow: 'hidden', padding: 0 })}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Description', 'Products', ''].map((h, i) => (
                    <th key={h} style={{ ...thStyle, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 600 }}>{c.name}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{c.description || '—'}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY, textAlign: 'right' }}>
                      {products.filter((p) => p.categoryId === c.id).length}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button onClick={() => { setEditingCategory(c); setCategoryModal(true) }}
                          style={{ fontFamily: fontBody, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteCategory(c)}
                          style={{ fontFamily: fontBody, background: 'none', border: `1px solid ${DANGER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: DANGER, cursor: 'pointer' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={4} style={{ fontFamily: fontBody, padding: 48, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No categories yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Suppliers ── */}
      {tab === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditingSupplier(null); setSupplierModal(true) }}
              style={{ fontFamily: fontBody, background: ACCENT, color: BG_BASE, border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Add supplier
            </button>
          </div>
          <div style={card({ overflow: 'hidden', padding: 0 })}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Contact', 'Address', 'Products', ''].map((h, i) => (
                    <th key={h} style={{ ...thStyle, textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 600 }}>{s.name}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{(s as any).contact_name || '—'}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{s.address || '—'}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY, textAlign: 'right' }}>
                      {products.filter((p) => p.supplierId === s.id).length}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button onClick={() => { setEditingSupplier(s); setSupplierModal(true) }}
                          style={{ fontFamily: fontBody, background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteSupplier(s)}
                          style={{ fontFamily: fontBody, background: 'none', border: `1px solid ${DANGER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: DANGER, cursor: 'pointer' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr><td colSpan={5} style={{ fontFamily: fontBody, padding: 48, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No suppliers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={productModal} onClose={() => setProductModal(false)}
        title={editingProduct ? 'Edit product' : 'Add product'}>
        <ProductForm
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onSave={(data) => saveProduct.mutateAsync(data)}
          onClose={() => setProductModal(false)}
        />
      </Modal>

      <Modal open={categoryModal} onClose={() => setCategoryModal(false)}
        title={editingCategory ? 'Edit category' : 'Add category'}>
        <CategoryForm
          category={editingCategory}
          onSave={(data) => saveCategory.mutateAsync(data)}
          onClose={() => setCategoryModal(false)}
        />
      </Modal>

      <Modal open={supplierModal} onClose={() => setSupplierModal(false)}
        title={editingSupplier ? 'Edit supplier' : 'Add supplier'}>
        <SupplierForm
          supplier={editingSupplier}
          onSave={(data) => saveSupplier.mutateAsync(data)}
          onClose={() => setSupplierModal(false)}
        />
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        message={confirmMsg}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}