'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const VENDORS = ['All Vendors', 'GlowMart', 'NaturalCo', 'PureKlenz', 'HerbalRoots', 'Minimalist', 'Dot & Key']

interface OrderCard {
  id: string
  customer: string
  product: string
  amount: number
  timeAgo: string
  vendor: string
  courier?: string
  awb?: string
  estDelivery?: string
  deliveredTime?: string
  rating?: number
}

const NEW_ORDERS: OrderCard[] = [
  { id: 'DQ-00891', customer: 'Aisha Patel', product: 'Rose Hip Serum', amount: 599, timeAgo: '8 min', vendor: 'GlowMart' },
  { id: 'DQ-00892', customer: 'Rahul Sharma', product: 'Niacinamide 10%', amount: 399, timeAgo: '14 min', vendor: 'Minimalist' },
  { id: 'DQ-00893', customer: 'Neha Gupta', product: 'Peptide Anti-Aging Cream', amount: 1299, timeAgo: '22 min', vendor: 'NaturalCo' },
  { id: 'DQ-00894', customer: 'Zara Khan', product: 'Charcoal Wash', amount: 349, timeAgo: '35 min', vendor: 'PureKlenz' },
  { id: 'DQ-00895', customer: 'Meera Joshi', product: 'Vitamin C Serum', amount: 599, timeAgo: '48 min', vendor: 'Minimalist' },
  { id: 'DQ-00896', customer: 'Aryan Kapoor', product: 'Bhringraj Oil', amount: 449, timeAgo: '1 hr', vendor: 'HerbalRoots' },
]

const PACKING_ORDERS: OrderCard[] = [
  { id: 'DQ-00885', customer: 'Priya Nair', product: 'SPF 60 Sunscreen', amount: 649, timeAgo: '2 hr', vendor: 'Dot & Key' },
  { id: 'DQ-00886', customer: 'Kavya Singh', product: 'Hyaluronic Acid Serum', amount: 499, timeAgo: '2.5 hr', vendor: 'Minimalist' },
  { id: 'DQ-00887', customer: 'Dev Patel', product: 'AHA BHA Toner', amount: 549, timeAgo: '3 hr', vendor: 'NaturalCo' },
  { id: 'DQ-00888', customer: 'Riya Shah', product: 'Retinol Night Cream', amount: 899, timeAgo: '4 hr', vendor: 'GlowMart' },
]

const PICKUP_ORDERS: OrderCard[] = [
  { id: 'DQ-00878', customer: 'Aditya Roy', product: 'Face Wash Salicylic', amount: 299, timeAgo: '5 hr', vendor: 'PureKlenz', courier: 'Bluedart', awb: 'BD98731452' },
  { id: 'DQ-00879', customer: 'Sneha Kumar', product: 'Ceramide Moisturizer', amount: 749, timeAgo: '6 hr', vendor: 'NaturalCo', courier: 'Delhivery', awb: 'DL20045781' },
  { id: 'DQ-00880', customer: 'Vikram Gupta', product: 'Sunscreen SPF 50+', amount: 449, timeAgo: '7 hr', vendor: 'Minimalist', courier: 'Xpressbees', awb: 'XB77210054' },
]

const TRANSIT_ORDERS: OrderCard[] = [
  { id: 'DQ-00865', customer: 'Ananya Iyer', product: 'Kojic Acid Serum', amount: 699, timeAgo: '1 day', vendor: 'GlowMart', courier: 'Bluedart', awb: 'BD98710122', estDelivery: 'Mar 24' },
  { id: 'DQ-00866', customer: 'Rohan Verma', product: 'Anti-Aging Kit', amount: 1899, timeAgo: '1 day', vendor: 'NaturalCo', courier: 'Delhivery', awb: 'DL20032411', estDelivery: 'Mar 24' },
  { id: 'DQ-00867', customer: 'Pooja Mishra', product: 'Niacinamide Moisturizer', amount: 499, timeAgo: '1 day', vendor: 'Minimalist', courier: 'DTDC', awb: 'DT55023081', estDelivery: 'Mar 25' },
  { id: 'DQ-00868', customer: 'Saurabh Tiwari', product: 'Charcoal Face Mask', amount: 349, timeAgo: '1.5 day', vendor: 'PureKlenz', courier: 'Xpressbees', awb: 'XB77188901', estDelivery: 'Mar 25' },
  { id: 'DQ-00869', customer: 'Lata Sharma', product: 'Rose Water Toner', amount: 199, timeAgo: '1.5 day', vendor: 'HerbalRoots', courier: 'Bluedart', awb: 'BD98711008', estDelivery: 'Mar 25' },
  { id: 'DQ-00870', customer: 'Nikhil Jain', product: 'Vitamin C Kit', amount: 1099, timeAgo: '2 day', vendor: 'GlowMart', courier: 'Delhivery', awb: 'DL20038800', estDelivery: 'Mar 26' },
  { id: 'DQ-00871', customer: 'Tara Singh', product: 'Peptide Eye Serum', amount: 799, timeAgo: '2 day', vendor: 'NaturalCo', courier: 'Bluedart', awb: 'BD98701193', estDelivery: 'Mar 26' },
]

const DELIVERED_ORDERS: OrderCard[] = [
  { id: 'DQ-00850', customer: 'Aisha Patel', product: 'Niacinamide Serum', amount: 399, timeAgo: '', deliveredTime: '9:10 AM', vendor: 'Minimalist', rating: 5 },
  { id: 'DQ-00851', customer: 'Rahul Sharma', product: 'Sunscreen SPF 50', amount: 449, timeAgo: '', deliveredTime: '10:22 AM', vendor: 'Dot & Key', rating: 4 },
  { id: 'DQ-00852', customer: 'Neha Gupta', product: 'Retinol 0.5%', amount: 649, timeAgo: '', deliveredTime: '11:05 AM', vendor: 'NaturalCo', rating: 5 },
  { id: 'DQ-00853', customer: 'Meera Joshi', product: 'AHA Toner', amount: 299, timeAgo: '', deliveredTime: '11:45 AM', vendor: 'Minimalist', rating: 4 },
  { id: 'DQ-00854', customer: 'Aryan Kapoor', product: 'Ceramide Cream', amount: 749, timeAgo: '', deliveredTime: '12:30 PM', vendor: 'NaturalCo', rating: 5 },
  { id: 'DQ-00855', customer: 'Priya Nair', product: 'Vitamin C Serum', amount: 599, timeAgo: '', deliveredTime: '1:15 PM', vendor: 'GlowMart', rating: 3 },
  { id: 'DQ-00856', customer: 'Kavya Singh', product: 'Rose Hip Oil', amount: 499, timeAgo: '', deliveredTime: '1:50 PM', vendor: 'GlowMart', rating: 5 },
  { id: 'DQ-00857', customer: 'Dev Patel', product: 'Face Wash', amount: 349, timeAgo: '', deliveredTime: '2:10 PM', vendor: 'PureKlenz', rating: 4 },
  { id: 'DQ-00858', customer: 'Riya Shah', product: 'Tinted Moisturizer', amount: 899, timeAgo: '', deliveredTime: '2:45 PM', vendor: 'Dot & Key', rating: 5 },
  { id: 'DQ-00859', customer: 'Sneha Kumar', product: 'Lip Balm SPF', amount: 249, timeAgo: '', deliveredTime: '3:00 PM', vendor: 'Minimalist', rating: 4 },
  { id: 'DQ-00860', customer: 'Vikram Gupta', product: 'Kojic Soap', amount: 199, timeAgo: '', deliveredTime: '3:30 PM', vendor: 'HerbalRoots', rating: 4 },
  { id: 'DQ-00861', customer: 'Ananya Iyer', product: 'Under Eye Cream', amount: 599, timeAgo: '', deliveredTime: '4:00 PM', vendor: 'NaturalCo', rating: 5 },
]

const ISSUE_ORDERS = [
  { id: 'DQ-00845', customer: 'Pooja Mishra', product: 'Expired Serum Received', issue: 'Customer received expired product', amount: 649 },
  { id: 'DQ-00848', customer: 'Saurabh Tiwari', product: 'Wrong Product Delivered', issue: 'Customer received wrong variant', amount: 399 },
]

const PICKUP_SLOTS = ['10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM', '12:00 PM – 1:00 PM', '2:00 PM – 3:00 PM', '3:00 PM – 4:00 PM', '4:00 PM – 5:00 PM']

export default function OrderPipeline() {
  const [vendorFilter, setVendorFilter] = useState('All Vendors')
  const [pickupModal, setPickupModal] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [showIssues, setShowIssues] = useState(false)
  const [newOrders, setNewOrders] = useState(NEW_ORDERS)
  const [packingOrders, setPackingOrders] = useState(PACKING_ORDERS)
  const [pickupOrders, setPickupOrders] = useState(PICKUP_ORDERS)
  const [notifiedOrders, setNotifiedOrders] = useState<string[]>([])
  const [markedPacked, setMarkedPacked] = useState<string[]>([])
  const [confirmedPickup, setConfirmedPickup] = useState<string[]>([])

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const deliveredRevenue = DELIVERED_ORDERS.reduce((s, o) => s + o.amount, 0)

  function filterOrders<T extends { vendor: string }>(orders: T[]) {
    return vendorFilter === 'All Vendors' ? orders : orders.filter(o => o.vendor === vendorFilter)
  }

  const stars = (r: number) => '★'.repeat(r) + '☆'.repeat(5 - r)

  const colHeader = (title: string, count: number, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, color: C.dark, margin: 0 }}>{title}</h3>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: color + '20', color }}>{count}</span>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>Order Pipeline</h1>
          <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', color: C.dark, background: '#fff' }}
          >
            {VENDORS.map(v => <option key={v}>{v}</option>)}
          </select>
          <button onClick={() => setShowIssues(!showIssues)} style={{ padding: '8px 14px', background: showIssues ? C.red : '#fff', color: showIssues ? '#fff' : C.red, border: `1px solid ${C.red}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ⚠️ Issues (2)
          </button>
        </div>
      </div>

      {/* Issues Sidebar */}
      {showIssues && (
        <div style={{ background: '#FEF2F2', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: `1px solid ${C.red}40` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12 }}>⚠️ Problem Orders — Requires Action</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ISSUE_ORDERS.map(o => (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.red}30`, flex: '1', minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{o.id}</div>
                    <div style={{ fontSize: 12, color: C.mu }}>{o.customer} · ₹{o.amount}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.red + '15', color: C.red }}>Issue</span>
                </div>
                <div style={{ fontSize: 12, color: C.dark, marginBottom: 12 }}>{o.issue}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ padding: '5px 10px', background: C.red + '15', color: C.red, border: `1px solid ${C.red}30`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Refund</button>
                  <button style={{ padding: '5px 10px', background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Reship</button>
                  <button style={{ padding: '5px 10px', background: C.orange + '15', color: C.orange, border: `1px solid ${C.orange}30`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Contact Vendor</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, overflowX: 'auto', marginBottom: 24 }}>

        {/* Column 1: New Orders */}
        <div style={{ minWidth: 200 }}>
          {colHeader('New Orders', filterOrders(newOrders).length, C.red)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filterOrders(newOrders).map(o => (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: 12, border: `1px solid ${C.red}30`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{o.id}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 6 }}>{o.product}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: C.dark }}>₹{o.amount}</span>
                  <span style={{ fontSize: 10, color: C.mu }}>{o.timeAgo} ago</span>
                </div>
                <button
                  onClick={() => setNotifiedOrders(prev => [...prev, o.id])}
                  style={{ width: '100%', padding: '5px', background: notifiedOrders.includes(o.id) ? C.green + '15' : C.red + '15', color: notifiedOrders.includes(o.id) ? C.green : C.red, border: `1px solid ${notifiedOrders.includes(o.id) ? C.green : C.red}30`, borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                >
                  {notifiedOrders.includes(o.id) ? '✅ Notified' : '🔔 Notify Vendor'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Vendor Packing */}
        <div style={{ minWidth: 200 }}>
          {colHeader('Vendor Packing', filterOrders(packingOrders).length, C.orange)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filterOrders(packingOrders).map(o => (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: 12, border: `1px solid ${C.orange}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{o.id}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 2 }}>{o.product}</div>
                <div style={{ fontSize: 10, color: C.mu, marginBottom: 8 }}>🏪 {o.vendor}</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => setMarkedPacked(prev => [...prev, o.id])}
                    style={{ flex: 1, padding: '5px', background: markedPacked.includes(o.id) ? C.green + '15' : C.orange + '15', color: markedPacked.includes(o.id) ? C.green : C.orange, border: `1px solid ${markedPacked.includes(o.id) ? C.green : C.orange}30`, borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {markedPacked.includes(o.id) ? '✅ Packed' : 'Mark Packed'}
                  </button>
                  <button onClick={() => setPickupModal(o.id)} style={{ flex: 1, padding: '5px', background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Assign Pickup</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Pickup Scheduled */}
        <div style={{ minWidth: 200 }}>
          {colHeader('Pickup Scheduled', filterOrders(pickupOrders).length, C.blue)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filterOrders(pickupOrders).map(o => (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: 12, border: `1px solid ${C.blue}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{o.id}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 4 }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 2 }}>🚚 {o.courier}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.blue, marginBottom: 8 }}>{o.awb}</div>
                <button
                  onClick={() => setConfirmedPickup(prev => [...prev, o.id])}
                  style={{ width: '100%', padding: '5px', background: confirmedPickup.includes(o.id) ? C.green + '15' : C.blue + '15', color: confirmedPickup.includes(o.id) ? C.green : C.blue, border: `1px solid ${confirmedPickup.includes(o.id) ? C.green : C.blue}30`, borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                >
                  {confirmedPickup.includes(o.id) ? '✅ Confirmed' : 'Confirm Pickup'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: In Transit */}
        <div style={{ minWidth: 200 }}>
          {colHeader('In Transit', filterOrders(TRANSIT_ORDERS).length, C.purple)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filterOrders(TRANSIT_ORDERS).map(o => (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: 12, border: `1px solid ${C.purple}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{o.id}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 2 }}>🚚 {o.courier}</div>
                <div style={{ fontSize: 10, color: C.purple, fontWeight: 600, marginBottom: 2 }}>{o.awb}</div>
                <div style={{ fontSize: 10, color: C.mu, marginBottom: 8 }}>📅 Est. {o.estDelivery}</div>
                <a href="#" style={{ display: 'block', textAlign: 'center', padding: '5px', background: C.purple + '10', color: C.purple, borderRadius: 7, fontSize: 10, fontWeight: 700, textDecoration: 'none', border: `1px solid ${C.purple}30` }}>
                  📍 Track
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Column 5: Delivered */}
        <div style={{ minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, color: C.dark, margin: 0 }}>Delivered</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: C.green + '20', color: C.green }}>{filterOrders(DELIVERED_ORDERS).length} today</span>
            <span style={{ fontSize: 10, color: C.mu }}>₹{deliveredRevenue.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filterOrders(DELIVERED_ORDERS).map(o => (
              <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: 12, border: `1px solid ${C.green}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{o.id}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{o.customer}</div>
                <div style={{ fontSize: 10, color: C.mu, marginBottom: 4 }}>✅ {o.deliveredTime}</div>
                {o.rating && (
                  <div style={{ fontSize: 11, color: C.gold, letterSpacing: '0.05em' }}>{stars(o.rating)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div style={{ background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', borderRadius: 16, padding: '16px 24px', color: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
          {[
            { label: 'Total Orders Today', value: '32', icon: '📦' },
            { label: 'Avg Fulfillment', value: '28 hrs', icon: '⏱' },
            { label: 'On-Time Delivery', value: '94%', icon: '✅' },
            { label: 'Issues', value: '2', icon: '⚠️' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pickup Modal */}
      {pickupModal !== null && (
        <div onClick={() => setPickupModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>Assign Pickup Time</h2>
              <button onClick={() => setPickupModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: C.mu, marginBottom: 14 }}>Order <strong style={{ color: C.dark }}>{pickupModal}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {PICKUP_SLOTS.map(slot => (
                <label key={slot} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1px solid ${selectedSlot === slot ? C.teal : C.border}`, background: selectedSlot === slot ? C.teal + '10' : '#fff', cursor: 'pointer' }}>
                  <input type="radio" name="slot" value={slot} checked={selectedSlot === slot} onChange={e => setSelectedSlot(e.target.value)} style={{ accentColor: C.teal }} />
                  <span style={{ fontSize: 13, color: selectedSlot === slot ? C.teal : C.dark, fontWeight: selectedSlot === slot ? 600 : 400 }}>{slot}</span>
                </label>
              ))}
            </div>
            <button onClick={() => { setPickupModal(null); setSelectedSlot('') }} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📅 Confirm Pickup Slot
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
