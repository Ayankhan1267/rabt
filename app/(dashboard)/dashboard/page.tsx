'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import toast from 'react-hot-toast'

type Period = 'today' | '7d' | '30d' | '90d' | 'year'
type Source = 'all' | 'website' | 'offline'

const STAGE_ORDER = ['just_login','new','contacted','consultation_pending','consultation_booked','consultation_accepted','consultation_rescheduled','consultation_completed','routine_purchased','converted']
const STAGE_LABELS: Record<string,string> = {
  just_login:'Registered', new:'New Lead', contacted:'Contacted',
  consultation_pending:'Cons. Pending', consultation_booked:'Cons. Booked',
  consultation_accepted:'Cons. Accepted', consultation_rescheduled:'Rescheduled',
  consultation_completed:'Cons. Done', routine_purchased:'Purchased', converted:'Converted',
}
const PIE_COLORS = ['#22C55E','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#14B8A6']

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [mongoConnected, setMongoConnected] = useState(false)
  const [period, setPeriod] = useState<Period>('30d')
  const [source, setSource] = useState<Source>('all')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const [allOrders, setAllOrders] = useState<any[]>([])
  const [allLeads, setAllLeads] = useState<any[]>([])
  const [allConsultations, setAllConsultations] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [allSpecialists, setAllSpecialists] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])

  useEffect(() => {
    loadData()
    const iv = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
      setProfile(prof)

      const [leadsRes, expRes, hqOrdersRes, goalsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('hq_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('goals').select('*'),
      ])
      setAllLeads(leadsRes.data || [])
      setAllExpenses(expRes.data || [])
      setGoals(goalsRes.data || [])

      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || (typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null)
      const hqOrders = (hqOrdersRes.data || []).map((o: any) => ({
        ...o, _source: 'offline', amount: o.amount || 0, createdAt: o.created_at,
        status: o.status || 'unknown',
      }))

      if (url) {
        try {
          const [ordR, consR, prodR, specR] = await Promise.all([
            fetch(url + '/api/orders').then(r => r.ok ? r.json() : []),
            fetch(url + '/api/consultations').then(r => r.ok ? r.json() : []),
            fetch(url + '/api/products').then(r => r.ok ? r.json() : []),
            fetch(url + '/api/specialists').then(r => r.ok ? r.json() : []),
          ])
          const webOrders = (Array.isArray(ordR) ? ordR : []).map((o: any) => ({
            ...o, _source: 'website',
            amount: o.amount || o.pricing?.total || 0,
            createdAt: o.createdAt || o.created_at,
            status: o.orderStatus || o.status || 'unknown',
          }))
          setAllOrders([...webOrders, ...hqOrders])
          setAllConsultations(Array.isArray(consR) ? consR : [])
          setAllProducts(Array.isArray(prodR) ? prodR : [])
          setAllSpecialists(Array.isArray(specR) ? specR : [])
          setMongoConnected(true)
        } catch { setAllOrders(hqOrders) }
      } else {
        setAllOrders(hqOrders)
      }
    } catch (e: any) { toast.error('Dashboard failed: ' + e.message) }
    setLastRefresh(new Date())
    setLoading(false)
  }

  function getPeriodStart(p: Period): Date {
    const d = new Date()
    if (p === 'today') { d.setHours(0,0,0,0); return d }
    if (p === '7d')    { d.setDate(d.getDate() - 7); return d }
    if (p === '30d')   { d.setDate(d.getDate() - 30); return d }
    if (p === '90d')   { d.setDate(d.getDate() - 90); return d }
    d.setMonth(0,1); d.setHours(0,0,0,0); return d
  }

  const filteredOrders = useMemo(() => {
    const start = getPeriodStart(period)
    return allOrders.filter(o => {
      const d = new Date(o.createdAt || o.created_at || 0)
      if (d < start) return false
      return source === 'all' || o._source === source
    })
  }, [allOrders, period, source])

  const prevOrders = useMemo(() => {
    const start = getPeriodStart(period)
    const diff = Date.now() - start.getTime()
    const prevStart = new Date(start.getTime() - diff)
    return allOrders.filter(o => {
      const d = new Date(o.createdAt || o.created_at || 0)
      return d >= prevStart && d < start && (source === 'all' || o._source === source)
    })
  }, [allOrders, period, source])

  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.amount || 0), 0)
  const prevRevenue  = prevOrders.reduce((s, o) => s + (o.amount || 0), 0)
  const revenueChg   = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0
  const deliveredAmt = filteredOrders.filter(o => ['delivered','Delivered','DELIVERED'].includes(o.status)).reduce((s, o) => s + o.amount, 0)
  const today        = new Date().toISOString().split('T')[0]
  const todayOrd     = allOrders.filter(o => new Date(o.createdAt || o.created_at || 0).toISOString().split('T')[0] === today)
  const todayRev     = todayOrd.reduce((s, o) => s + o.amount, 0)

  const filteredCons = useMemo(() => {
    const start = getPeriodStart(period)
    return allConsultations.filter(c => new Date(c.createdAt || c.created_at || 0) >= start)
  }, [allConsultations, period])

  const convertedLeads = allLeads.filter(l => ['routine_purchased','converted'].includes(l.stage)).length
  const convRate = allLeads.length > 0 ? (convertedLeads / allLeads.length * 100).toFixed(1) : '0'

  const periodExpenses = useMemo(() => {
    const start = getPeriodStart(period)
    return allExpenses.filter(e => new Date(e.date || e.created_at || 0) >= start)
  }, [allExpenses, period])
  const totalExp   = periodExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const adSpend    = periodExpenses.filter(e => e.category === 'Ad Spend').reduce((s, e) => s + (e.amount || 0), 0)
  const grossProfit = totalRevenue - totalExp
  const roas       = adSpend > 0 ? totalRevenue / adSpend : 0
  const avgOrder   = filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0

  // Chart: revenue + orders over time
  const chartData = useMemo(() => {
    if (period === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(); d.setDate(1); d.setMonth(i)
        const m = i, y = d.getFullYear()
        const ords = allOrders.filter(o => { const od = new Date(o.createdAt||o.created_at||0); return od.getMonth()===m&&od.getFullYear()===y&&(source==='all'||o._source===source) })
        return { label: d.toLocaleDateString('en-IN',{month:'short'}), revenue: Math.round(ords.reduce((s,o)=>s+o.amount,0)), orders: ords.length }
      })
    }
    if (period === 'today') {
      return Array.from({ length: 24 }, (_, i) => {
        const ords = allOrders.filter(o => { const od = new Date(o.createdAt||o.created_at||0); return od.getHours()===i&&od.toDateString()===new Date().toDateString() })
        return { label: `${i}:00`, revenue: Math.round(ords.reduce((s,o)=>s+o.amount,0)), orders: ords.length }
      })
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
      const ds = d.toISOString().split('T')[0]
      const ords = allOrders.filter(o => { const od = new Date(o.createdAt||o.created_at||0); return od.toISOString().split('T')[0]===ds&&(source==='all'||o._source===source) })
      return { label: d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}), revenue: Math.round(ords.reduce((s,o)=>s+o.amount,0)), orders: ords.length }
    })
  }, [allOrders, period, source])

  // Order status pie
  const statusPie = useMemo(() => {
    const c: Record<string,number> = {}
    filteredOrders.forEach(o => {
      const s = (o.status||'').toLowerCase()
      const k = s==='delivered'?'Delivered':s==='cancelled'||s==='canceled'?'Cancelled':s==='rto'?'RTO':s==='shipped'?'Shipped':s==='processing'?'Processing':'Pending'
      c[k] = (c[k]||0) + 1
    })
    return Object.entries(c).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
  }, [filteredOrders])

  // Revenue by source
  const sourcePie = [
    { name:'Website', value: filteredOrders.filter(o=>o._source==='website').reduce((s,o)=>s+o.amount,0) },
    { name:'Offline', value: filteredOrders.filter(o=>o._source==='offline').reduce((s,o)=>s+o.amount,0) },
  ].filter(d=>d.value>0)

  // CRM pipeline
  const pipelineData = useMemo(() => {
    const c: Record<string,number> = {}
    allLeads.forEach(l => { c[l.stage||'new'] = (c[l.stage||'new']||0)+1 })
    return STAGE_ORDER.filter(s=>c[s]>0).map(s=>({ stage: STAGE_LABELS[s]||s, count: c[s] }))
  }, [allLeads])

  // Top products
  const topProducts = useMemo(() => {
    const s: Record<string,{units:number;revenue:number}> = {}
    filteredOrders.filter(o=>!['cancelled','canceled'].includes((o.status||'').toLowerCase())).forEach(o => {
      if (o.items?.length) {
        o.items.forEach((it: any) => {
          const n = it.productSnapshot?.name||it.name||'Item'
          if (!s[n]) s[n]={units:0,revenue:0}
          s[n].units += it.quantity||1
          s[n].revenue += (it.price?.final||it.price||0)*(it.quantity||1)
        })
      } else if (o.products||o.product) {
        const n = (o.products||o.product||'Product').split(',')[0].trim()
        if (!s[n]) s[n]={units:0,revenue:0}
        s[n].units += 1; s[n].revenue += o.amount||0
      }
    })
    return Object.entries(s).sort((a,b)=>b[1].units-a[1].units).slice(0,7).map(([name,d])=>({
      name: name.length>24 ? name.slice(0,24)+'…' : name, units: d.units, revenue: Math.round(d.revenue)
    }))
  }, [filteredOrders])

  // 6-month P&L chart
  const plChart = useMemo(() => {
    return Array.from({length:6},(_,i)=>{
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-5+i)
      const m=d.getMonth(), y=d.getFullYear()
      const rev = allOrders.filter(o=>{const od=new Date(o.createdAt||o.created_at||0);return od.getMonth()===m&&od.getFullYear()===y}).reduce((s,o)=>s+o.amount,0)
      const exp = allExpenses.filter(e=>{const ed=new Date(e.date||e.created_at||0);return ed.getMonth()===m&&ed.getFullYear()===y}).reduce((s,e)=>s+(e.amount||0),0)
      return { label: d.toLocaleDateString('en-IN',{month:'short'}), revenue:Math.round(rev), expenses:Math.round(exp), profit:Math.round(rev-exp) }
    })
  }, [allOrders, allExpenses])

  // Low stock
  const lowStock = allProducts.filter(p => {
    const st = p.stock || p.variants?.reduce((s:number,v:any)=>s+(v.stock||0),0) || 0
    return st < (p.lowStockThreshold||10)
  }).slice(0,6)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const userName = profile?.name || profile?.full_name || 'Admin'

  const periodLabel: Record<Period,string> = { today:'Today', '7d':'7 Days', '30d':'30 Days', '90d':'90 Days', year:'This Year' }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:14 }}>
      <div style={{ width:32,height:32,border:'3px solid var(--gold)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
      <span style={{ color:'var(--mu)', fontSize:13 }}>Loading dashboard...</span>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne', fontSize:24, fontWeight:800 }}>
            {greeting}, <span style={{ color:'var(--gold)' }}>{userName}</span> ✦
          </h1>
          <p style={{ color:'var(--mu)', fontSize:12.5, marginTop:4 }}>
            {mongoConnected ? '🟢 Live · MongoDB + Supabase' : '🟡 Supabase data only'}
            {' · '}{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            {' · '}Updated {lastRefresh.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* Period */}
          <div style={{ display:'flex', background:'var(--s2)', borderRadius:10, padding:3, border:'1px solid var(--b1)' }}>
            {(['today','7d','30d','90d','year'] as Period[]).map(p => (
              <button key={p} onClick={()=>setPeriod(p)} style={{ padding:'5px 11px', borderRadius:7, fontSize:11.5, fontWeight:700, cursor:'pointer', border:'none', background:period===p?'var(--gL)':'transparent', color:period===p?'var(--gold)':'var(--mu)', fontFamily:'Outfit' }}>
                {p==='today'?'Today':p==='7d'?'7D':p==='30d'?'30D':p==='90d'?'90D':'Year'}
              </button>
            ))}
          </div>
          {/* Source */}
          <div style={{ display:'flex', background:'var(--s2)', borderRadius:10, padding:3, border:'1px solid var(--b1)' }}>
            {(['all','website','offline'] as Source[]).map(s => (
              <button key={s} onClick={()=>setSource(s)} style={{ padding:'5px 11px', borderRadius:7, fontSize:11.5, fontWeight:700, cursor:'pointer', border:'none', background:source===s?'rgba(59,130,246,0.15)':'transparent', color:source===s?'var(--blue)':'var(--mu)', fontFamily:'Outfit' }}>
                {s==='all'?'All':s==='website'?'Website':'Offline'}
              </button>
            ))}
          </div>
          <button onClick={loadData} style={{ padding:'7px 14px', background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:9, color:'var(--mu2)', fontSize:12, cursor:'pointer', fontFamily:'Outfit', fontWeight:600 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))', gap:12 }}>
        {[
          { label:'Today Revenue',  value:`Rs.${todayRev.toLocaleString('en-IN')}`,  sub:`${todayOrd.length} orders today`, color:'var(--gold)',  icon:'💰', bg:'var(--gL)' },
          { label:`${periodLabel[period]} Revenue`, value:`Rs.${totalRevenue.toLocaleString('en-IN')}`, sub: revenueChg>=0?`↑ ${Math.abs(revenueChg).toFixed(1)}% vs prev`:`↓ ${Math.abs(revenueChg).toFixed(1)}% vs prev`, color:revenueChg>=0?'var(--green)':'var(--red)', icon:'📈', bg:revenueChg>=0?'var(--grL)':'var(--rdL)' },
          { label:'Total Orders',   value:filteredOrders.length, sub:`${todayOrd.length} new today`, color:'var(--blue)',  icon:'📦', bg:'var(--blL)' },
          { label:'Delivered',      value:filteredOrders.filter(o=>['delivered','Delivered'].includes(o.status)).length, sub:`Rs.${deliveredAmt.toLocaleString('en-IN')} confirmed`, color:'var(--green)', icon:'✅', bg:'var(--grL)' },
          { label:'CRM Leads',      value:allLeads.length, sub:`${convertedLeads} converted · ${convRate}%`, color:'var(--purple)', icon:'🎯', bg:'rgba(139,92,246,0.12)' },
          { label:'Consultations',  value:filteredCons.length, sub:`${allConsultations.filter(c=>c.status==='pending').length} pending now`, color:'var(--teal)', icon:'👩‍⚕️', bg:'rgba(20,184,166,0.12)' },
          { label:'Net Profit',     value:`Rs.${Math.abs(grossProfit).toLocaleString('en-IN')}`, sub:grossProfit>=0?'Profit':'Loss', color:grossProfit>=0?'var(--green)':'var(--red)', icon:grossProfit>=0?'📊':'📉', bg:grossProfit>=0?'var(--grL)':'var(--rdL)' },
          { label:'ROAS',           value:`${roas.toFixed(2)}×`, sub:`Ad Rs.${adSpend.toLocaleString('en-IN')}`, color:roas>=2?'var(--green)':roas>=1?'var(--gold)':'var(--red)', icon:'📣', bg:roas>=2?'var(--grL)':roas>=1?'var(--gL)':'var(--rdL)' },
        ].map((k,i)=>(
          <div key={i} className="card" style={{ position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:8, right:10, fontSize:18, opacity:0.25 }}>{k.icon}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--mu)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontFamily:'Syne', fontSize:21, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:10.5, color:'var(--mu)', marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN REVENUE CHART ── */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontFamily:'Syne', fontSize:14, fontWeight:800 }}>Revenue & Orders — {periodLabel[period]}</div>
            <div style={{ fontSize:11, color:'var(--mu)', marginTop:3 }}>
              Rs.{totalRevenue.toLocaleString('en-IN')} total · {filteredOrders.length} orders
              {source !== 'all' && <span style={{ marginLeft:6, padding:'1px 7px', background:'rgba(59,130,246,0.1)', color:'var(--blue)', borderRadius:20, fontSize:10, fontWeight:700 }}>{source}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:14, fontSize:11, color:'var(--mu)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12,height:3,background:'#22C55E',borderRadius:2,display:'inline-block' }} />Revenue</span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12,height:3,background:'#3B82F6',borderRadius:2,display:'inline-block' }} />Orders</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{top:5,right:5,left:0,bottom:0}}>
            <defs>
              <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.28}/>
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="oGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{fill:'var(--mu)',fontSize:10}} tickLine={false} axisLine={false} interval={chartData.length>20?Math.floor(chartData.length/8):0} />
            <YAxis yAxisId="r" tick={{fill:'var(--mu)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
            <YAxis yAxisId="o" orientation="right" tick={{fill:'var(--mu)',fontSize:10}} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:10,fontSize:12}} formatter={(v:any,n:string)=>[n==='revenue'?`Rs.${Number(v).toLocaleString('en-IN')}`:v, n==='revenue'?'Revenue':'Orders']} />
            <Area yAxisId="r" type="monotone" dataKey="revenue" stroke="#22C55E" fill="url(#rGrad)" strokeWidth={2.5} dot={false} />
            <Area yAxisId="o" type="monotone" dataKey="orders"  stroke="#3B82F6" fill="url(#oGrad)" strokeWidth={2}   dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 3 ANALYTICS CHARTS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>

        {/* Order Status Donut */}
        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>Order Status</div>
          {statusPie.length > 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" paddingAngle={3}>
                    {statusPie.map((_,idx)=><Cell key={idx} fill={PIE_COLORS[idx%PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:8,fontSize:11}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                {statusPie.map((s,idx)=>(
                  <div key={idx} style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:7,height:7,borderRadius:'50%',background:PIE_COLORS[idx%PIE_COLORS.length],flexShrink:0 }} />
                    <span style={{ fontSize:11,flex:1,color:'var(--mu2)' }}>{s.name}</span>
                    <span style={{ fontSize:12,fontWeight:700,fontFamily:'DM Mono',color:PIE_COLORS[idx%PIE_COLORS.length] }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ textAlign:'center', padding:'28px 0', color:'var(--mu)', fontSize:12 }}>No orders in period</div>}
        </div>

        {/* Revenue by Source */}
        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>Revenue by Source</div>
          {sourcePie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={sourcePie} cx="50%" cy="50%" outerRadius={52} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    <Cell fill="#22C55E" /><Cell fill="#F59E0B" />
                  </Pie>
                  <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:8,fontSize:11}} formatter={(v:any)=>[`Rs.${Number(v).toLocaleString('en-IN')}`,'']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                {sourcePie.map((s,i)=>(
                  <div key={i} style={{ flex:1, background:'var(--s2)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--mu)', marginBottom:2 }}>{s.name}</div>
                    <div style={{ fontFamily:'DM Mono', fontSize:13, fontWeight:700, color:i===0?'var(--green)':'var(--gold)' }}>Rs.{s.value.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign:'center', padding:'28px 0', color:'var(--mu)', fontSize:12 }}>No revenue data</div>}
        </div>

        {/* CRM Pipeline */}
        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>CRM Lead Pipeline</div>
          {pipelineData.length > 0 ? (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {pipelineData.slice(0,7).map((p,i)=>{
                  const maxV = Math.max(...pipelineData.map(x=>x.count))
                  return (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:10.5, color:'var(--mu2)' }}>{p.stage}</span>
                        <span style={{ fontSize:11, fontWeight:700, fontFamily:'DM Mono', color:'var(--gold)' }}>{p.count}</span>
                      </div>
                      <div style={{ height:5, background:'var(--s2)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${(p.count/maxV*100).toFixed(0)}%`, background:'linear-gradient(90deg,#D4A853,#B87C30)', borderRadius:3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:'var(--mu)' }}>Total <b style={{color:'var(--tx)'}}>{allLeads.length}</b></span>
                <span style={{ fontSize:11, color:'var(--mu)' }}>Converted <b style={{color:'var(--green)'}}>{convertedLeads}</b></span>
                <span style={{ fontSize:11, color:'var(--mu)' }}>Rate <b style={{color:'var(--teal)'}}>{convRate}%</b></span>
              </div>
            </>
          ) : <div style={{ textAlign:'center', padding:'28px 0', color:'var(--mu)', fontSize:12 }}>No CRM leads</div>}
        </div>
      </div>

      {/* ── P&L CHART + TOP PRODUCTS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, alignItems:'center' }}>
            <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800 }}>6-Month P&amp;L</div>
            <div style={{ display:'flex', gap:12, fontSize:10.5, color:'var(--mu)' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:3,background:'#22C55E',borderRadius:2,display:'inline-block' }}/>Rev</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:3,background:'#EF4444',borderRadius:2,display:'inline-block' }}/>Exp</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={plChart} margin={{top:0,right:0,left:-10,bottom:0}} barGap={2} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{fill:'var(--mu)',fontSize:10}} tickLine={false} axisLine={false} />
              <YAxis tick={{fill:'var(--mu)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
              <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:10,fontSize:11}} formatter={(v:any,n:string)=>[`Rs.${Number(v).toLocaleString('en-IN')}`, n==='revenue'?'Revenue':n==='expenses'?'Expenses':'Profit']} />
              <Bar dataKey="revenue"  fill="#22C55E" radius={[4,4,0,0]} fillOpacity={0.85} />
              <Bar dataKey="expenses" fill="#EF4444" radius={[4,4,0,0]} fillOpacity={0.7}  />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>Top Products (Units Sold)</div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts} layout="vertical" margin={{top:0,right:40,left:5,bottom:0}} barSize={11}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{fill:'var(--mu)',fontSize:10}} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{fill:'var(--mu2)',fontSize:10}} tickLine={false} axisLine={false} width={95} />
                <Tooltip contentStyle={{background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:10,fontSize:11}} formatter={(v:any,n:string)=>[n==='units'?`${v} units`:`Rs.${Number(v).toLocaleString('en-IN')}`,n]} />
                <Bar dataKey="units" fill="#D4A853" radius={[0,4,4,0]} fillOpacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign:'center', padding:'40px 0', color:'var(--mu)', fontSize:12 }}>No product data</div>}
        </div>
      </div>

      {/* ── FINANCE MICRO-KPIS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
        {[
          { label:'Revenue',    value:`Rs.${totalRevenue.toLocaleString('en-IN')}`,  color:'var(--green)',  icon:'💹' },
          { label:'Expenses',   value:`Rs.${totalExp.toLocaleString('en-IN')}`,      color:'var(--orange)', icon:'📤' },
          { label:'Ad Spend',   value:`Rs.${adSpend.toLocaleString('en-IN')}`,       color:'var(--blue)',   icon:'📣' },
          { label:'Net Profit', value:`Rs.${Math.abs(grossProfit).toLocaleString('en-IN')}`, color:grossProfit>=0?'var(--green)':'var(--red)', icon:grossProfit>=0?'📊':'📉' },
          { label:'ROAS',       value:`${roas.toFixed(2)}×`, color:roas>=2?'var(--green)':roas>=1?'var(--gold)':'var(--red)', icon:'🎯' },
          { label:'Avg Order',  value:`Rs.${avgOrder.toLocaleString('en-IN')}`,      color:'var(--teal)',   icon:'🧾' },
        ].map((k,i)=>(
          <div key={i} className="card" style={{ position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:8, right:10, fontSize:16, opacity:0.22 }}>{k.icon}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--mu)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontFamily:'Syne', fontSize:20, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── RECENT ORDERS + RECENT LEADS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800 }}>Recent Orders</div>
            <a href="/orders" style={{ fontSize:11, color:'var(--gold)', textDecoration:'none' }}>View all →</a>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <tbody>
                {filteredOrders.slice(0,8).map((o,i)=>{
                  const st = (o.status||'').toLowerCase()
                  const sc = st==='delivered'?'var(--green)':st==='cancelled'||st==='canceled'?'var(--red)':st==='rto'?'var(--orange)':st==='shipped'?'var(--blue)':'var(--gold)'
                  const sb = st==='delivered'?'var(--grL)':st==='cancelled'||st==='canceled'?'var(--rdL)':st==='rto'?'var(--orL)':st==='shipped'?'var(--blL)':'var(--gL)'
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid var(--b1)' }}>
                      <td style={{ padding:'9px 14px' }}>
                        <div style={{ fontSize:12.5, fontWeight:600 }}>{o.customerName||o.customer_name||'Customer'}</div>
                        <div style={{ fontSize:10.5, color:'var(--mu)' }}>{o._source==='website'?'🌐 Website':'🏪 Offline'}</div>
                      </td>
                      <td style={{ padding:'9px 14px', fontFamily:'DM Mono', fontWeight:700, fontSize:13, color:'var(--gold)' }}>Rs.{(o.amount||0).toLocaleString('en-IN')}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700, background:sb, color:sc, textTransform:'capitalize', whiteSpace:'nowrap' }}>{o.status||'pending'}</span>
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:10.5, color:'var(--mu)', whiteSpace:'nowrap' }}>
                        {new Date(o.createdAt||o.created_at||0).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                      </td>
                    </tr>
                  )
                })}
                {filteredOrders.length===0 && <tr><td colSpan={4} style={{ padding:30, textAlign:'center', color:'var(--mu)', fontSize:12 }}>No orders in this period</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800 }}>Recent Leads</div>
            <a href="/crm" style={{ fontSize:11, color:'var(--gold)', textDecoration:'none' }}>View all →</a>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <tbody>
                {allLeads.slice(0,8).map((l,i)=>{
                  const stage = l.stage||'new'
                  const isGood = ['routine_purchased','converted'].includes(stage)
                  const isBad  = ['consultation_cancelled','lost'].includes(stage)
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid var(--b1)' }}>
                      <td style={{ padding:'9px 14px' }}>
                        <div style={{ fontSize:12.5, fontWeight:600 }}>{l.name||'Lead'}</div>
                        <div style={{ fontSize:10.5, color:'var(--mu)' }}>{l.phone||l.email||'-'}</div>
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:11, color:'var(--mu2)', maxWidth:90 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.concern||l.source||'—'}</div>
                      </td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700, background:isGood?'var(--grL)':isBad?'var(--rdL)':'var(--gL)', color:isGood?'var(--green)':isBad?'var(--red)':'var(--gold)', whiteSpace:'nowrap' }}>
                          {stage.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:10.5, color:'var(--mu)', whiteSpace:'nowrap' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                      </td>
                    </tr>
                  )
                })}
                {allLeads.length===0 && <tr><td colSpan={4} style={{ padding:30, textAlign:'center', color:'var(--mu)', fontSize:12 }}>No leads yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CONSULTATION + LOW STOCK + GOALS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:14 }}>

        {/* Consultation Stats */}
        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>Consultation Overview</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[
              { label:'Total',     value:allConsultations.length, color:'var(--blue)',   bg:'var(--blL)' },
              { label:'Pending',   value:allConsultations.filter(c=>c.status==='pending').length,   color:'var(--orange)', bg:'var(--orL)' },
              { label:'Accepted',  value:allConsultations.filter(c=>c.status==='accepted').length,  color:'var(--teal)',   bg:'rgba(20,184,166,0.15)' },
              { label:'Completed', value:allConsultations.filter(c=>c.status==='completed').length, color:'var(--green)',  bg:'var(--grL)' },
            ].map((s,i)=>(
              <div key={i} style={{ background:s.bg, borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontFamily:'Syne', fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10.5, fontWeight:700, color:s.color, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--b1)' }}>
            <span style={{ fontSize:11, color:'var(--mu)' }}>Specialists</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--gold)', fontFamily:'Syne' }}>{allSpecialists.length}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--b1)' }}>
            <span style={{ fontSize:11, color:'var(--mu)' }}>Completion Rate</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--green)', fontFamily:'Syne' }}>
              {allConsultations.length > 0 ? (allConsultations.filter(c=>c.status==='completed').length/allConsultations.length*100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>
            ⚠️ Low Stock
            {lowStock.length > 0 && <span style={{ fontSize:11, color:'var(--red)', marginLeft:6, fontFamily:'Outfit', fontWeight:600 }}>({lowStock.length} items)</span>}
          </div>
          {lowStock.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {lowStock.map((p,i)=>{
                const st = p.stock || p.variants?.reduce((s:number,v:any)=>s+(v.stock||0),0) || 0
                return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--b1)' }}>
                    <div style={{ fontSize:12, fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>{p.name}</div>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700, flexShrink:0, background:st===0?'var(--rdL)':'var(--orL)', color:st===0?'var(--red)':'var(--orange)' }}>
                      {st===0?'OUT OF STOCK':`${st} left`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : <div style={{ textAlign:'center', padding:'28px 0', color:'var(--mu)', fontSize:12 }}>✅ All products well-stocked</div>}
        </div>

        {/* Goals */}
        <div className="card">
          <div style={{ fontFamily:'Syne', fontSize:13, fontWeight:800, marginBottom:14 }}>Goals Progress</div>
          {goals.filter(g=>g.status!=='completed').length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {goals.filter(g=>g.status!=='completed').slice(0,4).map((g,i)=>{
                const pct = Math.min(100, ((g.current||0)/(g.target||1))*100)
                return (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'72%' }}>{g.title||g.name||'Goal'}</span>
                      <span style={{ fontSize:11, color:'var(--mu)', fontFamily:'DM Mono' }}>{Math.round(pct)}%</span>
                    </div>
                    <div style={{ height:6, background:'var(--s2)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:pct>=80?'var(--green)':pct>=50?'#D4A853':'var(--blue)', borderRadius:4, transition:'width 0.6s' }} />
                    </div>
                    <div style={{ fontSize:10, color:'var(--mu)', marginTop:3 }}>
                      {(g.current||0).toLocaleString('en-IN')} / {(g.target||0).toLocaleString('en-IN')} {g.unit||''}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <div style={{ textAlign:'center', padding:'28px 0', color:'var(--mu)', fontSize:12 }}>No active goals — set one in Goals section</div>}
        </div>
      </div>

    </div>
  )
}
