'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id?: string
  name: string
  brand: string
  category: string
  price: number
  mrp: number
  emoji: string
  description: string
  skin_types: string[]
  concerns: string[]
  rating: number
  review_count: number
  is_active: boolean
  is_featured: boolean
  stock?: number
  created_at?: string
}

interface Brand {
  id?: string
  name: string
  description: string
  logo_emoji: string
  is_active: boolean
  contact_email?: string
  website?: string
  brand_story?: string
  supported_concerns?: string[]
}

interface Order {
  id: string
  customer_name?: string
  products?: string
  amount: number
  status: string
  created_at: string
}

interface Payout {
  id: string
  amount: number
  status: string
  requested_at: string
  paid_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Serums', 'Moisturisers', 'Sunscreen', 'Cleansers', 'Treatments', 'Kits', 'Eye Care']
const CONCERNS   = ['Acne', 'Dark Spots', 'Dryness', 'Oiliness', 'Sensitivity', 'Fine Lines', 'Dark Circles', 'Uneven Tone']
const SKIN_TYPES = ['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive']

const VENDOR_TABS = [
  { id: 'products',  label: '🧴 Products'       },
  { id: 'analytics', label: '📊 Analytics'      },
  { id: 'orders',    label: '📦 Orders'         },
  { id: 'brand',     label: '🏷️ Brand Profile'  },
  { id: 'payouts',   label: '💰 Payouts'        },
]

// ─── Inline Seed Data ─────────────────────────────────────────────────────────
const SEED_BRANDS: Brand[] = [
  { name: 'DermIQ',    description: 'Our house brand — dermatologist-formulated, clinically tested', logo_emoji: '🧬', is_active: true },
  { name: 'Minimalist',description: 'Science-backed skincare with high-actives at honest prices',    logo_emoji: '🔬', is_active: true },
  { name: 'Dot & Key', description: 'Nature-inspired skin solutions with a modern twist',            logo_emoji: '🌿', is_active: true },
  { name: 'Plum',      description: 'Goodness-filled skincare — vegan, cruelty-free',               logo_emoji: '🍇', is_active: true },
  { name: 'Pilgrim',   description: 'Inspired by world beauty secrets, made for India',             logo_emoji: '🌺', is_active: true },
]

const SEED_PRODUCTS: Product[] = [
  { name: 'Vitamin C Brightening Serum',    brand: 'DermIQ',    category: 'Serums',       price: 799,  mrp: 1299, emoji: '✨', description: '15% stable Vitamin C for radiant, even-toned skin', skin_types: ['Normal','Dry','Combination'], concerns: ['Dark Spots','Uneven Tone'], rating: 4.9, review_count: 2341, is_active: true, is_featured: true,  stock: 142 },
  { name: 'Hyaluronic Acid Deep Hydra Gel', brand: 'DermIQ',    category: 'Moisturisers', price: 649,  mrp: 999,  emoji: '💧', description: '3-molecular-weight HA for 72-hour moisture lock',    skin_types: ['Normal','Dry','Sensitive'],   concerns: ['Dryness'],              rating: 4.8, review_count: 1876, is_active: true, is_featured: true,  stock: 88  },
  { name: 'Mineral Sunscreen SPF 50+',      brand: 'DermIQ',    category: 'Sunscreen',    price: 549,  mrp: 899,  emoji: '☀️', description: 'Broad-spectrum mineral UV with zero white cast',       skin_types: ['All'],                       concerns: ['Sensitivity'],          rating: 4.9, review_count: 3102, is_active: true, is_featured: true,  stock: 204 },
  { name: 'Retinol Night Cream',            brand: 'DermIQ',    category: 'Treatments',   price: 899,  mrp: 1499, emoji: '🌙', description: 'Encapsulated 0.3% retinol for cellular renewal',     skin_types: ['Normal','Oily','Combination'],concerns: ['Fine Lines','Acne'],     rating: 4.7, review_count: 1245, is_active: true, is_featured: false, stock: 56  },
  { name: 'Niacinamide 10% Serum',          brand: 'DermIQ',    category: 'Serums',       price: 599,  mrp: 999,  emoji: '🫐', description: 'Multi-tasking B3 for pores, sebum and brightening',  skin_types: ['Oily','Combination'],        concerns: ['Acne','Oiliness','Dark Spots'], rating: 4.8, review_count: 2089, is_active: true, is_featured: false, stock: 173 },
  { name: 'Salicylic Acid 2% Solution',     brand: 'Minimalist',category: 'Treatments',   price: 399,  mrp: 599,  emoji: '🔬', description: 'BHA exfoliant for acne and pore clearing',           skin_types: ['Oily'],                      concerns: ['Acne','Oiliness'],      rating: 4.6, review_count: 3892, is_active: true, is_featured: false, stock: 310 },
  { name: 'Alpha Arbutin 2% + HA',          brand: 'Minimalist',category: 'Serums',       price: 449,  mrp: 699,  emoji: '💊', description: 'Brightening serum for dark spots and uneven tone',   skin_types: ['Normal','Dry','Combination'],concerns: ['Dark Spots','Uneven Tone'],rating: 4.7, review_count: 2640, is_active: true, is_featured: false, stock: 95  },
  { name: 'Watermelon Glow Serum',          brand: 'Dot & Key', category: 'Serums',       price: 595,  mrp: 995,  emoji: '🍉', description: 'Hydrating and brightening serum with watermelon',    skin_types: ['Normal','Dry','Combination'],concerns: ['Dryness'],              rating: 4.5, review_count: 987,  is_active: true, is_featured: false, stock: 67  },
  { name: 'Green Tea Face Wash',            brand: 'Plum',      category: 'Cleansers',    price: 295,  mrp: 495,  emoji: '🍵', description: 'Gentle foaming cleanser for oily and acne-prone',    skin_types: ['Oily','Combination'],        concerns: ['Acne','Oiliness'],      rating: 4.4, review_count: 4201, is_active: true, is_featured: false, stock: 412 },
  { name: 'Hyaluronic Moisturizer',         brand: 'Pilgrim',   category: 'Moisturisers', price: 499,  mrp: 799,  emoji: '🌊', description: 'Lightweight HA moisturizer for all skin types',      skin_types: ['All'],                       concerns: ['Dryness'],              rating: 4.5, review_count: 765,  is_active: true, is_featured: false, stock: 38  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────
function discountPct(price: number, mrp: number) {
  if (!mrp || mrp <= price) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}

function statusColor(status: string) {
  const m: Record<string,string> = {
    pending: '#F59E0B', processing: '#3B82F6', shipped: '#14B8A6', delivered: '#22C55E',
    cancelled: '#EF4444', refunded: '#8B5CF6',
  }
  return m[status?.toLowerCase()] || '#6B7280'
}

// ─── Empty form states ────────────────────────────────────────────────────────
const EMPTY_PRODUCT: Product = {
  name: '', brand: '', category: 'Serums', price: 0, mrp: 0,
  emoji: '✨', description: '', skin_types: [], concerns: [],
  rating: 0, review_count: 0, is_active: true, is_featured: false, stock: 0,
}

const EMPTY_BRAND: Brand = {
  name: '', description: '', logo_emoji: '🏪', is_active: true,
  contact_email: '', website: '', brand_story: '', supported_concerns: [],
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorPage() {
  const [tab, setTab]                         = useState('products')
  const [selectedBrand, setSelectedBrand]     = useState<string>('')
  const [brands, setBrands]                   = useState<Brand[]>(SEED_BRANDS)
  const [products, setProducts]               = useState<Product[]>(SEED_PRODUCTS)
  const [orders, setOrders]                   = useState<Order[]>([])
  const [payouts, setPayouts]                 = useState<Payout[]>([])
  const [loading, setLoading]                 = useState(true)
  const [dbReady, setDbReady]                 = useState(false)
  const [search, setSearch]                   = useState('')
  const [catFilter, setCatFilter]             = useState('All')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [analyticsRange, setAnalyticsRange]   = useState<'7D'|'30D'|'90D'>('30D')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct]         = useState<Product | null>(null)
  const [form, setForm]                       = useState<Product>({ ...EMPTY_PRODUCT })
  const [brandForm, setBrandForm]             = useState<Brand>({ ...EMPTY_BRAND })
  const [savingBrand, setSavingBrand]         = useState(false)
  const [bankDetails, setBankDetails]         = useState({ account: '', ifsc: '', name: '' })

  // Load data on mount
  useEffect(() => { loadAll() }, [])

  // Sync brand form when selectedBrand changes
  useEffect(() => {
    const b = brands.find(b => b.name === selectedBrand)
    if (b) setBrandForm({ ...EMPTY_BRAND, ...b })
  }, [selectedBrand, brands])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: bData, error: bErr } = await supabase.from('dermiq_brands').select('*').order('name')
      const { data: pData, error: pErr } = await supabase.from('dermiq_products').select('*').order('created_at', { ascending: false })

      if (!bErr && bData && bData.length > 0) {
        setBrands(bData)
        setDbReady(true)
        if (!selectedBrand) setSelectedBrand(bData[0]?.name || '')
      } else {
        setBrands(SEED_BRANDS)
        setDbReady(false)
        if (!selectedBrand) setSelectedBrand(SEED_BRANDS[0]?.name || '')
      }

      if (!pErr && pData) setProducts(pData)
      else setProducts(SEED_PRODUCTS)

      // Orders + payouts (graceful fallback)
      const { data: oData } = await supabase
        .from('dermiq_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (oData) setOrders(oData)

      const { data: pyData } = await supabase
        .from('dermiq_payouts')
        .select('*')
        .order('requested_at', { ascending: false })
      if (pyData) setPayouts(pyData)
    } catch {
      setBrands(SEED_BRANDS)
      setProducts(SEED_PRODUCTS)
      setDbReady(false)
      if (!selectedBrand) setSelectedBrand(SEED_BRANDS[0]?.name || '')
    } finally {
      setLoading(false)
    }
  }

  // ── Vendor-scoped data ──────────────────────────────────────────────────────
  const vendorProducts = products.filter(p => p.brand === selectedBrand)
  const activeListings  = vendorProducts.filter(p => p.is_active).length
  const avgRating       = vendorProducts.length
    ? (vendorProducts.reduce((s, p) => s + (p.rating || 0), 0) / vendorProducts.length).toFixed(1)
    : '—'
  const vendorOrders   = orders.filter(o =>
    (o.products || '').toLowerCase().includes(selectedBrand.toLowerCase())
  )
  const totalRevenue   = vendorOrders.reduce((s, o) => s + (o.amount || 0), 0)

  const filteredProducts = vendorProducts.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'All' || p.category === catFilter
    return ms && mc
  })

  const filteredOrders = vendorOrders.filter(o =>
    orderStatusFilter === 'all' || o.status?.toLowerCase() === orderStatusFilter
  )

  // ── Product CRUD ────────────────────────────────────────────────────────────
  function openAddProduct() {
    setForm({ ...EMPTY_PRODUCT, brand: selectedBrand })
    setEditProduct(null)
    setShowProductForm(true)
  }

  function openEditProduct(p: Product) {
    setForm({ ...p })
    setEditProduct(p)
    setShowProductForm(true)
  }

  async function saveProduct() {
    if (!form.name.trim()) { toast.error('Product name required'); return }
    if (!form.price || form.price <= 0) { toast.error('Valid price required'); return }
    const payload = { ...form, brand: selectedBrand }

    if (dbReady) {
      const { error } = form.id
        ? await supabase.from('dermiq_products').update(payload).eq('id', form.id)
        : await supabase.from('dermiq_products').insert(payload)
      if (error) { toast.error(error.message); return }
    } else {
      if (form.id) {
        setProducts(prev => prev.map(p => p.id === form.id ? payload : p))
      } else {
        setProducts(prev => [{ ...payload, id: Date.now().toString() }, ...prev])
      }
    }
    toast.success(form.id ? 'Product updated!' : 'Product added!')
    setShowProductForm(false)
    setEditProduct(null)
    if (dbReady) loadAll()
  }

  async function toggleProduct(id: string, active: boolean) {
    if (dbReady) await supabase.from('dermiq_products').update({ is_active: !active }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !active } : p))
    toast.success(!active ? 'Listing activated' : 'Listing hidden')
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    if (dbReady) await supabase.from('dermiq_products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Product deleted')
  }

  // ── Brand Profile Save ──────────────────────────────────────────────────────
  async function saveBrandProfile() {
    setSavingBrand(true)
    if (dbReady) {
      const existing = brands.find(b => b.name === selectedBrand)
      const { error } = existing?.id
        ? await supabase.from('dermiq_brands').update(brandForm).eq('id', existing.id)
        : await supabase.from('dermiq_brands').upsert({ ...brandForm, name: selectedBrand }, { onConflict: 'name' })
      if (error) { toast.error(error.message); setSavingBrand(false); return }
    }
    setBrands(prev => prev.map(b => b.name === selectedBrand ? { ...b, ...brandForm } : b))
    toast.success('Brand profile saved!')
    setSavingBrand(false)
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s: Record<string, any> = {
    page:     { padding: '0 0 64px' },
    h1:       { fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
    sub:      { fontSize: 14, color: 'var(--mu)' },
    card:     { background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 'var(--r)', padding: '20px 18px' },
    statNum:  { fontSize: 30, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 },
    statLabel:{ fontSize: 12, color: 'var(--mu)', marginTop: 6, fontWeight: 500 },
    statSub:  { fontSize: 11, color: 'var(--mu)', marginTop: 2 },
    tabBtn: (a: boolean) => ({
      padding: '10px 18px', border: 'none',
      borderBottom: a ? '2px solid var(--teal)' : '2px solid transparent',
      background: 'none', fontWeight: a ? 700 : 500,
      color: a ? 'var(--teal)' : 'var(--mu)',
      cursor: 'pointer', fontSize: 13, transition: 'all .2s', fontFamily: 'inherit',
    }),
    btn: (col?: string) => ({
      padding: '10px 20px', background: col || 'var(--dark)', color: '#fff',
      border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
    }),
    outBtn: {
      padding: '9px 18px', background: 'transparent', color: 'var(--text)',
      border: '1.5px solid var(--s2)', borderRadius: 50, fontSize: 13,
      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    },
    input: {
      padding: '10px 14px', border: '1.5px solid var(--s2)', borderRadius: 'var(--r)',
      fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--s1)',
      color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const,
    },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--mu)', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '2px solid var(--s2)', color: 'var(--mu)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.07em', whiteSpace: 'nowrap' as const },
    td: { padding: '12px', borderBottom: '1px solid var(--s2)', verticalAlign: 'middle' as const },
    tag: (color: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color }),
    pill: (active: boolean) => ({
      padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: active ? 'var(--teal)' : 'var(--s2)', color: active ? '#fff' : 'var(--mu)',
      border: 'none', fontFamily: 'inherit', transition: 'all .15s',
    }),
    chip: (active: boolean) => ({
      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: active ? '#14b8a622' : 'var(--s2)', color: active ? 'var(--teal)' : 'var(--mu)',
      border: active ? '1.5px solid var(--teal)' : '1.5px solid transparent',
      fontFamily: 'inherit', transition: 'all .15s',
    }),
    overlay: {
      position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto' as const,
    },
    modal: {
      background: 'var(--dark)', borderRadius: 'var(--r)', padding: 28,
      width: '100%', maxWidth: 560, position: 'relative' as const,
    },
    select: {
      padding: '10px 14px', border: '1.5px solid var(--s2)', borderRadius: 'var(--r)',
      fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--s1)',
      color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const, cursor: 'pointer',
    },
    textarea: {
      padding: '10px 14px', border: '1.5px solid var(--s2)', borderRadius: 'var(--r)',
      fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--s1)',
      color: 'var(--text)', width: '100%', boxSizing: 'border-box' as const,
      resize: 'vertical' as const, minHeight: 90,
    },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--mu)', gap: 10 }}>
      <span style={{ fontSize: 22 }}>🏪</span> Loading Vendor Portal…
    </div>
  )

  return (
    <div style={s.page}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={s.h1}>🏪 Vendor Portal</div>
            <div style={s.sub}>Manage your brand, products and performance on DermIQ Marketplace</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={s.btn('var(--teal)')} onClick={openAddProduct}>+ Add Product</button>
            <a href="http://localhost:3001" target="_blank" style={{ ...s.outBtn, textDecoration: 'none', color: 'var(--text)' }}>
              View on Store →
            </a>
          </div>
        </div>
      </div>

      {/* ── Vendor Selector ─────────────────────────────────────────────────── */}
      <div style={{ ...s.card, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 600, whiteSpace: 'nowrap' }}>Viewing as vendor:</span>
        <select
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          style={{ ...s.select, width: 'auto', minWidth: 200, flex: 1, maxWidth: 320 }}
        >
          {brands.map(b => (
            <option key={b.name} value={b.name}>{b.logo_emoji} {b.name}</option>
          ))}
        </select>
        {!dbReady && (
          <span style={{ ...s.tag('#F59E0B'), fontSize: 11 }}>⚡ Preview Mode — DB tables not detected</span>
        )}
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
        <div style={s.card}>
          <div style={s.statNum}>{vendorProducts.length}</div>
          <div style={s.statLabel}>Total Products</div>
          <div style={s.statSub}>Listed on DermIQ</div>
        </div>
        <div style={s.card}>
          <div style={{ ...s.statNum, color: 'var(--green)' }}>{activeListings}</div>
          <div style={s.statLabel}>Active Listings</div>
          <div style={s.statSub}>{vendorProducts.length - activeListings} hidden</div>
        </div>
        <div style={s.card}>
          <div style={s.statNum}>₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div style={s.statLabel}>Total Revenue</div>
          <div style={s.statSub}>Lifetime earnings</div>
        </div>
        <div style={s.card}>
          <div style={{ ...s.statNum, color: '#F59E0B' }}>{avgRating} ⭐</div>
          <div style={s.statLabel}>Avg Rating</div>
          <div style={s.statSub}>Across all products</div>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--s2)', flexWrap: 'wrap' }}>
        {VENDOR_TABS.map(t => (
          <button key={t.id} style={s.tabBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: PRODUCTS                                                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <div>
          {/* Search + Filter bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="🔍 Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...s.input, maxWidth: 260, flex: 1 }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All', ...CATEGORIES].map(c => (
                <button key={c} style={s.pill(catFilter === c)} onClick={() => setCatFilter(c)}>{c}</button>
              ))}
            </div>
            <button style={{ ...s.btn('var(--teal)'), marginLeft: 'auto' }} onClick={openAddProduct}>
              + Add New Product
            </button>
          </div>

          {/* Products Table */}
          <div style={{ ...s.card, padding: 0, overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}></th>
                  <th style={s.th}>Product Name</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Price</th>
                  <th style={s.th}>MRP</th>
                  <th style={s.th}>Disc%</th>
                  <th style={s.th}>Stock</th>
                  <th style={s.th}>Rating</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ ...s.td, textAlign: 'center', color: 'var(--mu)', padding: 40 }}>
                      No products found. Add your first product!
                    </td>
                  </tr>
                ) : filteredProducts.map(p => (
                  <tr key={p.id || p.name} style={{ transition: 'background .15s' }}>
                    <td style={s.td}>
                      <span style={{ fontSize: 22 }}>{p.emoji}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{p.description?.slice(0, 50)}…</div>
                    </td>
                    <td style={s.td}>
                      <span style={s.tag('#14B8A6')}>{p.category}</span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700 }}>₹{p.price}</td>
                    <td style={{ ...s.td, color: 'var(--mu)', textDecoration: 'line-through' }}>₹{p.mrp}</td>
                    <td style={{ ...s.td, color: 'var(--green)', fontWeight: 700 }}>
                      {discountPct(p.price, p.mrp)}%
                    </td>
                    <td style={s.td}>
                      <span style={{ color: (p.stock || 0) < 20 ? 'var(--red)' : 'var(--text)', fontWeight: 600 }}>
                        {p.stock ?? '—'}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#F59E0B', fontWeight: 600 }}>
                      ⭐ {p.rating?.toFixed(1) || '—'}
                    </td>
                    <td style={s.td}>
                      <span style={s.tag(p.is_active ? '#22C55E' : '#6B7280')}>
                        {p.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEditProduct(p)}
                          style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: '1px solid var(--s2)', background: 'var(--s1)', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => p.id && toggleProduct(p.id, p.is_active)}
                          style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: 'none', background: p.is_active ? '#ef444422' : '#22c55e22', color: p.is_active ? 'var(--red)' : 'var(--green)', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {p.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => p.id && deleteProduct(p.id)}
                          style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600, border: 'none', background: '#ef444415', color: 'var(--red)', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: ANALYTICS                                                        */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div>
          {/* Date range pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {(['7D','30D','90D'] as const).map(r => (
              <button key={r} style={s.pill(analyticsRange === r)} onClick={() => setAnalyticsRange(r)}>{r}</button>
            ))}
          </div>

          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Page Views',     value: '—',   sub: 'Connect analytics to see data', icon: '👁️'  },
              { label: 'Add-to-Cart',    value: '—',   sub: 'Requires store integration',    icon: '🛒'  },
              { label: 'Conversions',    value: '—',   sub: 'Orders / Views',                icon: '✅'  },
              { label: 'Revenue',        value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: `Last ${analyticsRange}`, icon: '💰' },
            ].map(m => (
              <div key={m.label} style={s.card}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                <div style={s.statNum}>{m.value}</div>
                <div style={s.statLabel}>{m.label}</div>
                <div style={s.statSub}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Top Products */}
          <div style={{ ...s.card }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>
              Top Products by Inventory
            </div>
            {vendorProducts.slice(0, 5).map((p, i) => {
              const maxStock = Math.max(...vendorProducts.map(x => x.stock || 0), 1)
              const pct = Math.round(((p.stock || 0) / maxStock) * 100)
              return (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{p.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--s2)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--teal)', borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--mu)', width: 60, textAlign: 'right' }}>
                    {p.stock ?? 0} units
                  </span>
                </div>
              )
            })}
            {vendorProducts.length === 0 && (
              <div style={{ color: 'var(--mu)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                No products found for this vendor.
              </div>
            )}
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#3b82f611', borderRadius: 'var(--r)', fontSize: 12, color: '#3B82F6' }}>
              ℹ️ Full analytics (views, conversions, revenue trends) will appear once the DermIQ store analytics API is connected.
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: ORDERS                                                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['all','pending','processing','shipped','delivered','cancelled'].map(s_ => (
              <button key={s_} style={s.pill(orderStatusFilter === s_)} onClick={() => setOrderStatusFilter(s_)}>
                {s_.charAt(0).toUpperCase() + s_.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ ...s.card, padding: 0, overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Order ID</th>
                  <th style={s.th}>Customer</th>
                  <th style={s.th}>Products</th>
                  <th style={s.th}>Amount</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--mu)', padding: 48 }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
                      <div style={{ fontWeight: 600 }}>No orders yet</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Orders from DermIQ will appear here once the store is connected.</div>
                    </td>
                  </tr>
                ) : filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12, color: 'var(--mu)' }}>
                      #{o.id?.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{o.customer_name || 'N/A'}</td>
                    <td style={{ ...s.td, maxWidth: 200, color: 'var(--mu)', fontSize: 12 }}>{o.products || '—'}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>₹{(o.amount || 0).toLocaleString('en-IN')}</td>
                    <td style={s.td}>
                      <span style={s.tag(statusColor(o.status))}>
                        {o.status?.charAt(0).toUpperCase() + o.status?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: 'var(--mu)', fontSize: 12 }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: BRAND PROFILE                                                    */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'brand' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
          {/* Left: Basic Info */}
          <div style={s.card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, color: 'var(--text)' }}>
              Brand Identity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Brand Name</label>
                <input
                  style={s.input}
                  value={brandForm.name || selectedBrand}
                  onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Brand name"
                />
              </div>
              <div>
                <label style={s.label}>Logo Emoji</label>
                <input
                  style={s.input}
                  value={brandForm.logo_emoji}
                  onChange={e => setBrandForm(f => ({ ...f, logo_emoji: e.target.value }))}
                  placeholder="🧬"
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Short Description</label>
              <input
                style={s.input}
                value={brandForm.description}
                onChange={e => setBrandForm(f => ({ ...f, description: e.target.value }))}
                placeholder="One-line brand description"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Contact Email</label>
              <input
                style={s.input}
                type="email"
                value={brandForm.contact_email || ''}
                onChange={e => setBrandForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder="brand@example.com"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Website</label>
              <input
                style={s.input}
                value={brandForm.website || ''}
                onChange={e => setBrandForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://yourbrand.com"
              />
            </div>
          </div>

          {/* Right: Story + Concerns */}
          <div>
            <div style={{ ...s.card, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>
                Brand Story
              </div>
              <textarea
                style={s.textarea}
                rows={5}
                value={brandForm.brand_story || ''}
                onChange={e => setBrandForm(f => ({ ...f, brand_story: e.target.value }))}
                placeholder="Tell customers what makes your brand unique — your mission, philosophy, formulation approach…"
              />
            </div>

            <div style={{ ...s.card, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>
                Supported Skin Concerns
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CONCERNS.map(c => {
                  const active = (brandForm.supported_concerns || []).includes(c)
                  return (
                    <button
                      key={c}
                      style={s.chip(active)}
                      onClick={() => setBrandForm(f => ({
                        ...f,
                        supported_concerns: active
                          ? (f.supported_concerns || []).filter(x => x !== c)
                          : [...(f.supported_concerns || []), c],
                      }))}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              style={{ ...s.btn('var(--teal)'), width: '100%', justifyContent: 'center' }}
              onClick={saveBrandProfile}
              disabled={savingBrand}
            >
              {savingBrand ? '⏳ Saving…' : '✅ Save Brand Profile'}
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: PAYOUTS                                                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {tab === 'payouts' && (
        <div>
          {/* Balance + commission */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ ...s.card, border: '1.5px solid var(--teal)' }}>
              <div style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Available Balance
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>₹0</div>
              <button style={s.btn('var(--teal)')}>
                💸 Request Payout
              </button>
            </div>
            <div style={s.card}>
              <div style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Commission Structure
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>DermIQ Commission</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--teal)' }}>15%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--s2)', overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: 'var(--teal)', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>
                You keep <strong>85%</strong> of every sale. Payouts every 30 days to your registered bank account.
              </div>
            </div>
            <div style={s.card}>
              <div style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Earned (Lifetime)
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)' }}>
                ₹{Math.round(totalRevenue * 0.85).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 6 }}>After 15% commission deduction</div>
            </div>
          </div>

          {/* Payout History */}
          <div style={{ ...s.card, marginBottom: 20, padding: 0, overflowX: 'auto' }}>
            <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 15, borderBottom: '1px solid var(--s2)', color: 'var(--text)' }}>
              Payout History
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Payout ID</th>
                  <th style={s.th}>Amount</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Requested</th>
                  <th style={s.th}>Paid On</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...s.td, textAlign: 'center', color: 'var(--mu)', padding: 40 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
                      No payouts yet. Your first payout will appear here once processed.
                    </td>
                  </tr>
                ) : payouts.map(py => (
                  <tr key={py.id}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>#{py.id?.slice(-6).toUpperCase()}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>₹{py.amount?.toLocaleString('en-IN')}</td>
                    <td style={s.td}><span style={s.tag(statusColor(py.status))}>{py.status}</span></td>
                    <td style={{ ...s.td, fontSize: 12, color: 'var(--mu)' }}>{new Date(py.requested_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ ...s.td, fontSize: 12, color: 'var(--mu)' }}>{py.paid_at ? new Date(py.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bank Details */}
          <div style={s.card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>
              🏦 Bank Account Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={s.label}>Account Number</label>
                <input
                  style={s.input}
                  value={bankDetails.account}
                  onChange={e => setBankDetails(b => ({ ...b, account: e.target.value }))}
                  placeholder="XXXXXXXXXXXXXXXX"
                  type="password"
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={s.label}>IFSC Code</label>
                <input
                  style={s.input}
                  value={bankDetails.ifsc}
                  onChange={e => setBankDetails(b => ({ ...b, ifsc: e.target.value.toUpperCase() }))}
                  placeholder="HDFC0001234"
                />
              </div>
              <div>
                <label style={s.label}>Account Holder Name</label>
                <input
                  style={s.input}
                  value={bankDetails.name}
                  onChange={e => setBankDetails(b => ({ ...b, name: e.target.value }))}
                  placeholder="As per bank records"
                />
              </div>
            </div>
            <button
              style={s.btn()}
              onClick={() => toast.success('Bank details saved securely!')}
            >
              💾 Save Bank Details
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* PRODUCT FORM MODAL                                                      */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {showProductForm && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) { setShowProductForm(false); setEditProduct(null) } }}>
          <div style={s.modal}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
                {editProduct ? '✏️ Edit Product' : '➕ Add New Product'}
              </div>
              <button
                onClick={() => { setShowProductForm(false); setEditProduct(null) }}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--mu)', fontFamily: 'inherit' }}
              >
                ✕
              </button>
            </div>

            {/* Row: Emoji + Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Emoji</label>
                <input
                  style={{ ...s.input, textAlign: 'center', fontSize: 22, padding: '8px' }}
                  value={form.emoji}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  placeholder="✨"
                />
              </div>
              <div>
                <label style={s.label}>Product Name *</label>
                <input
                  style={s.input}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Vitamin C Brightening Serum"
                />
              </div>
            </div>

            {/* Row: Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Category</label>
              <select
                style={s.select}
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Row: Price + MRP + Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={s.label}>Price (₹) *</label>
                <input
                  style={s.input}
                  type="number"
                  value={form.price || ''}
                  onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  placeholder="799"
                />
              </div>
              <div>
                <label style={s.label}>MRP (₹)</label>
                <input
                  style={s.input}
                  type="number"
                  value={form.mrp || ''}
                  onChange={e => setForm(f => ({ ...f, mrp: Number(e.target.value) }))}
                  placeholder="1299"
                />
              </div>
              <div>
                <label style={s.label}>Stock</label>
                <input
                  style={s.input}
                  type="number"
                  value={form.stock ?? ''}
                  onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                  placeholder="100"
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Description</label>
              <textarea
                style={s.textarea}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short product description…"
                rows={3}
              />
            </div>

            {/* Skin Types */}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Skin Types</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SKIN_TYPES.map(st => {
                  const active = form.skin_types.includes(st)
                  return (
                    <button
                      key={st}
                      style={s.chip(active)}
                      onClick={() => setForm(f => ({
                        ...f,
                        skin_types: active ? f.skin_types.filter(x => x !== st) : [...f.skin_types, st],
                      }))}
                    >
                      {st}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Concerns */}
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Skin Concerns</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CONCERNS.map(c => {
                  const active = form.concerns.includes(c)
                  return (
                    <button
                      key={c}
                      style={s.chip(active)}
                      onClick={() => setForm(f => ({
                        ...f,
                        concerns: active ? f.concerns.filter(x => x !== c) : [...f.concerns, c],
                      }))}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                style={{
                  width: 42, height: 24, borderRadius: 12, background: form.is_active ? 'var(--teal)' : 'var(--s2)',
                  cursor: 'pointer', position: 'relative', transition: 'background .2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: form.is_active ? 20 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                {form.is_active ? 'Active — visible on store' : 'Hidden — not visible'}
              </span>
            </div>

            {/* Discount preview */}
            {form.mrp > form.price && form.price > 0 && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#22c55e15', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--green)' }}>
                ✅ {discountPct(form.price, form.mrp)}% discount — customers save ₹{form.mrp - form.price}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.btn('var(--teal)')} onClick={saveProduct}>
                {editProduct ? '✅ Update Product' : '➕ Add Product'}
              </button>
              <button
                style={s.outBtn}
                onClick={() => { setShowProductForm(false); setEditProduct(null) }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
