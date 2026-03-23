'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E8E0D8', cream: '#F7F3EE', bg: '#FAFAF8', accent: '#C8976A',
  green: '#10B981', red: '#EF4444', gold: '#D4A853',
}

type ContentTab = 'banners' | 'featured' | 'announcements' | 'categories'

interface Banner {
  id: string; title: string; subtitle: string; image_url: string;
  cta_text: string; cta_link: string; active: boolean; order: number;
}

interface Announcement { id: string; text: string; active: boolean; order: number }

interface CategoryContent {
  slug: string; label: string; heroImage: string; description: string; bannerText: string
}

interface FeaturedProduct { id: number; name: string; section: string }

const CATEGORY_SLUGS = [
  { slug: 'skincare', label: 'Skincare' },
  { slug: 'bodycare', label: 'Body Care' },
  { slug: 'lips-care', label: 'Lips Care' },
  { slug: 'haircare', label: 'Hair Care' },
  { slug: 'supplements', label: 'Supplements' },
  { slug: 'baby-care', label: 'Baby Care' },
  { slug: 'color-cosmetics', label: 'Color Cosmetics' },
]

const FEATURED_SECTIONS = ['Bestsellers', 'New Launches', 'Budget Picks', 'Editor\'s Choice', 'Trending Now']

function inputStyle(focused?: boolean): React.CSSProperties {
  return {
    width: '100%', border: `1px solid ${focused ? C.teal : C.border}`, borderRadius: 8,
    padding: '10px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box', background: '#fff', color: C.dark,
    transition: 'border-color 0.15s',
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 12, background: checked ? C.teal : C.border, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

// ── Banner Manager ───────────────────────────────────────────────────────────
function BannerManager({ contentData, onSave }: { contentData: any; onSave: (data: any) => void }) {
  const [banners, setBanners] = useState<Banner[]>(contentData?.banners || [
    { id: '1', title: 'Science-Backed Skincare', subtitle: 'Formulated by dermatologists. Trusted by 50K+ Indians.', image_url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1400&h=500&fit=crop', cta_text: 'Shop Now', cta_link: '/shop', active: true, order: 1 },
    { id: '2', title: 'New: Baby Care Collection', subtitle: 'Paediatrician-tested products for your little one.', image_url: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1400&h=500&fit=crop', cta_text: 'Explore Baby Care', cta_link: '/category/baby-care', active: true, order: 2 },
  ])
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Banner>>({})

  function startEdit(banner: Banner) {
    setEditing(banner.id)
    setForm({ ...banner })
  }

  function startNew() {
    const newBanner: Banner = { id: Date.now().toString(), title: '', subtitle: '', image_url: '', cta_text: 'Shop Now', cta_link: '/shop', active: true, order: banners.length + 1 }
    setBanners([...banners, newBanner])
    setEditing(newBanner.id)
    setForm({ ...newBanner })
  }

  function saveEdit() {
    const updated = banners.map(b => b.id === editing ? { ...b, ...form } as Banner : b)
    setBanners(updated)
    setEditing(null)
    onSave({ ...contentData, banners: updated })
    toast.success('Banner saved!')
  }

  function deleteBanner(id: string) {
    const updated = banners.filter(b => b.id !== id)
    setBanners(updated)
    onSave({ ...contentData, banners: updated })
    toast.success('Banner deleted')
  }

  function toggleActive(id: string) {
    const updated = banners.map(b => b.id === id ? { ...b, active: !b.active } : b)
    setBanners(updated)
    onSave({ ...contentData, banners: updated })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark }}>Homepage Banners</h2>
          <p style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>Manage hero banner images and CTAs displayed on the DermIQ homepage.</p>
        </div>
        <button onClick={startNew} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          + Add Banner
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {banners.map(banner => (
          <div key={banner.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {/* Banner preview */}
            {editing !== banner.id && (
              <div style={{ display: 'flex', gap: 0 }}>
                <div style={{ width: 200, height: 100, flexShrink: 0, position: 'relative', background: C.cream, overflow: 'hidden' }}>
                  {banner.image_url && (
                    <img src={banner.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                  {!banner.image_url && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🖼️</div>}
                </div>
                <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{banner.title || 'Untitled Banner'}</p>
                      <span style={{ fontSize: 11, background: banner.active ? '#D1FAE5' : '#F3F4F6', color: banner.active ? '#065F46' : '#9CA3AF', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                        {banner.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.mu, marginBottom: 2 }}>{banner.subtitle}</p>
                    <p style={{ fontSize: 11, color: C.teal }}>CTA: {banner.cta_text} → {banner.cta_link}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Toggle checked={banner.active} onChange={() => toggleActive(banner.id)} />
                    <button onClick={() => startEdit(banner)} style={{ background: '#F7F3EE', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: C.dark }}>Edit</button>
                    <button onClick={() => deleteBanner(banner.id)} style={{ background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: C.red }}>Delete</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit form */}
            {editing === banner.id && (
              <div style={{ padding: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Edit Banner</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Title</label>
                    <input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} style={inputStyle()} placeholder="Banner headline" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Subtitle</label>
                    <input value={form.subtitle || ''} onChange={e => setForm({ ...form, subtitle: e.target.value })} style={inputStyle()} placeholder="Supporting text" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Image URL (Unsplash or CDN)</label>
                    <input value={form.image_url || ''} onChange={e => setForm({ ...form, image_url: e.target.value })} style={inputStyle()} placeholder="https://images.unsplash.com/..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>CTA Button Text</label>
                    <input value={form.cta_text || ''} onChange={e => setForm({ ...form, cta_text: e.target.value })} style={inputStyle()} placeholder="Shop Now" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>CTA Link</label>
                    <input value={form.cta_link || ''} onChange={e => setForm({ ...form, cta_link: e.target.value })} style={inputStyle()} placeholder="/shop" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Toggle checked={form.active ?? true} onChange={v => setForm({ ...form, active: v })} />
                    <span style={{ fontSize: 13, color: C.mu }}>Active on homepage</span>
                  </div>
                </div>
                {form.image_url && (
                  <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', height: 120, position: 'relative' }}>
                    <img src={form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 4 }}>
                      <p style={{ fontSize: 18, fontWeight: 700 }}>{form.title}</p>
                      <p style={{ fontSize: 12 }}>{form.subtitle}</p>
                      <div style={{ marginTop: 8, background: C.accent, borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{form.cta_text}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveEdit} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Banner</button>
                  <button onClick={() => setEditing(null)} style={{ background: '#F7F3EE', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 20px', fontSize: 13, cursor: 'pointer', color: C.dark }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Featured Products ────────────────────────────────────────────────────────
function FeaturedProductsManager({ contentData, onSave }: { contentData: any; onSave: (data: any) => void }) {
  const [featured, setFeatured] = useState<Record<string, number[]>>(contentData?.featured || {
    'Bestsellers': [1, 2, 3, 7, 8],
    'New Launches': [5, 6, 9, 10],
    'Editor\'s Choice': [11, 14, 12],
  })
  const [selectedSection, setSelectedSection] = useState(FEATURED_SECTIONS[0])
  const [newId, setNewId] = useState('')

  function addProduct() {
    const id = parseInt(newId)
    if (!id || isNaN(id)) { toast.error('Enter a valid product ID'); return }
    const currentList = featured[selectedSection] || []
    if (currentList.includes(id)) { toast.error('Product already in this section'); return }
    const updated = { ...featured, [selectedSection]: [...currentList, id] }
    setFeatured(updated)
    onSave({ ...contentData, featured: updated })
    setNewId('')
    toast.success(`Product ${id} added to ${selectedSection}`)
  }

  function removeProduct(section: string, id: number) {
    const updated = { ...featured, [section]: (featured[section] || []).filter(pid => pid !== id) }
    setFeatured(updated)
    onSave({ ...contentData, featured: updated })
    toast.success('Product removed')
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark }}>Featured Products</h2>
        <p style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>Curate which products appear in each homepage section. Use product IDs from the DermIQ product library.</p>
      </div>

      {/* Section selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {FEATURED_SECTIONS.map(s => (
          <button key={s} onClick={() => setSelectedSection(s)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${selectedSection === s ? C.teal : C.border}`, background: selectedSection === s ? C.teal : '#fff', color: selectedSection === s ? '#fff' : C.dark, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {s}
            {featured[s] && <span style={{ marginLeft: 6, background: selectedSection === s ? 'rgba(255,255,255,0.3)' : C.border, borderRadius: 10, padding: '0 6px', fontSize: 11 }}>{featured[s].length}</span>}
          </button>
        ))}
      </div>

      {/* Selected section */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>{selectedSection} — Product IDs</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(featured[selectedSection] || []).map(id => (
            <div key={id} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>#{id}</span>
              <button onClick={() => removeProduct(selectedSection, id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
          {(!featured[selectedSection] || featured[selectedSection].length === 0) && (
            <p style={{ fontSize: 13, color: C.mu }}>No products in this section. Add IDs below.</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={newId}
            onChange={e => setNewId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProduct()}
            placeholder="Enter product ID (e.g. 1, 50, 90...)"
            style={{ flex: 1, ...inputStyle() }}
          />
          <button onClick={addProduct} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
        </div>
        <p style={{ fontSize: 11, color: C.mu, marginTop: 8 }}>
          Skincare IDs: 1–14 | Bodycare: 50–54 | Lips: 55–58 | Hair: 60–64 | Supplements: 70–74 | Baby: 80–83 | Color: 90–94
        </p>
      </div>
    </div>
  )
}

// ── Announcements Manager ────────────────────────────────────────────────────
function AnnouncementsManager({ contentData, onSave }: { contentData: any; onSave: (data: any) => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(contentData?.announcements || [
    { id: '1', text: '✨ FREE shipping on orders above ₹799', active: true, order: 1 },
    { id: '2', text: 'Use code DERMIQ15 for 15% off', active: true, order: 2 },
    { id: '3', text: '🧠 Free AI Skin Analysis — 30 seconds', active: true, order: 3 },
    { id: '4', text: '👨‍⚕️ Consultations from ₹499', active: true, order: 4 },
    { id: '5', text: '🌿 100% Clean Ingredients', active: true, order: 5 },
  ])
  const [newText, setNewText] = useState('')

  function addAnnouncement() {
    if (!newText.trim()) return
    const ann: Announcement = { id: Date.now().toString(), text: newText.trim(), active: true, order: announcements.length + 1 }
    const updated = [...announcements, ann]
    setAnnouncements(updated)
    onSave({ ...contentData, announcements: updated })
    setNewText('')
    toast.success('Announcement added!')
  }

  function toggleAnn(id: string) {
    const updated = announcements.map(a => a.id === id ? { ...a, active: !a.active } : a)
    setAnnouncements(updated)
    onSave({ ...contentData, announcements: updated })
  }

  function deleteAnn(id: string) {
    const updated = announcements.filter(a => a.id !== id)
    setAnnouncements(updated)
    onSave({ ...contentData, announcements: updated })
    toast.success('Announcement deleted')
  }

  function updateText(id: string, text: string) {
    setAnnouncements(announcements.map(a => a.id === id ? { ...a, text } : a))
  }

  function saveText(id: string) {
    const updated = announcements.map(a => a.id === id ? a : a)
    onSave({ ...contentData, announcements: updated })
    toast.success('Saved!')
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark }}>Announcement Bar</h2>
        <p style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>Manage the scrolling announcement bar at the top of the DermIQ homepage. Toggle individual items on or off.</p>
      </div>

      {/* Preview */}
      <div style={{ background: C.dark, borderRadius: 10, padding: '10px 20px', marginBottom: 20, display: 'flex', gap: 20, overflowX: 'auto' }}>
        {announcements.filter(a => a.active).map(a => (
          <span key={a.id} style={{ fontSize: 12, color: '#fff', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}>
            {a.text} <span style={{ color: C.accent }}>•</span>
          </span>
        ))}
        {announcements.filter(a => a.active).length === 0 && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>No active announcements</span>
        )}
      </div>
      <p style={{ fontSize: 11, color: C.mu, marginBottom: 16 }}>Preview of active announcements</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {announcements.map((ann, i) => (
          <div key={ann.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: C.mu, fontWeight: 700, width: 20, textAlign: 'center' }}>{i + 1}</span>
            <input
              value={ann.text}
              onChange={e => updateText(ann.id, e.target.value)}
              onBlur={() => saveText(ann.id)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: C.dark, background: 'transparent' }}
            />
            <Toggle checked={ann.active} onChange={() => toggleAnn(ann.id)} />
            <button onClick={() => deleteAnn(ann.id)} style={{ background: '#FEE2E2', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: C.red }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addAnnouncement()}
          placeholder="New announcement text (emoji + message)..."
          style={{ flex: 1, ...inputStyle() }}
        />
        <button onClick={addAnnouncement} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  )
}

// ── Category Content Manager ─────────────────────────────────────────────────
function CategoryContentManager({ contentData, onSave }: { contentData: any; onSave: (data: any) => void }) {
  const defaultCatContent: Record<string, CategoryContent> = Object.fromEntries(
    CATEGORY_SLUGS.map(c => [c.slug, { slug: c.slug, label: c.label, heroImage: '', description: '', bannerText: '' }])
  )
  const [categories, setCategories] = useState<Record<string, CategoryContent>>(
    contentData?.categories || defaultCatContent
  )
  const [selectedSlug, setSelectedSlug] = useState(CATEGORY_SLUGS[0].slug)

  function updateCategory(slug: string, field: keyof CategoryContent, value: string) {
    const updated = { ...categories, [slug]: { ...categories[slug], [field]: value } }
    setCategories(updated)
  }

  function saveCategory(slug: string) {
    onSave({ ...contentData, categories })
    toast.success(`${categories[slug].label} content saved!`)
  }

  const cat = categories[selectedSlug]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark }}>Category Content</h2>
        <p style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>Edit hero images, descriptions, and banner text for each category page.</p>
      </div>

      {/* Category selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORY_SLUGS.map(c => (
          <button key={c.slug} onClick={() => setSelectedSlug(c.slug)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${selectedSlug === c.slug ? C.teal : C.border}`, background: selectedSlug === c.slug ? C.teal : '#fff', color: selectedSlug === c.slug ? '#fff' : C.dark, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {c.label}
          </button>
        ))}
      </div>

      {cat && (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 20 }}>{cat.label} — Page Content</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Hero Banner Image URL</label>
              <input
                value={cat.heroImage}
                onChange={e => updateCategory(selectedSlug, 'heroImage', e.target.value)}
                style={inputStyle()}
                placeholder="https://images.unsplash.com/..."
              />
              {cat.heroImage && (
                <div style={{ marginTop: 8, height: 100, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={cat.heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Category Description</label>
              <textarea
                value={cat.description}
                onChange={e => updateCategory(selectedSlug, 'description', e.target.value)}
                rows={3}
                style={{ ...inputStyle(), resize: 'vertical' }}
                placeholder="A brief description shown in the category hero section..."
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Banner Promotional Text</label>
              <input
                value={cat.bannerText}
                onChange={e => updateCategory(selectedSlug, 'bannerText', e.target.value)}
                style={inputStyle()}
                placeholder="e.g. Up to 40% off Skincare Essentials"
              />
            </div>

            <button
              onClick={() => saveCategory(selectedSlug)}
              style={{ width: 'fit-content', background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Save {cat.label} Content
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DermIQContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('banners')
  const [contentData, setContentData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => { loadContent() }, [])

  async function loadContent() {
    try {
      const { data } = await supabase.from('dermiq_content').select('*').eq('key', 'homepage').single()
      if (data?.value) setContentData(data.value)
    } catch {
      // Table may not exist yet — use defaults
    } finally {
      setLoading(false)
    }
  }

  async function saveContent(newData: any) {
    setSaving(true)
    try {
      await supabase.from('dermiq_content').upsert([{ key: 'homepage', value: newData, updated_at: new Date().toISOString() }], { onConflict: 'key' })
      setContentData(newData)
      setLastSaved(new Date())
    } catch (err) {
      console.error('Save error:', err)
      // Still update local state even if DB fails
      setContentData(newData)
      setLastSaved(new Date())
    } finally {
      setSaving(false)
    }
  }

  const TABS: { id: ContentTab; icon: string; label: string; desc: string }[] = [
    { id: 'banners', icon: '🖼️', label: 'Banners', desc: 'Hero images & CTAs' },
    { id: 'featured', icon: '⭐', label: 'Featured Products', desc: 'Homepage sections' },
    { id: 'announcements', icon: '📢', label: 'Announcements', desc: 'Top bar text' },
    { id: 'categories', icon: '🗂️', label: 'Category Content', desc: 'Hero images & descriptions' },
  ]

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p style={{ color: C.mu }}>Loading content data...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🎨</span>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: C.dark }}>Content Management</h1>
            <span style={{ background: `${C.teal}18`, color: C.teal, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>DermIQ</span>
          </div>
          <p style={{ fontSize: 13, color: C.mu }}>Manage banners, featured products, announcements, and category content for rabtnaturals.com/dermiq</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastSaved && (
            <p style={{ fontSize: 12, color: C.green }}>
              ✓ Saved {lastSaved.toLocaleTimeString()}
            </p>
          )}
          {saving && <p style={{ fontSize: 12, color: C.mu }}>Saving...</p>}
          <a href="https://dermiq.in" target="_blank" rel="noopener noreferrer" style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: C.dark, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            🌐 Preview Site →
          </a>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: 6 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '12px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? C.teal : 'transparent',
              color: activeTab === tab.id ? '#fff' : C.mu,
              transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{tab.label}</span>
            <span style={{ fontSize: 10, opacity: 0.8 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'banners' && <BannerManager contentData={contentData} onSave={saveContent} />}
      {activeTab === 'featured' && <FeaturedProductsManager contentData={contentData} onSave={saveContent} />}
      {activeTab === 'announcements' && <AnnouncementsManager contentData={contentData} onSave={saveContent} />}
      {activeTab === 'categories' && <CategoryContentManager contentData={contentData} onSave={saveContent} />}
    </div>
  )
}
