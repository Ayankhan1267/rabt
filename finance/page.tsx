'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const EXPENSE_CATEGORIES = ['Ad Spend', 'Shipping', 'Raw Material', 'Packaging', 'Salary', 'Specialist Payout', 'Platform Fee', 'Tools', 'Office', 'Other']

export default function FinancePage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [mongoOrders, setMongoOrders] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month') // 'today' | 'week' | 'month' | 'total'
  const [form, setForm] = useState({ title: '', amount: '', category: 'Ad Spend', description: '', date: new Date().toISOString().split('T')[0], receipt_url: '' })
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [expRes, ordRes, earnRes] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('hq_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('specialist_earnings').select('*, specialist_id(name)').order('created_at', { ascending: false }),
    ])
    setExpenses(expRes.data || [])
    setOrders(ordRes.data || [])
    setEarnings(earnRes.data || [])

    if (mongoUrl) {
      try {
        const res = await fetch(mongoUrl + '/api/orders')
        if (res.ok) setMongoOrders(await res.json())
      } catch {}
    }
    setLoading(false)
  }

  // Filter by period
  function filterByPeriod(items: any[], dateField: string) {
    const now = new Date()
    return items.filter(item => {
      const d = new Date(item[dateField])
      if (period === 'today') return d.toDateString() === now.toDateString()
      if (period === 'week') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      return true
    })
  }

  const allOrders = [
    ...filterByPeriod(mongoOrders, 'createdAt').map(o => ({ ...o, amount: o.amount || o.pricing?.total || 0, cost: 0, shipping_cost: 0 })),
    ...filterByPeriod(orders, 'created_at')
  ]
  const filteredExpenses = filterByPeriod(expenses, 'date')

  const revenue = allOrders.reduce((s, o) => s + (o.amount || 0), 0)
  const deliveredRevenue = allOrders.filter(o => ['Delivered', 'DELIVERED', 'delivered'].includes(o.status || o.trackingStatus)).reduce((s, o) => s + (o.amount || 0), 0)
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const adSpend = filteredExpenses.filter(e => e.category === 'Ad Spend').reduce((s, e) => s + (e.amount || 0), 0)
  const shippingCost = filteredExpenses.filter(e => e.category === 'Shipping').reduce((s, e) => s + (e.amount || 0), 0)
  const rawMaterial = filteredExpenses.filter(e => e.category === 'Raw Material').reduce((s, e) => s + (e.amount || 0), 0)
  const specialistPayouts = filteredExpenses.filter(e => e.category === 'Specialist Payout').reduce((s, e) => s + (e.amount || 0), 0)
  const grossProfit = revenue - rawMaterial - shippingCost
  const netProfit = revenue - totalExpenses
  const roas = adSpend > 0 ? revenue / adSpend : 0
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  // Revenue chart (last 30 days)
  const chartData: any[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayOrders = [...mongoOrders, ...orders].filter(o => {
      const od = new Date(o.createdAt || o.created_at)
      return od.toISOString().split('T')[0] === dateStr
    })
    const dayExp = expenses.filter(e => e.date === dateStr)
    chartData.push({
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      revenue: dayOrders.reduce((s, o) => s + (o.amount || o.pricing?.total || 0), 0),
      expenses: dayExp.reduce((s, e) => s + (e.amount || 0), 0),
    })
  }

  // Expenses by category
  const byCategory: Record<string, number> = {}
  filteredExpenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })
  const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value: Math.round(value as number) })).sort((a, b) => b.value - a.value)

  async function addExpense() {
    if (!form.title || !form.amount) { toast.error('Fill required fields'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({
      title: form.title, amount: parseFloat(form.amount), category: form.category,
      description: form.description, date: form.date, receipt_url: form.receipt_url,
      created_by: user?.id
    })
    toast.success('Expense added!')
    setShowAddExpense(false)
    setForm({ title: '', amount: '', category: 'Ad Spend', description: '', date: new Date().toISOString().split('T')[0], receipt_url: '' })
    loadAll()
  }

  const inputStyle: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10
  }

  const CATCOLORS: Record<string, string> = {
    'Ad Spend': 'var(--blue)', 'Shipping': 'var(--teal)', 'Raw Material': 'var(--purple)',
    'Packaging': 'var(--orange)', 'Salary': 'var(--pink)', 'Specialist Payout': 'var(--green)',
    'Platform Fee': 'var(--gold)', 'Tools': 'var(--mu)', 'Office': 'var(--mu)', 'Other': 'var(--mu)',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}><span style={{ color: 'var(--gold)' }}>Finance</span> & P&L</h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>Complete profit & loss tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['today', 'week', 'month', 'total'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
              background: period === p ? 'var(--gL)' : 'rgba(255,255,255,0.05)',
              color: period === p ? 'var(--gold)' : 'var(--mu2)',
              border: `1px solid ${period === p ? 'rgba(212,168,83,0.3)' : 'var(--b1)'}`,
            }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
          <button onClick={() => setShowAddExpense(true)} style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>
            + Expense
          </button>
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, color: 'var(--green)', sub: `${allOrders.length} orders` },
          { label: 'Total Expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}`, color: 'var(--orange)', sub: `${filteredExpenses.length} entries` },
          { label: 'Gross Profit', value: `₹${grossProfit.toLocaleString('en-IN')}`, color: grossProfit >= 0 ? 'var(--green)' : 'var(--red)', sub: `After material + shipping` },
          { label: 'Net Profit', value: `₹${Math.abs(netProfit).toLocaleString('en-IN')}`, color: netProfit >= 0 ? 'var(--green)' : 'var(--red)', sub: `${profitMargin.toFixed(1)}% margin ${netProfit < 0 ? '(LOSS)' : ''}` },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Ad Spend', value: `₹${adSpend.toLocaleString('en-IN')}`, color: 'var(--blue)' },
          { label: 'ROAS', value: `${roas.toFixed(2)}×`, color: roas >= 3 ? 'var(--green)' : roas >= 2 ? 'var(--gold)' : 'var(--red)' },
          { label: 'Shipping Cost', value: `₹${shippingCost.toLocaleString('en-IN')}`, color: 'var(--teal)' },
          { label: 'Specialist Payouts', value: `₹${specialistPayouts.toLocaleString('en-IN')}`, color: 'var(--purple)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontFamily: 'Syne', fontWeight: 800, marginBottom: 16 }}>Revenue vs Expenses (30 days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} /><stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--mu)', fontSize: 9 }} tickLine={false} interval={4} />
              <YAxis tick={{ fill: 'var(--mu)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, fontSize: 12 }} formatter={(v: any, name: string) => [`₹${Number(v).toLocaleString('en-IN')}`, name === 'revenue' ? 'Revenue' : 'Expenses']} />
              <Area type="monotone" dataKey="revenue" stroke="#22C55E" fill="url(#revG)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#F97316" fill="url(#expG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontSize: 14, fontFamily: 'Syne', fontWeight: 800, marginBottom: 16 }}>Expenses by Category</div>
          {categoryData.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--mu2)' }}>{item.name}</span>
                <span style={{ fontSize: 12, fontFamily: 'DM Mono', fontWeight: 700, color: CATCOLORS[item.name] || 'var(--mu)' }}>₹{item.value.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, height: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (item.value / totalExpenses) * 100)}%`, height: '100%', background: CATCOLORS[item.name] || 'var(--mu)', borderRadius: 20 }} />
              </div>
            </div>
          ))}
          {categoryData.length === 0 && <p style={{ color: 'var(--mu)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No expenses recorded</p>}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>Expense Ledger</span>
          <span style={{ fontSize: 12, color: 'var(--mu)' }}>{filteredExpenses.length} entries · Total: ₹{totalExpenses.toLocaleString('en-IN')}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Date', 'Title', 'Category', 'Amount', 'Description', 'Action'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filteredExpenses.map((e, i) => (
              <tr key={i} onMouseOver={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={ev => (ev.currentTarget.style.background = '')}>
                <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 11.5, color: 'var(--mu)', whiteSpace: 'nowrap' }}>{e.date}</td>
                <td style={{ padding: '11px 12px', fontWeight: 500, fontSize: 12.5 }}>{e.title}</td>
                <td style={{ padding: '11px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: (CATCOLORS[e.category] || 'var(--mu)') + '22', color: CATCOLORS[e.category] || 'var(--mu)' }}>
                    {e.category}
                  </span>
                </td>
                <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13, color: 'var(--red)' }}>-₹{e.amount.toLocaleString('en-IN')}</td>
                <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--mu2)' }}>{e.description || '—'}</td>
                <td style={{ padding: '11px 12px' }}>
                  <button onClick={async () => { await supabase.from('expenses').delete().eq('id', e.id); toast.success('Deleted'); loadAll() }} style={{ padding: '3px 9px', background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Delete</button>
                </td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
                No expenses recorded. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setShowAddExpense(true)}>Add first expense →</span>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>💸 Add Expense</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Title*</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Meta Ads - March Week 2" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Amount (₹)*</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="5000" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
              <button onClick={() => setShowAddExpense(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={addExpense} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
