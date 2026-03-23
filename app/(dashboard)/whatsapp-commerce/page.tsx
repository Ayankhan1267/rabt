'use client'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B',
  border: '#E5E7EB', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6',
  blue: '#3B82F6', wa: '#25D366',
}

type Tab = 'chats' | 'flows' | 'catalog' | 'analytics'

interface Chat {
  id: string; name: string; phone: string; lastMsg: string
  time: string; unread: number; status: 'active' | 'resolved' | 'waiting'
  stage: string
}
interface Message { role: 'user' | 'ai'; text: string; time: string }

const DEMO_CHATS: Chat[] = [
  { id: '1', name: 'Priya Sharma', phone: '+91 98765 43210', lastMsg: 'Meri skin bahut dry hai...', time: '2m ago', unread: 2, status: 'active', stage: 'Skin Analysis' },
  { id: '2', name: 'Rohit Kumar', phone: '+91 87654 32109', lastMsg: 'Kaunsa serum best hai?', time: '15m ago', unread: 0, status: 'waiting', stage: 'Product Query' },
  { id: '3', name: 'Anjali Verma', phone: '+91 76543 21098', lastMsg: 'Order place kar do', time: '1h ago', unread: 0, status: 'active', stage: 'Order' },
  { id: '4', name: 'Meena Patel', phone: '+91 65432 10987', lastMsg: 'Bahut achha product hai!', time: '3h ago', unread: 0, status: 'resolved', stage: 'Complete' },
]

const FLOW_STEPS = [
  { id: 1, trigger: 'Customer says "Hi" / "Namaste"', action: 'Welcome message + skin quiz offer', icon: '👋' },
  { id: 2, trigger: 'Customer shares skin concern', action: 'AI skin analysis + product match', icon: '🔍' },
  { id: 3, trigger: 'Product interest shown', action: 'Send product details + price + order link', icon: '🛍️' },
  { id: 4, trigger: 'Customer asks about order', action: 'Fetch order status from system', icon: '📦' },
  { id: 5, trigger: 'Customer says "Buy" / "Order"', action: 'Send payment link via Razorpay', icon: '💳' },
  { id: 6, trigger: 'No response 24h', action: 'Follow-up message with discount code', icon: '📲' },
  { id: 7, trigger: 'Payment success', action: 'Order confirm + dispatch alert', icon: '✅' },
]

const CATALOG = [
  { name: 'Glow Serum 30ml', price: 899, concern: 'Dark Spots, Dullness', emoji: '✨' },
  { name: 'Vitamin C Serum', price: 799, concern: 'Pigmentation, Glow', emoji: '🍊' },
  { name: 'Niacinamide Toner', price: 499, concern: 'Acne, Oily Skin', emoji: '💧' },
  { name: 'Hydrating Cream', price: 699, concern: 'Dryness, Fine Lines', emoji: '🌿' },
  { name: 'Retinol Night Cream', price: 999, concern: 'Anti-aging, Pigmentation', emoji: '🌙' },
  { name: 'SPF 50 Sunscreen', price: 549, concern: 'Sun Protection', emoji: '☀️' },
  { name: 'Keratin Hair Mask', price: 899, concern: 'Hairfall, Damage', emoji: '💆' },
  { name: 'Scalp Serum 50ml', price: 899, concern: 'Dandruff, Hairfall', emoji: '🌱' },
]

export default function WhatsAppCommerceAgent() {
  const [tab, setTab] = useState<Tab>('chats')
  const [selectedChat, setSelectedChat] = useState<Chat | null>(DEMO_CHATS[0])
  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', text: 'Namaste! Meri skin bahut dry hai aur pimples bhi aa rahe hain', time: '10:32' },
    { role: 'ai', text: 'Namaste Priya ji! 🌿 Rabt Naturals mein aapka swagat hai! Aapki skin dry bhi hai aur pimples bhi — yeh combination skin hai. Main aapke liye perfect products recommend karti hoon. Kya aap batayengi — yeh pimples kaafi time se hain ya recently shuru hue?', time: '10:32' },
    { role: 'user', text: '2-3 months se hai, pehle itne nahi the', time: '10:34' },
  ])
  const [inputMsg, setInputMsg] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const [agentEnabled, setAgentEnabled] = useState(true)
  const [stats] = useState({ todayChats: 23, conversions: 7, revenue: 14350, responseTime: '45s' })
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!inputMsg.trim()) return
    const userMsg: Message = { role: 'user', text: inputMsg, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    setInputMsg('')
    setAiTyping(true)

    try {
      const res = await fetch('/api/whatsapp-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMsg, history: messages, customerName: selectedChat?.name }),
      })
      if (res.ok) {
        const d = await res.json()
        setMessages(prev => [...prev, { role: 'ai', text: d.reply, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }])
      }
    } catch { toast.error('AI response failed') }
    setAiTyping(false)
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'chats', label: 'Live Chats', icon: '💬' },
    { id: 'flows', label: 'AI Flow', icon: '🔄' },
    { id: 'catalog', label: 'Catalog', icon: '🛍️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.wa, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.dark }}>WhatsApp Commerce Agent</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>AI chatbot jo WhatsApp pe skin analysis, product recommendation aur orders handle karta hai</p>
          </div>
          <span style={{ background: C.wa, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Agent {agentEnabled ? 'Active' : 'Paused'}</span>
          <div onClick={() => setAgentEnabled(!agentEnabled)} style={{ width: 48, height: 26, borderRadius: 13, background: agentEnabled ? C.wa : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: agentEnabled ? 24 : 2, transition: 'left 0.2s' }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Chats Today', value: stats.todayChats, icon: '💬', color: C.wa },
          { label: 'Conversions', value: stats.conversions, icon: '✅', color: C.green },
          { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: '💰', color: C.gold },
          { label: 'Avg Response', value: stats.responseTime, icon: '⚡', color: C.blue },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.id ? C.wa : 'transparent', color: tab === t.id ? '#fff' : '#6B7280' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* LIVE CHATS */}
      {tab === 'chats' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 560 }}>
          {/* Chat List */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, color: C.dark }}>Active Conversations</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {DEMO_CHATS.map(chat => (
                <div key={chat.id} onClick={() => setSelectedChat(chat)} style={{ padding: '14px 16px', borderBottom: `1px solid #F3F4F6`, cursor: 'pointer', background: selectedChat?.id === chat.id ? '#F0FFF4' : 'transparent', transition: 'background 0.1s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{chat.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{chat.time}</span>
                      {chat.unread > 0 && <span style={{ background: C.wa, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{chat.unread}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.lastMsg}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: chat.status === 'active' ? '#D1FAE5' : chat.status === 'waiting' ? '#FEF3C7' : '#F3F4F6', color: chat.status === 'active' ? C.green : chat.status === 'waiting' ? C.gold : '#9CA3AF', fontWeight: 600 }}>{chat.status}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#EFF6FF', color: C.blue }}>{chat.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedChat && (
              <>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{selectedChat.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{selectedChat.phone} · {selectedChat.stage}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toast.success('Transferring to specialist...')} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', fontWeight: 600 }}>Handoff to Specialist</button>
                    <button onClick={() => toast.success('Marked as resolved')} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, cursor: 'pointer', fontWeight: 600 }}>Resolve</button>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#F0F4F0' }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'ai' ? 'flex-start' : 'flex-end' }}>
                      <div style={{ maxWidth: '70%', background: m.role === 'ai' ? '#fff' : C.wa, color: m.role === 'ai' ? C.dark : '#fff', borderRadius: m.role === 'ai' ? '0 12px 12px 12px' : '12px 0 12px 12px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                        {m.role === 'ai' && <div style={{ fontSize: 11, fontWeight: 700, color: C.wa, marginBottom: 4 }}>🤖 Riya — Rabt AI</div>}
                        {m.text}
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                  {aiTyping && (
                    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#fff', borderRadius: '0 12px 12px 12px', width: 'fit-content', fontSize: 20 }}>
                      <span style={{ animation: 'bounce 1s infinite' }}>·</span><span style={{ animation: 'bounce 1s infinite 0.2s' }}>·</span><span style={{ animation: 'bounce 1s infinite 0.4s' }}>·</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
                  <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Simulate customer message..." style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 24, padding: '10px 16px', fontSize: 13 }} />
                  <button onClick={sendMessage} style={{ background: C.wa, color: '#fff', border: 'none', borderRadius: 24, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI FLOW */}
      {tab === 'flows' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: C.dark }}>🔄 AI Conversation Flow</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FLOW_STEPS.map((step, i) => (
                <div key={step.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.wa, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, zIndex: 1 }}>{step.icon}</div>
                    {i < FLOW_STEPS.length - 1 && <div style={{ width: 2, flex: 1, background: '#D1FAE5', minHeight: 24 }} />}
                  </div>
                  <div style={{ paddingBottom: 20, flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>TRIGGER</div>
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>{step.trigger}</div>
                    <div style={{ background: '#F0FFF4', border: `1px solid #D1FAE5`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.dark }}>
                      <span style={{ fontWeight: 600, color: C.wa }}>AI Action: </span>{step.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CATALOG */}
      {tab === 'catalog' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {CATALOG.map((p, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>{p.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>{p.concern}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.teal, marginBottom: 12 }}>₹{p.price}</div>
                <button onClick={() => toast.success(`Product link copied for ${p.name}`)} style={{ width: '100%', background: C.wa, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  📤 Share on WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>📊 Conversion Funnel</h3>
            {[
              { stage: 'Messages Received', count: 156, pct: 100, color: C.blue },
              { stage: 'Engaged (replied)', count: 134, pct: 86, color: C.teal },
              { stage: 'Product Interest', count: 89, pct: 57, color: C.gold },
              { stage: 'Cart / Order Link', count: 42, pct: 27, color: C.orange },
              { stage: 'Purchased', count: 23, pct: 15, color: C.green },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.dark }}>{s.stage}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.count} ({s.pct}%)</span>
                </div>
                <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>🏆 Top Performing Responses</h3>
            {[
              { msg: 'Skin type analysis response', ctr: '78%', tag: 'Skin Quiz' },
              { msg: 'Glow Serum recommendation', ctr: '64%', tag: 'Product' },
              { msg: '10% first-order discount offer', ctr: '71%', tag: 'Offer' },
              { msg: 'Free consultation invite', ctr: '55%', tag: 'Consult' },
              { msg: 'Payment link message', ctr: '48%', tag: 'Order' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? `1px solid #F3F4F6` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{r.msg}</div>
                  <span style={{ fontSize: 11, background: '#EFF6FF', color: C.blue, padding: '2px 8px', borderRadius: 10 }}>{r.tag}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{r.ctr}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
