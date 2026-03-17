'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const ORDER_STATUSES = ['New', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Returned', 'RTO', 'Cancelled']
const STATUS_COLORS: Record<string, string> = {
  New: 'var(--blue)', Processing: 'var(--gold)', Packed: 'var(--teal)',
  Shipped: 'var(--purple)', Delivered: 'var(--green)', Returned: 'var(--orange)',
  RTO: 'var(--red)', Cancelled: 'var(--red)',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [mongoOrders, setMongoOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showOrderDetail, setShowOrderDetail] = useState<any>(null)
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  // Add order form
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    product: '', amount: '', cost: '', shipping_cost: '', courier: '',
    status: 'New', payment_method: 'Prepaid', payment_status: 'pending',
    source: 'Manual', notes: ''
  })

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    setLoading(true)
    try {
      // HQ Orders from Supabase
      const { data } = await supabase.from('hq_orders').select('*').order('created_at', { ascending: false })
      setOrders(data || [])

      // Website orders from MongoDB
      if (mongoUrl) {
        const res = await fetch(mongoUrl + '/api/orders')
        if (res.ok) setMongoOrders(await res.json())
      }
    } catch { toast.error('Failed to load orders') }
    setLoading(false)
  }

  const allOrders = [
    ...mongoOrders.map(o => ({ ...o, _source: 'website', status: o.trackingStatus || o.status || 'NEW', payment_method: o.isPrepaid ? 'Prepaid' : o.isCOD ? 'COD' : 'Prepaid', amount: o.amount || o.pricing?.total || 0, customer_name: o.customerName, id: o._id })),
    ...orders.map(o => ({ ...o, _source: 'hq' }))
  ]

  const filtered = allOrders.filter(o => {
    if (filter !== 'All' && o.status !== filter) return false
    if (paymentFilter !== 'All' && o.payment_method !== paymentFilter) return false
    if (sourceFilter !== 'All' && o._source !== sourceFilter) return false
    return true
  })

  // Stats
  const totalRevenue = allOrders.reduce((s, o) => s + (o.amount || 0), 0)
  const deliveredRevenue = allOrders.filter(o => ['Delivered', 'DELIVERED'].includes(o.status)).reduce((s, o) => s + (o.amount || 0), 0)
  const codOrders = allOrders.filter(o => o.payment_method === 'COD').length
  const prepaidOrders = allOrders.filter(o => o.payment_method !== 'COD').length
  const rtoOrders = allOrders.filter(o => o.status === 'RTO').length

  async function addOrder() {
    if (!form.customer_name || !form.product) { toast.error('Fill required fields'); return }
    const { data: profile } = await supabase.auth.getUser()
    await supabase.from('hq_orders').insert({
      ...form, amount: parseFloat(form.amount) || 0, cost: parseFloat(form.cost) || 0,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      created_by: profile.user?.id
    })
    toast.success('Order created!')
    setShowAddModal(false)
    setForm({ customer_name: '', customer_phone: '', customer_email: '', product: '', amount: '', cost: '', shipping_cost: '', courier: '', status: 'New', payment_method: 'Prepaid', payment_status: 'pending', source: 'Manual', notes: '' })
    loadOrders()
  }

  async function updateStatus(id: string, status: string, source: string) {
    if (source === 'hq') {
      await supabase.from('hq_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      toast.success('Status updated!')
      loadOrders()
    } else {
      toast('Website orders update via rabtnaturals.com admin panel')
    }
  }

  const inputStyle: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Order <span style={{ color: 'var(--gold)' }}>Management</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {allOrders.length} total orders · {mongoOrders.length} from website · {orders.length} from HQ
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
          + New Order
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Orders', value: allOrders.length, color: 'var(--blue)' },
          { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'var(--green)' },
          { label: 'COD Orders', value: codOrders, color: 'var(--orange)' },
          { label: 'Prepaid', value: prepaidOrders, color: 'var(--teal)' },
          { label: 'RTO', value: rtoOrders, color: 'var(--red)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Status Filter Pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--mu)', marginRight: 4 }}>Status:</span>
        {['All', ...ORDER_STATUSES].map(s => (
          <span key={s} onClick={() => setFilter(s)} style={{
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
            background: filter === s ? 'var(--gL)' : 'rgba(255,255,255,0.05)',
            color: filter === s ? 'var(--gold)' : 'var(--mu2)',
            border: `1px solid ${filter === s ? 'rgba(212,168,83,0.3)' : 'var(--b1)'}`,
            transition: 'all 0.13s'
          }}>{s}</span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--mu)', marginLeft: 8, marginRight: 4 }}>Payment:</span>
        {['All', 'Prepaid', 'COD'].map(p => (
          <span key={p} onClick={() => setPaymentFilter(p)} style={{
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
            background: paymentFilter === p ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
            color: paymentFilter === p ? 'var(--blue)' : 'var(--mu2)',
            border: `1px solid ${paymentFilter === p ? 'rgba(59,130,246,0.3)' : 'var(--b1)'}`,
          }}>{p}</span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--mu)', marginLeft: 8, marginRight: 4 }}>Source:</span>
        {['All', 'website', 'hq'].map(src => (
          <span key={src} onClick={() => setSourceFilter(src)} style={{
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
            background: sourceFilter === src ? 'var(--tlL)' : 'rgba(255,255,255,0.05)',
            color: sourceFilter === src ? 'var(--teal)' : 'var(--mu2)',
            border: `1px solid ${sourceFilter === src ? 'rgba(20,184,166,0.3)' : 'var(--b1)'}`,
          }}>{src === 'website' ? '🍃 Website' : src === 'hq' ? '⚡ HQ' : 'All'}</span>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            Loading orders...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#Order', 'Customer', 'Products', 'Amount', 'Payment', 'Status', 'Source', 'Date', 'Profit', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => {
                const profit = (o.amount || 0) - (o.cost || 0) - (o.shipping_cost || 0)
                return (
                  <tr key={i} style={{ transition: 'background 0.12s' }} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '11px 12px', fontSize: 11.5 }}>
                      <span style={{ fontFamily: 'DM Mono', color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setShowOrderDetail(o)}>
                        #{(o.orderNumber || o.id || '')?.toString().slice(-8)}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{o.customer_name || o.customerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>{o.customer_phone || o.customerPhone || ''}</div>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--mu2)', maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.products || o.product || (o.items?.[0]?.name) || '—'}
                        {o.itemCount > 1 && <span style={{ color: 'var(--mu)', fontSize: 10 }}> +{o.itemCount - 1}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontWeight: 700, fontSize: 12.5 }}>
                      ₹{(o.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: o.payment_method === 'COD' ? 'var(--orL)' : 'var(--blL)',
                        color: o.payment_method === 'COD' ? 'var(--orange)' : 'var(--blue)'
                      }}>{o.payment_method || 'Prepaid'}</span>
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      {o._source === 'hq' ? (
                        <select
                          value={o.status} onChange={e => updateStatus(o.id, e.target.value, o._source)}
                          style={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 6, padding: '4px 8px', color: STATUS_COLORS[o.status] || 'var(--mu2)', fontSize: 11, cursor: 'pointer', outline: 'none', fontFamily: 'Outfit' }}
                        >
                          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: (STATUS_COLORS[o.status] || 'var(--mu)') + '22', color: STATUS_COLORS[o.status] || 'var(--mu)' }}>
                          {o.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ fontSize: 10, color: o._source === 'website' ? 'var(--green)' : 'var(--mu)' }}>
                        {o._source === 'website' ? '🍃 Website' : '⚡ HQ'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 11, color: 'var(--mu)', whiteSpace: 'nowrap' }}>
                      {new Date(o.createdAt || o.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      {o._source === 'hq' && o.cost > 0 ? (
                        <span style={{ fontSize: 12, fontFamily: 'DM Mono', fontWeight: 700, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN')}
                        </span>
                      ) : <span style={{ color: 'var(--mu)', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <button onClick={() => setShowOrderDetail(o)} style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
                  No orders found. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setShowAddModal(true)}>Add first order →</span>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 520, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>📦 New Order</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: 'customer_name', label: 'Customer Name*', placeholder: 'Priya Sharma' },
                { key: 'customer_phone', label: 'Phone', placeholder: '+91 9876543210' },
                { key: 'customer_email', label: 'Email', placeholder: 'email@gmail.com' },
                { key: 'product', label: 'Product(s)*', placeholder: 'Moong Magic Kit' },
                { key: 'amount', label: 'Selling Price (₹)*', placeholder: '1299', type: 'number' },
                { key: 'cost', label: 'Product Cost (₹)', placeholder: '400', type: 'number' },
                { key: 'shipping_cost', label: 'Shipping Cost (₹)', placeholder: '60', type: 'number' },
                { key: 'courier', label: 'Courier', placeholder: 'Delhivery' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>{f.label}</label>
                  <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Payment Method</label>
                <select value={form.payment_method} onChange={e => setForm(prev => ({ ...prev, payment_method: e.target.value }))} style={inputStyle}>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">COD</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Status</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any special instructions..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            {/* Profit Preview */}
            {form.amount && (
              <div style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5 }}>
                💰 Estimated Profit: <strong style={{ color: (parseFloat(form.amount) - parseFloat(form.cost || '0') - parseFloat(form.shipping_cost || '0')) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  ₹{(parseFloat(form.amount) - parseFloat(form.cost || '0') - parseFloat(form.shipping_cost || '0')).toLocaleString('en-IN')}
                </strong>
                <span style={{ color: 'var(--mu)', marginLeft: 8 }}>
                  (₹{form.amount} - ₹{form.cost || 0} - ₹{form.shipping_cost || 0})
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={addOrder} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Create Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowOrderDetail(null)}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 520, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800 }}>Order #{(showOrderDetail.orderNumber || showOrderDetail.id)?.toString().slice(-8)}</div>
              <button onClick={() => setShowOrderDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Customer', value: showOrderDetail.customer_name || showOrderDetail.customerName },
                { label: 'Phone', value: showOrderDetail.customer_phone || showOrderDetail.customerPhone || '—' },
                { label: 'Amount', value: `₹${(showOrderDetail.amount || 0).toLocaleString('en-IN')}` },
                { label: 'Payment', value: showOrderDetail.payment_method || 'Prepaid' },
                { label: 'Status', value: showOrderDetail.status },
                { label: 'Source', value: showOrderDetail._source === 'website' ? '🍃 Website' : '⚡ HQ' },
                { label: 'City', value: showOrderDetail.city || showOrderDetail.shippingAddress?.city || '—' },
                { label: 'Courier', value: showOrderDetail.courier || '—' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
            {/* Products */}
            {showOrderDetail.items?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Products</div>
                {showOrderDetail.items.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                    {item.image && <img src={item.image} alt={item.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>{item.size} · Qty: {item.quantity}</div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700 }}>₹{item.price}</div>
                  </div>
                ))}
              </div>
            )}
            {/* WhatsApp Button */}
            {(showOrderDetail.customer_phone || showOrderDetail.customerPhone) && (
              <a href={`https://wa.me/${(showOrderDetail.customer_phone || showOrderDetail.customerPhone || '').replace(/[^0-9]/g, '')}?text=Hi ${showOrderDetail.customer_name || showOrderDetail.customerName}! Your order #${(showOrderDetail.orderNumber || showOrderDetail.id)?.toString().slice(-8)} status: ${showOrderDetail.status}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, color: 'var(--green)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                💬 Message on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
