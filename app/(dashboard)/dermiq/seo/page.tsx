'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6', orange: '#F97316'
}

const INITIAL_TOPICS = [
  { id: 1, topic: 'Best Niacinamide Serum India 2025', category: 'Skincare', status: 'Published', keyword: 'niacinamide serum india' },
  { id: 2, topic: 'How to Remove Dark Spots Naturally', category: 'Skincare', status: 'Generated', keyword: 'remove dark spots naturally' },
  { id: 3, topic: 'Oily Skin Routine Step by Step', category: 'Skincare', status: 'Published', keyword: 'oily skin routine' },
  { id: 4, topic: 'Hairfall Causes and Solutions', category: 'Haircare', status: 'Pending', keyword: 'hairfall causes solutions' },
  { id: 5, topic: 'Baby Skincare Do\'s and Don\'ts', category: 'Baby Care', status: 'Pending', keyword: 'baby skincare tips india' },
  { id: 6, topic: 'SPF Guide for Indian Skin Tones', category: 'Skincare', status: 'Generated', keyword: 'spf guide indian skin' },
  { id: 7, topic: 'Retinol for Beginners', category: 'Skincare', status: 'Rejected', keyword: 'retinol beginners guide' },
  { id: 8, topic: 'Body Care Routine for Dry Skin', category: 'Bodycare', status: 'Pending', keyword: 'body care dry skin' },
]

const INITIAL_PRODUCT_SEO = [
  { id: 1, category: 'Skincare', titleTag: true, metaDesc: true, schema: true, status: 'Optimized' },
  { id: 2, category: 'Haircare', titleTag: true, metaDesc: true, schema: false, status: 'Needs work' },
  { id: 3, category: 'Bodycare', titleTag: false, metaDesc: false, schema: false, status: 'Missing' },
  { id: 4, category: 'Supplements', titleTag: true, metaDesc: false, schema: false, status: 'Needs work' },
  { id: 5, category: 'Baby Care', titleTag: false, metaDesc: false, schema: false, status: 'Missing' },
  { id: 6, category: 'Lips Care', titleTag: true, metaDesc: true, schema: false, status: 'Needs work' },
  { id: 7, category: 'Color Cosmetics', titleTag: false, metaDesc: false, schema: false, status: 'Missing' },
]

const CATEGORY_PAGES = [
  { id: 1, slug: '/skincare', title: 'Best Skincare Products India', keyword: 'skincare products india', volume: 22400, position: 12 },
  { id: 2, slug: '/haircare', title: 'Hair Care Products Online', keyword: 'hair care products india', volume: 18200, position: 45 },
  { id: 3, slug: '/bodycare', title: 'Body Care & Moisturizers', keyword: 'body care products', volume: 8900, position: 8 },
  { id: 4, slug: '/supplements', title: 'Skin & Hair Supplements', keyword: 'beauty supplements india', volume: 5400, position: 28 },
  { id: 5, slug: '/baby-care', title: 'Baby Skincare Products', keyword: 'baby skincare products india', volume: 12100, position: 19 },
  { id: 6, slug: '/lip-care', title: 'Lip Care & Treatments', keyword: 'lip care products', volume: 6700, position: 33 },
  { id: 7, slug: '/color-cosmetics', title: 'Natural Color Cosmetics', keyword: 'natural color cosmetics', volume: 9300, position: 41 },
]

const TOP_KEYWORDS = [
  { keyword: 'niacinamide serum india', position: 8, clicks: 420 },
  { keyword: 'oily skin routine india', position: 14, clicks: 280 },
  { keyword: 'baby skincare products', position: 19, clicks: 210 },
  { keyword: 'body moisturizer india', position: 8, clicks: 190 },
  { keyword: 'hair fall solution india', position: 22, clicks: 160 },
]

type Topic = typeof INITIAL_TOPICS[0] & { generating?: boolean }
type ProductSeo = typeof INITIAL_PRODUCT_SEO[0] & {
  editing?: boolean, editTitle?: string, editMeta?: string, editKeyword?: string, editSchema?: string
}

export default function SEOPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS.map(t => ({ ...t })))
  const [productSeo, setProductSeo] = useState<ProductSeo[]>(INITIAL_PRODUCT_SEO.map(p => ({ ...p })))
  const [catPages, setCatPages] = useState(CATEGORY_PAGES.map(p => ({ ...p })))
  const [newTopic, setNewTopic] = useState({ topic: '', category: 'Skincare', keyword: '' })
  const [saving, setSaving] = useState(false)

  const TABS = ['Auto Blog Generator', 'Product Page SEO', 'Category Pages SEO', 'SEO Performance']

  async function generateTopic(id: number) {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, generating: true } : t))
    await new Promise(r => setTimeout(r, 2000))
    setTopics(prev => prev.map(t => t.id === id ? { ...t, generating: false, status: 'Generated' } : t))
    const topic = topics.find(t => t.id === id)
    if (topic) {
      await supabase.from('dermiq_seo_blogs').insert({
        topic: topic.topic, category: topic.category, keyword: topic.keyword,
        status: 'generated', created_at: new Date().toISOString()
      })
    }
    toast.success('Blog post generated!')
  }

  async function addCustomTopic() {
    if (!newTopic.topic) { toast.error('Enter a topic'); return }
    const newId = Math.max(...topics.map(t => t.id)) + 1
    const entry: Topic = { id: newId, ...newTopic, status: 'Pending' }
    setTopics(prev => [...prev, entry])
    await supabase.from('dermiq_seo_topics').insert({ topic: newTopic.topic, category: newTopic.category, keyword: newTopic.keyword, status: 'pending', created_at: new Date().toISOString() })
    setNewTopic({ topic: '', category: 'Skincare', keyword: '' })
    toast.success('Topic added!')
  }

  async function saveProductSeo(id: number) {
    setSaving(true)
    const row = productSeo.find(p => p.id === id)
    if (!row) { setSaving(false); return }
    const { error } = await supabase.from('dermiq_product_seo').upsert({
      category: row.category, title_tag: row.editTitle || '', meta_desc: row.editMeta || '',
      focus_keyword: row.editKeyword || '', schema_type: row.editSchema || '',
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to save SEO'); return }
    setProductSeo(prev => prev.map(p => p.id === id ? {
      ...p, editing: false,
      titleTag: !!(p.editTitle), metaDesc: !!(p.editMeta),
      schema: !!(p.editSchema),
      status: (p.editTitle && p.editMeta && p.editSchema) ? 'Optimized' : (p.editTitle || p.editMeta) ? 'Needs work' : 'Missing'
    } : p))
    toast.success('SEO saved!')
  }

  async function optimizeCategory(id: number) {
    setSaving(true)
    const page = catPages.find(p => p.id === id)
    if (page) {
      await supabase.from('dermiq_category_seo').upsert({ slug: page.slug, title: page.title, keyword: page.keyword, updated_at: new Date().toISOString() })
    }
    setSaving(false)
    toast.success('Category page optimized!')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.dark, background: '#fff',
    outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: C.mu, marginBottom: 5, display: 'block' }

  function statusBadge(status: string) {
    const map: Record<string, { bg: string, color: string }> = {
      'Published': { bg: `${C.green}15`, color: C.green },
      'Generated': { bg: `${C.blue}15`, color: C.blue },
      'Pending': { bg: `${C.gold}15`, color: C.gold },
      'Rejected': { bg: `${C.red}15`, color: C.red },
      'Optimized': { bg: `${C.green}15`, color: C.green },
      'Needs work': { bg: `${C.gold}15`, color: C.gold },
      'Missing': { bg: `${C.red}15`, color: C.red },
    }
    const s = map[status] || { bg: C.bg, color: C.mu }
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>
        {status}
      </span>
    )
  }

  function checkIcon(val: boolean) {
    return <span style={{ fontSize: 16 }}>{val ? '✅' : '❌'}</span>
  }

  function positionBar(pos: number) {
    const maxPos = 50
    const pct = Math.max(0, 100 - (pos / maxPos) * 100)
    const color = pos <= 10 ? C.green : pos <= 20 ? C.gold : C.orange
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 80, height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color }}>{pos}</span>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: C.bg, minHeight: '100vh', padding: '32px 24px' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontWeight: 700, color: C.dark, margin: 0 }}>SEO Automation</h1>
          <p style={{ color: C.mu, fontSize: 14, marginTop: 6 }}>AI-powered content generation and SEO optimization</p>
        </div>
        <button style={{
          background: C.teal, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', gap: 8
        }}
          onClick={() => toast.success('AI content generation started!')}>
          ✨ Generate Content
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 14, padding: 6, border: `1px solid ${C.border}`, marginBottom: 24, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)} style={{
            padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
            background: activeTab === i ? C.teal : 'transparent',
            color: activeTab === i ? '#fff' : C.mu,
          }}>{t}</button>
        ))}
      </div>

      {/* ===== TAB 1: Blog Generator ===== */}
      {activeTab === 0 && (
        <div>
          <div style={{ background: `${C.purple}10`, border: `1px solid ${C.purple}30`, borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <p style={{ margin: 0, fontSize: 13, color: C.dark }}>
              <strong>AI Blog Generator:</strong> Generates 800–1200 word SEO-optimized blog posts based on DermIQ products and specialist insights.
            </p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Topic', 'Category', 'Keyword', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topics.map((topic, i) => (
                  <tr key={topic.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.bg }}>
                    <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: C.dark, maxWidth: 260 }}>{topic.topic}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: `${C.teal}15`, color: C.teal, fontSize: 11, fontWeight: 700 }}>{topic.category}</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: C.mu, maxWidth: 180 }}>{topic.keyword}</td>
                    <td style={{ padding: '14px 18px' }}>{statusBadge(topic.status)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <button
                        onClick={() => generateTopic(topic.id)}
                        disabled={topic.generating || topic.status === 'Published'}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: (topic.generating || topic.status === 'Published') ? 'not-allowed' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                          background: topic.status === 'Published' ? C.bg : topic.generating ? `${C.purple}20` : `${C.purple}15`,
                          color: topic.status === 'Published' ? C.mu : C.purple,
                          opacity: topic.status === 'Published' ? 0.5 : 1,
                          minWidth: 120
                        }}>
                        {topic.generating ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: `2px solid ${C.purple}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                            Generating...
                          </span>
                        ) : topic.status === 'Published' ? 'Published' : '✨ Generate with AI'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add custom topic */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 18 }}>Add Custom Topic</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: 14, alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Topic</label>
                <input style={inputStyle} value={newTopic.topic} onChange={e => setNewTopic({ ...newTopic, topic: e.target.value })} placeholder="e.g. Vitamin C Serum Benefits" />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={newTopic.category} onChange={e => setNewTopic({ ...newTopic, category: e.target.value })}>
                  <option>Skincare</option>
                  <option>Haircare</option>
                  <option>Bodycare</option>
                  <option>Baby Care</option>
                  <option>Supplements</option>
                  <option>Lips Care</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Focus Keyword</label>
                <input style={inputStyle} value={newTopic.keyword} onChange={e => setNewTopic({ ...newTopic, keyword: e.target.value })} placeholder="vitamin c serum india" />
              </div>
              <button onClick={addCustomTopic} style={{
                background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap'
              }}>+ Add Topic</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB 2: Product Page SEO ===== */}
      {activeTab === 1 && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Category', 'Title Tag', 'Meta Desc', 'Schema', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productSeo.map((row) => (
                <>
                  <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: C.dark }}>{row.category}</td>
                    <td style={{ padding: '14px 18px' }}>{checkIcon(row.titleTag)}</td>
                    <td style={{ padding: '14px 18px' }}>{checkIcon(row.metaDesc)}</td>
                    <td style={{ padding: '14px 18px' }}>{checkIcon(row.schema)}</td>
                    <td style={{ padding: '14px 18px' }}>{statusBadge(row.status)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <button
                        onClick={() => setProductSeo(prev => prev.map(p => p.id === row.id ? {
                          ...p, editing: !p.editing,
                          editTitle: p.editTitle !== undefined ? p.editTitle : '',
                          editMeta: p.editMeta !== undefined ? p.editMeta : '',
                          editKeyword: p.editKeyword !== undefined ? p.editKeyword : '',
                          editSchema: p.editSchema !== undefined ? p.editSchema : 'Product',
                        } : p))}
                        style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: row.editing ? `${C.teal}10` : 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: row.editing ? C.teal : C.mu }}
                      >
                        {row.editing ? 'Close' : 'Edit SEO'}
                      </button>
                    </td>
                  </tr>
                  {row.editing && (
                    <tr key={`${row.id}-edit`} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td colSpan={6} style={{ padding: '0 18px 18px' }}>
                        <div style={{ background: C.bg, borderRadius: 12, padding: 18, marginTop: 4 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                              <label style={labelStyle}>Title Tag (max 60 chars)</label>
                              <input style={inputStyle} value={row.editTitle || ''} onChange={e => setProductSeo(prev => prev.map(p => p.id === row.id ? { ...p, editTitle: e.target.value } : p))} placeholder={`Best ${row.category} Products in India | DermIQ`} maxLength={60} />
                              <div style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{(row.editTitle || '').length}/60 characters</div>
                            </div>
                            <div>
                              <label style={labelStyle}>Focus Keyword</label>
                              <input style={inputStyle} value={row.editKeyword || ''} onChange={e => setProductSeo(prev => prev.map(p => p.id === row.id ? { ...p, editKeyword: e.target.value } : p))} placeholder={`${row.category.toLowerCase()} products india`} />
                            </div>
                            <div>
                              <label style={labelStyle}>Meta Description (max 160 chars)</label>
                              <textarea rows={3} style={{ ...inputStyle, resize: 'none' }} value={row.editMeta || ''} onChange={e => setProductSeo(prev => prev.map(p => p.id === row.id ? { ...p, editMeta: e.target.value } : p))} placeholder={`Discover the best ${row.category.toLowerCase()} products curated by skin experts...`} maxLength={160} />
                              <div style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{(row.editMeta || '').length}/160 characters</div>
                            </div>
                            <div>
                              <label style={labelStyle}>Schema Type</label>
                              <select style={{ ...inputStyle, cursor: 'pointer' }} value={row.editSchema || 'Product'} onChange={e => setProductSeo(prev => prev.map(p => p.id === row.id ? { ...p, editSchema: e.target.value } : p))}>
                                <option>Product</option>
                                <option>ItemList</option>
                                <option>BreadcrumbList</option>
                                <option>FAQPage</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => saveProductSeo(row.id)} disabled={saving} style={{
                              background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px',
                              fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif'
                            }}>
                              {saving ? 'Saving...' : 'Save SEO'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== TAB 3: Category Pages SEO ===== */}
      {activeTab === 2 && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['URL Slug', 'Current Title', 'Focus Keyword', 'Monthly Volume', 'Position', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catPages.map((page, i) => (
                <tr key={page.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.bg }}>
                  <td style={{ padding: '14px 18px', fontSize: 13, fontFamily: 'monospace', color: C.teal, fontWeight: 700 }}>{page.slug}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: C.dark }}>{page.title}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: C.mu }}>{page.keyword}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: C.dark }}>{page.volume.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: C.mu }}>/mo</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>{positionBar(page.position)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => optimizeCategory(page.id)} disabled={saving} style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', background: `${C.teal}15`,
                      fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'DM Sans, sans-serif', color: C.teal
                    }}>Optimize</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== TAB 4: SEO Performance ===== */}
      {activeTab === 3 && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Organic Traffic', value: '4,280', sub: '/month', icon: '📈', color: C.green },
              { label: 'Indexed Pages', value: '142', sub: 'pages', icon: '📄', color: C.blue },
              { label: 'Avg. Position', value: '28.4', sub: 'ranking', icon: '🔍', color: C.gold },
              { label: 'Click-Through Rate', value: '3.2%', sub: 'avg CTR', icon: '🖱️', color: C.purple },
              { label: 'Impressions', value: '48,200', sub: '/month', icon: '👁️', color: C.orange },
              { label: 'Top Keyword', value: 'Pos. 8', sub: 'niacinamide serum india', icon: '🏆', color: C.teal },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{stat.icon}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: C.dark }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{stat.label}</div>
                <div style={{ fontSize: 11, color: stat.color, fontWeight: 600, marginTop: 4 }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Top Keywords Chart */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700, color: C.dark, margin: 0 }}>Top 5 Keywords</h3>
              <span style={{ fontSize: 12, color: C.mu }}>Position by ranking (lower = better)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {TOP_KEYWORDS.map((kw, i) => {
                const maxPos = 50
                const barWidth = Math.max(5, 100 - (kw.position / maxPos) * 100)
                const color = kw.position <= 10 ? C.green : kw.position <= 20 ? C.gold : C.orange
                return (
                  <div key={kw.keyword}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: C.mu, width: 20 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{kw.keyword}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 12, color: C.mu }}>{kw.clicks} clicks/mo</span>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color, minWidth: 40, textAlign: 'right' }}>
                          #{kw.position}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 5, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              {[
                { color: C.green, label: 'Top 10 (Best)' },
                { color: C.gold, label: 'Top 20 (Good)' },
                { color: C.orange, label: '20+ (Needs work)' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                  <span style={{ fontSize: 12, color: C.mu }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick wins */}
          <div style={{ marginTop: 20, background: `${C.teal}08`, border: `1px solid ${C.teal}30`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Quick SEO Wins</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '✍️', text: 'Write 3 more blog posts targeting "hairfall" keywords — 18K searches/month uncaptured' },
                { icon: '🔗', text: 'Add internal links from top skincare posts to Bodycare category page' },
                { icon: '📸', text: 'Add alt text to 47 product images to improve image search rankings' },
                { icon: '⚡', text: 'Compress 12 images — page speed is affecting ranking for Haircare pages' },
              ].map((win, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{win.icon}</span>
                  <span style={{ fontSize: 13, color: C.dark, lineHeight: 1.5 }}>{win.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
