'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
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
  created_at?: string
}

interface Brand {
  id?: string
  name: string
  description: string
  logo_emoji: string
  is_active: boolean
  product_count?: number
}

const TABS = [
  { id: 'overview',  label: '📊 Overview'   },
  { id: 'products',  label: '🧴 Products'   },
  { id: 'brands',    label: '🏷️ Brands'     },
  { id: 'specialists', label: '👨‍⚕️ Specialists' },
  { id: 'orders',    label: '📦 Orders'     },
  { id: 'banners',   label: '🖼️ Banners'    },
]

const CATEGORIES = ['Serums', 'Moisturisers', 'Sunscreen', 'Cleansers', 'Treatments', 'Kits', 'Eye Care']
const CONCERNS   = ['Acne', 'Dark Spots', 'Dryness', 'Oiliness', 'Sensitivity', 'Fine Lines', 'Dark Circles', 'Uneven Tone']
const SKIN_TYPES = ['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive']

// ─── Seed data for initial setup ─────────────────────────────────────────────
const SEED_PRODUCTS: Product[] = [
  { name: 'Vitamin C Brightening Serum', brand: 'DermIQ', category: 'Serums', price: 799, mrp: 1299, emoji: '✨', description: '15% stable Vitamin C for radiant, even-toned skin', skin_types: ['Normal','Dry','Combination'], concerns: ['Dark Spots','Dullness','Uneven Tone'], rating: 4.9, review_count: 2341, is_active: true, is_featured: true },
  { name: 'Hyaluronic Acid Deep Hydra Gel', brand: 'DermIQ', category: 'Moisturisers', price: 649, mrp: 999, emoji: '💧', description: '3-molecular-weight HA for 72-hour moisture lock', skin_types: ['Normal','Dry','Sensitive'], concerns: ['Dryness'], rating: 4.8, review_count: 1876, is_active: true, is_featured: true },
  { name: 'Mineral Sunscreen SPF 50+', brand: 'DermIQ', category: 'Sunscreen', price: 549, mrp: 899, emoji: '☀️', description: 'Broad-spectrum mineral UV with zero white cast', skin_types: ['All'], concerns: ['Sensitivity'], rating: 4.9, review_count: 3102, is_active: true, is_featured: true },
  { name: 'Retinol Night Cream', brand: 'DermIQ', category: 'Treatments', price: 899, mrp: 1499, emoji: '🌙', description: 'Encapsulated 0.3% retinol for cellular renewal', skin_types: ['Normal','Oily','Combination'], concerns: ['Fine Lines','Acne'], rating: 4.7, review_count: 1245, is_active: true, is_featured: false },
  { name: 'Niacinamide 10% Serum', brand: 'DermIQ', category: 'Serums', price: 599, mrp: 999, emoji: '🫐', description: 'Multi-tasking B3 for pores, sebum and brightening', skin_types: ['Oily','Combination'], concerns: ['Acne','Oiliness','Dark Spots'], rating: 4.8, review_count: 2089, is_active: true, is_featured: false },
  { name: 'Salicylic Acid 2% Solution', brand: 'Minimalist', category: 'Treatments', price: 399, mrp: 599, emoji: '🔬', description: 'BHA exfoliant for acne and pore clearing', skin_types: ['Oily','Acne-prone'], concerns: ['Acne','Oiliness'], rating: 4.6, review_count: 3892, is_active: true, is_featured: false },
  { name: 'Alpha Arbutin 2% + HA', brand: 'Minimalist', category: 'Serums', price: 449, mrp: 699, emoji: '💊', description: 'Brightening serum for dark spots and uneven tone', skin_types: ['Normal','Dry','Combination'], concerns: ['Dark Spots','Uneven Tone'], rating: 4.7, review_count: 2640, is_active: true, is_featured: false },
  { name: 'Watermelon Glow Serum', brand: 'Dot & Key', category: 'Serums', price: 595, mrp: 995, emoji: '🍉', description: 'Hydrating and brightening serum with watermelon extract', skin_types: ['Normal','Dry','Combination'], concerns: ['Dryness','Dullness'], rating: 4.5, review_count: 987, is_active: true, is_featured: false },
  { name: 'Green Tea Face Wash', brand: 'Plum', category: 'Cleansers', price: 295, mrp: 495, emoji: '🍵', description: 'Gentle foaming cleanser for oily and acne-prone skin', skin_types: ['Oily','Combination'], concerns: ['Acne','Oiliness'], rating: 4.4, review_count: 4201, is_active: true, is_featured: false },
  { name: 'Hyaluronic Moisturizer', brand: 'Pilgrim', category: 'Moisturisers', price: 499, mrp: 799, emoji: '🌊', description: 'Lightweight HA moisturizer for all skin types', skin_types: ['All'], concerns: ['Dryness'], rating: 4.5, review_count: 765, is_active: true, is_featured: false },
]

const SEED_BRANDS: Brand[] = [
  { name: 'DermIQ', description: 'Our house brand — dermatologist-formulated, clinically tested', logo_emoji: '🧬', is_active: true },
  { name: 'Minimalist', description: 'Science-backed skincare with high-actives at honest prices', logo_emoji: '🔬', is_active: true },
  { name: 'Dot & Key', description: 'Nature-inspired skin solutions with a modern twist', logo_emoji: '🌿', is_active: true },
  { name: 'Plum', description: 'Goodness-filled skincare — vegan, cruelty-free', logo_emoji: '🍇', is_active: true },
  { name: 'Pilgrim', description: 'Inspired by world beauty secrets, made for India', logo_emoji: '🌺', is_active: true },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [tab, setTab]             = useState('overview')
  const [products, setProducts]   = useState<Product[]>([])
  const [brands, setBrands]       = useState<Brand[]>([])
  const [specialists, setSpecialists] = useState<any[]>([])
  const [orders, setOrders]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [dbReady, setDbReady]     = useState(false)
  const [search, setSearch]       = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [editBrand, setEditBrand] = useState<Brand | null>(null)
  const [catFilter, setCatFilter] = useState('All')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // Try to read from dermiq_products — if table missing, use seed data
      const { data: pData, error: pErr } = await supabase.from('dermiq_products').select('*').order('created_at', { ascending: false })
      const { data: bData, error: bErr } = await supabase.from('dermiq_brands').select('*').order('name')
      const { data: sData } = await supabase.from('profiles').select('id, full_name, specialty, status, role').eq('role', 'specialist').order('full_name')
      const { data: oData } = await supabase.from('orders').select('id, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(20)

      if (!pErr && pData) { setProducts(pData); setDbReady(true) }
      else { setProducts(SEED_PRODUCTS); setDbReady(false) }
      if (!bErr && bData) setBrands(bData)
      else setBrands(SEED_BRANDS)
      if (sData) setSpecialists(sData)
      if (oData) setOrders(oData)
    } catch {
      setProducts(SEED_PRODUCTS)
      setBrands(SEED_BRANDS)
    } finally { setLoading(false) }
  }

  async function setupTables() {
    toast.loading('Setting up DermIQ tables…')
    // Insert seed brands
    const { error: be } = await supabase.from('dermiq_brands').upsert(SEED_BRANDS, { onConflict: 'name' })
    // Insert seed products
    const { error: pe } = await supabase.from('dermiq_products').upsert(SEED_PRODUCTS, { onConflict: 'name' })
    toast.dismiss()
    if (be || pe) { toast.error('Tables may not exist yet — create them in Supabase first'); return }
    toast.success('Marketplace tables seeded!')
    setDbReady(true)
    loadAll()
  }

  async function saveProduct(p: Product) {
    if (dbReady) {
      const { error } = p.id
        ? await supabase.from('dermiq_products').update(p).eq('id', p.id)
        : await supabase.from('dermiq_products').insert(p)
      if (error) { toast.error(error.message); return }
    } else {
      if (p.id) setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      else setProducts(prev => [{ ...p, id: Date.now().toString() }, ...prev])
    }
    toast.success(p.id ? 'Product updated!' : 'Product added!')
    setShowProductForm(false); setEditProduct(null); if (dbReady) loadAll()
  }

  async function toggleProduct(id: string, active: boolean) {
    if (dbReady) await supabase.from('dermiq_products').update({ is_active: !active }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !active } : p))
    toast.success(!active ? 'Product activated' : 'Product hidden')
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    if (dbReady) await supabase.from('dermiq_products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Product deleted')
  }

  async function saveBrand(b: Brand) {
    if (dbReady) {
      const { error } = b.id
        ? await supabase.from('dermiq_brands').update(b).eq('id', b.id)
        : await supabase.from('dermiq_brands').insert(b)
      if (error) { toast.error(error.message); return }
    } else {
      if (b.id) setBrands(prev => prev.map(x => x.id === b.id ? b : x))
      else setBrands(prev => [...prev, { ...b, id: Date.now().toString() }])
    }
    toast.success(b.id ? 'Brand updated!' : 'Brand added!')
    setShowBrandForm(false); setEditBrand(null)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.is_active).length
  const activeBrands = brands.filter(b => b.is_active).length
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'All' || p.category === catFilter
    return matchSearch && matchCat
  })

  const s: Record<string, any> = {
    page: { padding: '0 0 48px' },
    header: { marginBottom: 28 },
    h1: { fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 },
    sub: { fontSize: 14, color: 'var(--mu)' },
    tabRow: { display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--s2)', flexWrap: 'wrap' as const },
    tabBtn: (active: boolean) => ({ padding: '10px 18px', border: 'none', borderBottom: active ? '2px solid var(--teal)' : '2px solid transparent', background: 'none', fontWeight: active ? 700 : 500, color: active ? 'var(--teal)' : 'var(--mu)', cursor: 'pointer', fontSize: 13, transition: 'all .2s', fontFamily: 'inherit' }),
    stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
    statCard: { background: 'var(--s1)', borderRadius: 'var(--r)', padding: '20px 18px', border: '1px solid var(--s2)' },
    statNum: { fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 },
    statLabel: { fontSize: 12, color: 'var(--mu)', marginTop: 5, fontWeight: 500 },
    dbBanner: { background: '#fff3e0', border: '1px solid #f59e0b', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const },
    btn: (col?: string) => ({ padding: '10px 20px', background: col || 'var(--dark)', color: '#fff', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }),
    outBtn: { padding: '9px 18px', background: 'transparent', color: 'var(--text)', border: '1.5px solid var(--s2)', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
    input: { padding: '10px 14px', border: '1.5px solid var(--s2)', borderRadius: 'var(--r)', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--s1)' },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '2px solid var(--s2)', color: 'var(--mu)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', whiteSpace: 'nowrap' as const },
    td: { padding: '12px', borderBottom: '1px solid var(--s2)', verticalAlign: 'middle' as const },
    tag: (color: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color }),
    card: { background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 'var(--r)', padding: 18 },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--mu)', gap: 10 }}>
      <span style={{ fontSize: 20 }}>🛍️</span> Loading Marketplace…
    </div>
  )

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={s.h1}>🛍️ DermIQ Marketplace</div>
            <div style={s.sub}>Multi-vendor skincare platform control panel — manage products, brands, specialists &amp; orders</div>
          </div>
          <a href="http://localhost:3001" target="_blank" style={{ ...s.btn(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            🌐 View Live Store
          </a>
        </div>
      </div>

      {/* DB Not Ready Banner */}
      {!dbReady && (
        <div style={s.dbBanner}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>⚠️ Using local data — Supabase tables not connected</div>
            <div style={{ fontSize: 12, color: '#78350f', marginTop: 3 }}>Create <code>dermiq_products</code> and <code>dermiq_brands</code> tables in Supabase to persist data</div>
          </div>
          <button onClick={setupTables} style={s.btn('#f59e0b')}>Seed Tables →</button>
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabRow}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={s.tabBtn(tab === t.id)}>{t.label}</button>)}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div style={s.stats}>
            {[
              { num: totalProducts, label: 'Total Products', icon: '🧴', color: 'var(--teal)' },
              { num: activeProducts, label: 'Active Listings', icon: '✅', color: 'var(--green)' },
              { num: activeBrands, label: 'Active Brands', icon: '🏷️', color: 'var(--accent, #C8976A)' },
              { num: `₹${totalRevenue.toLocaleString('en-IN')}`, label: 'Total Revenue', icon: '💰', color: 'var(--yellow, #f59e0b)' },
            ].map((s2, i) => (
              <div key={i} style={s.statCard}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s2.icon}</div>
                <div style={{ ...s.statNum, color: s2.color }}>{s2.num}</div>
                <div style={s.statLabel}>{s2.label}</div>
              </div>
            ))}
          </div>

          {/* Featured Products */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>⭐ Featured Products</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {products.filter(p => p.is_featured).map((p, i) => (
                <div key={i} style={{ ...s.card, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 32, width: 48, height: 48, borderRadius: 12, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{p.brand}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--teal)', marginTop: 3 }}>₹{p.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Overview */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🏷️ Brands Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {brands.map((b, i) => (
                <div key={i} style={{ ...s.card, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{b.logo_emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>{products.filter(p => p.brand === b.name).length} products</div>
                  <span style={s.tag(b.is_active ? 'var(--green,#22c55e)' : 'var(--mu)')}>{b.is_active ? 'Active' : 'Hidden'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {tab === 'products' && (
        <div>
          <div style={s.row}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or brands…" style={{ ...s.input, flex: 1, minWidth: 200 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '7px 14px', background: catFilter === c ? 'var(--dark)' : 'var(--s1)', color: catFilter === c ? '#fff' : 'var(--text)', border: '1.5px solid var(--s2)', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{c}</button>
              ))}
            </div>
            <button onClick={() => { setEditProduct(null); setShowProductForm(true) }} style={s.btn()}>+ Add Product</button>
          </div>

          {/* Add/Edit Form */}
          {showProductForm && (
            <ProductForm
              initial={editProduct}
              brands={brands}
              onSave={saveProduct}
              onClose={() => { setShowProductForm(false); setEditProduct(null) }}
            />
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['', 'Product', 'Brand', 'Category', 'Price', 'Rating', 'Status', 'Featured', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, i) => (
                  <tr key={i} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                    <td style={s.td}><span style={{ fontSize: 22 }}>{p.emoji}</span></td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>{p.description?.slice(0, 48)}…</div>
                    </td>
                    <td style={s.td}><span style={s.tag('var(--teal)')}>{p.brand}</span></td>
                    <td style={s.td}><span style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 600 }}>{p.category}</span></td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 800, color: 'var(--teal)' }}>₹{p.price}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', textDecoration: 'line-through' }}>₹{p.mrp}</div>
                    </td>
                    <td style={s.td}><span style={{ fontSize: 13, fontWeight: 700 }}>★ {p.rating}</span><span style={{ fontSize: 11, color: 'var(--mu)' }}> ({p.review_count?.toLocaleString('en-IN')})</span></td>
                    <td style={s.td}>
                      <button onClick={() => p.id && toggleProduct(p.id, p.is_active)} style={{ ...s.tag(p.is_active ? 'var(--green,#22c55e)' : 'var(--mu)'), border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {p.is_active ? '● Active' : '● Hidden'}
                      </button>
                    </td>
                    <td style={s.td}><span style={{ fontSize: 16 }}>{p.is_featured ? '⭐' : '—'}</span></td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditProduct(p); setShowProductForm(true) }} style={{ ...s.outBtn, padding: '6px 12px' }}>Edit</button>
                        <button onClick={() => p.id && deleteProduct(p.id)} style={{ ...s.outBtn, padding: '6px 12px', color: 'var(--red,#ef4444)', borderColor: 'var(--red,#ef4444)' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>No products match your filters</div>}
          </div>
        </div>
      )}

      {/* ── BRANDS ── */}
      {tab === 'brands' && (
        <div>
          <div style={s.row}>
            <button onClick={() => { setEditBrand(null); setShowBrandForm(true) }} style={s.btn()}>+ Add Brand</button>
          </div>
          {showBrandForm && (
            <BrandForm
              initial={editBrand}
              onSave={saveBrand}
              onClose={() => { setShowBrandForm(false); setEditBrand(null) }}
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {brands.map((b, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 32, width: 56, height: 56, borderRadius: 16, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{b.logo_emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{b.name}</div>
                    <span style={s.tag(b.is_active ? 'var(--green,#22c55e)' : 'var(--mu)')}>{b.is_active ? 'Active' : 'Hidden'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', margin: '5px 0 10px' }}>{b.description}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>{products.filter(p => p.brand === b.name).length} products listed</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={() => { setEditBrand(b); setShowBrandForm(true) }} style={{ ...s.outBtn, padding: '6px 12px' }}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SPECIALISTS ── */}
      {tab === 'specialists' && (
        <div>
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--mu)' }}>
            Assign specialists from your HQ team to handle DermIQ skin consultations. Specialists appear in the "Know Your Skin" consultation flow.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {specialists.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--mu)' }}>
                No specialists found. Make sure team members have role = 'specialist' in Supabase profiles.
              </div>
            ) : specialists.map((sp, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--teal2,#3D7A74))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👨‍⚕️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sp.full_name || sp.name || 'Specialist'}</div>
                  <div style={{ fontSize: 12, color: 'var(--mu)' }}>{sp.specialty || 'Dermatologist'}</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked={sp.status === 'active'} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  DermIQ
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === 'orders' && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Recent DermIQ Orders</div>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 700 }}>No orders yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Orders from the DermIQ marketplace will appear here</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>{['Order ID', 'Customer', 'Amount', 'Status', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i}>
                      <td style={s.td}><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{o.id?.slice(0, 8).toUpperCase()}</span></td>
                      <td style={s.td}>{o.customer_name}</td>
                      <td style={s.td}><strong>₹{o.total?.toLocaleString('en-IN')}</strong></td>
                      <td style={s.td}><span style={s.tag(o.status === 'delivered' ? 'var(--green,#22c55e)' : o.status === 'pending' ? '#f59e0b' : 'var(--mu)')}>{o.status}</span></td>
                      <td style={s.td}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BANNERS ── */}
      {tab === 'banners' && (
        <div>
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--mu)' }}>Control hero banners, promotional strips and campaign banners shown on the DermIQ store.</div>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              { label: 'Announcement Bar', current: '✨ FREE shipping on orders above ₹799 · Use code DERMIQ15 for 15% off', type: 'text' },
              { label: 'Hero Banner', current: 'Skin That Speaks For Itself — Science-backed formulas', type: 'text' },
              { label: 'Promotional Strip', current: 'Buy 2 Get 1 Free on all Serums · Limited time offer', type: 'text' },
            ].map((b, i) => (
              <div key={i} style={s.card}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{b.label}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input defaultValue={b.current} style={{ ...s.input, flex: 1 }} />
                  <button style={s.btn()} onClick={() => toast.success(`${b.label} updated!`)}>Save</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductForm({ initial, brands, onSave, onClose }: { initial: Product | null, brands: Brand[], onSave: (p: Product) => void, onClose: () => void }) {
  const [form, setForm] = useState<Product>(initial || {
    name: '', brand: brands[0]?.name || 'DermIQ', category: 'Serums', price: 0, mrp: 0, emoji: '🧴',
    description: '', skin_types: [], concerns: [], rating: 4.5, review_count: 0, is_active: true, is_featured: false
  })

  const set = (k: keyof Product, v: any) => setForm(f => ({ ...f, [k]: v }))

  const toggleArr = (key: 'skin_types' | 'concerns', val: string) => {
    const arr = form[key] as string[]
    set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const ms: Record<string, any> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    box: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
    label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' },
    input: { padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' },
    chip: (active: boolean) => ({ padding: '5px 12px', background: active ? 'var(--teal)' : '#f3f4f6', color: active ? '#fff' : '#374151', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }),
    chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  }

  return (
    <div style={ms.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={ms.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{initial ? 'Edit Product' : 'Add New Product'}</div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={ms.row}>
          <div style={ms.field}><label style={ms.label}>Emoji</label><input value={form.emoji} onChange={e => set('emoji', e.target.value)} style={{ ...ms.input, fontSize: 28, textAlign: 'center' }} maxLength={4} /></div>
          <div style={ms.field}><label style={ms.label}>Brand</label>
            <select value={form.brand} onChange={e => set('brand', e.target.value)} style={ms.input}>
              {brands.map(b => <option key={b.name}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div style={ms.field}><label style={ms.label}>Product Name</label><input value={form.name} onChange={e => set('name', e.target.value)} style={ms.input} placeholder="e.g. Vitamin C Brightening Serum" /></div>

        <div style={ms.row}>
          <div style={ms.field}><label style={ms.label}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={ms.input}>
              {['Serums','Moisturisers','Sunscreen','Cleansers','Treatments','Kits','Eye Care'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={ms.field}><label style={ms.label}>Price (₹)</label><input type="number" value={form.price} onChange={e => set('price', +e.target.value)} style={ms.input} /></div>
        </div>

        <div style={ms.row}>
          <div style={ms.field}><label style={ms.label}>MRP (₹)</label><input type="number" value={form.mrp} onChange={e => set('mrp', +e.target.value)} style={ms.input} /></div>
          <div style={ms.field}><label style={ms.label}>Rating</label><input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={e => set('rating', +e.target.value)} style={ms.input} /></div>
        </div>

        <div style={ms.field}><label style={ms.label}>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...ms.input, minHeight: 70, resize: 'vertical' }} /></div>

        <div style={{ ...ms.field, marginBottom: 10 }}>
          <label style={ms.label}>Skin Types</label>
          <div style={ms.chips}>
            {['Normal','Oily','Dry','Combination','Sensitive','All'].map(t => (
              <button key={t} onClick={() => toggleArr('skin_types', t)} style={ms.chip((form.skin_types as string[]).includes(t))}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ ...ms.field, marginBottom: 20 }}>
          <label style={ms.label}>Targets / Concerns</label>
          <div style={ms.chips}>
            {['Acne','Dark Spots','Dryness','Oiliness','Sensitivity','Fine Lines','Dark Circles','Uneven Tone'].map(c => (
              <button key={c} onClick={() => toggleArr('concerns', c)} style={ms.chip((form.concerns as string[]).includes(c))}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Active (visible on store)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} /> Featured
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onSave(form)} style={{ flex: 1, padding: 14, background: 'var(--dark)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {initial ? 'Save Changes' : 'Add Product'}
          </button>
          <button onClick={onClose} style={{ padding: '14px 20px', background: '#f3f4f6', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Brand Form Modal ─────────────────────────────────────────────────────────
function BrandForm({ initial, onSave, onClose }: { initial: Brand | null, onSave: (b: Brand) => void, onClose: () => void }) {
  const [form, setForm] = useState<Brand>(initial || { name: '', description: '', logo_emoji: '🏷️', is_active: true })
  const set = (k: keyof Brand, v: any) => setForm(f => ({ ...f, [k]: v }))

  const ms: Record<string, any> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    box: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28 },
    field: { marginBottom: 16 },
    label: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', marginBottom: 5 },
    input: { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  }

  return (
    <div style={ms.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={ms.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{initial ? 'Edit Brand' : 'Add Brand'}</div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={ms.field}><label style={ms.label}>Logo Emoji</label><input value={form.logo_emoji} onChange={e => set('logo_emoji', e.target.value)} style={{ ...ms.input, fontSize: 28, textAlign: 'center', width: 60 }} maxLength={4} /></div>
        <div style={ms.field}><label style={ms.label}>Brand Name</label><input value={form.name} onChange={e => set('name', e.target.value)} style={ms.input} placeholder="e.g. Minimalist" /></div>
        <div style={ms.field}><label style={ms.label}>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...ms.input, minHeight: 80, resize: 'vertical' }} /></div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Active on store
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onSave(form)} style={{ flex: 1, padding: 14, background: 'var(--dark)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {initial ? 'Save Changes' : 'Add Brand'}
          </button>
          <button onClick={onClose} style={{ padding: '14px 20px', background: '#f3f4f6', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
