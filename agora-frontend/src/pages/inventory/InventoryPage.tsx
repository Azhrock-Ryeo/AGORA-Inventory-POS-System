import { useMemo, useState } from 'react';
import ProductFormModal from '../../components/inventory/ProductFormModal';
import CategoryFormModal from '../../components/inventory/CategoryFormModal';
import SupplierFormModal from '../../components/inventory/SupplierFormModal';
import { mockCategories, mockSuppliers, mockProducts } from '../../data/mockInventory';
import type { Product, Category, Supplier } from '../../types/inventory';

type Tab = 'products' | 'categories' | 'suppliers';

// ── design tokens ────────────────────────────────────────────────────────────
const BG_BASE = '#0f172a';
const BG_CARD = '#1e293b';
const BORDER = '#334155';
const TEXT_PRIMARY = '#f1f5f9';
const TEXT_SECONDARY = '#94a3b8';
const TEXT_MUTED = '#475569';
const ACCENT = '#f59e0b';
const ACCENT_DIM = 'rgba(245,158,11,0.12)';
const SUCCESS = '#34d399';
const SUCCESS_DIM = 'rgba(52,211,153,0.12)';
const DANGER = '#f87171';
const DANGER_DIM = 'rgba(248,113,113,0.12)';

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: BG_CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: '12px',
  ...extra,
});

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: TEXT_MUTED,
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  background: BG_BASE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: '10px 14px',
  color: TEXT_PRIMARY,
  fontSize: 13,
  outline: 'none',
};

const peso = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('products');

  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized';
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? 'Unknown';

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(search);
      const matchesCategory = !categoryFilter || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const handleSaveProduct = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev];
    });
  };

  const handleToggleProductStatus = (product: Product) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
      )
    );
  };

  const handleSaveCategory = (category: Category) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      return exists ? prev.map((c) => (c.id === category.id ? category : c)) : [category, ...prev];
    });
  };

  const handleDeleteCategory = (id: string) => {
    const inUse = products.some((p) => p.categoryId === id);
    if (inUse) {
      window.alert('This category is assigned to existing products. Reassign those products before deleting it.');
      return;
    }
    if (window.confirm('Delete this category?')) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => {
      const exists = prev.some((s) => s.id === supplier.id);
      return exists ? prev.map((s) => (s.id === supplier.id ? supplier : s)) : [supplier, ...prev];
    });
  };

  const handleDeleteSupplier = (id: string) => {
    const inUse = products.some((p) => p.supplierId === id);
    if (inUse) {
      window.alert('This supplier is linked to existing products. Reassign those products before deleting it.');
      return;
    }
    if (window.confirm('Delete this supplier?')) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const TABS: Tab[] = ['products', 'categories', 'suppliers'];

  // ── shared table styles ───────────────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    padding: '12px 20px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: BG_BASE,
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 20px',
    fontSize: 13,
    borderTop: `1px solid ${BORDER}`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: 700, margin: 0 }}>Inventory</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
          Manage your product catalog, categories, and suppliers.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              position: 'relative',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tab === t ? ACCENT : TEXT_MUTED,
              transition: 'color 0.15s',
            }}
          >
            {t}
            {tab === t && (
              <span style={{
                position: 'absolute',
                bottom: -1,
                left: 0,
                right: 0,
                height: 2,
                borderRadius: 2,
                background: ACCENT,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, SKU, or barcode"
                  style={{ ...inputStyle, paddingLeft: 34, width: 240 }}
                />
              </div>
              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ ...inputStyle, paddingRight: 28 }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setEditingProduct(null); setProductModalOpen(true); }}
              style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              + Add product
            </button>
          </div>

          <div style={card({ overflow: 'hidden', padding: 0 })}>
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
                  <tr key={p.id} style={{ background: 'transparent' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = BG_BASE)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</div>
                      {p.barcode && <div style={{ fontSize: 11, color: TEXT_MUTED }}>{p.barcode}</div>}
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{categoryName(p.categoryId)}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{supplierName(p.supplierId)}</td>
                    <td style={{ ...tdStyle, color: TEXT_PRIMARY, fontWeight: 700, textAlign: 'right' }}>{peso(p.price)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: p.status === 'active' ? SUCCESS_DIM : 'rgba(100,116,139,0.15)',
                        color: p.status === 'active' ? SUCCESS : TEXT_MUTED,
                      }}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => { setEditingProduct(p); setProductModalOpen(true); }}
                          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleProductStatus(p)}
                          style={{
                            background: 'none',
                            border: `1px solid ${p.status === 'active' ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.4)'}`,
                            borderRadius: 6, padding: '4px 10px', fontSize: 12,
                            color: p.status === 'active' ? DANGER : SUCCESS,
                            cursor: 'pointer',
                          }}
                        >
                          {p.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                      No products match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Categories Tab ── */}
      {tab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}
              style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
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
                        <button
                          onClick={() => { setEditingCategory(c); setCategoryModalOpen(true); }}
                          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}
                        >Edit</button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          style={{ background: 'none', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: DANGER, cursor: 'pointer' }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Suppliers Tab ── */}
      {tab === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setEditingSupplier(null); setSupplierModalOpen(true); }}
              style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
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
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{s.contact}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>{s.address || '—'}</td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY, textAlign: 'right' }}>
                      {products.filter((p) => p.supplierId === s.id).length}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => { setEditingSupplier(s); setSupplierModalOpen(true); }}
                          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, color: TEXT_SECONDARY, cursor: 'pointer' }}
                        >Edit</button>
                        <button
                          onClick={() => handleDeleteSupplier(s.id)}
                          style={{ background: 'none', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: DANGER, cursor: 'pointer' }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductFormModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
      />
      <CategoryFormModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        category={editingCategory}
      />
      <SupplierFormModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
        supplier={editingSupplier}
      />
    </div>
  );
}